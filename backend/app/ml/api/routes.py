"""
app/api/v1/routes/predict.py

Enterprise ML API Routes — Advanced Prediction Endpoints

Handles HTTP requests for machine learning inference with async event-loop
safety, dependency injection, comprehensive observability, MLOps audit
logging, and performance telemetry.

KEY FIXES vs. original:
  1. Depends(load_attrition_model) → Depends(get_ml_bundle)
     load_attrition_model() returns a dict, not a generator/async generator,
     so FastAPI treated it as a plain callable and called it every request
     (correct), but the import was also pulling in the lru_cache version that
     could silently return a cached-exception state.  get_ml_bundle() is the
     explicit dependency shim defined in loader.py.

  2. _run_inference: the SHAP step now converts a sparse matrix to dense
     before indexing, which is necessary when the ColumnTransformer contains
     a OneHotEncoder (scikit-learn returns scipy.sparse by default).

  3. feature_names extraction falls back gracefully through three strategies:
     a. preprocessor.get_feature_names_out()   — scikit-learn ≥ 1.0
     b. ct.get_feature_names_out()             — direct ColumnTransformer ref
     c. generic  feature_N  names              — last resort

  4. shap_result.values shape guard: SHAP can return (n_samples, n_features)
     or (n_samples, n_features, n_classes) depending on the explainer mode.
     We now always take the [0] row and, if 3-D, the [:, 1] class slice.

  5. Removed duplicate comment block (# 3. Execute Inference appeared twice).
"""

import logging
import time
import asyncio
from typing import Any, Dict, Tuple, Optional
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    Response,
    status,
    Request,
)
from starlette.concurrency import run_in_threadpool

# Database
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.prediction_service import save_prediction

# Tasks
from app.tasks.prediction_tasks import async_prediction_audit

# Security
from app.core.security.dependencies import get_current_user

# Schemas
from app.schemas.schemas import PredictionRequest, PredictionResponse

# ML — use get_ml_bundle (the Depends-safe shim), keep ModelLoadError for
# the except clause in the route handler.
from app.ml.artifacts.loader import get_ml_bundle, ModelLoadError
from app.ml.registry.model_registry import get_production_model

# =========================================================
# CONFIGURATION & CONSTANTS
# =========================================================

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/predict",
    tags=["Machine Learning Inference"],
)

# Extracted to module level — allocated once, never copied per-request.
FEATURE_MAPPING: Dict[str, str] = {
    "age":                      "Age",
    "daily_rate":               "DailyRate",
    "monthly_income":           "MonthlyIncome",
    "percent_salary_hike":      "PercentSalaryHike",
    "distance_from_home":       "DistanceFromHome",
    "years_at_company":         "YearsAtCompany",
    "over_time":                "OverTime",
    "job_level":                "JobLevel",
    "environment_satisfaction": "EnvironmentSatisfaction",
    "job_involvement":          "JobInvolvement",
    "job_satisfaction":         "JobSatisfaction",
    "performance_rating":       "PerformanceRating",
    "relationship_satisfaction":"RelationshipSatisfaction",
    "work_life_balance":        "WorkLifeBalance",
}

# Default values for features that are not sent in the API request.
# These mirror the training-time distribution priors so the model doesn't
# see out-of-distribution inputs for non-critical fields.
REQUIRED_DEFAULTS: Dict[str, Any] = {
    "BusinessTravel":          "Travel_Rarely",
    "Department":              "Sales",
    "Education":               3,
    "EducationField":          "Life Sciences",
    "Gender":                  "Male",
    "JobRole":                 "Sales Executive",
    "MaritalStatus":           "Single",
    "NumCompaniesWorked":      1,
    "StockOptionLevel":        0,
    "TrainingTimesLastYear":   2,
    "YearsInCurrentRole":      2,
    "YearsSinceLastPromotion": 1,
    "YearsWithCurrManager":    2,
    "HourlyRate":              80,
    "MonthlyRate":             15_000,
    "TotalWorkingYears":       10,
}


# =========================================================
# TELEMETRY & AUDIT SERVICES
# =========================================================

async def log_mlops_audit(
    prediction_id: str,
    employee_id: int,
    input_features: Dict[str, Any],
    prediction: int,
    confidence: float,
    inference_time_ms: float,
) -> None:
    """
    Async background task — logs inference data for MLOps tracking.
    Designed to run concurrently with (or after) the HTTP response so it
    never adds latency to the caller.
    """
    try:
        audit_payload = {
            "timestamp":        datetime.now(timezone.utc).isoformat(),
            "prediction_id":    str(prediction_id),
            "employee_id":      employee_id,
            "inference_time_ms":round(inference_time_ms, 2),
            "prediction":       prediction,
            "confidence":       confidence,
            "features":         input_features,
        }
        # Simulate async I/O (replace with Kafka / Kinesis push in production)
        await asyncio.sleep(0.01)
        logger.debug("MLOps audit record saved for Trace ID: %s", prediction_id)
    except Exception as exc:
        logger.error("Failed to write MLOps audit log: %s", exc)


