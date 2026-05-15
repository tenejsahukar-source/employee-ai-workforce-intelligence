import os
import logging
import threading
import joblib
from typing import Any, Dict

# Assuming Keras is used for DL models
try:
    import tensorflow as tf
    HAS_TF = True
except ImportError:
    HAS_TF = False

logger = logging.getLogger(__name__)

class ModelArtifactNotFoundError(FileNotFoundError):
    """Raised when a required ML artifact is missing from the disk."""
    pass

class MLArtifactRegistry:
    """
    Enterprise Thread-Safe Artifact Registry.
    Lazily loads models into RAM and caches them securely.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Implements a strict Thread-Safe Singleton pattern."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MLArtifactRegistry, cls).__new__(cls)
                cls._instance._artifacts: Dict[str, Any] = {}
                cls._instance._registry_lock = threading.Lock()
        return cls._instance

    def load_joblib(self, artifact_id: str, file_path: str) -> Any:
        """
        Safely loads and caches a Scikit-Learn / Joblib artifact.
        """
        # Fast path (no lock needed if already loaded)
        if artifact_id in self._artifacts:
            return self._artifacts[artifact_id]

        # Thread-safe loading path
        with self._registry_lock:
            # Double-check inside lock
            if artifact_id in self._artifacts:
                return self._artifacts[artifact_id]

            if not os.path.exists(file_path):
                error_msg = f"CRITICAL: Artifact '{artifact_id}' not found at {file_path}. Cannot boot service."
                logger.error(error_msg)
                raise ModelArtifactNotFoundError(error_msg)

            try:
                logger.info(f"Loading Joblib artifact '{artifact_id}' into RAM from {file_path}")
                model = joblib.load(file_path)
                self._artifacts[artifact_id] = model
                return model
            except Exception as e:
                logger.error(f"Failed to load artifact '{artifact_id}': {str(e)}", exc_info=True)
                raise RuntimeError(f"Corrupted artifact '{artifact_id}': {str(e)}")

    def load_keras(self, artifact_id: str, file_path: str) -> Any:
        """
        Safely loads and caches a TensorFlow/Keras neural network.
        """
        if not HAS_TF:
            raise ImportError("TensorFlow is not installed. Cannot load Keras models.")

        if artifact_id in self._artifacts:
            return self._artifacts[artifact_id]

        with self._registry_lock:
            if artifact_id in self._artifacts:
                return self._artifacts[artifact_id]

            if not os.path.exists(file_path):
                error_msg = f"CRITICAL: Keras model '{artifact_id}' not found at {file_path}."
                logger.error(error_msg)
                raise ModelArtifactNotFoundError(error_msg)

            try:
                logger.info(f"Loading Keras artifact '{artifact_id}' into RAM from {file_path}")
                model = tf.keras.models.load_model(file_path)
                self._artifacts[artifact_id] = model
                return model
            except Exception as e:
                logger.error(f"Failed to load Keras model '{artifact_id}': {str(e)}", exc_info=True)
                raise RuntimeError(f"Corrupted Keras artifact '{artifact_id}': {str(e)}")

    def clear_cache(self, artifact_id: str = None):
        """
        Clears specific or all models from RAM. Crucial for zero-downtime hot-reloading 
        when new models are trained via background Celery workers.
        """
        with self._registry_lock:
            if artifact_id:
                if artifact_id in self._artifacts:
                    del self._artifacts[artifact_id]
                    logger.info(f"Artifact '{artifact_id}' purged from RAM.")
            else:
                self._artifacts.clear()
                logger.info("Complete ML artifact cache purged from RAM.")

# Global instance to be imported by the FastAPI app
artifact_registry = MLArtifactRegistry()