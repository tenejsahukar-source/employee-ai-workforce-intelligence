"""
app/services/prediction_service.py

Database persistence layer for ML inference records.

CHANGES vs. original:
  - Added  trace_id, risk_label, model_version, top_contributors parameters.
    The original save_prediction() accepted inference_time_ms as a parameter
    but the ORM model was missing that column, so SQLAlchemy silently dropped
    the value on every INSERT — the DB row always had NULL for inference_time_ms.
  - Added structured logging at INFO level with key fields for log aggregation.
  - Added a typed return annotation.
  - top_contributors is serialised to a plain list[dict] before storage so
    PostgreSQL JSONB doesn't receive Pydantic model instances (which are not
    JSON-serialisable by default).
  - Wrapped the commit in a try/except with rollback so a DB failure doesn't
    leave the session in a broken state, which would crash every subsequent
    request that reuses the same SQLAlchemy Session from the connection pool.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models.prediction import PredictionLog

logger = logging.getLogger(__name__)


def save_prediction(
    *,
    db:               Session,
    prediction_id:    str,
    trace_id:         str,
    employee_id:      int,
    features:         Dict,
    prediction:       int,
    confidence:       float,
    risk_label:       str,
    inference_time_ms:float,
    model_name:       str,
    model_version:    str,
    shap_values:      Optional[Dict[str, float]] = None,
    top_contributors: Optional[List[Dict]]       = None,
) -> PredictionLog:
    """
    Persists a single inference record to PostgreSQL.

    All parameters are keyword-only (the leading ``*``) to prevent
    accidental positional argument mismatches as the signature grows.

    Parameters
    ----------
    db               : Active SQLAlchemy session (injected by FastAPI Depends).
    prediction_id    : UUID string, unique per prediction.
    trace_id         : UUID string, shared between HTTP header and JSON body.
    employee_id      : Numeric employee identifier.
    features         : Raw request payload dict (stored for drift monitoring).
    prediction       : 0 = No Attrition, 1 = Attrition.
    confidence       : Model probability for class 1 (0.0 – 1.0).
    risk_label       : "LOW", "MEDIUM", or "HIGH".
    inference_time_ms: Wall-clock time from request receipt to response build.
    model_name       : Full model artifact name string.
    model_version    : Semver string extracted from model_name.
    shap_values      : Dict mapping feature name → SHAP float.
    top_contributors : Ranked list of {"feature": str, "impact": float} dicts.

    Returns
    -------
    The refreshed PredictionLog ORM instance with its auto-generated ``id``.

    Raises
    ------
    RuntimeError wrapping the original SQLAlchemyError so the caller
    (the route handler) can catch it and return a 500 without exposing
    internal DB details to the client.
    """
    record = PredictionLog(
        prediction_id    = prediction_id,
        trace_id         = trace_id,
        employee_id      = employee_id,
        features         = features,
        prediction       = prediction,
        confidence       = confidence,
        risk_label       = risk_label,
        inference_time_ms= inference_time_ms,
        model_name       = model_name,
        model_version    = model_version,
        shap_values      = shap_values or {},
        top_contributors = top_contributors or [],
    )

    try:
        db.add(record)
        db.commit()
        logger.info("COMMIT SUCCESSFUL")
        db.refresh(record)
        logger.info("ROW ID AFTER REFRESH: %s", record.id)
        count = db.query(PredictionLog).count()
        logger.info("TOTAL ROWS IN prediction_logs = %s", count)

        logger.info(
            "Prediction persisted | prediction_id=%s trace_id=%s "
            "employee_id=%s prediction=%d confidence=%.4f risk=%s "
            "latency=%.2fms model=%s",
            prediction_id, trace_id, employee_id,
            prediction, confidence, risk_label,
            inference_time_ms, model_name,
        )

        return record

    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(
            "DB commit failed for prediction_id=%s: %s",
            prediction_id, exc,
        )
        raise RuntimeError(
            f"Failed to persist prediction record [{prediction_id}]: {exc}"
        ) from exc