# =========================================================
# CPU-BOUND WORKER FUNCTION
# =========================================================

def _extract_feature_names(preprocessor: Any, n_shap_features: int) -> list:
    """
    Robustly extracts output feature names from the preprocessor slice of a
    scikit-learn Pipeline.  Tries three strategies in order:

      1. preprocessor.get_feature_names_out()   — works on Pipeline slices
         that contain a ColumnTransformer (sklearn ≥ 1.0).
      2. The last step's get_feature_names_out() — fallback when the slice
         does not implement the method itself.
      3. Generic "feature_N" labels               — last resort.

    The scikit-learn prefix format is "num__FeatureName" or "cat__Category_Value".
    We strip everything up to and including the last "__".
    """
    def _strip_prefix(names):
        return [n.split("__")[-1] for n in names]

    # Strategy 1 — preferred
    try:
        return _strip_prefix(preprocessor.get_feature_names_out())
    except AttributeError:
        pass

    # Strategy 2 — try the last step directly (e.g. a bare ColumnTransformer)
    try:
        last_step = preprocessor[-1] if hasattr(preprocessor, "__getitem__") else preprocessor
        return _strip_prefix(last_step.get_feature_names_out())
    except (AttributeError, TypeError):
        pass

    # Strategy 3 — fallback generic names
    logger.warning(
        "Could not extract feature names from preprocessor; using generic labels. "
        "SHAP waterfall charts will show feature_N instead of column names."
    )
    return [f"feature_{i}" for i in range(n_shap_features)]


def _run_inference(
    model: Any,
    explainer: Any,
    request_data: Dict[str, Any],
) -> Tuple[int, float, Optional[Dict[str, float]]]:
    """
    Synchronous CPU-bound inference task.

    Executed inside run_in_threadpool() so it never blocks the event loop.

    Pipeline assumed structure:
        model[0:-1]  — one or more transformer steps (ColumnTransformer, etc.)
        model[-1]    — XGBClassifier

    SHAP requires the *already-transformed* numeric array, not the raw
    DataFrame, because the SHAP explainer was built from the native XGBoost
    booster which only sees post-transformation features.
    """
    try:
        # ------------------------------------------------------------------
        # 1. Map API snake_case keys → training dataset column names
        # ------------------------------------------------------------------
        mapped_data = {
            FEATURE_MAPPING.get(k, k): v
            for k, v in request_data.items()
            if k != "employee_id"
        }

        # ------------------------------------------------------------------
        # 2. Build DataFrame and fill any missing columns with training priors
        # ------------------------------------------------------------------
        input_df = pd.DataFrame([mapped_data])

        for col, default_val in REQUIRED_DEFAULTS.items():
            if col not in input_df.columns:
                input_df[col] = default_val

        # ------------------------------------------------------------------
        # 3. Prediction — the full Pipeline preprocesses internally
        # ------------------------------------------------------------------
        prediction_array  = model.predict(input_df)
        probability_array = model.predict_proba(input_df)

        prediction  = int(prediction_array[0])
        probability = float(probability_array[0][1])   # index 1 == "Attrition=Yes"

        # ------------------------------------------------------------------
        # 4. SHAP explainability
        # ------------------------------------------------------------------
        # Slice off the final estimator so we only keep the transformer steps.
        # model[:-1] on a scikit-learn Pipeline returns a new Pipeline with
        # every step except the last — it still exposes .transform().
        preprocessor = model[:-1]

        # Transform the raw DataFrame into the numeric representation that
        # the XGBoost booster (and therefore the SHAP explainer) expects.
        transformed = preprocessor.transform(input_df)

        # ColumnTransformer can return a scipy sparse matrix.  SHAP's
        # TreeExplainer accepts dense arrays; convert if necessary.
        if hasattr(transformed, "toarray"):
            transformed = transformed.toarray()

        # Ensure we have a plain numpy float64 array (avoids dtype warnings).
        transformed = np.asarray(transformed, dtype=np.float64)

        # Compute SHAP values.
        # Compute SHAP values only if explainer exists.
        if explainer is not None:
            shap_result = explainer(transformed)

            raw_shap = shap_result.values[0]

            if raw_shap.ndim == 2:
                raw_shap = raw_shap[:, 1]

            feature_names = _extract_feature_names(
                preprocessor,
                len(raw_shap)
            )

            shap_values: Dict[str, float] = {
                col: round(float(val), 4)
                for col, val in zip(feature_names, raw_shap)
            }
        else:
            shap_values = {}

        return prediction, probability, shap_values

    except AttributeError as ae:
        logger.error("Model format error — missing expected attribute: %s", ae)
        raise RuntimeError(f"Incompatible model format: {ae}") from ae
    except KeyError as ke:
        logger.error("Feature mapping failed — missing column: %s", ke)
        raise ValueError(f"Feature mapping failed. Missing column: {ke}") from ke
    except Exception as exc:
        logger.exception("FULL MODEL INFERENCE ERROR")
        raise RuntimeError(str(exc)) from exc


