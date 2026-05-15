import logging
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

# Configure logger for this module
logger = logging.getLogger(__name__)

class MissingColumnsError(ValueError):
    """Custom exception raised when required DataFrame columns are missing."""
    pass

class WorkforceFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Enterprise-grade feature engineering transformer for Workforce Analytics.
    
    Designed to be fully compatible with scikit-learn Pipelines.
    Modularizes index generation, includes schema validation, ensures
    robust error handling, and parameterized tuning.
    """
    
    # Define exact schema contract expected by this transformer
    REQUIRED_COLUMNS = [
        'JobInvolvement', 'PerformanceRating', 'PercentSalaryHike',
        'DistanceFromHome', 'OverTime', 'EnvironmentSatisfaction',
        'JobSatisfaction', 'RelationshipSatisfaction', 'WorkLifeBalance'
    ]

    def __init__(self, 
                 productivity_hike_weight: float = 10.0,
                 stress_distance_weight: float = 10.0,
                 stress_overtime_penalty: float = 2.0,
                 burnout_engagement_discount: float = 2.0,
                 burnout_base_offset: float = 5.0,
                 burnout_max_score: float = 10.0):
        """
        Initializes the transformer with configurable hyperparameters.
        Extracting magic numbers allows for hyperparameter tuning via GridSearchCV.
        """
        self.productivity_hike_weight = productivity_hike_weight
        self.stress_distance_weight = stress_distance_weight
        self.stress_overtime_penalty = stress_overtime_penalty
        self.burnout_engagement_discount = burnout_engagement_discount
        self.burnout_base_offset = burnout_base_offset
        self.burnout_max_score = burnout_max_score

    def fit(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> 'WorkforceFeatureEngineer':
        """
        Fit method for scikit-learn Pipeline compatibility.
        As a stateless transformer, it simply validates the schema and returns self.
        """
        self._validate_input(X)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Applies the feature engineering transformations to the dataframe.
        """
        logger.info("Starting workforce feature engineering transformation.")
        self._validate_input(X)
        
        # Avoid pandas SettingWithCopyWarning and isolate transformations
        X_transformed = X.copy()
        
        try:
            X_transformed = self._compute_productivity_index(X_transformed)
            X_transformed = self._compute_stress_index(X_transformed)
            X_transformed = self._compute_engagement_score(X_transformed)
            X_transformed = self._compute_burnout_score(X_transformed)
        except Exception as e:
            logger.error(f"Critical error during feature transformation: {str(e)}", exc_info=True)
            raise

        new_features_count = len(X_transformed.columns) - len(X.columns)
        logger.info(f"Successfully generated {new_features_count} new synthetic features.")
        
        return X_transformed

    def _validate_input(self, X: pd.DataFrame) -> None:
        """Strict validation of the input schema to ensure Fail-Fast behavior."""
        missing_cols = [col for col in self.REQUIRED_COLUMNS if col not in X.columns]
        if missing_cols:
            error_msg = f"Data validation failed. Missing required columns: {missing_cols}"
            logger.error(error_msg)
            raise MissingColumnsError(error_msg)

    def _compute_productivity_index(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates Productivity Index."""
        df['productivity_index'] = (
            (df['JobInvolvement'] * df['PerformanceRating']) + 
            (df['PercentSalaryHike'] / self.productivity_hike_weight)
        )
        return df

    def _compute_stress_index(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates Stress Index with safe type coercion."""
        # Robust boolean casting handling 'Yes', 'True', 1, or boolean types
        is_overtime = df['OverTime'].apply(
            lambda x: 1 if str(x).strip().lower() in ['yes', 'y', '1', 'true'] else 0
        )
        
        df['stress_index'] = (
            (df['DistanceFromHome'] / self.stress_distance_weight) + 
            (is_overtime * self.stress_overtime_penalty) - 
            df['EnvironmentSatisfaction']
        )
        return df

    def _compute_engagement_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates Engagement Score."""
        df['engagement_score'] = (
            df['JobSatisfaction'] + 
            df['RelationshipSatisfaction'] + 
            df['WorkLifeBalance']
        )
        return df

    def _compute_burnout_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates Burnout Score based on previously computed stress and engagement."""
        raw_burnout = df['stress_index'] - (df['engagement_score'] / self.burnout_engagement_discount)
        
        # Normalize to max_score bounds safely using NumPy
        df['burnout_score'] = np.clip(
            raw_burnout + self.burnout_base_offset, 
            0, 
            self.burnout_max_score
        )
        return df