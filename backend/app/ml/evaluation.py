import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


# Classification Metrics
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    confusion_matrix, classification_report, roc_auc_score, log_loss
)
# Regression Metrics
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score
)

from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

# ==========================================
# CLASSIFICATION EVALUATION
# ==========================================

class ModelEvaluationResult(BaseModel):
    """
    Strict schema for classification model evaluation results.
    Ensures serialization compatibility for FastAPI and MLOps platforms.
    """
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: Optional[float] = None
    log_loss: Optional[float] = None
    confusion_matrix: List[List[int]]
    classification_report: Dict[str, Any]
    
    model_config = ConfigDict(extra='ignore')


def evaluate_model(
    model_name: str, 
    y_true: np.ndarray | pd.Series, 
    y_pred: np.ndarray | pd.Series, 
    y_prob: Optional[np.ndarray | pd.Series] = None,
    is_binary: bool = True
) -> ModelEvaluationResult:
    """
    Calculates comprehensive classification metrics and returns a strictly typed schema.
    """
    logger.info(f"Starting classification evaluation for model: {model_name}")
    
    # Determine the correct averaging method based on classification type
    avg_method = 'binary' if is_binary else 'weighted'
    
    # Calculate Core Threshold-Based Metrics
    metrics = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, average=avg_method, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, average=avg_method, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_true, y_pred, average=avg_method, zero_division=0)), 4),
    }

    # Calculate Advanced Probabilistic Metrics (if probabilities are provided)
    roc_auc_val = None
    log_loss_val = None
    if y_prob is not None:
        try:
            if is_binary:
                roc_auc_val = round(float(roc_auc_score(y_true, y_prob)), 4)
            else:
                roc_auc_val = round(float(roc_auc_score(y_true, y_prob, multi_class='ovr')), 4)
            log_loss_val = round(float(log_loss(y_true, y_prob)), 4)
        except Exception as e:
            logger.warning(f"Could not calculate probabilistic metrics: {str(e)}")

    # Matrix & Report (Converting to dictionary natively instead of strings)
    cm = confusion_matrix(y_true, y_pred).tolist()
    report = classification_report(y_true, y_pred, zero_division=0, output_dict=True)

    # Package into Pydantic Model
    result = ModelEvaluationResult(
        model_name=model_name,
        **metrics,
        roc_auc=roc_auc_val,
        log_loss=log_loss_val,
        confusion_matrix=cm,
        classification_report=report
    )
    
    logger.info(f"Evaluation completed for {model_name} | Accuracy: {result.accuracy} | F1: {result.f1_score}")
    
    return result


# ==========================================
# REGRESSION EVALUATION
# ==========================================

class RegressionEvaluationResult(BaseModel):
    """Strict schema for regression model evaluation results."""
    model_name: str
    mse: float
    rmse: float
    mae: float
    r2_score: float
    
    model_config = ConfigDict(extra='ignore')


def evaluate_regression_model(
    model_name: str, 
    y_true: np.ndarray | pd.Series, 
    y_pred: np.ndarray | pd.Series
) -> RegressionEvaluationResult:
    """Calculates comprehensive regression metrics."""
    logger.info(f"Starting regression evaluation for model: {model_name}")
    
    mse = float(mean_squared_error(y_true, y_pred))
    
    result = RegressionEvaluationResult(
        model_name=model_name,
        mse=round(mse, 4),
        rmse=round(float(np.sqrt(mse)), 4),
        mae=round(float(mean_absolute_error(y_true, y_pred)), 4),
        r2_score=round(float(r2_score(y_true, y_pred)), 4)
    )
    
    logger.info(f"Evaluation completed for {model_name} | RMSE: {result.rmse} | R2: {result.r2_score}")
    return result