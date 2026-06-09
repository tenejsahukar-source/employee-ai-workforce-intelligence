"""
Employee Attrition Prediction Schemas
Path: backend/app/schemas/employee.py
"""

from pydantic import BaseModel, Field, ConfigDict


class EmployeeDataRequest(BaseModel):
    """
    Schema for employee attrition prediction input data.
    Validates the incoming payload against expected ranges, types, and categories.
    """
    model_config = ConfigDict(from_attributes=True)

    employee_id: int = Field(
        ..., gt=0, description="Unique identifier for the employee."
    )
    age: int = Field(
        ..., ge=18, le=100, description="Age of the employee in years."
    )
    daily_rate: float = Field(
        ..., ge=0.0, description="Daily billing or wage rate."
    )
    monthly_income: float = Field(
        ..., ge=0.0, description="Monthly income of the employee."
    )
    percent_salary_hike: float = Field(
        ..., ge=0.0, description="Percentage increase in salary from the previous year."
    )
    years_at_company: float = Field(
        ..., ge=0.0, description="Total years the employee has spent at the current company."
    )
    years_in_current_role: float = Field(
        ..., ge=0.0, description="Total years the employee has been in their current role."
    )
    total_working_years: float = Field(
        ..., ge=0.0, description="Total number of years the employee has worked in their career."
    )
    job_satisfaction: int = Field(
        ..., ge=1, le=4, description="Job satisfaction level (1: Low, 2: Medium, 3: High, 4: Very High)."
    )
    environment_satisfaction: int = Field(
        ..., ge=1, le=4, description="Environment satisfaction level (1: Low, 2: Medium, 3: High, 4: Very High)."
    )
    work_life_balance: int = Field(
        ..., ge=1, le=4, description="Work-life balance rating (1: Bad, 2: Good, 3: Better, 4: Best)."
    )
    distance_from_home: float = Field(
        ..., ge=0.0, description="Distance from home to work (e.g., in miles or km)."
    )
    training_times_last_year: int = Field(
        ..., ge=0, description="Number of times the employee was trained last year."
    )
    num_companies_worked: int = Field(
        ..., ge=0, description="Number of previous companies the employee has worked for."
    )
    stock_option_level: int = Field(
        ..., ge=0, le=3, description="Stock option level granted to the employee (0 to 3)."
    )
    relationship_satisfaction: int = Field(
        ..., ge=1, le=4, description="Relationship satisfaction level (1: Low, 2: Medium, 3: High, 4: Very High)."
    )
    performance_rating: int = Field(
        ..., ge=1, le=4, description="Performance rating of the employee (1: Low, 2: Good, 3: Excellent, 4: Outstanding)."
    )


class ExplainPayload(BaseModel):
    """
    Schema for handling SHAP explainability requests.
    Used to return or receive features mapped to their model predictions.
    """
    model_config = ConfigDict(from_attributes=True)

    features: dict[str, float | int | str] = Field(
        ..., description="Dictionary of feature names and their corresponding input values."
    )
    prediction: float | None = Field(
        default=None, description="The attrition prediction probability or score returned by the model."
    )
    model_version: str | None = Field(
        default=None, description="The semantic version string of the model used for the prediction."
    )