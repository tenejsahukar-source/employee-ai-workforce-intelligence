import os
import logging
import threading
import pandas as pd
import numpy as np
import shap
from typing import Dict, Any, List

from app.config.ml_config import ml_config
from api.core.model_registry import artifact_registry
from api.schemas.employee import EmployeeDataRequest, ExplainPayload

logger = logging.getLogger(__name__)

class ExplainabilityService:
    """
    Enterprise Explainable AI (XAI) Service.
    Safely decomposes Scikit-Learn Pipelines to generate SHAP values,
    translating complex tensor outputs into business-readable insights.
    """
    
    # Cache for explainers to prevent CPU bottlenecking on every request
    _explainers: Dict[str, shap.Explainer] = {}
    _explainer_lock = threading.Lock()

    @classmethod
    def _get_pipeline_components(cls, target: str):
        """
        Retrieves the pipeline from the RAM registry and cleanly splits it 
        into the preprocessing steps and the final estimator.
        """
        if target == "attrition":
            model_path = ml_config.MODEL_ARTIFACT_PATH
        else:
            model_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), f"model_{target}.joblib")
            
        pipeline = artifact_registry.load_joblib(target, model_path)
        
        # Slice the pipeline: Everything up to the last step is the preprocessor
        preprocessor = pipeline[:-1]
        # The last step is the actual estimator (XGBoost, RandomForest, CatBoost)
        estimator = pipeline[-1]
        
        return preprocessor, estimator

    @classmethod
    def _get_explainer(cls, target: str, estimator: Any) -> shap.Explainer:
        """
        Thread-safely initializes and caches the SHAP TreeExplainer.
        """
        if target in cls._explainers:
            return cls._explainers[target]
            
        with cls._explainer_lock:
            if target not in cls._explainers:
                logger.info(f"Initializing SHAP TreeExplainer for target '{target}' (This may take a moment)...")
                try:
                    # TreeExplainer is highly optimized for XGBoost, Random Forest, etc.
                    cls._explainers[target] = shap.TreeExplainer(estimator)
                except Exception as e:
                    logger.error(f"Failed to initialize TreeExplainer for {target}: {str(e)}")
                    raise RuntimeError(f"XAI not supported for current {target} model architecture.")
            return cls._explainers[target]

    @classmethod
    def explain_prediction(cls, employee: EmployeeDataRequest, target: str) -> ExplainPayload:
        """
        Generates feature contributions for a specific prediction, 
        returning a Pydantic-validated payload for the frontend.
        """
        logger.info(f"Generating SHAP explanation for {employee.employee_id} on target: {target}")
        
        # 1. Pipeline Decomposition
        preprocessor, estimator = cls._get_pipeline_components(target)
        
        # 2. Prepare Raw Input
        raw_df = pd.DataFrame([employee.model_dump(exclude={"employee_id"})])
        
        # 3. Apply Feature Engineering & Scaling
        transformed_data = preprocessor.transform(raw_df)
        
        # Handle sparse matrices from OneHotEncoder natively
        if hasattr(transformed_data, 'toarray'):
            transformed_data = transformed_data.toarray()
            
        # Extract dynamic feature names from the Scikit-Learn transformer
        if hasattr(preprocessor, 'get_feature_names_out'):
            feature_names = preprocessor.get_feature_names_out()
        else:
            feature_names = [f"Feature_{i}" for i in range(transformed_data.shape[1])]
            
        # 4. Generate SHAP Values
        explainer = cls._get_explainer(target, estimator)
        shap_output = explainer(transformed_data)
        
        # 5. Extract Values Safely (Handling SHAP's complex multidimensional arrays)
        base_value = float(shap_output.base_values[0])
        values = shap_output.values[0]
        
        # Multiclass Check (e.g., Performance Rating)
        # If output is 2D, it means (features, classes). We need the values for the predicted class.
        if len(values.shape) > 1:
            predicted_class_idx = int(estimator.predict(transformed_data)[0])
            # XGBoost vs RandomForest handle multiclass SHAP slightly differently, 
            # but usually the last axis is the class.
            try:
                values = values[:, predicted_class_idx]
            except IndexError:
                # Fallback to positive class if class mapping is weird
                values = values[:, 1]
                
        # 6. Map feature names to their impact values
        contributions = {str(feature_names[i]): float(values[i]) for i in range(len(feature_names))}
        
        # Sort by absolute impact (highest impact first)
        sorted_contributions = dict(sorted(contributions.items(), key=lambda item: abs(item[1]), reverse=True))
        
        # Extract top 3 features pushing the score up, and top 3 pushing it down
        top_factors = [feat for feat, val in list(sorted_contributions.items())[:5]]

        # 7. Package into strict Pydantic Schema
        return ExplainPayload(
            employee_id=employee.employee_id,
            base_value=round(base_value, 4),
            shap_impact={k: round(v, 4) for k, v in sorted_contributions.items()},
            top_contributing_factors=top_factors
        )

# Example usage inside your FastAPI Router:
# @router.post("/explain/attrition", response_model=APIResponseEnvelope)
# async def explain_attrition(payload: EmployeeDataRequest):
#     explanation = ExplainabilityService.explain_prediction(payload, target="attrition")
#     return APIResponseEnvelope(status="success", data=explanation)