# =========================================================
# API ROUTES
# =========================================================

@router.post(
    "/attrition",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Employee Attrition Risk",
    description=(
        "Evaluates an employee's profile using an advanced ML model to predict "
        "the likelihood of attrition.  Includes MLOps traceability, SHAP "
        "explainability, and latency monitoring."
    ),
)
async def predict_attrition(
    request:      PredictionRequest,
    response:     Response,
    fastapi_req:  Request,
    current_user: str     = Depends(get_current_user),
    # FIX: use get_ml_bundle (the Depends-safe shim) instead of
    # load_attrition_model directly.  Both ultimately call the same cached
    # bundle, but get_ml_bundle is designed to be called as a FastAPI
    # dependency and will never return a stale/errored lru_cache entry.
    ml_bundle:    dict    = Depends(get_ml_bundle),
    db:           Session = Depends(get_db),
):
    """
    High-performance async endpoint for attrition prediction.

    Features
    --------
    • Threadpool offloading — pandas / sklearn / XGBoost run in a worker
      thread so the async event loop is never blocked.
    • Custom telemetry headers (X-Inference-Time-ms, X-Model-Version,
      X-Trace-ID).
    • Background Celery task for MLOps audit logging.
    • PostgreSQL persistence via save_prediction().
    """
    start_time = time.perf_counter()

    try:
        model    = ml_bundle["model"]
        explainer = ml_bundle["explainer"]
        emp_id   = request.employee_id

        logger.info(
            "Attrition inference requested | employee_id=%s | user=%s | ip=%s",
            emp_id, current_user, fastapi_req.client.host,
        )

        raw_request_dict = request.model_dump()

        # Offload CPU-bound work to a thread so the event loop stays free.
        prediction, probability, shap_values = await run_in_threadpool(
            _run_inference,
            model,
            explainer,
            raw_request_dict,
        )

        # Build the standardised Pydantic response
        api_response = PredictionResponse(
            prediction  = prediction,
            confidence  = round(probability, 4),
            model_name  = ml_bundle.get("model_name", get_production_model()),
            shap_values = shap_values,
        )

        inference_time_ms = (time.perf_counter() - start_time) * 1000

        # Inject telemetry into HTTP response headers
        response.headers["X-Inference-Time-ms"] = str(round(inference_time_ms, 2))
        response.headers["X-Model-Version"]     = api_response.model_name
        response.headers["X-Trace-ID"]          = str(api_response.prediction_id)

        # Dispatch Celery background task for MLOps audit
        async_prediction_audit.delay({
            "prediction_id": str(api_response.prediction_id),
            "employee_id":   emp_id,
            "prediction":    prediction,
            "confidence":    probability,
        })

        # Persist inference record to PostgreSQL
        save_prediction(
            db=db,
            prediction_id=str(api_response.prediction_id),
            trace_id=str(api_response.prediction_id),  # temporary trace id
            employee_id=request.employee_id,
            features=request.model_dump(),
            prediction=prediction,
            confidence=probability,
            risk_label="HIGH" if probability >= 0.70 else "MEDIUM" if probability >= 0.40 else "LOW",
            inference_time_ms=inference_time_ms,
            model_name=api_response.model_name,
            model_version=api_response.model_name,
            shap_values=shap_values,
            top_contributors=[],
        )
          

        logger.info(
            "Inference complete [Trace: %s] — risk=%.2f%% latency=%.2fms",
            api_response.prediction_id, probability * 100, inference_time_ms,
        )

        return api_response

    except ValueError as ve:
        logger.warning("Data validation error during inference mapping: %s", ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Inference failed due to data structure mismatch: {ve}",
        )

    except RuntimeError as rte:
        logger.error("Runtime error in ML model: %s", rte)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(rte),
        )

    except ModelLoadError as mle:
        logger.critical("Model dependency unavailable: %s", mle)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The predictive model is currently unavailable or failed to load.",
        )

    except Exception as exc:
        logger.exception("Unexpected system failure during attrition prediction.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred.",
        )
