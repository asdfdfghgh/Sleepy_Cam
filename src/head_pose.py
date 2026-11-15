"""
Head Pose Estimation, Angular Velocity & Nodding Detection
===========================================================
Estimates 3D Head Pose (Pitch, Yaw, Roll) via Perspective-n-Point (solvePnP),
tracks head movement velocity, downward head tilt, and repeated nodding patterns.
"""

import time
import math
from typing import List, Tuple, Optional, Deque
from collections import deque
import numpy as np

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False

from config import HeadPoseConfig, CONFIG


class HeadPoseEstimator:
    """
    Estimates 3D head rotation angles and detects fatigue-related head kinematics
    such as nodding and progressive downward drooping.
    """

    def __init__(self, config: Optional[HeadPoseConfig] = None):
        self.config = config or CONFIG.head_pose

        # Canonical 3D facial model points
        self.model_points = np.array(self.config.model_points, dtype=np.float64)

        # Angular history for velocity & nodding
        # (timestamp, pitch, yaw, roll)
        self.pose_history: Deque[Tuple[float, float, float, float]] = deque()
        self.last_angles: Optional[Tuple[float, float, float]] = None
        self.last_time: Optional[float] = None

        # Nodding event detection
        # Cycle tracking: downward drop -> bottom point -> upward recovery
        self.nodding_events: Deque[float] = deque() # Timestamps of detected nods
        self.total_nods: int = 0
        self.in_nod_cycle: bool = False
        self.nod_start_pitch: float = 0.0
        self.nod_start_time: float = 0.0
        self.nod_min_pitch: float = 0.0

        # Smoothed stability score (100 = perfectly still, 0 = erratic/nodding)
        self.stability_score: float = 85.0

    def estimate_pose(
        self,
        landmarks: Optional[List[Tuple[int, int]]],
        image_shape: Tuple[int, int],
        now: Optional[float] = None
    ) -> dict:
        """
        Estimate 3D head pose and kinematics.
        image_shape: (height, width)
        """
        if now is None:
            now = time.time()

        if not CV2_AVAILABLE or not landmarks or len(landmarks) < 300:
            return self._build_empty_output(now)

        h, w = image_shape[:2]

        # 2D image points corresponding to canonical 3D model
        image_points = []
        for idx in self.config.landmark_indices:
            if idx < len(landmarks):
                image_points.append(landmarks[idx])
            else:
                image_points.append((w // 2, h // 2))

        image_points = np.array(image_points, dtype=np.float64)

        # Camera intrinsic matrix approximation
        focal_length = float(w)
        center = (w / 2.0, h / 2.0)
        camera_matrix = np.array([
            [focal_length, 0.0, center[0]],
            [0.0, focal_length, center[1]],
            [0.0, 0.0, 1.0]
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        # Solve Perspective-n-Point
        success, rvec, tvec = cv2.solvePnP(
            self.model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return self._build_empty_output(now)

        # Convert rotation vector to rotation matrix
        rmat, _ = cv2.Rodrigues(rvec)

        # Decompose rotation matrix into Euler angles
        # Using cv2.RQDecomp3x3 or direct trigonometry
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
        pitch, yaw, roll = angles[0], angles[1], angles[2]

        # Smooth angles & compute velocity
        dt = (now - self.last_time) if self.last_time else 0.033
        dt = max(1e-3, min(0.5, dt))

        velocity = 0.0
        if self.last_angles is not None:
            dp = abs(pitch - self.last_angles[0])
            dy = abs(yaw - self.last_angles[1])
            dr = abs(roll - self.last_angles[2])
            angular_dist = math.sqrt(dp**2 + dy**2 + dr**2)
            velocity = angular_dist / dt

        self.last_angles = (pitch, yaw, roll)
        self.last_time = now

        # Update pose history
        self.pose_history.append((now, pitch, yaw, roll))
        while self.pose_history and (now - self.pose_history[0][0]) > 60.0:
            self.pose_history.popleft()

        # Update stability score
        # High velocity or fluctuating pitch degrades stability
        target_stability = float(np.clip(100.0 - (velocity * 1.5), 10.0, 100.0))
        self.stability_score = (
            (1.0 - self.config.stability_smoothing_alpha) * self.stability_score
            + self.config.stability_smoothing_alpha * target_stability
        )

        # Detect head nodding cycles
        self._check_nodding(now, pitch, velocity)

        # Maintain nodding rate (nods per minute over last 60 seconds)
        while self.nodding_events and (now - self.nodding_events[0]) > 60.0:
            self.nodding_events.popleft()
        nod_frequency = float(len(self.nodding_events))

        return {
            "pitch": float(pitch),
            "yaw": float(yaw),
            "roll": float(roll),
            "velocity": float(velocity),
            "stability": float(self.stability_score),
            "nod_frequency": float(nod_frequency),
            "total_nods": int(self.total_nods),
            "is_nodding": bool(self.in_nod_cycle)
        }

    def _check_nodding(self, now: float, pitch: float, velocity: float):
        """
        Nodding pattern:
        1. Downward pitch excursion (head drops downward by > nod_pitch_drop_deg)
        2. Followed by an upward recovery within nod_recovery_window_sec.
        """
        if not self.in_nod_cycle:
            # Check if downward excursion started
            # Pitch in solvePnP: downward tilt usually lowers pitch angle
            if len(self.pose_history) >= 4:
                # Look at pitch delta over last 0.8s
                recent_samples = [p for t, p, _, _ in self.pose_history if (now - t) <= 0.8]
                if recent_samples:
                    delta = recent_samples[0] - pitch
                    if delta >= self.config.nod_pitch_drop_deg:
                        self.in_nod_cycle = True
                        self.nod_start_pitch = recent_samples[0]
                        self.nod_start_time = now
                        self.nod_min_pitch = pitch
        else:
            # Inside cycle: track minimum pitch reached
            if pitch < self.nod_min_pitch:
                self.nod_min_pitch = pitch

            elapsed = now - self.nod_start_time

            # Check for recovery: pitch rises back towards start
            recovery_delta = pitch - self.nod_min_pitch
            if recovery_delta >= (self.config.nod_pitch_drop_deg * 0.7):
                # Completed a full nod cycle!
                self.total_nods += 1
                self.nodding_events.append(now)
                self.in_nod_cycle = False
            elif elapsed > self.config.nod_recovery_window_sec:
                # Timed out without snapback (user may simply be looking down continuously)
                self.in_nod_cycle = False

    def _build_empty_output(self, now: float) -> dict:
        return {
            "pitch": 0.0,
            "yaw": 0.0,
            "roll": 0.0,
            "velocity": 0.0,
            "stability": float(self.stability_score),
            "nod_frequency": float(len(self.nodding_events)),
            "total_nods": int(self.total_nods),
            "is_nodding": False
        }
