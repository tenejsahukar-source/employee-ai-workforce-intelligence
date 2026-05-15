import os
import logging
import requests
from celery import Celery
from typing import Dict, Any

# Import our enterprise training pipelines
from app.ml import (
    train_attrition_pipeline,
    train_performance_pipeline,
    train_burnout_pipeline,
    train_ann_pipeline,
    WorkforceClusteringTrainer,
    AnomalyDetectorTrainer
)

logger = logging.getLogger(__name__)

# Enterprise Configuration: Pull from Environment, never hardcode infrastructure URLs
REDIS_BROKER = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
REDIS_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
FASTAPI_INTERNAL_URL = os.getenv("FASTAPI_INTERNAL_URL", "http://localhost:8000/api/v1/internal")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "super-secret-service-key")

celery_app = Celery(
    "ml_workforce_tasks",
    broker=REDIS_BROKER,
    backend=REDIS_BACKEND
)

# Standardize Celery configuration for production
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1, # Ensure heavy ML tasks don't get bottlenecked in one worker's queue
    task_track_started=True
)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def retrain_model_task(self, target: str, data_path: str) -> Dict[str, Any]:
    """
    Background task to retrain ML models asynchronously.
    Includes auto-retry logic for transient I/O failures and triggers FastAPI hot-reloads.
    """
    logger.info(f"Task ID [{self.request.id}] - Starting retraining sequence for: {target}")
    
    if not os.path.exists(data_path):
        logger.error(f"Dataset missing at {data_path}")
        raise ValueError(f"Dataset not found: {data_path}")

    try:
        metrics_dump = None
        artifact_id = None

        # 1. Pipeline Routing Engine
        if target == 'attrition':
            pipeline, metrics = train_attrition_pipeline(data_path)
            metrics_dump = metrics.model_dump()
            artifact_id = 'attrition'

        elif target == 'performance':
            pipeline, metrics = train_performance_pipeline(data_path)
            metrics_dump = metrics.model_dump()
            artifact_id = 'performance'

        elif target == 'burnout':
            pipeline, metrics = train_burnout_pipeline(data_path)
            metrics_dump = metrics.model_dump()
            artifact_id = 'burnout'

        elif target == 'segmentation':
            import pandas as pd
            df = pd.read_csv(data_path)
            trainer = WorkforceClusteringTrainer(n_clusters=3)
            pipeline, labels = trainer.train_and_save(df)
            metrics_dump = {"assigned_labels": labels}
            artifact_id = 'segmentation'

        else:
            raise ValueError(f"Unknown retraining target: {target}")

        logger.info(f"Successfully retrained {target} model. New metrics: {metrics_dump}")

        # 2. Inter-Process Communication (IPC): Notify FastAPI to hot-reload the RAM cache
        _notify_fastapi_reload(artifact_id)

        return {
            "status": "success", 
            "target": target, 
            "metrics": metrics_dump
        }

    except Exception as e:
        logger.error(f"Error retraining {target} model: {str(e)}", exc_info=True)
        # Automatically retry the task if it fails (e.g., due to temporary disk lock or memory spike)
        raise self.retry(exc=e)


def _notify_fastapi_reload(artifact_id: str):
    """
    Sends a secure webhook to the FastAPI service instructing it to drop the old 
    model from its Singleton RAM cache and load the newly serialized artifact.
    """
    if not artifact_id:
        return

    webhook_endpoint = f"{FASTAPI_INTERNAL_URL}/reload-artifact"
    headers = {"Authorization": f"Bearer {INTERNAL_API_KEY}"}
    payload = {"artifact_id": artifact_id}

    try:
        logger.info(f"Sending hot-reload webhook to FastAPI for artifact: {artifact_id}")
        response = requests.post(webhook_endpoint, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            logger.info("FastAPI successfully hot-reloaded the artifact.")
        else:
            logger.warning(f"FastAPI rejected reload webhook. Status: {response.status_code}. Response: {response.text}")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to reach FastAPI for hot-reload. The API will continue serving the OLD model until rebooted. Error: {str(e)}")