"""
Enterprise ML Model Loader & Registry
Handles singleton loading of ML models with strict path resolution,
environment-aware configuration, hot-reloading support, and robust exception handling.
"""

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

# =========================================================
# CONFIGURATION & LOGGING
# =========================================================

logger = logging.getLogger(__name__)

# Resolve paths dynamically to ensure Docker/OS compatibility.
# Assumes this file is in app/ml/artifacts/ or app/ml/prediction/
# We use environment variables so the orchestrator (Kubernetes/Docker) can override the mount path.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"
MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", DEFAULT_ARTIFACTS_DIR))

# =========================================================
# EXCEPTIONS
# =========================================================

class ModelLoadError(Exception):
    """Custom exception raised when an ML model fails to load into memory."""
    pass

# =========================================================
# MODEL REGISTRY / LOADER
# =========================================================

@lru_cache(maxsize=1)
def load_attrition_model() -> Any:
    """
    Loads the attrition prediction model into memory.
    
    Uses LRU cache (maxsize=1) to implement the Singleton pattern, 
    ensuring the heavy model file is only read from disk once during the 
    FastAPI application lifecycle.
    
    Returns:
        Any: The deserialized model object (e.g., scikit-learn Pipeline, XGBoost Booster).
        
    Raises:
        ModelLoadError: If the model file is missing, corrupted, or unreadable.
    """
    model_path = MODEL_DIR / "attrition_model.joblib"
    
    # 1. Pre-flight check: Ensure the file actually exists before attempting deserialization
    if not model_path.exists():
        error_msg = f"Attrition model artifact not found at expected path: {model_path}"
        logger.error(error_msg)
        raise ModelLoadError(error_msg)

    try:
        logger.debug(f"Attempting to load attrition model from {model_path}...")
        
        # 2. Load model into memory
        model = joblib.load(model_path)
        
        logger.info(f"Attrition model loaded successfully from {model_path}.")
        return model
        
    except EOFError as e:
        # Catch corrupted files (common if a Docker volume sync interrupted a write)
        error_msg = f"Model artifact is corrupted or incomplete: {model_path}"
        logger.exception(error_msg)
        raise ModelLoadError(error_msg) from e
        
    except Exception as e:
        # Catch all other deserialization/memory errors
        error_msg = f"Unexpected error while loading attrition model from {model_path}"
        logger.exception(error_msg)
        raise ModelLoadError(error_msg) from e

def clear_model_cache() -> None:
    """
    Clears the LRU cache for the attrition model.
    
    MLOps Feature: If an automated Celery pipeline retrains the model and overwrites 
    the .joblib file, calling this function allows FastAPI to "hot-reload" 
    the new model on the next inference request without restarting the Docker container.
    """
    load_attrition_model.cache_clear()
    logger.info("Attrition model cache cleared. The next inference request will hit the disk.")