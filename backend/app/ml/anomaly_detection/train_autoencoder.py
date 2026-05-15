import os
import logging
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Model # type: ignore
from tensorflow.keras.layers import Input, Dense # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau # type: ignore
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

from app.config.ml_config import ml_config

logger = logging.getLogger(__name__)

class AnomalyDetectorTrainer:
    """
    Enterprise training pipeline for Unsupervised Anomaly Detection.
    Builds, trains, and bundles an Autoencoder.
    """
    
    def __init__(self, feature_cols: list):
        self.feature_cols = feature_cols
        self.scaler = StandardScaler()

    def build_autoencoder(self, input_dim: int) -> Model:
        """Constructs a bottleneck autoencoder architecture."""
        input_layer = Input(shape=(input_dim,))
        
        # Encoder
        encoded = Dense(16, activation='relu')(input_layer)
        encoded = Dense(8, activation='relu')(encoded)
        
        # Bottleneck (forces the network to learn the most crucial compressed representations)
        encoded = Dense(4, activation='relu')(encoded)
        
        # Decoder
        decoded = Dense(8, activation='relu')(encoded)
        decoded = Dense(16, activation='relu')(decoded)
        decoded = Dense(input_dim, activation='linear')(decoded)
        
        autoencoder = Model(inputs=input_layer, outputs=decoded)
        autoencoder.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
            loss='mse'
        )
        return autoencoder

    def train_and_save(self, df: pd.DataFrame, artifact_name: str = "anomaly_bundle"):
        """
        Executes the training loop, computes the threshold, and saves the bundle.
        """
        logger.info("Initiating Autoencoder Training for Anomaly Detection...")
        
        # 1. Validate Data
        missing_cols = [col for col in self.feature_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required features: {missing_cols}")

        X_raw = df[self.feature_cols].copy()

        # 2. Prevent Sequential Bias via Shuffled Split
        X_train_raw, X_val_raw = train_test_split(X_raw, test_size=0.15, random_state=42)

        # 3. Fit Scaler ONLY on training data to prevent leakage
        X_train_scaled = self.scaler.fit_transform(X_train_raw)
        X_val_scaled = self.scaler.transform(X_val_raw)

        # 4. Build and Train Model
        input_dim = X_train_scaled.shape[1]
        autoencoder = self.build_autoencoder(input_dim)
        
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=4, verbose=1)
        ]

        autoencoder.fit(
            X_train_scaled, X_train_scaled,
            epochs=100,
            batch_size=32,
            validation_data=(X_val_scaled, X_val_scaled),
            callbacks=callbacks,
            verbose=1
        )

        # 5. Compute Anomaly Threshold (using the validation set to reflect unseen 'normal' variance)
        logger.info("Computing statistical threshold for anomalies...")
        val_predictions = autoencoder.predict(X_val_scaled, verbose=0)
        val_mse = np.mean(np.power(X_val_scaled - val_predictions, 2), axis=1)
        
        # 95th percentile means we expect 5% of our workforce to be flagged for review
        threshold = float(np.percentile(val_mse, 95))
        logger.info(f"Anomaly MSE Threshold set to: {threshold:.4f}")

        # 6. Bundle and Serialize
        bundle_dir = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), artifact_name)
        os.makedirs(bundle_dir, exist_ok=True)

        joblib.dump(self.scaler, os.path.join(bundle_dir, 'ae_scaler.joblib'))
        joblib.dump({'threshold': threshold, 'features': self.feature_cols}, os.path.join(bundle_dir, 'ae_meta.joblib'))
        autoencoder.save(os.path.join(bundle_dir, 'autoencoder.keras'))

        logger.info(f"Anomaly Detection bundle successfully saved to {bundle_dir}")
        return threshold

# Example execution:
# trainer = AnomalyDetectorTrainer(feature_cols=['productivity_index', 'stress_index', 'PercentSalaryHike'])
# threshold = trainer.train_and_save(df_featured)