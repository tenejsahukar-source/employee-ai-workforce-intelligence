"""
Enterprise ML Schemas - Prediction Payloads
Handles request/response validation, strict typing, OpenAPI schema generation,
MLOps traceability, and Docker-safe FastAPI compatibility.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Dict
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)


# =========================================================
# ENUMS
# =========================================================

class OvertimeStatus(str, Enum):
    """
    Allowed overtime status values.
    """

    YES = "Yes"
    NO = "No"


class Department(str, Enum):
    """
    Standardized department values.
    Keep aligned with database-level enums/constants.
    """

    SALES = "sales"
    ENGINEERING = "engineering"
    HR = "hr"
    FINANCE = "finance"
    OPERATIONS = "operations"


class PredictionOutcome(int, Enum):
    """
    Binary prediction output mapping.
    """

    RETAINED = 0
    ATTRITION = 1


# =========================================================
# REQUEST SCHEMA
# =========================================================

class PredictionRequest(BaseModel):
    """
    Strict validation schema for employee ML prediction requests.

    Features:
    - Strong type validation
    - Anti-malicious payload protection
    - Cross-field validation
    - OpenAPI documentation support
    - Pydantic v2 compatibility
    """

    employee_id: int = Field(
        ...,
        gt=0,
        description="Unique identifier for the employee."
    )

    age: int = Field(
        ...,
        ge=18,
        le=100,
        description="Employee age in years."
    )

    daily_rate: float = Field(
        ...,
        gt=0,
        description="Daily billing/pay rate."
    )

    monthly_income: float = Field(
        ...,
        gt=0,
        description="Monthly salary/income."
    )

    percent_salary_hike: float = Field(
        ...,
        ge=0.0,
        description="Percentage of the most recent salary hike."
    )

    distance_from_home: float = Field(
        ...,
        ge=0.0,
        description="Distance from home to work (e.g., in miles or km)."
    )

    years_at_company: int = Field(
        ...,
        ge=0,
        description="Years employee has worked at the company."
    )

    job_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="Job satisfaction score (1-4)."
    )

    work_life_balance: int = Field(
        ...,
        ge=1,
        le=4,
        description="Work-life balance score (1-4)."
    )

    over_time: OvertimeStatus = Field(
        ...,
        description="Whether employee works overtime."
    )

    department: Department = Field(
        ...,
        description="Employee department."
    )

    job_level: int = Field(
        ...,
        ge=1,
        le=5,
        description="Level of the job within the company hierarchy (1-5)."
    )

    environment_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="Environment satisfaction score (1-4)."
    )

    job_involvement: int = Field(
        ...,
        ge=1,
        le=4,
        description="Job involvement score (1-4)."
    )

    performance_rating: int = Field(
        ...,
        ge=1,
        le=4,
        description="Performance rating score (1-4)."
    )

    relationship_satisfaction: int = Field(
        ...,
        ge=1,
        le=4,
        description="Relationship satisfaction score (1-4)."
    )

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "employee_id": 1045,
                "age": 32,
                "daily_rate": 800.0,
                "monthly_income": 6500.5,
                "percent_salary_hike": 15.0,
                "distance_from_home": 10.5,
                "years_at_company": 5,
                "job_satisfaction": 3,
                "work_life_balance": 2,
                "over_time": "Yes",
                "department": "engineering",
                "job_level": 2,
                "environment_satisfaction": 3,
                "job_involvement": 3,
                "performance_rating": 3,
                "relationship_satisfaction": 4
            }
        }
    )

    @model_validator(mode="after")
    def validate_logical_constraints(self) -> "PredictionRequest":
        """
        Prevent logically impossible data.
        """
        max_possible_years = self.age - 18

        if self.years_at_company > max_possible_years:
            raise ValueError(
                "years_at_company exceeds plausible working years "
                f"for age={self.age}"
            )

        return self


# =========================================================
# RESPONSE SCHEMA
# =========================================================

class PredictionResponse(BaseModel):
    """
    Enterprise-grade ML inference response schema.

    Features:
    - Immutable response payload
    - Traceable prediction IDs
    - SHAP explainability support
    - MLOps-ready metadata
    - OpenAPI-compatible typing
    """

    prediction_id: UUID = Field(
        default_factory=uuid4,
        description="Unique inference trace identifier."
    )

    prediction: PredictionOutcome = Field(
        ...,
        description="Predicted class label."
    )

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Prediction probability/confidence."
    )

    model_name: str = Field(
        ...,
        min_length=1,
        description="Model identifier/version."
    )

    shap_values: Dict[str, float] | None = Field(
        default=None,
        description="SHAP feature importance values."
    )

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC inference timestamp."
    )

    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "prediction_id": "123e4567-e89b-12d3-a456-426614174000",
                "prediction": 1,
                "confidence": 0.87,
                "model_name": "xgboost-attrition-v2.1.0",
                "shap_values": {
                    "over_time": 0.45,
                    "monthly_income": -0.12,
                    "years_at_company": 0.08
                },
                "timestamp": "2026-05-13T12:16:36Z"
            }
        }
    )