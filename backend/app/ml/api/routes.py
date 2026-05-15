"""
Enterprise ML API Routes - Advanced Prediction Endpoints
Handles HTTP requests for machine learning inference with async event loop safety,
dependency injection, comprehensive observability, MLOps audit logging, 
and performance telemetry.
"""

import logging
import time
import asyncio
from typing import Any, Dict, Tuple, Optional
from datetime import datetime, timezone

import pandas as pd
from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    Response,
    status,
    Request
)
from starlette.concurrency import run_in_threadpool

# Database Imports
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.prediction_service import save_prediction

# Task Imports
from app.tasks.prediction_tasks import async_prediction_audit

# Security Imports
from app.core.security.dependencies import get_current_user

# Schemas (Assuming Pydantic V2 definitions from previous steps)
from app.schemas.schemas import (
    PredictionRequest,
    PredictionResponse
)

# ML Loader (Assumed dependency)
from app.ml.artifacts.loader import load_attrition_model, ModelLoadError
from app.ml.registry.model_registry import get_production_model

# =========================================================
# CONFIGURATION & CONSTANTS
# =========================================================

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/predict",
    tags=["Machine Learning Inference"]
)

# Extracted to the module level so it is not re-allocated on every request
FEATURE_MAPPING = {
    "age": "Age",
    "daily_rate": "DailyRate",
    "monthly_income": "MonthlyIncome",
    "percent_salary_hike": "PercentSalaryHike",
    "distance_from_home": "DistanceFromHome",
    "years_at_company": "YearsAtCompany",
    "over_time": "OverTime",
    "job_level": "JobLevel",
    "environment_satisfaction": "EnvironmentSatisfaction",
    "job_involvement": "JobInvolvement",
    "job_satisfaction": "JobSatisfaction",
    "performance_rating": "PerformanceRating",
    "relationship_satisfaction": "RelationshipSatisfaction",
    "work_life_balance": "WorkLifeBalance"
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
    inference_time_ms: float
) -> None:
    """
    Asynchronous background task to log inference data for MLOps tracking.
    This facilitates data drift monitoring and model performance auditing
    without blocking the API response.
    """
    try:
        # In a real enterprise system, this would push to Kafka, AWS Kinesis,
        # or a managed ML Tracking database (like MLflow/Arize).
        audit_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "prediction_id": str(prediction_id),
            "employee_id": employee_id,
            "inference_time_ms": round(inference_time_ms, 2),
            "prediction": prediction,
            "confidence": confidence,
            "features": input_features
        }
        
        # Simulate network I/O for data lake ingestion
        await asyncio.sleep(0.01) 
        logger.debug(f"MLOps Audit Record saved for Trace ID: {prediction_id}")
        
    except Exception as e:
        # We don't want audit logging failures to crash the user-facing API
        logger.error(f"Failed to write MLOps audit log: {str(e)}")


# =========================================================
# CPU-BOUND WORKER FUNCTIONS
# =========================================================

