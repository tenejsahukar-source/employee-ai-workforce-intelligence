import os
import asyncio
import logging
from fastapi import APIRouter, HTTPException, Security, Depends, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

# Import our upgraded schemas
from api.schemas.employee import (
    EmployeeDataRequest, 
    APIResponseEnvelope, 
    PredictionPayload,
    RecommendationPayload,
    ExplainPayload
)

# Import our upgraded services
from api.services.inference_service import InferenceService, fetch_mock_employee_data
from api.services.recommendation_service import RecommendationEngine
from api.services.explainability_service import ExplainabilityService

# Import infrastructure
from api.core.model_registry import artifact_registry
# Note: Ensure Celery tasks are imported from your actual worker module
from worker.tasks import retrain_model_task 

router = APIRouter(prefix="/api/v1/ml", tags=["Machine Learning Inference"])
logger = logging.getLogger(__name__)

# Simple API Key security for internal webhooks
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "super-secret-service-key")
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def verify_internal_webhook(api_key: str = Depends(api_key_header)):
    """Verifies that the request is coming from our internal Celery worker."""
    if not api_key or api_key.replace("Bearer ", "") != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Invalid internal authorization token"
        )
    return True

# ==========================================
# INFERENCE ENDPOINTS
# ==========================================

@router.post("/predict/performance", response_model=APIResponseEnvelope)
async def predict_performance(employee: EmployeeDataRequest):
    try:
        # Offload synchronous ML computation to a separate thread
        payload = await asyncio.to_thread(InferenceService.predict_performance, employee)
        return APIResponseEnvelope(status="success", data=payload)
    except Exception as e:
        logger.error(f"Performance prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during prediction.")

@router.post("/predict/attrition", response_model=APIResponseEnvelope)
async def predict_attrition(employee: EmployeeDataRequest):
    try:
        payload = await asyncio.to_thread(InferenceService.predict_attrition, employee)
        return APIResponseEnvelope(status="success", data=payload)
    except Exception as e:
        logger.error(f"Attrition prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/burnout", response_model=APIResponseEnvelope)
async def predict_burnout(employee: EmployeeDataRequest):
    try:
        payload = await asyncio.to_thread(InferenceService.predict_burnout, employee)
        return APIResponseEnvelope(status="success", data=payload)
    except Exception as e:
        logger.error(f"Burnout prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ANALYTICS & XAI ENDPOINTS
# ==========================================

@router.post("/recommendations", response_model=APIResponseEnvelope)
async def get_recommendations(employee: EmployeeDataRequest):
    """
    Stateless POST endpoint for recommendations. 
    (Pass the employee data directly to get prescriptive actions).
    """
    try:
        payload = await asyncio.to_thread(RecommendationEngine.generate_prescriptive_actions, employee)
        return APIResponseEnvelope(status="success", data=payload)
    except Exception as e:
        logger.error(f"Recommendation generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate recommendations.")

@router.get("/explain/{employee_id}/{target}", response_model=APIResponseEnvelope)
async def explain_employee_prediction(employee_id: str, target: str):
    """
    Retrieves mock data from the DB and generates SHAP values for the specified target.
    Targets: 'attrition', 'performance', 'burnout'
    """
    valid_targets = ["attrition", "performance", "burnout"]
    if target not in valid_targets:
        raise HTTPException(status_code=400, detail=f"Target must be one of {valid_targets}")

    try:
        # Simulate DB Fetch
        employee_data = await asyncio.to_thread(fetch_mock_employee_data, employee_id)
        
        # Generate Explanation
        payload = await asyncio.to_thread(ExplainabilityService.explain_prediction, employee_data, target)
        return APIResponseEnvelope(status="success", data=payload)
    except Exception as e:
        logger.error(f"SHAP explanation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# INTERNAL MLOPS ENDPOINTS
# ==========================================

class RetrainRequest(BaseModel):
    data_path: str

@router.post("/tasks/retrain/{target}", response_model=APIResponseEnvelope)
async def trigger_retraining(target: str, request: RetrainRequest):
    """Triggers Celery background task for model retraining."""
    valid_targets = ["performance", "attrition", "burnout", "segmentation"]
    if target not in valid_targets:
        raise HTTPException(status_code=400, detail=f"Invalid target. Must be one of {valid_targets}")
    
    # Asynchronous task dispatch
    task = retrain_model_task.delay(target, request.data_path)
    
    return APIResponseEnvelope(
        status="success", 
        message="Retraining task initiated", 
        data={"task_id": task.id, "target": target}
    )

class ReloadRequest(BaseModel):
    artifact_id: str

@router.post("/internal/reload-artifact", dependencies=[Depends(verify_internal_webhook)])
async def reload_ml_artifact(request: ReloadRequest):
    """
    Secure Webhook endpoint. 
    Called by the Celery Worker to force FastAPI to drop the old model from RAM 
    and load the newly trained version without dropping user requests.
    """
    logger.info(f"Received hot-reload webhook for artifact: {request.artifact_id}")
    try:
        # Clear the specific model from RAM
        artifact_registry.clear_cache(request.artifact_id)
        return APIResponseEnvelope(
            status="success", 
            message=f"Cache cleared for {request.artifact_id}. It will be lazy-loaded on the next request."
        )
    except Exception as e:
        logger.error(f"Failed to process reload webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reload artifact cache.")