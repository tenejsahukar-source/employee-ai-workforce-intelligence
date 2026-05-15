import os
import logging
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import List, Optional
from pydantic import BaseModel

from app.config.ml_config import ml_config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Pydantic Schema for FastAPI Response
# ---------------------------------------------------------
class AnomalyResult(BaseModel):
    """Rich schema representing an anomaly detection evaluation."""
    is_anomaly: bool
    severity_score: float  # The actual MSE
    threshold_used: float  # Provided so the frontend can graph it

class BatchAnomalyResponse(BaseModel):
    """Schema for processing multiple employees at once."""
    results: List[AnomalyResult]
    total_anomalies_detected: int

# ---------------------------------------------------------
# Singleton Inference Service
# ---------------------------------------------------------
class AnomalyDetectionService:
    """
    High-performance inference engine for Anomaly Detection.
    Pre-loads artifacts into RAM on FastAPI startup.
    """

    def __init__(self, artifact_name: str = "anomaly_bundle"):
        self.autoencoder = None
        self.scaler = None
        self.threshold = 0.0
        self.required_features = []
        
        self._load_bundle(artifact_name)

    def _load_bundle(self, artifact_name: str):
        """Loads the Scaler, Metadata, and Keras model safely."""
        bundle_dir = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), artifact_name)
        
        try:
            # Load Scikit-Learn / Metadata elements
            self.scaler = joblib.load(os.path.join(bundle_dir, 'ae_scaler.joblib'))
            meta = joblib.load(os.path.join(bundle_dir, 'ae_meta.joblib'))
            
            self.threshold = meta['threshold']
            self.required_features = meta['features']
            
            # Load Keras Model
            self.autoencoder = tf.keras.models.load_model(os.path.join(bundle_dir, 'autoencoder.keras'))
            
            logger.info(f"Anomaly Detection service loaded successfully. Threshold: {self.threshold:.4f}")
        except FileNotFoundError:
            logger.warning("Anomaly Detection bundle not found. Service will be inactive.")
        except Exception as e:
            logger.error(f"Error loading Anomaly Detection bundle: {str(e)}", exc_info=True)

    def predict(self, df_input: pd.DataFrame) -> BatchAnomalyResponse:
        """
        Evaluates a batch of employee records to detect severe anomalies.
        """
        if self.autoencoder is None:
            raise RuntimeError("Anomaly service is currently unavailable.")

        # 1. Validate incoming payload against training schema
        missing = [col for col in self.required_features if col not in df_input.columns]
        if missing:
            raise ValueError(f"Missing required features for anomaly detection: {missing}")

        X_infer = df_input[self.required_features].copy()

        # 2. Scale
        X_scaled = self.scaler.transform(X_infer)

        # 3. Predict & Calculate Error
        predictions = self.autoencoder.predict(X_scaled, verbose=0)
        mse_scores = np.mean(np.power(X_scaled - predictions, 2), axis=1)

        # 4. Package Results
        results_list = []
        anomalies_count = 0

        for mse in mse_scores:
            is_anom = bool(mse > self.threshold)
            if is_anom:
                anomalies_count += 1
                
            results_list.append(
                AnomalyResult(
                    is_anomaly=is_anom,
                    severity_score=round(float(mse), 4),
                    threshold_used=round(float(self.threshold), 4)
                )
            )

        return BatchAnomalyResponse(
            results=results_list,
            total_anomalies_detected=anomalies_count
        )

# Instantiate the Singleton to be imported by the FastAPI router
anomaly_service = AnomalyDetectionService()