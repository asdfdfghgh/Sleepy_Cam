"""
Mouth Feature Extraction & Temporal Yawn Detection
===================================================
Calculates Mouth Aspect Ratio (MAR) and implements temporal yawn state machine
to discriminate genuine yawning from talking, smiling, or brief vocalization.
"""

import time
import math
from typing import List, Tuple, Optional, Deque
from collections import deque
import numpy as np

from config import MouthConfig, CONFIG


def euclidean_dist(pt1: Tuple[int, int], pt2: Tuple[int, int]) -> float:
    return math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])


def calculate_mar(landmarks: List[Tuple[int, int]]) -> float:
    """
    Computes Mouth Aspect Ratio (MAR) using MediaPipe landmarks:
    p78: Left corner
    p308: Right corner
    p13: Upper lip center
    p14: Lower lip center
    p82: Upper lip left
    p87: Lower lip left
    p312: Upper lip right
    p317: Lower lip right
    """
    try:
        p_left = landmarks[78]
        p_right = landmarks[308]
        p_top_mid = landmarks[13]
        p_bot_mid = landmarks[14]
        p_top_l = landmarks[82]
        p_bot_l = landmarks[87]
        p_top_r = landmarks[312]
        p_bot_r = landmarks[317]

        d_v1 = euclidean_dist(p_top_mid, p_bot_mid)
        d_v2 = euclidean_dist(p_top_l, p_bot_l)
        d_v3 = euclidean_dist(p_top_r, p_bot_r)
        d_h = euclidean_dist(p_left, p_right)

        if d_h < 1e-4:
            return 0.0

        return (d_v1 + d_v2 + d_v3) / (3.0 * d_h)
    except IndexError:
        return 0.0


class MouthMetricsTracker:
    """
    Tracks MAR and detects prolonged mouth opening / genuine yawns
    using temporal thresholding.
    """

    def __init__(self, config: Optional[MouthConfig] = None):
        self.config = config or CONFIG.mouth

        # Yawn state machine
        self.is_mouth_open_wide: bool = False
        self.open_start_time: Optional[float] = None
        self.current_open_duration: float = 0.0

        # Completed yawns: (timestamp, duration_sec)
        self.yawn_history: Deque[Tuple[float, float]] = deque()
        self.total_yawns: int = 0
        self.last_yawn_duration: float = 0.0
        self.prolonged_openings_count: int = 0

    def process(
        self,
        landmarks: Optional[List[Tuple[int, int]]],
        baseline_mar: Optional[float] = None,
        now: Optional[float] = None
    ) -> dict:
        """
        Process current frame landmarks and update mouth/yawn metrics.
        """
        if now is None:
            now = time.time()

        if not landmarks or len(landmarks) < 320:
            return self._build_empty_output()

        mar = calculate_mar(landmarks)

        # Baseline-adapted threshold
        # If baseline MAR is ~0.25, yawn threshold is max(0.55, baseline * 1.8)
        ref_mar = baseline_mar if (baseline_mar is not None and baseline_mar > 0.05) else self.config.default_mar_threshold
        yawn_threshold = max(0.55, ref_mar * 1.75)

        is_wide = mar >= yawn_threshold

        # Yawn state machine
        if is_wide:
            if not self.is_mouth_open_wide:
                self.is_mouth_open_wide = True
                self.open_start_time = now

            self.current_open_duration = now - (self.open_start_time or now)

            # Check if this qualifies as a prolonged opening
            if self.current_open_duration >= self.config.yawn_min_duration_sec and not getattr(self, '_counted_current_prolonged', False):
                self.prolonged_openings_count += 1
                self._counted_current_prolonged = True
        else:
            if self.is_mouth_open_wide:
                # Mouth just closed: evaluate if opening qualified as a genuine yawn
                duration = now - (self.open_start_time or now)
                if self.config.yawn_min_duration_sec <= duration <= self.config.yawn_max_duration_sec:
                    self.total_yawns += 1
                    self.last_yawn_duration = duration
                    self.yawn_history.append((now, duration))

                self.is_mouth_open_wide = False
                self.open_start_time = None
                self.current_open_duration = 0.0
                self._counted_current_prolonged = False

        # Maintain rolling yawns per minute
        cutoff = now - self.config.yawn_window_sec
        while self.yawn_history and self.yawn_history[0][0] < cutoff:
            self.yawn_history.popleft()

        recent_yawns = list(self.yawn_history)
        actual_window_sec = min(self.config.yawn_window_sec, max(1.0, now - (self.yawn_history[0][0] if self.yawn_history else now)))
        yawns_per_min = (len(recent_yawns) / max(0.1, actual_window_sec)) * 60.0

        if recent_yawns:
            avg_yawn_dur = float(np.mean([d for _, d in recent_yawns]))
        else:
            avg_yawn_dur = float(self.last_yawn_duration)

        # Mouth opening percentage (relative to baseline / maximum opening)
        mouth_opening_pct = float(np.clip((mar / max(ref_mar, 1e-4)) * 50.0, 0.0, 150.0))

        return {
            "mar": float(mar),
            "mouth_opening_pct": float(mouth_opening_pct),
            "is_yawning": bool(self.is_mouth_open_wide and self.current_open_duration >= self.config.yawn_min_duration_sec),
            "yawn_duration": float(self.current_open_duration if self.is_mouth_open_wide else self.last_yawn_duration),
            "total_yawns": int(self.total_yawns),
            "yawns_per_min": float(yawns_per_min),
            "avg_yawn_duration": float(avg_yawn_dur),
            "prolonged_openings": int(self.prolonged_openings_count)
        }

    def _build_empty_output(self) -> dict:
        return {
            "mar": 0.0,
            "mouth_opening_pct": 0.0,
            "is_yawning": False,
            "yawn_duration": float(self.last_yawn_duration),
            "total_yawns": int(self.total_yawns),
            "yawns_per_min": 0.0,
            "avg_yawn_duration": float(self.last_yawn_duration),
            "prolonged_openings": int(self.prolonged_openings_count)
        }
