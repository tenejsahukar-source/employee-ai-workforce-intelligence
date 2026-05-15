import time

from app.core.celery_app import celery_app


@celery_app.task
def async_prediction_audit(data: dict):

    time.sleep(2)

    print("Async Prediction Audit:", data)

    return {
        "status": "completed"
    }