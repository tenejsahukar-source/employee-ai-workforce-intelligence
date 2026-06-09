"""
app/ml/services/shap_explainer.py

Production-grade ExplainabilityService.

Architecture
------------
This service is stateless.  All model state lives in the ML bundle returned
by load_attrition_model() (loader.py).  The bundle exposes:

    bundle["model"]        – full sklearn Pipeline
    bundle["preprocessor"] – pipeline[:-1]  (preprocessing steps only)
    bundle["estimator"]    – pipeline[-1]   (XGBClassifier)
    bundle["explainer"]    – shap.TreeExplainer built on the XGBClassifier
    bundle["model_name"]   – str

Root-cause fixes vs. the original shap_explainer.py
------------------------------------------------------
FIX 1  Removed all references to artifact_registry / MLArtifactRegistry /
       ExplainerBundle / PipelineComponents — that module does not exist in
       this codebase and caused an ImportError on startup.

FIX 2  Wired bundle retrieval to load_attrition_model() from loader.py,
       which is the single source of truth for the cached bundle.

FIX 3  Replaced explainer(transformed) [Explanation callable API] with
       explainer.shap_values(transformed) [ndarray API].  The callable API
       is only reliable when the TreeExplainer was built from an sklearn
       wrapper with feature_names_in_; the ndarray API works in all cases.
       Both are supported; we use shap_values() for safety and extract
       base_values via explainer.expected_value.

FIX 4  Feature names are now derived directly from the sklearn preprocessor
       via get_feature_names_out(), with a generic fallback.  No dependency
       on PipelineComponents.

FIX 5  Class index resolution uses the sklearn estimator's classes_ array
       directly from bundle["estimator"].

FIX 6  All forward-reference type annotations that pointed at the missing
       artifact_registry module have been removed.

FIX 7  _resolve_model_path / target routing retained but wired to the
       loader bundle; currently only "attrition" is supported.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import scipy.sparse
import shap

from app.ml.artifacts.loader import load_attrition_model, ModelLoadError
from app.schemas.employee import EmployeeDataRequest, ExplainPayload

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Sparse-to-dense helper
# ---------------------------------------------------------------------------

def _to_dense(arr: Any) -> np.ndarray:
    """
    Convert any sparse matrix to a dense ndarray.

    Prefers tocsr().toarray() so that SHAP receives the CSR layout it
    expects internally, avoiding an extra copy when already CSR.
    """
    if scipy.sparse.issparse(arr):
        return arr.tocsr().toarray()
    return np.asarray(arr)


# ---------------------------------------------------------------------------
# Feature name extraction
# ---------------------------------------------------------------------------

def _extract_feature_names(preprocessor: Any, n_features: int) -> List[str]:
    """
    Derive post-transform feature names from the sklearn preprocessor.

    Calls get_feature_names_out() if available (sklearn ≥ 1.0).
    Falls back to generic "Feature_N" names if the call fails or the
    length does not match the actual transform output width.
    """
    if hasattr(preprocessor, "get_feature_names_out"):
        try:
            names = list(preprocessor.get_feature_names_out())
            if len(names) == n_features:
                return names
            logger.warning(
                "get_feature_names_out() returned %d names but transform "
                "produced %d features — using generic names.",
                len(names),
                n_features,
            )
        except Exception as e:
            logger.warning(
                "get_feature_names_out() raised %s — using generic names.", e
            )
    return [f"Feature_{i}" for i in range(n_features)]


# ---------------------------------------------------------------------------
# Class index resolution
# ---------------------------------------------------------------------------

def _resolve_class_index(estimator: Any, transformed_row: np.ndarray) -> int:
    """
    Map the estimator's predicted class label to the correct SHAP column
    index using estimator.classes_.

    Returns 0 for regressors (no classes_ attribute) or binary classifiers
    where SHAP returns a single output column.
    """
    if not hasattr(estimator, "classes_"):
        return 0  # regressor — single output

    raw_prediction = estimator.predict(transformed_row)[0]
    try:
        return list(estimator.classes_).index(raw_prediction)
    except ValueError:
        logger.warning(
            "Predicted class %r not found in estimator.classes_ %r — "
            "defaulting to index 0.",
            raw_prediction,
            estimator.classes_,
        )
        return 0


# ---------------------------------------------------------------------------
# base_value extraction
# ---------------------------------------------------------------------------

def _extract_base_value(
    expected_value: Any,
    class_idx: int,
    is_multiclass: bool,
) -> float:
    """
    Safely extract a scalar base value from explainer.expected_value.

    expected_value shapes from shap.TreeExplainer:
      Regression / binary classifier:  scalar float
      Binary classifier (some builds):  list[float] length 2
      Multiclass:                        list[float] or ndarray length n_classes
    """
    if np.isscalar(expected_value):
        return float(expected_value)

    ev = np.asarray(expected_value)
    if ev.ndim == 0:
        return float(ev)
    if ev.ndim == 1:
        if is_multiclass and len(ev) > 1:
            return float(ev[class_idx])
        return float(ev[0])
    if ev.ndim == 2:
        return float(ev[0, class_idx])

    logger.warning(
        "Unexpected expected_value shape %s; using ev.flat[0].", ev.shape
    )
    return float(ev.flat[0])


# ---------------------------------------------------------------------------
# SHAP vector extraction
# ---------------------------------------------------------------------------

def _extract_shap_vector(
    shap_values: Any,
    class_idx: int,
    is_multiclass: bool,
) -> np.ndarray:
    """
    Extract the 1-D per-feature SHAP contribution vector for a single sample.

    shap.TreeExplainer.shap_values() return shapes:
      Binary / regression:  ndarray (1, n_features)
      Multiclass:           list of ndarrays, one per class,
                            each (1, n_features)

    We always return shape (n_features,).
    """
    if isinstance(shap_values, list):
        # Multiclass path — shap_values[class_idx] is (n_samples, n_features)
        idx = class_idx if class_idx < len(shap_values) else 0
        return np.asarray(shap_values[idx][0])

    # Binary / regression path — shap_values is (n_samples, n_features)
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        # Some SHAP builds: (n_samples, n_features, n_classes)
        return arr[0, :, class_idx]
    if arr.ndim == 2:
        return arr[0]
    if arr.ndim == 1:
        return arr

    raise ValueError(
        f"Unexpected shap_values shape {arr.shape}. "
        "Expected 2-D (n_samples, n_features) or list of such arrays."
    )


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ExplainabilityService:
    """
    Stateless per-request SHAP explanation service.

    Retrieves the pre-warmed ML bundle from load_attrition_model() and
    computes per-feature SHAP contributions for a single employee record.
    Safe for concurrent async calls — no instance state is mutated.
    """

    @classmethod
    def explain_prediction(
        cls,
        employee: EmployeeDataRequest,
        target: str = "attrition",
    ) -> ExplainPayload:
        """
        Generate per-feature SHAP contributions for one employee prediction.

        Parameters
        ----------
        employee : EmployeeDataRequest
            Pydantic model of raw employee features.
        target : str
            Logical model name.  Currently only "attrition" is supported;
            additional targets can be added via loader.py.

        Returns
        -------
        ExplainPayload
            Validated payload ready for the frontend SHAP waterfall chart.

        Raises
        ------
        ModelLoadError
            If the ML bundle failed to load at startup.
        RuntimeError
            If the explainer is None (SHAP was disabled due to a load error).
        """
        logger.info(
            "SHAP explanation requested | employee=%s target=%s",
            employee.employee_id,
            target,
        )

        # ── 1. Retrieve the cached bundle ────────────────────────────────
        bundle: Dict[str, Any] = load_attrition_model()

        explainer = bundle.get("explainer")
        if explainer is None:
            raise RuntimeError(
                "SHAP TreeExplainer is not available — it failed to "
                "initialise at startup.  Check the startup logs for the "
                "root cause and restart the server."
            )

        preprocessor = bundle["preprocessor"]   # pipeline[:-1]
        estimator    = bundle["estimator"]       # pipeline[-1]  XGBClassifier

        is_multiclass = (
            hasattr(estimator, "classes_") and len(estimator.classes_) > 2
        )

        # ── 2. Build raw input DataFrame ────────────────────────────────
        raw_df = pd.DataFrame([employee.model_dump(exclude={"employee_id"})])

        # ── 3. Preprocess ────────────────────────────────────────────────
        transformed = preprocessor.transform(raw_df)
        transformed = _to_dense(transformed)        # guaranteed ndarray

        # ── 4. Feature names ─────────────────────────────────────────────
        n_features   = transformed.shape[1]
        feature_names = _extract_feature_names(preprocessor, n_features)

        # ── 5. Class index ───────────────────────────────────────────────
        class_idx = _resolve_class_index(estimator, transformed)

        # ── 6. SHAP values (ndarray API — works with raw Booster wrapper) ─
        shap_values = explainer.shap_values(transformed)

        # ── 7. Base value ────────────────────────────────────────────────
        base_value = _extract_base_value(
            explainer.expected_value,
            class_idx,
            is_multiclass,
        )

        # ── 8. Per-feature contribution vector ───────────────────────────
        shap_vector = _extract_shap_vector(shap_values, class_idx, is_multiclass)

        # ── 9. Length guard ──────────────────────────────────────────────
        n_shap = len(shap_vector)
        if n_shap != len(feature_names):
            logger.warning(
                "Feature name count (%d) != SHAP value count (%d) for "
                "target '%s'.  Truncating to shorter length; investigate "
                "OneHotEncoder schema changes.",
                len(feature_names),
                n_shap,
                target,
            )
            min_len      = min(n_shap, len(feature_names))
            feature_names = feature_names[:min_len]
            shap_vector   = shap_vector[:min_len]

        # ── 10. Build sorted contribution map ────────────────────────────
        contributions = {
            feature_names[i]: float(shap_vector[i])
            for i in range(len(feature_names))
        }
        sorted_contributions = dict(
            sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)
        )

        top_factors = list(sorted_contributions.keys())[:5]

        # ── 11. Return validated Pydantic payload ────────────────────────
        return ExplainPayload(
            employee_id=employee.employee_id,
            base_value=round(base_value, 4),
            shap_impact={k: round(v, 4) for k, v in sorted_contributions.items()},
            top_contributing_factors=top_factors,
        )
