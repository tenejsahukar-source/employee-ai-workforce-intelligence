from sqlalchemy.orm import Session

from app.db.models.prediction import PredictionLog


def save_prediction(
    db: Session,
    prediction_id: str,
    employee_id: int,
    features: dict,
    prediction: int,
    confidence: float,
    inference_time_ms: float,
    model_name: str,
    shap_values: dict | None = None
):

    prediction_record = PredictionLog(
        prediction_id=prediction_id,
        employee_id=employee_id,
        features=features,
        prediction=prediction,
        confidence=confidence,
        inference_time_ms=inference_time_ms,
        model_name=model_name,
        shap_values=shap_values
    )

    db.add(prediction_record)

    db.commit()

    db.refresh(prediction_record)

    return prediction_record