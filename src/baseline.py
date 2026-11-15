"""
Personalized Baseline Calibration & Normalization
==================================================
Calculates user-specific nominal biometric metrics during a calibration phase
and provides relative deviation normalization for fatigue calculation.
"""

import os
import json
import time
from typing import Dict, Any, Optional, List
import numpy as np

from config import CalibrationConfig, CONFIG


class PersonalBaseline:
    """
    Collects facial and kinematic metrics during an initial calibration window
    to establish an individualized biometric reference model.
    """

    def __init__(self, config: Optional[CalibrationConfig] = None, duration_seconds: Optional[float] = None):
        self.config = config or CONFIG.calibration
        self.target_duration = duration_seconds if duration_seconds is not None else self.config.duration_seconds

        self.is_calibrated: bool = False
        self.start_time: Optional[float] = None
        self.elapsed_time: float = 0.0

        # Buffers for nominal measurement collection
        self._ear_samples: List[float] = []
        self._mar_samples: List[float] = []
        self._pitch_samples: List[float] = []
        self._head_vel_samples: List[float] = []
        self._facial_act_samples: List[float] = []
        self._blink_durations: List[float] = []
        self._shoulder_angles: List[float] = []
        self._head_dists: List[float] = []
        self._total_blinks_calib: int = 0

        # Nominal baseline values (default fallback before calibration)
        self.data: Dict[str, float] = {
            "ear": 0.28,
            "blink_rate": 14.0,       # blinks per minute
            "blink_duration": 0.18,   # seconds
            "mar": 0.25,
            "head_pitch": 0.0,
            "head_movement": 12.0,    # deg/s
            "facial_activity": 45.0,  # 0-100 scale
            "shoulder_angle": 0.0,
            "head_dist": 1.2
        }

    def start(self, now: Optional[float] = None):
        """Starts the calibration timer."""
        self.start_time = now or time.time()
        self.is_calibrated = False
        self.reset_buffers()

    def reset_buffers(self):
        self._ear_samples.clear()
        self._mar_samples.clear()
        self._pitch_samples.clear()
        self._head_vel_samples.clear()
        self._facial_act_samples.clear()
        self._blink_durations.clear()
        self._shoulder_angles.clear()
        self._head_dists.clear()
        self._total_blinks_calib = 0

    def update(
        self,
        eye_metrics: dict,
        mouth_metrics: dict,
        pose_metrics: dict,
        posture_metrics: dict,
        facial_activity: float,
        now: Optional[float] = None
    ) -> float:
        """
        Feeds live metrics into calibration buffers.
        Returns: progress ratio (0.0 to 1.0).
        """
        if self.is_calibrated:
            return 1.0

        now = now or time.time()
        if self.start_time is None:
            self.start(now)

        self.elapsed_time = now - self.start_time

        # Warmup period check (ignore first few seconds while user settles in)
        if self.elapsed_time > self.config.warmup_seconds:
            if eye_metrics.get("ear", 0.0) > 0.08:
                self._ear_samples.append(eye_metrics["ear"])
            if mouth_metrics.get("mar", 0.0) > 0.05:
                self._mar_samples.append(mouth_metrics["mar"])
            if "pitch" in pose_metrics:
                self._pitch_samples.append(pose_metrics["pitch"])
                self._head_vel_samples.append(pose_metrics.get("velocity", 0.0))
            if facial_activity > 0.0:
                self._facial_act_samples.append(facial_activity)
            if eye_metrics.get("blink_duration", 0.0) > 0.05:
                self._blink_durations.append(eye_metrics["blink_duration"])
            if posture_metrics.get("is_tracked", False):
                self._shoulder_angles.append(posture_metrics["shoulder_angle"])
                self._head_dists.append(posture_metrics["head_dist"])

        progress = min(1.0, max(0.0, self.elapsed_time / max(1.0, self.target_duration)))

        if progress >= 1.0:
            self._finalize_calibration()

        return progress

    def _finalize_calibration(self):
        """Computes statistical baselines (robust median/mean) from buffers."""
        if self._ear_samples:
            # 75th percentile of EAR represents normal open eyes while filtering blinks
            self.data["ear"] = float(np.percentile(self._ear_samples, 70))
        if self._mar_samples:
            # 30th percentile represents neutral resting mouth
            self.data["mar"] = float(np.percentile(self._mar_samples, 35))
        if self._pitch_samples:
            self.data["head_pitch"] = float(np.median(self._pitch_samples))
        if self._head_vel_samples:
            self.data["head_movement"] = float(np.median(self._head_vel_samples))
        if self._facial_act_samples:
            self.data["facial_activity"] = float(np.median(self._facial_act_samples))
        if self._blink_durations:
            self.data["blink_duration"] = float(np.median(self._blink_durations))

        # Estimate nominal blink rate per minute
        calib_active_mins = max(0.1, (self.target_duration - self.config.warmup_seconds) / 60.0)
        self.data["blink_rate"] = max(8.0, min(28.0, len(self._blink_durations) / calib_active_mins))

        if self._shoulder_angles:
            self.data["shoulder_angle"] = float(np.median(self._shoulder_angles))
        if self._head_dists:
            self.data["head_dist"] = float(np.median(self._head_dists))

        self.is_calibrated = True

    def get_deviations(
        self,
        current_ear: float,
        current_mar: float,
        current_pitch: float,
        current_activity: float
    ) -> Dict[str, float]:
        """
        Computes relative deviations against personalized baseline.
        Negative EAR deviation = eye is closing compared to baseline.
        """
        base_ear = max(0.01, self.data.get("ear", 0.28))
        base_mar = max(0.01, self.data.get("mar", 0.25))
        base_act = max(0.01, self.data.get("facial_activity", 45.0))

        ear_dev = (current_ear - base_ear) / base_ear
        mar_dev = (current_mar - base_mar) / base_mar
        pitch_dev = current_pitch - self.data.get("head_pitch", 0.0)
        act_dev = (current_activity - base_act) / base_act

        return {
            "ear_relative_deviation": float(ear_dev),
            "mar_relative_deviation": float(mar_dev),
            "pitch_deviation_deg": float(pitch_dev),
            "activity_relative_deviation": float(act_dev)
        }

    def save(self, filepath: Optional[str] = None):
        """Saves baseline data to JSON file."""
        path = filepath or self.config.save_baseline_path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({
                "calibrated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "duration_seconds": self.target_duration,
                "metrics": self.data
            }, f, indent=2)

    def load(self, filepath: Optional[str] = None) -> bool:
        """Loads previously saved baseline."""
        path = filepath or self.config.save_baseline_path
        if not os.path.exists(path):
            return False
        try:
            with open(path, "r") as f:
                data = json.load(f)
                if "metrics" in data:
                    self.data.update(data["metrics"])
                    self.is_calibrated = True
                    return True
        except Exception:
            return False
        return False
