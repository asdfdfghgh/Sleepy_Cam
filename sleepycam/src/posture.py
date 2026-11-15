"""
Body Posture Tracking & Slouching Analysis
===========================================
Tracks shoulder tilt, torso-head alignment, slouching, and posture stability
using MediaPipe Pose with graceful degradation when pose is unavailable.
"""

import time
import math
from typing import Tuple, Optional, Deque
from collections import deque
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    mp = None
    MEDIAPIPE_AVAILABLE = False

from config import PostureConfig, CONFIG


class PostureTracker:
    """
    Analyzes upper body posture (shoulders, neck alignment, slouching).
    Falls back gracefully if MediaPipe Pose is not installed or shoulders not visible.
    """

    def __init__(self, config: Optional[PostureConfig] = None):
        self.config = config or CONFIG.posture
        self.pose = None

        if MEDIAPIPE_AVAILABLE and self.config.enable_pose and hasattr(mp, "solutions") and hasattr(mp.solutions, "pose"):
            try:
                self.mp_pose = mp.solutions.pose
                self.pose = self.mp_pose.Pose(
                    static_image_mode=False,
                    model_complexity=0, # Fast CPU friendly model
                    enable_segmentation=False,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
            except Exception:
                self.pose = None

        # Posture history for stability and drift
        # (timestamp, shoulder_angle, head_shoulder_dist)
        self.history: Deque[Tuple[float, float, float]] = deque()
        self.smoothed_posture_score: float = 85.0
        self.posture_change_metric: float = 0.0

    def process(
        self,
        frame_rgb: np.ndarray,
        baseline_posture: Optional[dict] = None,
        now: Optional[float] = None
    ) -> dict:
        """
        Processes frame for upper body posture indicators.
        """
        if now is None:
            now = time.time()

        if self.pose is None:
            return self._build_fallback_output(baseline_posture)

        h, w = frame_rgb.shape[:2]
        try:
            results = self.pose.process(frame_rgb)
        except Exception:
            return self._build_fallback_output(baseline_posture)

        if not results.pose_landmarks:
            return self._build_fallback_output(baseline_posture)

        landmarks = results.pose_landmarks.landmark
        l_sh = landmarks[self.config.shoulder_left_idx]
        r_sh = landmarks[self.config.shoulder_right_idx]
        nose = landmarks[self.config.nose_idx]

        # Check visibility
        if l_sh.visibility < 0.4 or r_sh.visibility < 0.4:
            return self._build_fallback_output(baseline_posture)

        # 1. Shoulder Angle (Tilt/Leaning)
        dx = (l_sh.x - r_sh.x) * w
        dy = (l_sh.y - r_sh.y) * h
        shoulder_angle_deg = math.degrees(math.atan2(dy, dx))

        # 2. Torso-Head Alignment (Slouching indicator)
        # Vertical distance from nose to shoulder center line
        shoulder_center_y = ((l_sh.y + r_sh.y) / 2.0) * h
        nose_y = nose.y * h
        head_drop_dist = shoulder_center_y - nose_y # Positive when head is above shoulders

        # Normalize relative to shoulder width
        shoulder_width = max(10.0, math.hypot(dx, dy))
        norm_head_dist = head_drop_dist / shoulder_width

        # 3. Posture Score Calculation
        # Baseline comparisons
        base_angle = baseline_posture.get("shoulder_angle", 0.0) if baseline_posture else 0.0
        base_dist = baseline_posture.get("head_dist", norm_head_dist) if baseline_posture else norm_head_dist

        tilt_dev = abs(shoulder_angle_deg - base_angle)
        # Slouching: head sinking lower relative to shoulders (norm_head_dist decreases)
        slouch_dev = max(0.0, (base_dist - norm_head_dist) * 100.0)

        # Stability / Quality score (100 = upright and aligned)
        penalty = (tilt_dev * 1.5) + (slouch_dev * 1.8)
        raw_score = float(np.clip(100.0 - penalty, 10.0, 100.0))

        self.smoothed_posture_score = 0.90 * self.smoothed_posture_score + 0.10 * raw_score

        # 4. Posture Change over rolling 30 seconds
        self.history.append((now, shoulder_angle_deg, norm_head_dist))
        while self.history and (now - self.history[0][0]) > 30.0:
            self.history.popleft()

        if len(self.history) >= 2:
            initial_angle = self.history[0][1]
            initial_dist = self.history[0][2]
            self.posture_change_metric = float(
                abs(shoulder_angle_deg - initial_angle) + abs(norm_head_dist - initial_dist) * 20.0
            )

        return {
            "shoulder_angle": float(shoulder_angle_deg),
            "head_dist": float(norm_head_dist),
            "is_slouching": bool(slouch_dev > 15.0),
            "is_leaning": bool(tilt_dev > 12.0),
            "posture_score": float(self.smoothed_posture_score),
            "posture_change": float(self.posture_change_metric),
            "is_tracked": True
        }

    def _build_fallback_output(self, baseline_posture: Optional[dict]) -> dict:
        """Fallback when full body pose is not detected or unavailable."""
        return {
            "shoulder_angle": 0.0,
            "head_dist": 1.0,
            "is_slouching": False,
            "is_leaning": False,
            "posture_score": float(self.smoothed_posture_score),
            "posture_change": 0.0,
            "is_tracked": False
        }

    def close(self):
        if self.pose:
            self.pose.close()
