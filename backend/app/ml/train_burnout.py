import os
import logging
import pandas as pd
import joblib
from typing import Tuple
from catboost import CatBoostRegressor
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

from app.config.ml_config import ml_config
from app.ml.preprocessing import WorkforceDataProcessor
from app.ml.feature_engineering import WorkforceFeatureEngineer
from app.ml.evaluation import evaluate_regression_model, RegressionEvaluationResult

# Configure module logger
logger = logging.getLogger(__name__)

def train_burnout_pipeline(data_path: str) -> Tuple[Pipeline, RegressionEvaluationResult]:
    """
    Enterprise training pipeline for Burnout Score (Regression).
    Demonstrates training a proxy/surrogate model on synthetic targets
    while strictly avoiding mathematical target leakage.
    """
    logger.info(f"Initiating Burnout regression sequence using dataset: {data_path}")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset missing: {data_path}")

    # 1. Load Data & Generate Synthetic Target
    df_raw = pd.read_csv(data_path)
    
    # We must run the feature engineer HERE to create the 'burnout_score' label.
    # In a true enterprise system, this label would be pre-calculated in a Data Warehouse (e.g. dbt).
    target_generator = WorkforceFeatureEngineer()
    df_with_target = target_generator.transform(df_raw)

    # CRITICAL: Prevent Target Leakage
    # If we don't drop these, CatBoost will just reverse-engineer the formula: 
    # burnout = stress - (engagement/2) + 5
    leakage_columns = ['stress_index', 'engagement_score', 'productivity_index']
    df_safe = df_with_target.drop(columns=leakage_columns, errors='ignore')

    # 2. Data Processing Strategy
    # Using 'burnout_score' as our continuous y-variable
    processor = WorkforceDataProcessor(target_col="burnout_score")
    X_train, X_test, y_train, y_test = processor.prepare_training_data(df_safe)

    # Build the dynamic preprocessor (imputation + scaling + encoding)
    column_preprocessor = processor.build_preprocessor(X_train)

    # 3. Master Pipeline Assembly
    # Notice we don't include WorkforceFeatureEngineer here, because it requires
    # the exact features we just dropped to prevent leakage.
    base_pipeline = Pipeline([
        ("preprocessing", column_preprocessor),
        ("regressor", CatBoostRegressor(
            loss_function='RMSE',
            random_seed=42,
            verbose=0 # Keep logs clean during GridSearch
        ))
    ])

    # 4. Hyperparameter Tuning
    # Double-underscore routing targets CatBoost specifically
    param_grid = {
        'regressor__iterations': [200, 500],
        'regressor__learning_rate': [0.05, 0.1],
        'regressor__depth': [4, 6]
    }

    logger.info("Starting Cross-Validation Hyperparameter Tuning for CatBoost...")
    grid_search = GridSearchCV(
        estimator=base_pipeline,
        param_grid=param_grid,
        cv=5,
        scoring='neg_root_mean_squared_error', # Scikit-learn minimizes, so it uses negative RMSE
        n_jobs=-1,
        verbose=1
    )

    grid_search.fit(X_train, y_train)
    best_pipeline = grid_search.best_estimator_
    logger.info(f"Optimal hyperparameters discovered: {grid_search.best_params_}")

    # 5. Enterprise Evaluation
    logger.info("Evaluating optimal pipeline against holdout test set.")
    y_pred = best_pipeline.predict(X_test)
    
    evaluation_results = evaluate_regression_model(
        model_name="CatBoost_Burnout_Pipeline_V1",
        y_true=y_test,
        y_pred=y_pred
    )

    # 6. Artifact Serialization
    artifact_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), "model_burnout.joblib")
    os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
    
    joblib.dump(best_pipeline, artifact_path)
    logger.info(f"Production Burnout regressor serialized to: {artifact_path}")

    return best_pipeline, evaluation_results

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    DATA_PATH = "data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
    
    try:
        pipeline, metrics = train_burnout_pipeline(DATA_PATH)
        # Cleanly print the Pydantic schema as JSON
        print(metrics.model_dump_json(indent=2))
    except Exception as e:
        logger.error("Burnout training pipeline failed.", exc_info=True)