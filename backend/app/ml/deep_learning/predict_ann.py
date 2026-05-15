import os
import logging
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.config.ml_config import ml_config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Pydantic Output Schema for FastAPI Integration
# ---------------------------------------------------------
class DeepLearningPredictionResult(BaseModel):
    """Structured response schema for Deep Learning Inference."""
    attrition_risk: Optional[float] = None
    performance_class: Optional[int] = None
    burnout_score: Optional[float] = None


# ---------------------------------------------------------
# Enterprise Inference Engine
# ---------------------------------------------------------
class DeepLearningPredictor:
    """
    Singleton predictor service designed to be loaded once on app startup.
    Handles artifact loading, sparse-to-dense conversion, and safe inference.
    """
    
    def __init__(self):
        self.models = {}
        self.preprocessors = {}
        
        # Maps target keys to the bundle directories we created in the training script
        self.bundle_map = {
            'attrition': 'dl_attrition',
            'performance': 'dl_performance',
            'burnout': 'dl_burnout'
        }
        
        self._load_artifacts()

    def _load_artifacts(self):
        """Loads all available models and preprocessors from the artifact registry."""
        base_path = os.path.dirname(ml_config.MODEL_ARTIFACT_PATH)
        
        for target_name, bundle_folder in self.bundle_map.items():
            bundle_path = os.path.join(base_path, bundle_folder)
            
            try:
                # Load Preprocessor (Scikit-Learn)
                preprocessor_path = os.path.join(bundle_path, "preprocessor.joblib")
                self.preprocessors[target_name] = joblib.load(preprocessor_path)
                
                # Load Neural Network (Keras)
                model_path = os.path.join(bundle_path, "network.keras")
                self.models[target_name] = tf.keras.models.load_model(model_path)
                
                logger.info(f"Successfully loaded DL bundle for: {target_name}")
            except Exception as e:
                # We use warning here, not error, so the API still starts even if one model is missing
                logger.warning(f"DL bundle unavailable for '{target_name}'. Reason: {str(e)}")

    def _prepare_tensor(self, target_name: str, df: pd.DataFrame) -> np.ndarray:
        """
        Transforms raw data through the Scikit-Learn pipeline and 
        safely converts sparse matrices to dense TensorFlow arrays.
        """
        preprocessor = self.preprocessors[target_name]
        X_processed = preprocessor.transform(df)
        
        # CRITICAL: Convert Scipy sparse matrix (from OneHotEncoder) to Numpy dense array
        if hasattr(X_processed, 'toarray'):
            X_processed = X_processed.toarray()
            
        return X_processed

    def predict(self, features_df: pd.DataFrame) -> DeepLearningPredictionResult:
        """
        Executes parallel inference across all available Neural Networks.
        Ensures target leakage is prevented dynamically.
        """
        results = {}
        
        # 1. Attrition Inference
        if 'attrition' in self.models:
            try:
                X_tensor = self._prepare_tensor('attrition', features_df)
                prob = self.models['attrition'].predict(X_tensor, verbose=0)[0][0]
                results['attrition_risk'] = float(prob)
            except Exception as e:
                logger.error(f"Inference failed for attrition: {str(e)}", exc_info=True)

        # 2. Performance Inference
        if 'performance' in self.models:
            try:
                X_tensor = self._prepare_tensor('performance', features_df)
                probs = self.models['performance'].predict(X_tensor, verbose=0)[0]
                # Map Keras 0-3 output back to real-world 1-4 rating
                results['performance_class'] = int(np.argmax(probs)) + 1
            except Exception as e:
                logger.error(f"Inference failed for performance: {str(e)}", exc_info=True)

        # 3. Burnout Inference (With Anti-Leakage Protection)
        if 'burnout' in self.models:
            try:
                # Strip synthetic targets if they accidentally made it into the payload
                leakage_cols = ['stress_index', 'engagement_score', 'productivity_index']
                clean_df = features_df.drop(columns=leakage_cols, errors='ignore')
                
                X_tensor = self._prepare_tensor('burnout', clean_df)
                score = self.models['burnout'].predict(X_tensor, verbose=0)[0][0]
                results['burnout_score'] = float(score)
            except Exception as e:
                logger.error(f"Inference failed for burnout: {str(e)}", exc_info=True)

        return DeepLearningPredictionResult(**results)

# Instantiate a Singleton to be imported by FastAPI routers
# This ensures models are only loaded into RAM once when the server boots
dl_predictor = DeepLearningPredictor()