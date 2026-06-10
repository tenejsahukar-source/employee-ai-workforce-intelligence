"""
backend/app/routes/analytics.py

FastAPI router for all AetherIQ dashboard analytics endpoints.
All queries run against PostgreSQL via async SQLAlchemy.
Pydantic schemas are in schemas.py.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Employee, PredictionRecord
from app.schemas.analytics import (
    OverviewResponse,
    RiskDistributionResponse,
    RiskBucket,
    DepartmentsResponse,
    DepartmentRisk,
    HighRiskEmployeesResponse,
    HighRiskEmployee,
    TrendsResponse,
    TrendPoint,
)
from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/overview
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns headline KPI metrics:
    - Total headcount
    - Average attrition risk
    - High-risk employee count  (risk > 0.7)
    - Retention score           (100 - avg_risk * 100)
    - AI confidence             (avg confidence from predictions)
    - Period-over-period deltas (vs. last 30 days)
    """
    logger.info("[analytics.overview] Executing overview aggregation")

    # Current period aggregates
    current = await db.execute(
        select(
            func.count(Employee.id).label("total"),
            func.avg(Employee.attrition_risk).label("avg_risk"),
            func.sum(
                case((Employee.attrition_risk > 0.7, 1), else_=0)
            ).label("high_risk_count"),
        )
    )
    row = current.one()

    total_employees: int  = row.total or 0
    avg_risk: float       = float(row.avg_risk or 0.0)
    high_risk_count: int  = int(row.high_risk_count or 0)
    retention_score: int  = max(0, round(100 - avg_risk * 100))

    # AI confidence from the latest 100 predictions
    conf_result = await db.execute(
        select(func.avg(PredictionRecord.confidence))
        .order_by(PredictionRecord.timestamp.desc())
        .limit(100)
    )
    ai_confidence: float = float(conf_result.scalar() or 0.94)

    # Previous-period averages (last 30 days vs prior 30 days)
    prev_result = await db.execute(
        text(
            """
            SELECT
                AVG(CASE WHEN created_at >= NOW() - INTERVAL '60 days'
                         AND created_at <  NOW() - INTERVAL '30 days'
                         THEN attrition_risk END) AS prev_avg_risk,
                SUM(CASE WHEN created_at >= NOW() - INTERVAL '60 days'
                         AND created_at <  NOW() - INTERVAL '30 days'
                         AND attrition_risk > 0.7 THEN 1 ELSE 0 END) AS prev_high_risk
            FROM employees
            """
        )
    )
    prev_row = prev_result.one()
    prev_avg_risk: float   = float(prev_row.prev_avg_risk or avg_risk)
    prev_high_risk: int    = int(prev_row.prev_high_risk or high_risk_count)
    prev_retention: float  = max(0.0, 100.0 - prev_avg_risk * 100)

    return OverviewResponse(
        total_employees=total_employees,
        avg_attrition_risk=round(avg_risk, 4),
        high_risk_count=high_risk_count,
        retention_score=retention_score,
        ai_confidence=round(ai_confidence, 4),
        avg_risk_delta=round((avg_risk - prev_avg_risk) * 100, 2),
        high_risk_delta=high_risk_count - prev_high_risk,
        retention_delta=round(retention_score - prev_retention, 2),
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/risk-distribution
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/risk-distribution", response_model=RiskDistributionResponse)
async def get_risk_distribution(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns Low / Medium / High risk bucket counts for the donut chart.
    Thresholds: Low < 0.3, Medium 0.3–0.7, High > 0.7
    """
    logger.info("[analytics.risk-distribution] Executing risk bucket query")

    result = await db.execute(
        select(
            func.sum(case((Employee.attrition_risk <= 0.3, 1), else_=0)).label("low"),
            func.sum(case(((Employee.attrition_risk > 0.3) & (Employee.attrition_risk <= 0.7), 1), else_=0)).label("medium"),
            func.sum(case((Employee.attrition_risk > 0.7, 1), else_=0)).label("high"),
            func.count(Employee.id).label("total"),
        )
    )
    row = result.one()

    buckets = [
        RiskBucket(name="Low Risk",    value=int(row.low    or 0), fill="#10b981"),
        RiskBucket(name="Medium Risk", value=int(row.medium or 0), fill="#f59e0b"),
        RiskBucket(name="High Risk",   value=int(row.high   or 0), fill="#f43f5e"),
    ]
    return RiskDistributionResponse(buckets=buckets, total=int(row.total or 0))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/departments
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/departments", response_model=DepartmentsResponse)
async def get_departments(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Per-department: headcount, average attrition risk (0–100), average tenure.
    Powers the horizontal bar heatmap.
    """
    logger.info("[analytics.departments] Executing department aggregation")

    result = await db.execute(
        select(
            Employee.dept.label("name"),
            func.count(Employee.id).label("count"),
            func.avg(Employee.attrition_risk).label("avg_risk"),
            func.avg(Employee.years_at_company).label("avg_tenure"),
        )
        .where(Employee.dept.isnot(None))
        .group_by(Employee.dept)
        .order_by(func.avg(Employee.attrition_risk).desc())
    )
    rows = result.all()

    departments = [
        DepartmentRisk(
            name=row.name,
            count=int(row.count),
            risk=round(float(row.avg_risk or 0) * 100),
            avg_tenure=round(float(row.avg_tenure or 0), 1),
        )
        for row in rows
    ]
    return DepartmentsResponse(departments=departments)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/high-risk-employees
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/high-risk-employees", response_model=HighRiskEmployeesResponse)
async def get_high_risk_employees(
    limit: int = Query(default=5, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns top-N employees sorted by attrition risk descending.
    Powers the Retention Priority Queue table.
    """
    logger.info(f"[analytics.high-risk-employees] limit={limit}")

    result = await db.execute(
        select(Employee)
        .where(Employee.attrition_risk > 0.3)
        .order_by(Employee.attrition_risk.desc())
        .limit(limit)
    )
    employees_db = result.scalars().all()

    employees = [
        HighRiskEmployee(
            id=str(emp.id),
            name=emp.name,
            dept=emp.dept or "Unknown",
            role=emp.role or "Employee",
            risk=round(float(emp.attrition_risk or 0), 4),
            email=emp.email or "",
            image=getattr(emp, "image", None),
        )
        for emp in employees_db
    ]
    return HighRiskEmployeesResponse(employees=employees, total=len(employees))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/trends
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    months: int = Query(default=6, ge=3, le=24),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns monthly attrition rate (actual) + AI projected rate for the
    past N months. Actual rate = avg attrition_risk of predictions in that month.
    Projected rate = AVG of model confidence for that month.
    Powers the Retention Forecast area chart.
    """
    logger.info(f"[analytics.trends] months={months}")

    result = await db.execute(
        text(
            """
            SELECT
                TO_CHAR(DATE_TRUNC('month', timestamp), 'Mon') AS month,
                DATE_TRUNC('month', timestamp)                 AS month_ts,
                AVG(CASE WHEN prediction = 1 THEN 1.0 ELSE 0.0 END) * 100 AS rate,
                AVG(confidence) * 100                                       AS predicted
            FROM prediction_records
            WHERE timestamp >= NOW() - INTERVAL ':months months'
            GROUP BY month_ts, month
            ORDER BY month_ts ASC
            """,
            {"months": months},
        )
    )
    rows = result.all()

    points = [
        TrendPoint(
            month=row.month,
            rate=round(float(row.rate), 2) if row.rate is not None else None,
            predicted=round(float(row.predicted), 2),
        )
        for row in rows
    ]

    # If no prediction history yet, return placeholder data so the chart renders
    if not points:
        logger.warning("[analytics.trends] No prediction history found — returning empty series")

    return TrendsResponse(
        points=points,
        period_label=f"Last {months} months",
    )
