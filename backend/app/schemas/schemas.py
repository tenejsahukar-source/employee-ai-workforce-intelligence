"""
backend/app/schemas.py

Pydantic v2 schemas for all AetherIQ endpoints.
These mirror the TypeScript interfaces in analyticsApi.ts and employeeService.ts
exactly — field names, types, and nullability must stay in sync.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS — Overview
# ─────────────────────────────────────────────────────────────────────────────

class OverviewResponse(BaseModel):
    total_employees:    int
    avg_attrition_risk: float = Field(..., ge=0.0, le=1.0)
    high_risk_count:    int
    retention_score:    int   = Field(..., ge=0, le=100)
    ai_confidence:      float = Field(..., ge=0.0, le=1.0)
    avg_risk_delta:     float   # signed % points vs previous period
    high_risk_delta:    int     # signed int vs previous period
    retention_delta:    float   # signed % points vs previous period


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS — Risk Distribution
# ─────────────────────────────────────────────────────────────────────────────

class RiskBucket(BaseModel):
    name:  Literal["Low Risk", "Medium Risk", "High Risk"]
    value: int
    fill:  str  # hex colour string, e.g. "#10b981"


class RiskDistributionResponse(BaseModel):
    buckets: List[RiskBucket]
    total:   int


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS — Departments
# ─────────────────────────────────────────────────────────────────────────────

class DepartmentRisk(BaseModel):
    name:       str
    count:      int
    risk:       int   = Field(..., ge=0, le=100)  # 0–100 integer
    avg_tenure: float


class DepartmentsResponse(BaseModel):
    departments: List[DepartmentRisk]


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS — High-Risk Employees
# ─────────────────────────────────────────────────────────────────────────────

class HighRiskEmployee(BaseModel):
    id:    str
    name:  str
    dept:  str
    role:  str
    risk:  float = Field(..., ge=0.0, le=1.0)
    email: str
    image: Optional[str] = None


class HighRiskEmployeesResponse(BaseModel):
    employees: List[HighRiskEmployee]
    total:     int


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS — Trends
# ─────────────────────────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    month:     str
    rate:      Optional[float] = None   # null for future months
    predicted: float


class TrendsResponse(BaseModel):
    points:       List[TrendPoint]
    period_label: str


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE — List / Detail
# ─────────────────────────────────────────────────────────────────────────────

class EmployeeListItem(BaseModel):
    id:                  str
    name:                str
    role:                str
    dept:                str
    tenure:              str
    risk:                float          = Field(..., ge=0.0, le=1.0)
    email:               str
    manager:             str
    manager_role:        str            = Field(default="", alias="managerRole")
    skills:              List[str]      = []
    certifications:      List[str]      = []
    work_location:       Optional[str]  = Field(default=None, alias="workLocation")
    employment_type:     Optional[str]  = Field(default=None, alias="employmentType")
    status:              Optional[Literal["Active", "On Leave", "High Risk"]] = "Active"
    performance_score:   Optional[float] = Field(default=None, alias="performanceScore")
    satisfaction_level:  Optional[float] = Field(default=None, alias="satisfactionLevel")
    salary_band:         Optional[str]   = Field(default=None, alias="salaryBand")
    age:                 Optional[int]  = None
    gender:              Optional[str]  = None
    education:           Optional[str]  = None
    marital_status:      Optional[str]  = Field(default=None, alias="maritalStatus")
    years_in_role:       Optional[str]  = Field(default=None, alias="yearsInRole")
    overtime_status:     Optional[str]  = Field(default=None, alias="overtimeStatus")
    image:               Optional[str]  = None

    model_config = ConfigDict(populate_by_name=True)


class EmployeeListResponse(BaseModel):
    employees: List[EmployeeListItem]
    total:     int
    page:      int
    page_size: int


# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE — Bulk Upload
# ─────────────────────────────────────────────────────────────────────────────

class UploadValidationError(BaseModel):
    row:     int
    field:   str
    message: str


class BulkUploadResponse(BaseModel):
    inserted: int
    updated:  int
    skipped:  int
    errors:   List[UploadValidationError]
    job_id:   str


class UploadProgressResponse(BaseModel):
    job_id:     str
    status:     Literal["pending", "processing", "done", "failed"]
    progress:   int   = Field(..., ge=0, le=100)
    inserted:   int
    total_rows: int
    errors:     List[UploadValidationError]


# ─────────────────────────────────────────────────────────────────────────────
# ML INPUT SCHEMAS (Request Payloads)
# ─────────────────────────────────────────────────────────────────────────────

class EmployeeDataRequest(BaseModel):
    """
    Raw employee data payload from the frontend.
    Engineered features (like stress_index) are INTENTIONALLY excluded here,
    as the ML Pipeline will calculate them automatically.
    """

    # FIX 1: Accept both int (1045) and str ("EMP-9482") — coerce int → str automatically
    employee_id: Union[int, str] = Field(
        ...,
        description="Employee ID — numeric (1045) or alphanumeric ('EMP-9482')"
    )

    @field_validator("employee_id", mode="before")
    @classmethod
    def coerce_employee_id_to_str(cls, v: Any) -> str:
        """Normalize any int/str employee_id to a plain string."""
        return str(v)

    # Demographics & Compensation
    age: int = Field(..., ge=18, le=100, description="Employee age in years")

    # FIX 2: Use Union[int, float] so bare ints (800) pass float validation
    daily_rate: Union[int, float] = Field(..., ge=0, description="Daily rate of pay")

    monthly_income: Union[int, float] = Field(..., ge=0, description="Monthly salary")

    percent_salary_hike: Union[int, float] = Field(
        ..., ge=0.0, le=100.0, description="Percentage of last salary hike"
    )

    # Workplace Metrics
    distance_from_home: Union[int, float] = Field(
        ..., ge=0.0, description="Commute distance in miles/km"
    )

    years_at_company: int = Field(
        ..., ge=0, le=60, description="Total years spent at the company"
    )

    over_time: Literal["Yes", "No"] = Field(
        ..., description="Does the employee work overtime?"
    )

    # FIX 3: Added missing `department` field that the frontend sends
    department: Optional[str] = Field(
        default=None,
        description="Employee department (e.g. 'engineering', 'sales')"
    )

    # Ordinal Ratings (1–4 / 1–5 Scale)
    job_level: int = Field(
        ..., ge=1, le=5, description="Hierarchical level in the company"
    )

    environment_satisfaction: int = Field(
        ..., ge=1, le=4, description="1=Low, 4=Very High"
    )

    job_involvement: int = Field(
        ..., ge=1, le=4, description="1=Low, 4=Very High"
    )

    job_satisfaction: int = Field(
        ..., ge=1, le=4, description="1=Low, 4=Very High"
    )

    performance_rating: int = Field(
        ..., ge=1, le=4, description="1=Low, 4=Outstanding"
    )

    relationship_satisfaction: int = Field(
        ..., ge=1, le=4, description="1=Low, 4=Very High"
    )

    work_life_balance: int = Field(
        ..., ge=1, le=4, description="1=Bad, 4=Best"
    )

    model_config = ConfigDict(
        # FIX 4: extra="ignore" silently drops any other unexpected frontend fields
        # instead of raising a 422. Swap to "forbid" if you want strict validation.
        extra="ignore",
        json_schema_extra={
            "example": {
                "employee_id": 1045,
                "age": 23,
                "daily_rate": 800,
                "monthly_income": 6500,
                "percent_salary_hike": 11,
                "distance_from_home": 12,
                "years_at_company": 5,
                "over_time": "No",
                "department": "engineering",
                "job_level": 2,
                "environment_satisfaction": 3,
                "job_involvement": 3,
                "job_satisfaction": 3,
                "performance_rating": 3,
                "relationship_satisfaction": 3,
                "work_life_balance": 3,
            }
        }
    )


# ─────────────────────────────────────────────────────────────────────────────
# ML OUTPUT SCHEMAS (Response Payloads)
# ─────────────────────────────────────────────────────────────────────────────

class APIResponseEnvelope(BaseModel):
    """
    Standard Enterprise API Envelope.
    Guarantees every endpoint returns the exact same top-level structure.
    """

    status:    Literal["success", "error"]
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    message:   Optional[str] = None
    data:      Optional[Any] = None


class PredictionPayload(BaseModel):
    """Response payload for pure predictive outputs."""

    employee_id:           str
    attrition_risk_score:  Optional[float] = None
    predicted_performance: Optional[int]   = None
    burnout_score:         Optional[float] = None
    segment_persona:       Optional[str]   = None
    is_anomaly:            Optional[bool]  = None


class RecommendationPayload(BaseModel):
    """Response payload for the HR Prescriptive Recommendation Engine."""

    employee_id:                str
    risk_level:                 Literal["Low", "Medium", "High", "Critical"]
    actionable_recommendations: List[str]
    estimated_retention_impact: str


class ExplainPayload(BaseModel):
    """Response payload for Explainable AI (SHAP)."""

    employee_id:              str
    base_value:               float
    shap_impact:              Dict[str, float]   # feature name → SHAP value
    top_contributing_factors: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# ML API REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class PredictionRequest(EmployeeDataRequest):
    """Inherits all employee input fields."""
    pass


class PredictionResponse(BaseModel):
    """Standardized ML inference response schema."""

    prediction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prediction:    int
    confidence:    float
    model_name:    str
    shap_values:   Optional[Dict[str, float]] = None
    timestamp:     str = Field(default_factory=lambda: datetime.utcnow().isoformat())
