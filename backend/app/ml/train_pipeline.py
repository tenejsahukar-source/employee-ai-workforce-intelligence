import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from app.ml.feature_engineering import WorkforceFeatureEngineer
from app.ml.preprocessing import WorkforceDataProcessor
from app.config.ml_config import ml_config

def train_and_save_pipeline(df_raw: pd.DataFrame):
    """
    Master function to coordinate data processing, pipeline assembly, and training.
    """
    # 1. Initialize Processor & Prepare Data
    processor = WorkforceDataProcessor(target_col="Attrition")
    X_train, X_test, y_train, y_test = processor.prepare_training_data(df_raw)

    # 2. Build the Preprocessor dynamically based on X_train
    # (We build it here so it knows which columns are numeric vs categorical)
    column_preprocessor = processor.build_preprocessor(X_train)

    # 3. Assemble the Ultimate Master Pipeline
    pipeline = Pipeline([
        # Step A: Generate synthetic features (Stress Index, Burnout, etc.)
        ("feature_engineering", WorkforceFeatureEngineer()),
        
        # Step B: Impute missing values, Scale, and One-Hot Encode
        ("preprocessing", column_preprocessor),
        
        # Step C: The Estimator
        ("classifier", XGBClassifier(
            n_estimators=100, 
            learning_rate=0.1, 
            random_state=42,
            eval_metric='logloss'
        ))
    ])

    # 4. Train the entire monolithic pipeline
    print("Training enterprise ML pipeline...")
    pipeline.fit(X_train, y_train)

    # 5. Serialize ONE unified artifact
    joblib.dump(pipeline, ml_config.MODEL_ARTIFACT_PATH)
    print(f"Pipeline unified and serialized successfully to {ml_config.MODEL_ARTIFACT_PATH}")
    
    # Optional: Evaluate on X_test here
    
    return pipeline