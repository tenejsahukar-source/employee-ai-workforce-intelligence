import io
import base64
import logging
import pandas as pd
import seaborn as sns
from typing import Dict, List, Any
from matplotlib.figure import Figure
from sklearn.decomposition import PCA

logger = logging.getLogger(__name__)

def plot_training_history_base64(history_dict: Dict[str, List[float]], title: str = "Training History") -> str:
    """
    Generates a thread-safe training history plot and returns it as a Base64 string.
    Ready to be embedded directly into an HTML <img> tag or React component.
    """
    # 1. Use Object-Oriented Matplotlib (Thread-Safe)
    fig = Figure(figsize=(12, 4))
    ax1, ax2 = fig.subplots(1, 2)
    
    # 2. Plot Loss
    if 'loss' in history_dict:
        ax1.plot(history_dict['loss'], label='Train Loss', color='blue')
    if 'val_loss' in history_dict:
        ax1.plot(history_dict['val_loss'], label='Validation Loss', color='orange')
        
    ax1.set_title('Model Loss')
    ax1.set_xlabel('Epochs')
    ax1.set_ylabel('Loss')
    ax1.legend()
    
    # 3. Plot Accuracy / Metric (Dynamically find the metric name)
    metrics = [k for k in history_dict.keys() if k not in ['loss', 'val_loss', 'lr']]
    if metrics:
        metric = metrics[0]
        val_metric = f"val_{metric}"
        
        ax2.plot(history_dict[metric], label=f'Train {metric.capitalize()}', color='green')
        if val_metric in history_dict:
            ax2.plot(history_dict[val_metric], label=f'Validation {metric.capitalize()}', color='red')
            
        ax2.set_title(f'Model {metric.capitalize()}')
        ax2.set_xlabel('Epochs')
        ax2.set_ylabel(metric.capitalize())
        ax2.legend()
    
    fig.tight_layout()
    
    # 4. Render to RAM Buffer (No Disk I/O)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    
    # 5. Encode to Base64
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    
    # 6. Clean up RAM
    buf.close()
    fig.clf()
    
    return img_base64

def plot_clusters_pca_base64(
    df: pd.DataFrame, 
    feature_cols: List[str], 
    labels_series: pd.Series, 
    preprocessor: Any
) -> str:
    """
    Reduces features to 2D via PCA and generates a thread-safe scatter plot.
    Expects the preprocessor to be passed in, avoiding disk I/O.
    """
    try:
        # 1. Transform data using the injected preprocessor
        X_scaled = preprocessor.transform(df[feature_cols])
        
        # 2. Dimensionality Reduction
        pca = PCA(n_components=2)
        X_pca = pca.fit_transform(X_scaled)
        
        plot_df = pd.DataFrame({
            'PCA1': X_pca[:, 0],
            'PCA2': X_pca[:, 1],
            'Segment': labels_series.values # Ensure it's a raw array to avoid index mismatch
        })
        
        # 3. Thread-Safe Figure Setup
        fig = Figure(figsize=(10, 6))
        ax = fig.subplots()
        
        # 4. Seaborn Plotting (passing the specific ax)
        sns.scatterplot(
            data=plot_df, 
            x='PCA1', 
            y='PCA2', 
            hue='Segment', 
            palette='viridis', 
            alpha=0.7,
            ax=ax
        )
        
        ax.set_title('Workforce Segments (PCA Projection)')
        ax.set_xlabel(f'PCA Component 1 ({pca.explained_variance_ratio_[0]:.2%} variance)')
        ax.set_ylabel(f'PCA Component 2 ({pca.explained_variance_ratio_[1]:.2%} variance)')
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        
        fig.tight_layout()
        
        # 5. Render to Buffer
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        buf.close()
        fig.clf()
        
        return img_base64
        
    except Exception as e:
        logger.error(f"Failed to generate PCA plot: {str(e)}", exc_info=True)
        raise