import uuid
from datetime import datetime
from typing import Dict, List, Optional, Literal, Any

from pydantic import BaseModel, Field, ConfigDict

# ==========================================
# INPUT SCHEMAS (Request Payloads)
# ==========================================

class EmployeeDataRequest(BaseModel):
    """
    Raw employee data payload from the frontend.
    Engineered features (like stress_index) are INTENTIONALLY excluded here,
    as the ML Pipeline will calculate them automatically.
    """

    # Identifiers
    employee_id: int = Field(
        ...,
        description="Unique alphanumeric identifier for the employee"
    )

    # Demographics & Compensation
    age: int = Field(
        ...,
        ge=18,
        le=100,
        description="Employee age in years"
    )

    daily_rate: int = Field(
        ...,
        ge=0,
        description="Daily rate of pay"
    )

    monthly_income: int = Field(
        ...,
        ge=0,
        description="Monthly salary"
    )

    percent_salary_hike: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of last salary hike"
    )

    # Workplace Metrics
    distance_from_home: float = Field(
        ...,
        ge=0.0,
        description="Commute distance in miles/km"
    )

    years_at_company: int = Field(
        ...,
        ge=0,
        le=60,
        description="Total years spent at the company"
    )

    over_time: Literal['Yes', 'No'] = Field(
        ...,
        description="Does the employee work overtime?"
    )

    # Ordinal Ratings (1 to 4 Scale)
    job_level: int = Field(
        ...,
        ge=1,
        le=5,
        description="Hierarchical level in the company"
    )

    environment_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Low, 4=Very High"
    )

    job_involvement: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Low, 4=Very High"
    )

    job_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Low, 4=Very High"
    )

    performance_rating: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Low, 4=Outstanding"
    )

    relationship_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Low, 4=Very High"
    )

    work_life_balance: int = Field(
        ...,
        ge=1,
        le=4,
        description="1=Bad, 4=Best"
    )

    # FastAPI Swagger UI Generation
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "employee_id": "EMP-9482",
                "age": 32,
                "daily_rate": 800,
                "monthly_income": 6500,
                "percent_salary_hike": 15.0,
                "distance_from_home": 12.5,
                "years_at_company": 5,
                "over_time": "Yes",
                "job_level": 2,
                "environment_satisfaction": 3,
                "job_involvement": 3,
                "job_satisfaction": 4,
                "performance_rating": 3,
                "relationship_satisfaction": 4,
                "work_life_balance": 2
            }
        }
    )


# ==========================================
# OUTPUT SCHEMAS (Response Payloads)
# ==========================================

class APIResponseEnvelope(BaseModel):
    """
    Standard Enterprise API Envelope.
    Guarantees every endpoint returns the exact same top-level structure.
    """

    status: Literal["success", "error"]

    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )

    message: Optional[str] = None
    data: Optional[Any] = None


# ---- Domain Specific Data Payloads ----

class PredictionPayload(BaseModel):
    """Response payload for pure predictive outputs."""

    employee_id: str
    attrition_risk_score: Optional[float] = None
    predicted_performance: Optional[int] = None
    burnout_score: Optional[float] = None
    segment_persona: Optional[str] = None
    is_anomaly: Optional[bool] = None


class RecommendationPayload(BaseModel):
    """Response payload for the HR Prescriptive Recommendation Engine."""

    employee_id: str
    risk_level: Literal["Low", "Medium", "High", "Critical"]
    actionable_recommendations: List[str]
    estimated_retention_impact: str


class ExplainPayload(BaseModel):
    """Response payload for Explainable AI (SHAP)."""

    employee_id: str
    base_value: float

    # Maps feature names to their SHAP impact values
    shap_impact: Dict[str, float]

    top_contributing_factors: List[str]


# ==========================================
# ML API REQUEST / RESPONSE SCHEMAS
# ==========================================

class PredictionRequest(EmployeeDataRequest):
    """
    Inherits all employee input fields.
    """
    pass


class PredictionResponse(BaseModel):
    """
    Standardized ML inference response schema.
    """

    prediction_id: str = Field(
        default_factory=lambda: str(uuid.uuid4())
    )

    prediction: int
    confidence: float
    model_name: str

    shap_values: Optional[Dict[str, float]] = None

    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )