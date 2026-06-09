"""
Enterprise ML API Routes - Prediction History Endpoints
Handles HTTP requests for fetching stored prediction logs from PostgreSQL,
with filtering, pagination, and audit trail support.
"""

import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

# Database Imports
from app.db.session import get_db
from app.db.models.prediction import PredictionLog

# Security Imports
from app.core.security.dependencies import get_current_user

# Pydantic response schema
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

# =========================================================
# CONFIGURATION
# =========================================================

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/predictions",
    tags=["Prediction History"]
)


# =========================================================
# RESPONSE SCHEMAS  (defined here to keep history self-contained)
# =========================================================

class PredictionHistoryItem(BaseModel):
    """
    Serialised view of a single PredictionLog row.
    Returned in the history list endpoint.
    """

    prediction_id: str = Field(..., description="Unique trace ID for this inference.")
    employee_id: int = Field(..., description="Employee this prediction was run for.")
    prediction: int = Field(..., description="0 = Retained, 1 = Attrition.")
    confidence: float = Field(..., description="Model confidence (0.0 – 1.0).")
    model_name: str = Field(..., description="Model version that produced this result.")
    inference_time_ms: Optional[float] = Field(None, description="How long inference took.")
    timestamp: datetime = Field(..., description="UTC time the prediction was saved.")

    model_config = ConfigDict(from_attributes=True)


class PredictionHistoryResponse(BaseModel):
    """
    Paginated wrapper for prediction history results.
    """

    total: int = Field(..., description="Total records in the database.")
    page: int = Field(..., description="Current page number (1-indexed).")
    page_size: int = Field(..., description="Number of records per page.")
    predictions: List[PredictionHistoryItem]


# =========================================================
# ROUTES
# =========================================================

@router.get(
    "",
    response_model=PredictionHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch Prediction History",
    description=(
        "Returns a paginated list of all attrition prediction records stored in "
        "PostgreSQL, ordered by most recent first. Supports filtering by employee_id "
        "and pagination via page/page_size query params."
    )
)
def get_prediction_history(
    employee_id: Optional[int] = Query(
        default=None,
        gt=0,
        description="Filter results to a specific employee."
    ),
    page: int = Query(
        default=1,
        ge=1,
        description="Page number (1-indexed)."
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Records per page (max 100)."
    ),
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated prediction history from PostgreSQL.

    - Ordered by most recent `created_at` / `timestamp` first
    - Optional filter by `employee_id`
    - Returns total count for frontend pagination
    """
    try:
        # Base query
        query = db.query(PredictionLog)

        # Optional employee filter
        if employee_id is not None:
            query = query.filter(PredictionLog.employee_id == employee_id)

        # Total count (before pagination)
        total = query.count()

        # Order by most recent first — use `created_at` if available, else `id`
        # Adjust the column name to match your actual PredictionLog model
        try:
            query = query.order_by(desc(PredictionLog.created_at))
        except AttributeError:
            # Fallback: order by primary key descending if no timestamp column
            query = query.order_by(desc(PredictionLog.id))

        # Pagination
        offset = (page - 1) * page_size
        records = query.offset(offset).limit(page_size).all()

        # Serialize
        items = []
        for record in records:
            items.append(
                PredictionHistoryItem(
                    prediction_id=str(record.prediction_id),
                    employee_id=record.employee_id,
                    prediction=int(record.prediction),
                    confidence=float(record.confidence),
                    model_name=record.model_name,
                    inference_time_ms=(
                        float(record.inference_time_ms)
                        if record.inference_time_ms is not None
                        else None
                    ),
                    # Try common timestamp column names
                    timestamp=getattr(
                        record,
                        "created_at",
                        getattr(record, "timestamp", datetime.utcnow())
                    ),
                )
            )

        logger.info(
            f"History query: user={current_user} | "
            f"employee_filter={employee_id} | "
            f"page={page}/{((total - 1) // page_size) + 1} | "
            f"returned={len(items)}/{total}"
        )

        return PredictionHistoryResponse(
            total=total,
            page=page,
            page_size=page_size,
            predictions=items
        )

    except Exception as e:
        logger.exception("Failed to fetch prediction history from database.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve prediction history: {str(e)}"
        )


@router.get(
    "/{prediction_id}",
    response_model=PredictionHistoryItem,
    status_code=status.HTTP_200_OK,
    summary="Fetch Single Prediction Record",
    description="Returns a single prediction record by its UUID trace ID."
)
def get_prediction_by_id(
    prediction_id: str,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch one prediction log entry by its prediction_id UUID string.
    """
    record = (
        db.query(PredictionLog)
        .filter(PredictionLog.prediction_id == prediction_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No prediction found with ID: {prediction_id}"
        )

    return PredictionHistoryItem(
        prediction_id=str(record.prediction_id),
        employee_id=record.employee_id,
        prediction=int(record.prediction),
        confidence=float(record.confidence),
        model_name=record.model_name,
        inference_time_ms=(
            float(record.inference_time_ms)
            if record.inference_time_ms is not None
            else None
        ),
        timestamp=getattr(
            record,
            "created_at",
            getattr(record, "timestamp", datetime.utcnow())
        ),
    )
