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

    employee_id = Column(Integer, nullable=False)

    features = Column(JSON, nullable=False)

    prediction = Column(Integer, nullable=False)

    confidence = Column(Float, nullable=False)

    inference_time_ms = Column(Float, nullable=False)

    model_name = Column(String, nullable=False)

    shap_values = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )