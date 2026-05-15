from pathlib import Path


MODEL_REGISTRY = {
    "xgboost-attrition-v2.1.0": {
        "path": "artifacts/attrition_model.joblib",
        "status": "production"
    },

    "xgboost-attrition-v2.0.0": {
        "path": "artifacts/archive/attrition_model_v2.joblib",
        "status": "archived"
    }
}


def get_model_path(model_name: str) -> str:

    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model version: {model_name}")

    return MODEL_REGISTRY[model_name]["path"]


def get_production_model() -> str:

    for model_name, metadata in MODEL_REGISTRY.items():

        if metadata["status"] == "production":
            return model_name

    raise RuntimeError("No production model configured.")