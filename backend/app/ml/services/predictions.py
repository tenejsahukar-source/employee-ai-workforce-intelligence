import os
import logging
import pandas as pd
from typing import Dict, Any

from app.config.ml_config import ml_config
from api.core.model_registry import artifact_registry
from api.schemas.employee import EmployeeDataRequest, PredictionPayload

logger = logging.getLogger(__name__)

class InferenceService:
    """
    Core service mapping API requests to the thread-safe ML Artifact Registry.
    Abstracts pandas conversions and probability extraction away from the API routers.
    """

    @staticmethod
    def _prepare_dataframe(employee: EmployeeDataRequest) -> pd.DataFrame:
        """
        Converts the Pydantic model into a Pandas DataFrame.
        Safely excludes the employee_id, as ML models cannot ingest strings/IDs.
        """
        # model_dump() replaces the deprecated dict() in Pydantic V2
        data_dict = employee.model_dump(exclude={"employee_id"})
        return pd.DataFrame([data_dict])

    @classmethod
    def predict_attrition(cls, employee: EmployeeDataRequest) -> PredictionPayload:
        """Processes Employee Data through the Attrition Pipeline."""
        logger.info(f"Processing Attrition Inference for {employee.employee_id}")
        
        # Pull path from centralized config, enforcing Single Source of Truth
        model_path = ml_config.MODEL_ARTIFACT_PATH
        
        # Load thread-safely from RAM (or disk if cold start)
        pipeline = artifact_registry.load_joblib("attrition", model_path)
        
        df = cls._prepare_dataframe(employee)
        
        # Extract probability of class 1 (Yes/Leave)
        risk_score = float(pipeline.predict_proba(df)[0][1])
        
        return PredictionPayload(
            employee_id=employee.employee_id,
            attrition_risk_score=round(risk_score, 4)
        )

    @classmethod
    def predict_performance(cls, employee: EmployeeDataRequest) -> PredictionPayload:
        """Processes Employee Data through the Performance Pipeline."""
        logger.info(f"Processing Performance Inference for {employee.employee_id}")
        
        model_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), "model_performance.joblib")
        pipeline = artifact_registry.load_joblib("performance", model_path)
        
        df = cls._prepare_dataframe(employee)
        
        # Performance is multiclass classification (returns 1, 2, 3, or 4)
        prediction = int(pipeline.predict(df)[0])
        
        return PredictionPayload(
            employee_id=employee.employee_id,
            predicted_performance=prediction
        )

    @classmethod
    def predict_burnout(cls, employee: EmployeeDataRequest) -> PredictionPayload:
        """Processes Employee Data through the Burnout Regression Pipeline."""
        logger.info(f"Processing Burnout Inference for {employee.employee_id}")
        
        model_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), "model_burnout.joblib")
        pipeline = artifact_registry.load_joblib("burnout", model_path)
        
        df = cls._prepare_dataframe(employee)
        
        # Burnout is regression (returns a float score, e.g., 6.4)
        score = float(pipeline.predict(df)[0])
        
        return PredictionPayload(
            employee_id=employee.employee_id,
            burnout_score=round(score, 2)
        )


# ==========================================
# Mock Database Fetcher (For testing GET routes)
# ==========================================

def fetch_mock_employee_data(employee_id: str) -> EmployeeDataRequest:
    """
    Simulates a PostgreSQL database fetch.
    Notice how it STRICTLY returns raw data. The ML pipeline handles all math.
    """
    return EmployeeDataRequest(
        employee_id=employee_id,
        age=30,
        daily_rate=800,
        distance_from_home=10.5,
        environment_satisfaction=3,
        job_involvement=3,
        job_level=2,
        job_satisfaction=4,
        monthly_income=5000,
        over_time="Yes",         # Changed from 1 to "Yes" to match our Pydantic Literal type
        percent_salary_hike=15.0,
        performance_rating=3,
        relationship_satisfaction=3,
        work_life_balance=3,
        years_at_company=5
        # productivity, stress, and engagement are GONE.
    )