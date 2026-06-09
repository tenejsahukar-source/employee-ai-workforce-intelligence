from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models.prediction import PredictionLog

# Initialize the router
router = APIRouter()

@router.get("/api/v1/analytics/dashboard")
async def get_analytics_dashboard(db: Session = Depends(get_db)):
    """
    Retrieve live analytics dashboard metrics for attrition risk from the database.
    """
    # 1. Total predictions
    total_predictions = db.query(func.count(PredictionLog.id)).scalar() or 0
    
    # 2. Risk counts (Updated to exactly match DB casing)
    high_risk_count = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "HIGH").scalar() or 0
    medium_risk_count = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "MEDIUM").scalar() or 0
    low_risk_count = db.query(func.count(PredictionLog.id)).filter(PredictionLog.risk_label == "LOW").scalar() or 0
    
    # 3. Average confidence
    avg_confidence = db.query(func.avg(PredictionLog.confidence)).scalar() or 0.0
    
    # 4. Calculate overall attrition risk & retention score (Derived metrics)
    overall_attrition_risk = 0.0
    retention_score = 0.0
    
    if total_predictions > 0:
        overall_attrition_risk = round((high_risk_count / total_predictions) * 100, 2)
        retention_score = round(100.0 - overall_attrition_risk, 2)

    return {
        "total_predictions": total_predictions,
        "high_risk_count": high_risk_count,
        "medium_risk_count": medium_risk_count,
        "low_risk_count": low_risk_count,
        "avg_confidence": round(avg_confidence, 2),
        "overall_attrition_risk": overall_attrition_risk,
        "retention_score": retention_score
    }