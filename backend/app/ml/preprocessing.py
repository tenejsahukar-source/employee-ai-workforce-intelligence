import logging
import os
import joblib
from typing import Tuple

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import (
    StandardScaler,
    OneHotEncoder,
    LabelEncoder
)
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

from app.config.ml_config import ml_config

logger = logging.getLogger(__name__)


class WorkforceDataProcessor:
    """
    Enterprise-grade data processor for Workforce Analytics.

    Responsibilities:
    - Data cleaning
    - Target encoding
    - Train/test splitting
    - Robust preprocessing pipeline creation
    - Artifact persistence
    """

    # Columns with no predictive value
    # Ideally move to config later
    COLUMNS_TO_DROP = [
        'EmployeeNumber',
        'EmployeeCount',
        'Over18',
        'StandardHours'
    ]

    def __init__(self, target_col: str = "Attrition"):
        self.target_col = target_col
        self.label_encoder = LabelEncoder()

    # =========================================================
    # PREPROCESSOR
    # =========================================================

    def build_preprocessor(self, X_train: pd.DataFrame) -> ColumnTransformer:
        """
        Builds a production-safe preprocessing pipeline.

        Features:
        - Missing value handling
        - Scaling for numerical features
        - One-hot encoding for categorical features
        - Sparse matrix optimization for scalability
        """

        if X_train.empty:
            raise ValueError("Training dataframe is empty.")

        # Better numeric detection
        categorical_cols = X_train.select_dtypes(
            include=['object', 'category']
        ).columns.tolist()

        numerical_cols = X_train.select_dtypes(
            include=['number']
        ).columns.tolist()

        logger.info(
            f"Identified {len(numerical_cols)} numerical "
            f"and {len(categorical_cols)} categorical features."
        )

        # =========================
        # Numerical Pipeline
        # =========================
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        # =========================
        # Categorical Pipeline
        # =========================
        categorical_transformer = Pipeline(steps=[
            (
                'imputer',
                SimpleImputer(
                    strategy='constant',
                    fill_value='missing'
                )
            ),

            # Sparse output for memory efficiency
            (
                'onehot',
                OneHotEncoder(
                    handle_unknown='ignore'
                )
            )
        ])

        # =========================
        # Combined Preprocessor
        # =========================
        preprocessor = ColumnTransformer(
           transformers=[
                ('num', numeric_transformer, numerical_cols),
                ('cat', categorical_transformer, categorical_cols)
            ],
            remainder='drop'
        )

        # Save preprocessor artifact
        self._save_artifact(
            preprocessor,
            "preprocessor.joblib"
        )

        logger.info("Preprocessor pipeline built successfully.")

        return preprocessor

    # =========================================================
    # TRAINING DATA PREPARATION
    # =========================================================

    def prepare_training_data(
        self,
        df: pd.DataFrame,
        test_size: float = 0.2
    ) -> Tuple[
        pd.DataFrame,
        pd.DataFrame,
        pd.Series,
        pd.Series
    ]:
        """
        Prepares raw dataframe for model training.

        Steps:
        - Validation
        - Feature cleaning
        - Target encoding
        - Stratified train/test split
        """

        logger.info("Preparing training data...")

        # =========================
        # Validation
        # =========================
        if df.empty:
            raise ValueError("Input dataframe is empty.")

        if len(df) < 10:
            raise ValueError(
                "Dataset too small for reliable training."
            )

        if self.target_col not in df.columns:
            raise ValueError(
                f"Target column '{self.target_col}' "
                f"not found in dataframe."
            )

        # =========================
        # Feature Cleaning & Target Drop
        # =========================
        y = df[self.target_col]
        
        # Clean features and explicitly drop the target column to prevent target leakage
        X = self._clean_features(df)
        X = X.drop(columns=[self.target_col])

        logger.info(f"Dataset shape: {X.shape}")

        # =========================
        # Target Distribution
        # =========================
        logger.info(
            f"Target distribution:\n"
            f"{y.value_counts(normalize=True)}"
        )

        # =========================
        # Target Encoding
        # =========================
        if y.dtype == 'object' or y.dtype.name == 'category':

            y = pd.Series(
                self.label_encoder.fit_transform(y),
                index=y.index
            )

            # Save encoder
            self._save_artifact(
                self.label_encoder,
                f"label_encoder_{self.target_col}.joblib"
            )

        # =========================
        # Safer Stratification
        # =========================
        stratify_target = y if y.nunique() > 1 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=42,
            stratify=stratify_target
        )

        logger.info(
            f"Training data shape: {X_train.shape}"
        )

        logger.info(
            f"Testing data shape: {X_test.shape}"
        )

        return X_train, X_test, y_train, y_test

    # =========================================================
    # INFERENCE DATA PREPARATION
    # =========================================================

    def prepare_inference_data(
        self,
        df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Cleans and prepares inference data.
        """

        logger.info("Preparing inference data...")

        if df.empty:
            raise ValueError("Inference dataframe is empty.")

        X = self._clean_features(df)

        # Remove target column if accidentally passed
        if self.target_col in X.columns:
            X = X.drop(columns=[self.target_col])

        logger.info(
            f"Inference data shape: {X.shape}"
        )

        return X

    # =========================================================
    # FEATURE CLEANING
    # =========================================================

    def _clean_features(
        self,
        df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Removes ID columns and zero-variance features.
        """

        cols_to_drop = [
            col for col in self.COLUMNS_TO_DROP
            if col in df.columns
        ]

        logger.info(
            f"Dropping columns: {cols_to_drop}"
        )

        return df.drop(columns=cols_to_drop)

    # =========================================================
    # FEATURE NAMES
    # =========================================================

    def get_feature_names(
        self,
        preprocessor: ColumnTransformer
    ):
        """
        Returns transformed feature names.

        Useful for:
        - SHAP explainability
        - Feature importance
        - Debugging
        - Dashboards
        """

        return preprocessor.get_feature_names_out()

    # =========================================================
    # ARTIFACT SAVING
    # =========================================================

    def _save_artifact(
        self,
        artifact,
        filename: str
    ):
        """
        Handles safe artifact persistence.
        """

        base_path = os.path.dirname(
            ml_config.MODEL_ARTIFACT_PATH
        )

        os.makedirs(base_path, exist_ok=True)

        path = os.path.join(
            base_path,
            filename
        )

        joblib.dump(artifact, path)

        logger.info(
            f"Artifact saved successfully to: {path}"
        )