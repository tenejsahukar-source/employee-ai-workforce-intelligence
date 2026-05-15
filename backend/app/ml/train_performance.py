import os
import logging
import pandas as pd
import joblib
from typing import Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

from app.config.ml_config import ml_config
from app.ml.preprocessing import WorkforceDataProcessor


# Configure module logger
logger = logging.getLogger(__name__)

def train_performance_pipeline(data_path: str) -> Tuple[Pipeline, ModelEvaluationResult]:
    """
    Enterprise training pipeline for Employee Performance Prediction.
    Ensures zero data leakage and utilizes structured evaluation.
    """
    logger.info(f"Initiating Performance training sequence using dataset: {data_path}")
    
    if not os.path.exists(data_path):
        logger.error(f"Dataset not found at {data_path}")
        raise FileNotFoundError(f"Dataset missing: {data_path}")

    # 1. Load and Prepare Raw Data
    df_raw = pd.read_csv(data_path)
    
    # Note: Target is now PerformanceRating
    processor = WorkforceDataProcessor(target_col="PerformanceRating")
    
    # Stratified split ensures balanced classes (PerformanceRating is usually highly imbalanced)
    X_train, X_test, y_train, y_test = processor.prepare_training_data(df_raw)

    # 2. Build Dynamic Preprocessor
    column_preprocessor = processor.build_preprocessor(X_train)

    # 3. Assemble Master Pipeline
    # WARNING: We intentionally exclude WorkforceFeatureEngineer here to prevent Target Leakage, 
    # since Productivity Index requires PerformanceRating to calculate.
    base_pipeline = Pipeline([
        ("preprocessing", column_preprocessor),
        ("classifier", RandomForestClassifier(
            random_state=42,
            class_weight="balanced" # Crucial for imbalanced HR ratings
        ))
    ])

    # 4. Hyperparameter Tuning
    # Use 'classifier__' prefix to route params to the RandomForest step inside the Pipeline
    param_grid = {
        'classifier__n_estimators': [100, 300],
        'classifier__max_depth': [10, 20, None],
        'classifier__min_samples_split': [2, 5]
    }

    logger.info("Starting Cross-Validation Hyperparameter Tuning (GridSearchCV)...")
    grid_search = GridSearchCV(
        estimator=base_pipeline,
        param_grid=param_grid,
        cv=5,
        scoring='f1_weighted', # Better than 'accuracy' for HR data
        n_jobs=-1,
        verbose=1
    )

    grid_search.fit(X_train, y_train)
    best_pipeline = grid_search.best_estimator_
    logger.info(f"Optimal hyperparameters discovered: {grid_search.best_params_}")

    # 5. Enterprise Evaluation
    logger.info("Evaluating optimal pipeline against pure holdout test set.")
    y_pred = best_pipeline.predict(X_test)
    
    # RandomForest outputs predict_proba safely
    y_prob = best_pipeline.predict_proba(X_test)
    
    # Handle multiclass probabilities safely if PerformanceRating has >2 classes (e.g., 1, 2, 3, 4)
    is_binary = len(pd.unique(y_test)) == 2
    if is_binary:
        prob_for_eval = y_prob[:, 1]
    else:
        prob_for_eval = y_prob

    evaluation_results = evaluate_model(
        model_name="RandomForest_Performance_Pipeline_V1",
        y_true=y_test,
        y_pred=y_pred,
        y_prob=prob_for_eval,
        is_binary=is_binary
    )

    # 6. Artifact Serialization
    # Use a specific path for the performance model
    artifact_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), "model_performance.joblib")
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
    
    joblib.dump(best_pipeline, artifact_path)
    logger.info(f"Production Performance pipeline successfully serialized to: {artifact_path}")

    return best_pipeline, evaluation_results

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    
    DATA_PATH = "data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
    
    try:
        pipeline, metrics = train_performance_pipeline(DATA_PATH)
        logger.info(f"Final Test F1-Score: {metrics.f1_score}")
    except Exception as e:
        logger.error("Training pipeline failed.", exc_info=True)