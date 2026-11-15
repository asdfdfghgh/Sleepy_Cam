"""
Experimental Microsleep-Like Event Detection Engine
====================================================
Monitors multimodal temporal patterns (eye closure + head pitch drooping +
sudden jerk recovery) to flag candidate microsleep occurrences.

DISCLAIMER: This is an experimental computer-vision heuristic indicator and
is NOT a certified medical diagnosis or automotive driving safety system.
"""

import time
from typing import List, Dict, Optional, Tuple, Deque
from collections import deque
from dataclasses import dataclass

from config import MicrosleepConfig, CONFIG
from baseline import PersonalBaseline


@dataclass
class MicrosleepEvent:
    timestamp: float
    formatted_time: str
    duration_sec: float
    peak_pitch_drop_deg: float
    recovery_velocity: float
    confidence_pct: float
    notes: str


class MicrosleepDetector:
    """
    Evaluates synchronized kinematic and ocular events to detect microsleep candidates.
    """

    def __init__(self, config: Optional[MicrosleepConfig] = None):
        self.config = config or CONFIG.microsleep

        # Event storage
        self.events: List[MicrosleepEvent] = []
        self.total_events: int = 0
        self.last_event_time: float = 0.0

        # Active state tracking
        self.active_alert: bool = False
        self.alert_text: str = ""
        self.alert_expiry: float = 0.0

        # Temporal trajectory buffer (stores last 4 seconds)
        # (timestamp, ear, pitch, velocity, facial_act)
        self.trajectory: Deque[Tuple[float, float, float, float, float]] = deque()

    def process(
        self,
        ear: float,
        is_closed: bool,
        closure_duration: float,
        pitch: float,
        velocity: float,
        facial_activity: float,
        baseline: PersonalBaseline,
        now: Optional[float] = None
    ) -> Tuple[bool, Optional[MicrosleepEvent]]:
        """
        Processes instantaneous metrics and detects microsleep sequences.
        Returns: (is_currently_alerting, newly_triggered_event_or_None)
        """
        now = now or time.time()

        # Update trajectory buffer
        self.trajectory.append((now, ear, pitch, velocity, facial_activity))
        while self.trajectory and (now - self.trajectory[0][0]) > 4.0:
            self.trajectory.popleft()

        # Check cooldown
        in_cooldown = (now - self.last_event_time) < self.config.cooldown_seconds

        newly_detected_event = None

        if not in_cooldown and is_closed:
            # Condition 1: Eye closure duration reaches microsleep window (0.5s - 3.0s)
            if self.config.min_closure_duration_sec <= closure_duration <= self.config.max_closure_duration_sec:
                # Condition 2: Check downward head pitch excursion from baseline
                baseline_pitch = baseline.data.get("head_pitch", 0.0)
                pitch_drop = baseline_pitch - pitch

                # Condition 3: Look for reduced facial activity in trajectory
                avg_act = sum(t[4] for t in self.trajectory) / max(1, len(self.trajectory))
                baseline_act = baseline.data.get("facial_activity", 45.0)

                # Condition 4: Downward head drooping OR sudden recovery jerk
                is_drooping = pitch_drop >= self.config.downward_pitch_drop_deg
                has_recovery_jerk = velocity >= self.config.recovery_jerk_velocity

                if is_drooping or (has_recovery_jerk and closure_duration >= 0.6) or closure_duration >= 1.2:
                    # Calculate heuristic confidence
                    confidence = 50.0
                    if is_drooping:
                        confidence += 20.0
                    if has_recovery_jerk:
                        confidence += 20.0
                    if avg_act < (0.6 * baseline_act):
                        confidence += 10.0
                    confidence = min(98.0, confidence)

                    event = MicrosleepEvent(
                        timestamp=now,
                        formatted_time=time.strftime("%H:%M:%S", time.localtime(now)),
                        duration_sec=round(closure_duration, 2),
                        peak_pitch_drop_deg=round(max(0.0, pitch_drop), 1),
                        recovery_velocity=round(velocity, 1),
                        confidence_pct=round(confidence, 1),
                        notes="Candidate microsleep pattern detected (Eye closure + Kinematic droop/jerk)"
                    )

                    self.events.append(event)
                    self.total_events += 1
                    self.last_event_time = now
                    self.active_alert = True
                    self.alert_text = f"POSSIBLE MICRO-SLEEP EVENT ({closure_duration:.1f}s)"
                    self.alert_expiry = now + 3.0
                    newly_detected_event = event

        # Handle active alert timeout
        if self.active_alert and now > self.alert_expiry:
            self.active_alert = False
            self.alert_text = ""

        return self.active_alert, newly_detected_event

    def get_event_summary(self) -> List[dict]:
        """Returns JSON-serializable list of all detected events."""
        return [
            {
                "timestamp": e.timestamp,
                "time": e.formatted_time,
                "duration_seconds": e.duration_sec,
                "pitch_drop_degrees": e.peak_pitch_drop_deg,
                "recovery_velocity": e.recovery_velocity,
                "confidence_percent": e.confidence_pct,
                "notes": e.notes
            }
            for e in self.events
        ]
