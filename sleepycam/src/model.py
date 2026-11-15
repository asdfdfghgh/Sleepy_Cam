"""
Machine Learning Model Manager & Inference Pipeline
===================================================
Manages loading, feature scaling, and real-time inference for trained
classifiers (Random Forest, Logistic Regression, XGBoost, or PyTorch Temporal Models).
"""

import os
from typing import List, Tuple, Optional, Dict, Any
import numpy as np

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    joblib = None
    JOBLIB_AVAILABLE = False

from data_logger import LABEL_NAMES


class FatigueModelManager:
    """
    Loads saved Scikit-Learn / XGBoost models and scalers,
    transforms feature vectors, and computes class probabilities and fatigue scores.
    """

    def __init__(
        self,
        model_path: str = "models/best_model.joblib",
        scaler_path: str = "models/scaler.joblib"
    ):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.model = None
        self.scaler = None
        self.is_loaded: bool = False

        self.load_model()

    def load_model(self) -> bool:
        """Loads model and scaler from joblib binaries if present."""
        if not JOBLIB_AVAILABLE:
            return False

        if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
            try:
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.is_loaded = True
                return True
            except Exception as e:
                print(f"[ModelManager] Error loading model: {e}")
                self.is_loaded = False
                return False
        return False

    def is_ready(self) -> bool:
        return self.is_loaded and self.model is not None and self.scaler is not None

    def predict(self, features: List[float]) -> Tuple[int, float, Dict[str, float]]:
        """
        Runs ML inference on a single 18-element feature vector.
        Returns:
            predicted_class: 0 (Awake), 1 (Slightly Tired), 2 (Tired), 3 (Very Tired)
            fatigue_score: continuous score mapped from 0 to 100 based on expected fatigue value
            probabilities: dict of class name to probability
        """
        if not self.is_ready():
            return 0, 10.0, {name: (1.0 if i == 0 else 0.0) for i, name in enumerate(LABEL_NAMES)}

        # Format input vector
        X = np.array(features, dtype=np.float32).reshape(1, -1)
        # Handle any NaNs/Infs
        X = np.nan_to_num(X, nan=0.0, posinf=1.0, neginf=-1.0)

        # Scale features
        X_scaled = self.scaler.transform(X)

        # Predict class
        pred_class = int(self.model.predict(X_scaled)[0])

        # Predict probabilities
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X_scaled)[0]
            # Ensure 4 classes
            full_probs = [0.0] * 4
            classes = self.model.classes_
            for idx, c in enumerate(classes):
                if 0 <= c < 4:
                    full_probs[c] = float(probs[idx])

            # Expected value of fatigue level (0.0 to 3.0) -> scaled to 0 - 100
            expected_tier = (
                0.0 * full_probs[0] +
                1.0 * full_probs[1] +
                2.0 * full_probs[2] +
                3.0 * full_probs[3]
            )
            fatigue_score = float((expected_tier / 3.0) * 100.0)
            prob_dict = {LABEL_NAMES[i]: round(full_probs[i], 3) for i in range(4)}
        else:
            fatigue_score = float((pred_class / 3.0) * 100.0)
            prob_dict = {name: (1.0 if i == pred_class else 0.0) for i, name in enumerate(LABEL_NAMES)}

        return pred_class, fatigue_score, prob_dict
