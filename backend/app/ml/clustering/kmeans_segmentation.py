import os
import logging
import pandas as pd
import joblib
from typing import Dict, Tuple, List
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from app.config.ml_config import ml_config

logger = logging.getLogger(__name__)

class WorkforceClusteringTrainer:
    """
    Enterprise training pipeline for Workforce Segmentation.
    Handles artifact generation, robust centroid analysis, and safe serialization.
    """
    
    # Standard behavioral features expected by this clustering module
    DEFAULT_FEATURES = ['productivity_index', 'stress_index', 'engagement_score']

    def __init__(self, n_clusters: int = 3):
        self.n_clusters = n_clusters
        self.feature_cols = self.DEFAULT_FEATURES

    def train_and_save(self, df: pd.DataFrame, artifact_name: str = "clustering_bundle.joblib") -> Tuple[Pipeline, Dict[int, str]]:
        """
        Trains the segmentation pipeline and generates dynamic business labels.
        """
        logger.info(f"Initiating KMeans Clustering Training for {self.n_clusters} clusters...")
        
        # 1. Validate Data
        missing_cols = [col for col in self.feature_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required features for clustering: {missing_cols}")

        X_train = df[self.feature_cols].copy()

        # 2. Assemble Scikit-Learn Pipeline
        clustering_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('kmeans', KMeans(n_clusters=self.n_clusters, random_state=42, n_init=10))
        ])

        # 3. Fit Pipeline
        clustering_pipeline.fit(X_train)

        # 4. Extract Centroids for Business Logic
        # We must pull the scaler and kmeans model OUT of the pipeline to reverse-transform the centroids
        scaler = clustering_pipeline.named_steps['scaler']
        kmeans = clustering_pipeline.named_steps['kmeans']
        
        centroids_raw = kmeans.cluster_centers_
        centroids_real_scale = scaler.inverse_transform(centroids_raw)
        centroid_df = pd.DataFrame(centroids_real_scale, columns=self.feature_cols)

        # 5. Generate Collision-Proof Business Labels
        labels = self._generate_robust_labels(centroid_df)

        # 6. Create Model Bundle and Serialize
        bundle = {
            'pipeline': clustering_pipeline,
            'labels_map': labels,
            'features': self.feature_cols
        }
        
        artifact_path = os.path.join(os.path.dirname(ml_config.MODEL_ARTIFACT_PATH), "segmentation", artifact_name)
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        joblib.dump(bundle, artifact_path)
        
        logger.info(f"Clustering Bundle serialized successfully to: {artifact_path}")
        logger.info(f"Assigned Cluster Labels: {labels}")
        
        return clustering_pipeline, labels

    def _generate_robust_labels(self, centroid_df: pd.DataFrame) -> Dict[int, str]:
        """
        Collision-proof heuristic assignment. 
        Ensures a cluster is only assigned one primary persona.
        """
        labels = {}
        unassigned_clusters = set(range(self.n_clusters))

        # Helper function to safely assign a label to the best available cluster
        def assign_label(feature: str, label_name: str, maximize: bool = True):
            if feature not in centroid_df.columns or not unassigned_clusters:
                return
                
            # Filter DataFrame to only unassigned clusters
            available_df = centroid_df.loc[list(unassigned_clusters)]
            
            # Find index of max or min
            best_idx = available_df[feature].idxmax() if maximize else available_df[feature].idxmin()
            
            labels[best_idx] = label_name
            unassigned_clusters.remove(best_idx)

        # Priority 1: High Stress gets the Burnout label
        assign_label('stress_index', "Burnout Risk", maximize=True)
        
        # Priority 2: Highest Productivity (of the remaining) gets High Performers
        assign_label('productivity_index', "High Performers", maximize=True)
        
        # Priority 3: Lowest Engagement gets Low Engagement
        assign_label('engagement_score', "Low Engagement", maximize=False)

        # Catch-all for any remaining clusters
        for idx in list(unassigned_clusters):
            labels[idx] = "General Workforce"

        return labels

# Example Execution
# trainer = WorkforceClusteringTrainer(n_clusters=3)
# trainer.train_and_save(df_featured)