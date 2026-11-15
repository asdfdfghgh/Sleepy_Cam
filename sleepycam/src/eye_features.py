"""
Eye Feature Extraction, Blink Dynamics & PERCLOS Analysis
==========================================================
Computes Eye Aspect Ratio (EAR), blink frequency, blink duration,
long-eye-closures, and rolling window PERCLOS (Percentage of Eye Closure).
"""

import time
import math
from typing import List, Tuple, Optional, Deque
from collections import deque
import numpy as np

from config import EyeConfig, CONFIG


def euclidean_dist(pt1: Tuple[int, int], pt2: Tuple[int, int]) -> float:
    """Computes Euclidean distance between two 2D points."""
    return math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])


def calculate_ear(eye_landmarks: List[Tuple[int, int]]) -> float:
    """
    Computes Eye Aspect Ratio (EAR) from 6 canonical eye landmarks:
    [p1(outer), p2(top1), p3(top2), p4(inner), p5(bot2), p6(bot1)]
    Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    """
    if len(eye_landmarks) < 6:
        return 0.0

    p1, p2, p3, p4, p5, p6 = eye_landmarks[:6]

    # Vertical distances
    dist_v1 = euclidean_dist(p2, p6)
    dist_v2 = euclidean_dist(p3, p5)

    # Horizontal distance
    dist_h = euclidean_dist(p1, p4)

    if dist_h < 1e-6:
        return 0.0

    return (dist_v1 + dist_v2) / (2.0 * dist_h)


