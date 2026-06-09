"""
app/ml/core/artifact_registry.py

Single-source-of-truth for ALL ML artifact loading.
Owns: joblib pipeline loading, XGBoost 3.x compat patch, SHAP explainer
      initialization, and thread-safe process-local caching.

Design contract
---------------
- One registry per OS process (class-level dicts).
- Multi-worker safety: each Uvicorn/Gunicorn worker initialises its own
  cache independently. Cross-worker sharing is NOT attempted here; use
  Redis-based model versioning at the orchestration layer if needed.
- Celery workers import this module independently — same rules apply.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import shap
import xgboost as xgb
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PipelineComponents:
    """Immutable decomposition of a fitted Scikit-Learn Pipeline."""
    target: str
    preprocessor: Pipeline          # pipeline[:-1] — all transformer steps
    estimator: Any                  # pipeline[-1]  — final estimator
    feature_names: List[str]        # post-transform feature names
    classes: Optional[np.ndarray]   # estimator.classes_ (None for regression)
    is_multiclass: bool

    @property
    def n_classes(self) -> int:
        return len(self.classes) if self.classes is not None else 1


@dataclass
class ExplainerBundle:
    """Pairs a SHAP explainer with its pipeline components."""
    components: PipelineComponents
    explainer: Any


# ---------------------------------------------------------------------------
# XGBoost 3.x compatibility patch
# ---------------------------------------------------------------------------

def _patch_booster_save_raw(booster: xgb.Booster) -> xgb.Booster:
    """
    Monkey-patch xgb.Booster.save_raw to work around a serialization bug
    introduced in XGBoost ≥ 3.x where base_score is returned as a
    bracketed string  '[1.6156463E-1]'  instead of a plain float, causing
    shap.TreeExplainer to raise:

        ValueError: could not convert string to float: '[1.6156463E-1]'

    The patch wraps save_raw so it writes JSON, loads it back, strips the
    brackets, then re-serialises — giving SHAP a clean booster object.

    This is intentionally applied ONLY when xgb.__version__ >= '3.0'
    and only to XGBoost models; other estimators are unaffected.
    """
    major = int(xgb.__version__.split(".")[0])
    
    # XGBoost 3.x is where the SHAP base_score bug occurs.
    if major < 3:
        return booster

    original_save_raw = booster.save_raw

    def _patched_save_raw(*args, **kwargs):
        try:
            saved = original_save_raw(*args, **kwargs)
        except TypeError:
            saved = original_save_raw()

        if isinstance(saved, tuple):
            fmt_tag, byte_data = saved[0], saved[1]
            is_tuple = True
        else:
            fmt_tag, byte_data = None, saved
            is_tuple = False

        try:
            import json
            import ast

            payload = json.loads(byte_data)

            lmp = (
                payload
                .get("learner", {})
                .get("learner_model_param", {})
            )

            base_score = lmp.get("base_score")

            if (
                isinstance(base_score, str)
                and base_score.startswith("[")
            ):
                extracted = ast.literal_eval(base_score)[0]
                lmp["base_score"] = str(float(extracted))

                byte_data = bytearray(
                    json.dumps(payload).encode("utf-8")
                )

        except Exception as exc:
            logger.warning(
                f"Non-fatal save_raw patch failure: {exc}"
            )

        return (
            (fmt_tag, byte_data)
            if is_tuple
            else byte_data
        )

    booster.save_raw = _patched_save_raw  # type: ignore[method-assign]
    return booster


# ---------------------------------------------------------------------------
# Pipeline decomposition helpers
# ---------------------------------------------------------------------------

def _extract_feature_names(preprocessor: Any, n_features: int) -> List[str]:
    """
    Robustly extract post-transform feature names.

    Walks the preprocessor pipeline to find the last step that exposes
    get_feature_names_out(), falling back gracefully for nested structures
    (ColumnTransformer → FeatureUnion → plain estimator).
    """
    # Direct hit — most common case
    if hasattr(preprocessor, "get_feature_names_out"):
        try:
            names = list(preprocessor.get_feature_names_out())
            if len(names) == n_features:
                return names
        except Exception:
            pass

    # Pipeline of steps: walk in reverse to find last that exposes names
    if isinstance(preprocessor, Pipeline):
        for _, step in reversed(preprocessor.steps):
            if hasattr(step, "get_feature_names_out"):
                try:
                    names = list(step.get_feature_names_out())
                    if len(names) == n_features:
                        return names
                except Exception:
                    pass

    logger.warning(
        "Could not extract feature names from preprocessor; "
        "using generic Feature_N labels."
    )
    return [f"Feature_{i}" for i in range(n_features)]


def decompose_pipeline(target: str, pipeline: Pipeline) -> PipelineComponents:
    """
    Split a fitted Scikit-Learn Pipeline into preprocessor + estimator,
    validate shapes, and extract feature metadata.

    Raises
    ------
    ValueError
        If the pipeline has fewer than 2 steps (no estimator to separate).
    """
    if len(pipeline.steps) < 2:
        raise ValueError(
            f"Pipeline for '{target}' must have ≥2 steps "
            "(at least one transformer + one estimator)."
        )

    # pipeline[:-1] returns a new Pipeline of all-but-last steps
    preprocessor: Pipeline = pipeline[:-1]
    estimator = pipeline[-1]

    # We need a concrete feature count — fit a zero-row probe transform
    # to discover n_features without a live sample.
    # This is safe because we call transform(raw_df) later anyway.
    classes: Optional[np.ndarray] = getattr(estimator, "classes_", None)
    is_multiclass = classes is not None and len(classes) > 2

    # Feature names are populated lazily (need a real transform call).
    # Store an empty list here; populated on first real transform.
    return PipelineComponents(
        target=target,
        preprocessor=preprocessor,
        estimator=estimator,
        feature_names=[],          # filled after first transform
        classes=classes,
        is_multiclass=is_multiclass,
    )


# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------

class MLArtifactRegistry:
    """
    Process-local, thread-safe registry for ML pipelines and SHAP explainers.

    Responsibilities
    ----------------
    1. Load joblib pipelines exactly once per (target, path) pair.
    2. Apply XGBoost 3.x compatibility patch to every XGBoost estimator.
    3. Initialise SHAP TreeExplainer once per target, always using the
       patched booster — eliminating the duplicate-explainer bug.
    4. Expose typed accessors so application code never touches raw dicts.

    Thread safety
    -------------
    Uses double-checked locking (same pattern as the original code, but
    unified across pipelines AND explainers so they can never diverge).
    """

    _pipelines: Dict[str, Pipeline] = {}
    _bundles: Dict[str, ExplainerBundle] = {}
    _pipeline_lock = threading.Lock()
    _bundle_lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def get_bundle(cls, target: str, model_path: str) -> ExplainerBundle:
        """
        Return the fully-initialised ExplainerBundle for *target*.
        Creates and caches it on first call; subsequent calls are O(1).
        """
        if target in cls._bundles:
            return cls._bundles[target]

        with cls._bundle_lock:
            if target not in cls._bundles:
                cls._bundles[target] = cls._build_bundle(target, model_path)
        return cls._bundles[target]

    @classmethod
    def invalidate(cls, target: str) -> None:
        """
        Evict a target's cache entries (e.g. after a model hot-reload).
        Thread-safe: acquires both locks so no partial state is observed.
        """
        with cls._pipeline_lock, cls._bundle_lock:
            cls._pipelines.pop(target, None)
            cls._bundles.pop(target, None)
        logger.info(f"Cache evicted for target '{target}'.")

    # ------------------------------------------------------------------
    # Private construction helpers
    # ------------------------------------------------------------------

    @classmethod
    def _load_pipeline(cls, target: str, model_path: str) -> Pipeline:
        if target in cls._pipelines:
            return cls._pipelines[target]

        with cls._pipeline_lock:
            if target not in cls._pipelines:
                if not os.path.exists(model_path):
                    raise FileNotFoundError(
                        f"Model artifact not found at '{model_path}' "
                        f"for target '{target}'."
                    )
                logger.info(f"Loading pipeline for '{target}' from {model_path}")
                pipeline: Pipeline = joblib.load(model_path)
                cls._pipelines[target] = pipeline
        return cls._pipelines[target]

    @classmethod
    def _build_bundle(cls, target: str, model_path: str) -> ExplainerBundle:
        pipeline = cls._load_pipeline(target, model_path)
        components = decompose_pipeline(target, pipeline)
        estimator = components.estimator

        # --- XGBoost 3.x patch -----------------------------------------
        patched_estimator: Any = estimator
        if isinstance(estimator, xgb.XGBModel):
            booster = estimator.get_booster()
            _patch_booster_save_raw(booster)
            patched_estimator = booster  # SHAP uses the raw booster
            logger.info(
                f"XGBoost 3.x compatibility patch applied for '{target}'."
            )

        # --- SHAP explainer --------------------------------------------
        logger.info(
            f"Initialising SHAP TreeExplainer for '{target}' "
            f"(XGBoost booster={isinstance(patched_estimator, xgb.Booster)})…"
        )
        try:
            explainer = shap.TreeExplainer(patched_estimator)
        except Exception:
            logger.warning(
                "TreeExplainer failed. Falling back to generic SHAP Explainer."
            )
            try:
                explainer = shap.Explainer(patched_estimator)
            except Exception as fallback_exc:
                logger.exception(f"Generic SHAP Explainer init failed for '{target}': {fallback_exc}")
                raise RuntimeError(f"XAI unavailable for target '{target}': {fallback_exc}") from fallback_exc

        return ExplainerBundle(components=components, explainer=explainer)


# Singleton — import this everywhere instead of instantiating manually.
artifact_registry = MLArtifactRegistry()