def _run_inference(
    model: Any,
    explainer: Any,
    request_data: Dict[str, Any]
) -> Tuple[int, float, Optional[Dict[str, float]]]:
    """
    Synchronous CPU-bound inference task.
    Safely executes pandas transformations and scikit-learn/XGBoost predictions
    in an isolated thread.
    """
    try:
        # 1. Map API snake_case fields -> Training dataset feature names
        # We use the module-level FEATURE_MAPPING for O(1) lookups and memory efficiency
        mapped_data = {
            FEATURE_MAPPING.get(k, k): v
            for k, v in request_data.items()
            if k != "employee_id"  # Exclude non-predictive IDs from the model input
        }

        # 2. Prepare DataFrame for inference
        input_df = pd.DataFrame([mapped_data])

        required_defaults = {
            "BusinessTravel": "Travel_Rarely",
            "Department": "Sales",
            "Education": 3,
            "EducationField": "Life Sciences",
            "Gender": "Male",
            "JobRole": "Sales Executive",
            "MaritalStatus": "Single",
            "NumCompaniesWorked": 1,
            "StockOptionLevel": 0,
            "TrainingTimesLastYear": 2,
            "YearsInCurrentRole": 2,
            "YearsSinceLastPromotion": 1,
            "YearsWithCurrManager": 2,
            "HourlyRate": 80,
            "MonthlyRate": 15000,
            "TotalWorkingYears": 10,
           # "Attrition": "No"
        }

        for col, default_value in required_defaults.items():
            if col not in input_df.columns:
                input_df[col] = default_value
        
        # 3. Execute Inference
        # Assumes model exposes scikit-learn compatible API (.predict, .predict_proba)
        prediction_array = model.predict(input_df)
        probability_array = model.predict_proba(input_df)
        
        prediction = int(prediction_array[0])
        probability = float(probability_array[0][1])  # Assuming index 1 is the positive class (Attrition)
        
        shap_result = explainer(input_df)
        raw_shap = shap_result.values[0]

        shap_values = {
            col: round(float(val), 4)
            for col, val in zip(input_df.columns, raw_shap)
        }
            
        return prediction, probability, shap_values

    except AttributeError as ae:
        logger.error(f"Model format error: Missing expected attributes (e.g., feature_names_in_): {ae}")
        raise RuntimeError(f"Incompatible model format: {ae}")
    except KeyError as ke:
        logger.error(f"Missing expected feature column during inference mapping: {ke}")
        raise ValueError(f"Feature mapping failed. Missing column: {ke}")
    except Exception as e:
        logger.exception("FULL MODEL INFERENCE ERROR")
        raise RuntimeError(str(e))


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
        "the likelihood of attrition. Includes MLOps traceability, explainability "
        "(SHAP), and latency monitoring."
    )
)
async def predict_attrition(
    request: PredictionRequest,
    response: Response,
    fastapi_req: Request,
    current_user: str = Depends(get_current_user),
    ml_bundle: dict = Depends(load_attrition_model),
    db: Session = Depends(get_db)
):
    """
    High-performance async endpoint for Attrition Prediction.
    Features:
    - Threadpool offloading for CPU tasks
    - Telemetry and custom headers
    - Background MLOps audit logging
    - Database persistence for inference tracking
    """
    start_time = time.perf_counter()
    
    try:
        model = ml_bundle["model"]
        explainer = ml_bundle["explainer"]

        emp_id = request.employee_id
        logger.info(f"Processing attrition inference for employee_id: {emp_id} | Requested by User: {current_user} | Client IP: {fastapi_req.client.host}")

        # 🚀 CRITICAL: Offload Pandas and Scikit-Learn/XGBoost to a separate thread.
        # Standard async def endpoints run on the main event loop. If pandas/predict 
        # takes 200ms, your entire server freezes for 200ms. run_in_threadpool fixes this.
        raw_request_dict = request.model_dump()
        
        prediction, probability, shap_values = await run_in_threadpool(
            _run_inference, 
            model, 
            explainer,
            raw_request_dict
        )

        # Construct the standardized response
        api_response = PredictionResponse(
            prediction=prediction,
            confidence=round(probability, 4),
            model_name=get_production_model(), 
            shap_values=shap_values
        )

        # Calculate telemetry
        inference_time_ms = (time.perf_counter() - start_time) * 1000

        # Inject custom telemetry headers into the HTTP response
        response.headers["X-Inference-Time-ms"] = str(round(inference_time_ms, 2))
        response.headers["X-Model-Version"] = api_response.model_name
        response.headers["X-Trace-ID"] = str(api_response.prediction_id)

        # Dispatch background task for MLOps auditing (Offloaded to Celery Worker)
        async_prediction_audit.delay({
            "prediction_id": str(api_response.prediction_id),
            "employee_id": emp_id,
            "prediction": prediction,
            "confidence": probability
        })

        # Save inference results to the database
        save_prediction(
            db=db,
            prediction_id=str(api_response.prediction_id),
            employee_id=emp_id,
            features=raw_request_dict,
            prediction=prediction,
            confidence=probability,
            inference_time_ms=inference_time_ms,
            model_name=api_response.model_name,
            shap_values=shap_values
        )

        logger.info(
            f"Inference complete [Trace: {api_response.prediction_id}] - "
            f"Risk Score: {probability:.2%} | Latency: {inference_time_ms:.2f}ms"
        )
        
        return api_response

    except ValueError as ve:
        logger.warning(f"Data validation error during inference payload mapping: {ve}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Inference failed due to data structure mismatch: {ve}"
        )
        
    except RuntimeError as re:
        logger.error(f"Runtime execution error in ML model: {re}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(re)
        )
        
    except ModelLoadError as mle:
        logger.critical(f"Model dependency unavailable: {mle}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The predictive model is currently unavailable or failed to load."
        )
        
    except Exception as error:
        logger.exception("Unexpected system failure during attrition prediction.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred while processing the prediction."
        )