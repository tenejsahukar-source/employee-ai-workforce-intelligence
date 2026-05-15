import os
import logging
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization, Input # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau # type: ignore
from sklearn.model_selection import train_test_split

from app.config.ml_config import ml_config
from app.ml.preprocessing import WorkforceDataProcessor
from app.ml.feature_engineering import WorkforceFeatureEngineer


# Configure logger
logger = logging.getLogger(__name__)

def build_ann(input_dim: int, task: str) -> Sequential:
    """
    Builds an enterprise-grade ANN with Batch Normalization and Dropout.
    Input layer is explicitly defined to prevent graph execution errors.
    """
    model = Sequential([
        Input(shape=(input_dim,)),
        Dense(128, activation='relu'),
        BatchNormalization(),
        Dropout(0.3),
        
        Dense(64, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        
        Dense(32, activation='relu'),
        BatchNormalization()
    ])
    
    # Task-specific Output Layers & Compilation
    if task == 'binary':
        model.add(Dense(1, activation='sigmoid'))
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
            loss='binary_crossentropy', 
            metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
        )
    elif task == 'multiclass':
        # Assuming 4 performance levels (0, 1, 2, 3)
        model.add(Dense(4, activation='softmax')) 
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
            loss='sparse_categorical_crossentropy', 
            metrics=['accuracy']
        )
    elif task == 'regression':
        model.add(Dense(1, activation='linear'))
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
            loss='mse', 
            metrics=['mae']
        )
    else:
        raise ValueError(f"Unsupported task type: {task}")
        
    return model


def train_ann_pipeline(df: pd.DataFrame, target_col: str, task: str, model_name: str):
    """
    Master function to coordinate 3-way split, preprocessing, DL training, and bundling.
    """
    logger.info(f"--- Initiating Deep Learning Pipeline for {model_name} ---")
    
    # 1. Isolate Targets and Prevent Leakage
    if task == 'regression' and target_col == 'burnout_score':
        # Drop the engineered features that constitute the target formula
        leakage_cols = ['stress_index', 'engagement_score', 'productivity_index']
        df = df.drop(columns=leakage_cols, errors='ignore')

    processor = WorkforceDataProcessor(target_col=target_col)
    
    # 2. Three-Way Split (Train / Validation / Test)
    # We need Test (for unbiased eval) and Val (for Early Stopping)
    X_temp, X_test, y_temp, y_test = processor.prepare_training_data(df, test_size=0.15)
    
    # Split the temp data again into Train and Val
    is_stratified = task != 'regression'
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, 
        test_size=0.15 / 0.85, # Math to ensure Val is ~15% of total original data
        random_state=42, 
        stratify=y_temp if is_stratified else None
    )

    # 3. Fit Preprocessor STRICTLY on Training Data (Zero Leakage)
    column_preprocessor = processor.build_preprocessor(X_train)
    
    X_train_processed = column_preprocessor.fit_transform(X_train)
    X_val_processed = column_preprocessor.transform(X_val)
    X_test_processed = column_preprocessor.transform(X_test)

    # Convert sparse matrices to dense arrays for TensorFlow
    if hasattr(X_train_processed, 'toarray'):
        X_train_processed = X_train_processed.toarray()
        X_val_processed = X_val_processed.toarray()
        X_test_processed = X_test_processed.toarray()

    # 4. Build & Train the Neural Network
    input_dim = X_train_processed.shape[1]
    model = build_ann(input_dim=input_dim, task=task)
    
    # Advanced Callbacks: Stop early if no improvement, reduce learning rate if plateauing
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=12, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5, verbose=1)
    ]
    
    logger.info("Training Neural Network...")
    model.fit(
        X_train_processed, y_train,
        validation_data=(X_val_processed, y_val),
        epochs=100,
        batch_size=32,
        callbacks=callbacks,
        verbose=1
    )
    
    # 5. Enterprise Evaluation Suite
    logger.info("Evaluating Network on pure holdout test set...")
    raw_predictions = model.predict(X_test_processed)
    
    if task == 'binary':
        y_prob = raw_predictions.flatten()
        y_pred = (y_prob > 0.5).astype(int)
        metrics = evaluate_model(model_name, y_test, y_pred, y_prob=y_prob, is_binary=True)
        
    elif task == 'multiclass':
        y_prob = raw_predictions
        y_pred = np.argmax(y_prob, axis=1)
        metrics = evaluate_model(model_name, y_test, y_pred, y_prob=y_prob, is_binary=False)
        
    elif task == 'regression':
        y_pred = raw_predictions.flatten()
        metrics = evaluate_regression_model(model_name, y_test, y_pred)

    # 6. Artifact Serialization (Model Bundling)
    # Because Joblib cannot safely serialize Keras models, we save them side-by-side in a dedicated folder
    bundle_dir = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), model_name)
    os.makedirs(bundle_dir, exist_ok=True)
    
    joblib.dump(column_preprocessor, os.path.join(bundle_dir, "preprocessor.joblib"))
    model.save(os.path.join(bundle_dir, "network.keras"))
    
    logger.info(f"Model Bundle (Preprocessor + Keras Graph) saved to: {bundle_dir}")
    print(metrics.model_dump_json(indent=2))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    
    # Example execution:
    DATA_PATH = "data/WA_Fn-UseC_-HR-Employee-Attrition.csv"
    if os.path.exists(DATA_PATH):
        df_raw = pd.read_csv(DATA_PATH)
        
        # We must generate the baseline synthetic features first
        fe = WorkforceFeatureEngineer()
        df_featured = fe.transform(df_raw)
        
        # Train Deep Learning Models
        train_ann_pipeline(df_featured, target_col='Attrition', task='binary', model_name='dl_attrition')
        # train_ann_pipeline(df_featured, target_col='PerformanceRating', task='multiclass', model_name='dl_performance')
        # train_ann_pipeline(df_featured, target_col='burnout_score', task='regression', model_name='dl_burnout')