import os
import logging
import threading
import joblib
from typing import Any, Dict

# SHAP Support Imports
import shap
import ast
import json

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
                cls._instance._explainers: Dict[str, Any] = {}
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

    def load_shap_explainer(
        self,
        artifact_id: str,
        model_path: str
    ):
        """
        Loads and caches SHAP TreeExplainer.
        """
        explainer_key = f"{artifact_id}_explainer"

        if explainer_key in self._explainers:
            return self._explainers[explainer_key]

        with self._registry_lock:
            if explainer_key in self._explainers:
                return self._explainers[explainer_key]

            model = self.load_joblib(
                artifact_id,
                model_path
            )

            try:
                # Works whether model is Pipeline or raw XGBClassifier
                if hasattr(model, "named_steps"):
                    final_estimator = list(model.named_steps.values())[-1]
                else:
                    final_estimator = model

                booster = final_estimator.get_booster()

                logger.info(f"Applying XGBoost SHAP compatibility patch for {artifact_id}")
                self._patch_booster_save_raw(booster)

                explainer = shap.TreeExplainer(booster)

                self._explainers[explainer_key] = explainer

                logger.info(f"SHAP explainer cached for {artifact_id}")

                return explainer

            except Exception as e:
                logger.error(
                    f"Failed to initialize SHAP explainer: {e}",
                    exc_info=True
                )
                raise

    def _patch_booster_save_raw(
        self,
        booster
    ):
        original_save_raw = booster.save_raw

        def patched_save_raw(*args, **kwargs):
            saved = original_save_raw(
                *args,
                **kwargs
            )

            if isinstance(saved, tuple):
                fmt_tag = saved[0]
                byte_data = saved[1]
                is_tuple = True
            else:
                fmt_tag = None
                byte_data = saved
                is_tuple = False

            try:
                payload = json.loads(byte_data)
                lmp = (
                    payload
                    .get("learner", {})
                    .get(
                        "learner_model_param",
                        {}
                    )
                )

                base_score = lmp.get("base_score")

                if (
                    isinstance(base_score, str)
                    and
                    base_score.startswith("[")
                ):
                    extracted = ast.literal_eval(base_score)[0]
                    lmp["base_score"] = str(float(extracted))
                    
                    byte_data = bytearray(
                        json.dumps(payload).encode("utf-8")
                    )

            except Exception as e:
                logger.warning(f"SHAP booster patch skipped: {e}")

            return (
                (fmt_tag, byte_data)
                if is_tuple
                else byte_data
            )

        booster.save_raw = patched_save_raw

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
                
                # Also purge the corresponding explainer if it exists
                explainer_key = f"{artifact_id}_explainer"
                if explainer_key in self._explainers:
                    del self._explainers[explainer_key]
                    logger.info(f"Explainer '{explainer_key}' purged from RAM.")
            else:
                self._artifacts.clear()
                self._explainers.clear()
                logger.info("Complete ML artifact and SHAP explainer cache purged from RAM.")

# Global instance to be imported by the FastAPI app
artifact_registry = MLArtifactRegistry()