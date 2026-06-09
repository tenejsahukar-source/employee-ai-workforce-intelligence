from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    DateTime,
    JSON
)

from datetime import datetime

from app.db.base import Base


class PredictionLog(Base):

    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)

    prediction_id = Column(String, unique=True, nullable=False)
    trace_id = Column(String, nullable=True)
    employee_id = Column(Integer, nullable=False)
    features = Column(JSON, nullable=False)
    prediction = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    risk_label = Column(String, nullable=True)
    inference_time_ms = Column(Float, nullable=False)
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    shap_values = Column(JSON, nullable=True)
    top_contributors = Column(JSON, nullable=True)
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )