"""
Multimodal Fatigue Calculator & Behavioral Scoring Engine
=========================================================
Synthesizes facial, ocular, oral, head pose, and postural features into an
interpretable 0-100 Fatigue Score using weighted behavioral heuristics or ML inference.
"""

from typing import List, Dict, Tuple, Optional, Any
import numpy as np

from config import FatigueConfig, CONFIG
from baseline import PersonalBaseline


FEATURE_NAMES = [
    "EAR",
    "left_EAR",
    "right_EAR",
    "PERCLOS",
    "blink_rate",
    "average_blink_duration",
    "long_blink_count",
    "MAR",
    "yawn_rate",
    "average_yawn_duration",
    "head_pitch",
    "head_yaw",
    "head_roll",
    "head_velocity",
    "head_nod_frequency",
    "facial_activity",
    "posture_score",
    "posture_change"
]


class FatigueCalculator:
    """
    Constructs the standard feature vector and computes continuous fatigue scores
    with customizable weighting and dynamic baseline normalization.
    """

    def __init__(self, config: Optional[FatigueConfig] = None):
        self.config = config or CONFIG.fatigue
        self.weights = self.config.weights
        self.smoothed_score: float = 10.0 # Start in awake state
        self.ml_model = None

    def set_ml_model(self, model):
        """Attaches a trained ML model wrapper."""
        self.ml_model = model

    def build_feature_vector(
        self,
        eye: dict,
        mouth: dict,
        pose: dict,
        posture: dict,
        facial_activity: float
    ) -> List[float]:
        """
        Builds the 18-element feature vector in exact specification order:
        [
            EAR, left_EAR, right_EAR, PERCLOS,
            blink_rate, average_blink_duration, long_blink_count,
            MAR, yawn_rate, average_yawn_duration,
            head_pitch, head_yaw, head_roll, head_velocity, head_nod_frequency,
            facial_activity, posture_score, posture_change
        ]
        """
        return [
            float(eye.get("ear", 0.0)),
            float(eye.get("left_ear", 0.0)),
            float(eye.get("right_ear", 0.0)),
            float(eye.get("perclos", 0.0)),
            float(eye.get("blink_rate", 0.0)),
            float(eye.get("avg_blink_duration", 0.0)),
            float(eye.get("long_blink_count", 0)),
            float(mouth.get("mar", 0.0)),
            float(mouth.get("yawns_per_min", 0.0)),
            float(mouth.get("avg_yawn_duration", 0.0)),
            float(pose.get("pitch", 0.0)),
            float(pose.get("yaw", 0.0)),
            float(pose.get("roll", 0.0)),
            float(pose.get("velocity", 0.0)),
            float(pose.get("nod_frequency", 0.0)),
            float(facial_activity),
            float(posture.get("posture_score", 85.0)),
            float(posture.get("posture_change", 0.0))
        ]

    def compute_score(
        self,
        features: List[float],
        baseline: PersonalBaseline,
        active_closure_duration: float = 0.0
    ) -> Tuple[float, str, Tuple[int, int, int], Dict[str, float]]:
        """
        Computes the fatigue score (0-100), label string, RGB color tuple, and component breakdown.
        """
        # If ML model is loaded and enabled, use ML inference
        if self.ml_model is not None and self.ml_model.is_ready():
            ml_pred, ml_score, ml_probs = self.ml_model.predict(features)
            raw_score = ml_score
            components = {"ml_probabilities": ml_probs}
        else:
            raw_score, components = self._compute_heuristic_score(features, baseline, active_closure_duration)

        # Apply exponential moving average smoothing
        alpha = self.config.smoothing_factor
        self.smoothed_score = (1.0 - alpha) * self.smoothed_score + alpha * raw_score
        final_score = float(np.clip(self.smoothed_score, 0.0, 100.0))

        # Determine level label and color
        label, color = self._classify_score(final_score)

        return final_score, label, color, components

    def _compute_heuristic_score(
        self,
        features: List[float],
        baseline: PersonalBaseline,
        active_closure_duration: float
    ) -> Tuple[float, Dict[str, float]]:
        """
        Computes the heuristic fatigue score from 0 to 100 based on weighted components.
        """
        (
            ear, left_ear, right_ear, perclos,
            blink_rate, avg_blink_duration, long_blink_count,
            mar, yawn_rate, avg_yawn_dur,
            pitch, yaw, roll, velocity, nod_freq,
            facial_act, posture_score, posture_change
        ) = features

        b_ear = max(0.01, baseline.data.get("ear", 0.28))
        b_blink_rate = max(1.0, baseline.data.get("blink_rate", 14.0))
        b_blink_dur = max(0.05, baseline.data.get("blink_duration", 0.18))
        b_pitch = baseline.data.get("head_pitch", 0.0)
        b_act = max(1.0, baseline.data.get("facial_activity", 45.0))

        # 1. PERCLOS Component (0 - 100): High importance
        # PERCLOS over 15% is drowsy, over 30% is severe
        perclos_score = float(np.clip((perclos / 25.0) * 100.0, 0.0, 100.0))

        # 2. Prolonged Eye Closures & Active Closure (0 - 100): High importance
        # If eyes are actively closed > 0.4s right now or recent long blinks
        active_closure_penalty = min(100.0, (active_closure_duration / 1.5) * 100.0) if active_closure_duration > 0.3 else 0.0
        long_blink_penalty = min(100.0, long_blink_count * 25.0)
        dur_ratio = max(0.0, (avg_blink_duration - b_blink_dur) / b_blink_dur)
        duration_penalty = min(100.0, dur_ratio * 60.0)
        eye_closure_score = max(active_closure_penalty, 0.6 * long_blink_penalty + 0.4 * duration_penalty)

        # 3. Blink Frequency Abnormalities (0 - 100): Moderate importance
        # Fatigue causes either hyper-blinking (dry eyes) or hypo-blinking (staring into space)
        rate_ratio = blink_rate / b_blink_rate if b_blink_rate > 0 else 1.0
        if rate_ratio < 0.5: # Staring / reduced blink rate
            blink_rate_score = min(100.0, (0.5 - rate_ratio) * 160.0)
        elif rate_ratio > 1.8: # Fluttering / struggle to keep eyes open
            blink_rate_score = min(100.0, (rate_ratio - 1.8) * 80.0)
        else:
            blink_rate_score = 0.0

        # 4. Yawning Component (0 - 100): Moderate importance
        # Yawns per min: 1 yawn/min is slightly tired, >= 3 yawns/min is severe
        yawn_score = min(100.0, (yawn_rate * 32.0) + (avg_yawn_dur * 6.0))

        # 5. Head Nodding & Downward Pitch (0 - 100): High importance
        nod_score = min(100.0, nod_freq * 45.0)
        pitch_drop = max(0.0, (b_pitch - pitch))
        if pitch_drop > 8.0:
            pitch_score = min(100.0, (pitch_drop - 8.0) * 5.0)
        else:
            pitch_score = 0.0
        head_kinematics_score = max(nod_score, 0.7 * nod_score + 0.3 * pitch_score)

        # 6. Posture Degradation (0 - 100): Moderate importance
        # Posture score drops when slouching or leaning heavily
        posture_fatigue_score = max(0.0, 100.0 - posture_score)

        # 7. Reduced Facial Activity (0 - 100): Low/Moderate importance
        # Monotone/mask-like face with low movement indicates exhaustion
        act_ratio = facial_act / b_act
        if act_ratio < 0.6:
            facial_inactivity_score = min(100.0, (0.6 - act_ratio) * 180.0)
        else:
            facial_inactivity_score = 0.0

        # Weighted combination
        raw_weighted = (
            self.weights.perclos * perclos_score +
            self.weights.long_blinks * eye_closure_score +
            self.weights.blink_frequency * blink_rate_score +
            self.weights.yawn_frequency * yawn_score +
            self.weights.head_nodding * head_kinematics_score +
            self.weights.posture_degradation * posture_fatigue_score +
            self.weights.facial_inactivity * facial_inactivity_score
        )

        components = {
            "perclos_component": float(perclos_score),
            "eye_closure_component": float(eye_closure_score),
            "blink_frequency_component": float(blink_rate_score),
            "yawn_component": float(yawn_score),
            "head_kinematics_component": float(head_kinematics_score),
            "posture_component": float(posture_fatigue_score),
            "facial_inactivity_component": float(facial_inactivity_score)
        }

        return float(np.clip(raw_weighted, 0.0, 100.0)), components

    def _classify_score(self, score: float) -> Tuple[str, Tuple[int, int, int]]:
        """Classifies numeric score into designated fatigue level and display color."""
        for label, (low, high, color) in self.config.score_ranges.items():
            if low <= score < high:
                return label, color
        # Top boundary check
        return "BRO YOU NEED SLEEP", (50, 30, 240)
