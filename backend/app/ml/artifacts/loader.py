import joblib
import shap
from functools import lru_cache

from app.ml.registry.model_registry import (
    get_model_path,
    get_production_model
)

class ModelLoadError(Exception):
    pass

@lru_cache()
def load_attrition_model():
    """
    Loads and caches the trained ML pipeline and SHAP explainer.
    Fetches the active production model dynamically from the registry.
    """
    try:
        # Dynamically fetch the current production model path
        MODEL_NAME = get_production_model()
        MODEL_PATH = get_model_path(MODEL_NAME)

        model = joblib.load(MODEL_PATH)
        
        # Initialize SHAP explainer
        explainer = shap.Explainer(model)
        
        return {
            "model": model,
            "explainer": explainer
        }

    except Exception as e:
        raise ModelLoadError(
            f"Failed to load model or explainer: {str(e)}"
        )