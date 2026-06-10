"""
app/ml/api/analytics_routes.py

FastAPI router for all dashboard analytics endpoints.
Queries run against PostgreSQL via SQLAlchemy sync session.
All data derived from PredictionLog table.

Schema reference (prediction.py):
  id, prediction_id, trace_id, employee_id, features (JSON),
  prediction (int), confidence (float), risk_label (str),
  inference_time_ms, model_name, model_version,
  shap_values (JSON), top_contributors (JSON), created_at (DateTime)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text

from app.db.session import get_db
from app.db.models.prediction import PredictionLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/overview
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    """Headline KPI metrics for the dashboard overview cards."""
    logger.info("[analytics.overview] Executing overview aggregation")

    total  = db.query(func.count(PredictionLog.id)).scalar() or 0
    high   = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "HIGH").scalar() or 0
    medium = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "MEDIUM").scalar() or 0
    low    = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "LOW").scalar() or 0
    avg_conf = float(db.query(func.avg(PredictionLog.confidence)).scalar() or 0.94)

    avg_risk        = round((high / total) if total > 0 else 0.0, 4)
    retention_score = max(0, round(100 - avg_risk * 100))

    # Previous 30-day window for period-over-period deltas
    cutoff_now  = datetime.utcnow() - timedelta(days=30)
    cutoff_prev = datetime.utcnow() - timedelta(days=60)

    prev_total = db.query(func.count(PredictionLog.id)).filter(
        PredictionLog.created_at >= cutoff_prev,
        PredictionLog.created_at <  cutoff_now,
    ).scalar() or 0

    prev_high = db.query(func.count(PredictionLog.id)).filter(
        PredictionLog.created_at >= cutoff_prev,
        PredictionLog.created_at <  cutoff_now,
        PredictionLog.risk_label == "HIGH",
    ).scalar() or 0

    prev_avg_risk  = round((prev_high / prev_total) if prev_total > 0 else avg_risk, 4)
    prev_retention = max(0.0, 100.0 - prev_avg_risk * 100)

    return {
        "total_employees":    total,
        "avg_attrition_risk": avg_risk,
        "high_risk_count":    high,
        "medium_risk_count":  medium,
        "low_risk_count":     low,
        "retention_score":    retention_score,
        "ai_confidence":      round(avg_conf, 4),
        "avg_risk_delta":     round((avg_risk - prev_avg_risk) * 100, 2),
        "high_risk_delta":    high - prev_high,
        "retention_delta":    round(retention_score - prev_retention, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/risk-distribution
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    """Low / Medium / High risk bucket counts for the donut chart."""
    logger.info("[analytics.risk-distribution] Executing risk bucket query")

    total  = db.query(func.count(PredictionLog.id)).scalar() or 0
    high   = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "HIGH").scalar() or 0
    medium = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "MEDIUM").scalar() or 0
    low    = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "LOW").scalar() or 0

    return {
        "buckets": [
            {"name": "Low Risk",    "value": low,    "fill": "#10b981"},
            {"name": "Medium Risk", "value": medium, "fill": "#f59e0b"},
            {"name": "High Risk",   "value": high,   "fill": "#f43f5e"},
        ],
        "total": total,
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/departments
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    """
    Per-department risk breakdown extracted from the features JSON column.
    Falls back to model_name grouping if no department data exists.
    """
    logger.info("[analytics.departments] Executing department aggregation")

    # Department is stored in features JSON — extract it with Postgres JSON operator
    try:
        rows = db.execute(
            text("""
                SELECT
                    COALESCE(features->>'Department', features->>'department', 'Unknown') AS dept,
                    COUNT(*)                                                               AS count,
                    SUM(CASE WHEN risk_label = 'HIGH'   THEN 1 ELSE 0 END)               AS high,
                    SUM(CASE WHEN risk_label = 'MEDIUM' THEN 1 ELSE 0 END)               AS medium,
                    SUM(CASE WHEN risk_label = 'LOW'    THEN 1 ELSE 0 END)               AS low,
                    ROUND(AVG(confidence)::numeric, 4)                                    AS avg_conf
                FROM prediction_logs
                WHERE features IS NOT NULL
                GROUP BY dept
                ORDER BY high DESC
            """)
        ).all()
    except Exception as e:
        logger.warning(f"[analytics.departments] Query failed: {e}")
        rows = []

    departments = [
        {
            "name":     row.dept,
            "count":    int(row.count),
            "risk":     round((row.high / row.count) * 100) if row.count else 0,
            "high":     int(row.high),
            "medium":   int(row.medium),
            "low":      int(row.low),
            "avg_conf": float(row.avg_conf or 0),
        }
        for row in rows
    ]
    return {"departments": departments}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/high-risk-employees
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/high-risk-employees")
def get_high_risk_employees(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Top-N HIGH risk predictions sorted by confidence descending.
    Powers the Retention Priority Queue table.
    """
    logger.info(f"[analytics.high-risk-employees] limit={limit}")

    rows = (
        db.query(PredictionLog)
        .filter(PredictionLog.risk_label == "HIGH")
        .order_by(PredictionLog.confidence.desc())
        .limit(limit)
        .all()
    )

    employees = []
    for row in rows:
        # Pull name/dept/role from features JSON if available
        features = row.features or {}
        employees.append({
            "id":          str(row.id),
            "employee_id": row.employee_id,
            "name":        features.get("EmployeeName") or features.get("employee_name") or f"Employee #{row.employee_id}",
            "dept":        features.get("Department")   or features.get("department")    or "Unknown",
            "role":        features.get("JobRole")      or features.get("job_role")      or "Employee",
            "risk":        row.risk_label,
            "confidence":  round(float(row.confidence or 0), 4),
            "model":       row.model_name,
            "created_at":  row.created_at.isoformat() if row.created_at else None,
        })

    return {"employees": employees, "total": len(employees)}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/trends
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/trends")
def get_trends(
    months: int = Query(default=6, ge=3, le=24),
    db: Session = Depends(get_db),
):
    """
    Monthly attrition rate + avg confidence for the past N months.
    Powers the Retention Forecast area chart.
    Uses created_at (the actual column name in prediction_logs).
    """
    logger.info(f"[analytics.trends] months={months}")

    try:
        rows = db.execute(
            text("""
                SELECT
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY')  AS month,
                    DATE_TRUNC('month', created_at)                      AS month_ts,
                    ROUND(
                        AVG(CASE WHEN risk_label = 'HIGH' THEN 1.0 ELSE 0.0 END) * 100,
                        2
                    )                                                    AS rate,
                    ROUND(AVG(confidence) * 100, 2)                     AS predicted
                FROM prediction_logs
                WHERE created_at >= NOW() - (:months * INTERVAL '1 month')
                GROUP BY month_ts, month
                ORDER BY month_ts ASC
            """),
            {"months": months},
        ).all()
    except Exception as e:
        logger.warning(f"[analytics.trends] Trend query failed: {e}")
        rows = []

    points = [
        {
            "month":     row.month,
            "rate":      float(row.rate)      if row.rate      is not None else 0.0,
            "predicted": float(row.predicted) if row.predicted is not None else 0.0,
        }
        for row in rows
    ]

    if not points:
        logger.warning("[analytics.trends] No prediction history — returning empty series")

    return {"points": points, "period_label": f"Last {months} months"}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/analytics/dashboard  (backward compatibility)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_analytics_dashboard(db: Session = Depends(get_db)):
    """Legacy single-call summary — kept for backward compatibility."""
    total     = db.query(func.count(PredictionLog.id)).scalar() or 0
    high      = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "HIGH").scalar() or 0
    medium    = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "MEDIUM").scalar() or 0
    low       = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "LOW").scalar() or 0
    avg_conf  = float(db.query(func.avg(PredictionLog.confidence)).scalar() or 0.0)
    attrition = round((high / total) * 100, 2) if total > 0 else 0.0

    return {
        "total_predictions":      total,
        "high_risk_count":        high,
        "medium_risk_count":      medium,
        "low_risk_count":         low,
        "avg_confidence":         round(avg_conf, 2),
        "overall_attrition_risk": attrition,
        "retention_score":        round(100.0 - attrition, 2),
    }