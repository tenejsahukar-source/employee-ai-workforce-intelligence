import os
import logging
import pandas as pd
import joblib
from typing import Tuple, Any
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

from app.config.ml_config import ml_config
from app.ml.preprocessing import WorkforceDataProcessor
from app.ml.feature_engineering import WorkforceFeatureEngineer
from app.ml.evaluation import evaluate_model, ModelEvaluationResult

# Configure module logger
logger = logging.getLogger(__name__)


def train_attrition_pipeline(data_path: str) -> Tuple[Pipeline, ModelEvaluationResult]:
    """
    Enterprise training pipeline.
    Combines feature engineering, preprocessing, and hyperparameter tuning into
    a single Data-Leakage-proof execution context.
    """
    logger.info(f"Initiating training sequence using dataset: {data_path}")

    if not os.path.exists(data_path):
        logger.error(f"Dataset not found at {data_path}")
        raise FileNotFoundError(f"Dataset missing: {data_path}")

    # 1. Load and Prepare Raw Data
    df_raw = pd.read_csv(data_path)
    processor = WorkforceDataProcessor(target_col="Attrition")

    # Stratified split happens before ANY transformations to ensure a pure holdout test set
    X_train, X_test, y_train, y_test = processor.prepare_training_data(df_raw)

    # 2. Build Dynamic Preprocessor based on training column types
    column_preprocessor = processor.build_preprocessor(X_train)

    # 3. Assemble the Master Pipeline
    # This guarantees transformations happen dynamically within each CV fold.
    base_pipeline = Pipeline([
        ("feature_engineering", WorkforceFeatureEngineer()),
        ("preprocessing", column_preprocessor),
        ("classifier", XGBClassifier(
    
            eval_metric='logloss',
            random_state=42
        ))
    ])

    # 4. Hyperparameter Tuning on the Pipeline
    # Note the 'classifier__' prefix. This tells GridSearchCV to target the XGBoost step inside the pipeline.
    param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__max_depth': [3, 5, 7],
        'classifier__learning_rate': [0.01, 0.1]
    }

    logger.info("Starting Cross-Validation Hyperparameter Tuning (GridSearchCV)...")

    grid_search = GridSearchCV(
        estimator=base_pipeline,
        param_grid=param_grid,
        cv=5,
        scoring='f1_weighted',
        n_jobs=-1,  # Utilize all available CPU cores
        verbose=1
    )

    grid_search.fit(X_train, y_train)

    best_pipeline = grid_search.best_estimator_

    logger.info(
        f"Optimal hyperparameters discovered: {grid_search.best_params_}"
    )

    # 5. Enterprise Evaluation
    # We extract probability (y_prob) to calculate ROC-AUC and Log Loss
    logger.info(
        "Evaluating optimal pipeline against pure holdout test set."
    )

    y_pred = best_pipeline.predict(X_test)
    y_prob = best_pipeline.predict_proba(X_test)[:, 1]

    evaluation_results = evaluate_model(
        model_name="XGBoost_Attrition_Pipeline_V1",
        y_true=y_test,
        y_pred=y_pred,
        y_prob=y_prob,
        is_binary=True
    )

    # 6. Artifact Serialization
    artifact_path = ml_config.MODEL_ARTIFACT_PATH

    os.makedirs(
        os.path.dirname(artifact_path),
        exist_ok=True
    )

    joblib.dump(
        best_pipeline,
        artifact_path
    )

    logger.info(
        f"Production pipeline successfully serialized to: {artifact_path}"
    )

    return best_pipeline, evaluation_results


if __name__ == "__main__":

    # Setup basic logging for local script execution
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Path should ideally be pulled from environment variables or configs in a real system
    DATA_PATH = "data/WA_Fn-UseC_-HR-Employee-Attrition.csv"

    try:
        pipeline, metrics = train_attrition_pipeline(DATA_PATH)

        # We can easily dump the Pydantic result to JSON for CI/CD tracking
        logger.info(f"Final Test Accuracy: {metrics.accuracy}")
        logger.info(f"Final Test ROC-AUC: {metrics.roc_auc}")

        # Create artifacts folder if missing
        os.makedirs("artifacts", exist_ok=True)

        # Save trained model
        joblib.dump(
            pipeline,
            "artifacts/attrition_model.joblib"
        )

        print("Attrition model saved successfully.")

    except Exception as e:
        logger.error(
            "Training pipeline failed.",
            exc_info=True
        )