class EyeMetricsTracker:
    """
    Tracks real-time eye aspect ratios, blink dynamics, and PERCLOS
    over configurable rolling time windows.
    """

    def __init__(self, config: Optional[EyeConfig] = None):
        self.config = config or CONFIG.eye

        # State machine for blink tracking
        self.is_eye_closed: bool = False
        self.closure_start_time: Optional[float] = None
        self.closure_start_frame: int = 0
        self.current_frame_idx: int = 0

        # Rolling history buffers
        # Timestamps of completed blinks: (timestamp, duration_sec, is_long)
        self.blink_history: Deque[Tuple[float, float, bool]] = deque()

        # Rolling frames for PERCLOS: deque of (timestamp, is_closed_bool)
        self.perclos_samples: Deque[Tuple[float, bool]] = deque()

        # Cumulative totals
        self.total_blinks: int = 0
        self.total_long_blinks: int = 0
        self.last_blink_duration: float = 0.0

        # Current active closure duration (for live alert/microsleep)
        self.current_closure_duration: float = 0.0

    def process(
        self,
        landmarks: Optional[List[Tuple[int, int]]],
        baseline_ear: Optional[float] = None,
        now: Optional[float] = None
    ) -> dict:
        """
        Process current frame landmarks and update all eye metrics.
        Returns dictionary of computed eye features.
        """
        if now is None:
            now = time.time()
        self.current_frame_idx += 1

        # Fallback if no landmarks detected
        if not landmarks or len(landmarks) < 468:
            return self._build_empty_output(now, baseline_ear)

        # 1. Extract eye coordinates
        left_pts = [landmarks[idx] for idx in self.config.left_eye_indices if idx < len(landmarks)]
        right_pts = [landmarks[idx] for idx in self.config.right_eye_indices if idx < len(landmarks)]

        if len(left_pts) < 6 or len(right_pts) < 6:
            return self._build_empty_output(now, baseline_ear)

        # 2. Calculate EAR for left, right, and average
        left_ear = calculate_ear(left_pts)
        right_ear = calculate_ear(right_pts)
        avg_ear = (left_ear + right_ear) / 2.0

        # Effective thresholds
        ref_ear = baseline_ear if (baseline_ear is not None and baseline_ear > 0.05) else self.config.default_ear_threshold
        # Closure threshold: e.g. 75% of baseline EAR
        closure_threshold = ref_ear * self.config.perclos_closure_threshold_pct

        is_currently_closed = avg_ear < closure_threshold

        # 3. Eye Openness percentage (0 - 100%)
        # Openness = (avg_ear / ref_ear) * 100 clamped
        openness_pct = float(np.clip((avg_ear / max(ref_ear, 1e-4)) * 100.0, 0.0, 150.0))

        # 4. Blink State Machine
        if is_currently_closed:
            if not self.is_eye_closed:
                self.is_eye_closed = True
                self.closure_start_time = now
                self.closure_start_frame = self.current_frame_idx

            self.current_closure_duration = now - (self.closure_start_time or now)
        else:
            if self.is_eye_closed:
                # Eye just opened: evaluate the completed closure
                duration = now - (self.closure_start_time or now)
                frames_closed = self.current_frame_idx - self.closure_start_frame

                # Discard noise/glitches shorter than min consecutive frames (~0.05s)
                if frames_closed >= self.config.blink_consecutive_frames_min:
                    is_long = duration >= self.config.long_blink_duration_sec
                    self.total_blinks += 1
                    if is_long:
                        self.total_long_blinks += 1

                    self.last_blink_duration = duration
                    self.blink_history.append((now, duration, is_long))

                self.is_eye_closed = False
                self.closure_start_time = None
                self.current_closure_duration = 0.0

        # 5. Maintain rolling PERCLOS window
        self.perclos_samples.append((now, is_currently_closed))
        cutoff = now - self.config.perclos_window_sec
        while self.perclos_samples and self.perclos_samples[0][0] < cutoff:
            self.perclos_samples.popleft()

        # Compute PERCLOS (% time eye was closed in rolling window)
        if self.perclos_samples:
            closed_count = sum(1 for _, closed in self.perclos_samples if closed)
            perclos_pct = (closed_count / len(self.perclos_samples)) * 100.0
        else:
            perclos_pct = 0.0

        # 6. Maintain rolling blink rate and average blink duration
        while self.blink_history and self.blink_history[0][0] < cutoff:
            self.blink_history.popleft()

        recent_blinks = list(self.blink_history)
        window_duration_min = max(0.1, (now - cutoff) / 60.0) if self.blink_history else 1.0
        # If tracking time is less than window, normalize to actual elapsed window
        actual_window_sec = min(self.config.perclos_window_sec, max(1.0, now - (self.blink_history[0][0] if self.blink_history else now)))
        blink_rate_per_min = (len(recent_blinks) / max(0.1, actual_window_sec)) * 60.0

        if recent_blinks:
            durations = [d for _, d, _ in recent_blinks]
            avg_blink_duration = float(np.mean(durations))
            recent_long_blinks = sum(1 for _, _, is_long in recent_blinks if is_long)
        else:
            avg_blink_duration = self.last_blink_duration
            recent_long_blinks = 0

        return {
            "ear": float(avg_ear),
            "left_ear": float(left_ear),
            "right_ear": float(right_ear),
            "eye_openness": float(openness_pct),
            "is_closed": bool(is_currently_closed),
            "closure_duration": float(self.current_closure_duration),
            "total_blinks": int(self.total_blinks),
            "blink_rate": float(blink_rate_per_min),
            "blink_duration": float(self.last_blink_duration),
            "avg_blink_duration": float(avg_blink_duration),
            "long_blink_count": int(recent_long_blinks),
            "total_long_blinks": int(self.total_long_blinks),
            "perclos": float(perclos_pct),
            "left_points": left_pts,
            "right_points": right_pts
        }

    def _build_empty_output(self, now: float, baseline_ear: Optional[float]) -> dict:
        return {
            "ear": 0.0,
            "left_ear": 0.0,
            "right_ear": 0.0,
            "eye_openness": 0.0,
            "is_closed": False,
            "closure_duration": 0.0,
            "total_blinks": int(self.total_blinks),
            "blink_rate": 0.0,
            "blink_duration": float(self.last_blink_duration),
            "avg_blink_duration": float(self.last_blink_duration),
            "long_blink_count": 0,
            "total_long_blinks": int(self.total_long_blinks),
            "perclos": 0.0,
            "left_points": [],
            "right_points": []
        }
