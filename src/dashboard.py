"""
OpenCV Real-Time Visual Dashboard & Live Graph
==============================================
Renders high-contrast telemetry HUD, meter bars, live fatigue graph,
bounding boxes, facial landmarks, and alert banners onto the video stream.
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

from config import SystemConfig, CONFIG


class DashboardRenderer:
    """
    Renders an integrated HUD dashboard with biometric meters,
    status badges, live sparkline trend graphs, and alert banners.
    """

    def __init__(self, config: Optional[SystemConfig] = None):
        self.config = config or CONFIG

        # Color Palette (BGR)
        self.BG_DARK = (18, 22, 28)
        self.PANEL_BG = (28, 34, 44)
        self.BORDER_COLOR = (55, 68, 86)
        self.TEXT_WHITE = (245, 247, 250)
        self.TEXT_MUTED = (145, 158, 175)
        self.ACCENT_CYAN = (235, 185, 45)
        self.ACCENT_GREEN = (85, 215, 110)
        self.ACCENT_YELLOW = (45, 215, 245)
        self.ACCENT_ORANGE = (35, 135, 255)
        self.ACCENT_RED = (60, 65, 245)

        # Graph History: deque of (relative_time_sec, score)
        self.graph_history: Deque[Tuple[float, float]] = deque()
        self.start_time: float = time.time()

        # Side panel width
        self.panel_width: int = 380

    def draw_dashboard(
        self,
        frame: np.ndarray,
        fps: float,
        calibration_progress: float,
        is_calibrated: bool,
        eye_metrics: dict,
        mouth_metrics: dict,
        pose_metrics: dict,
        posture_metrics: dict,
        facial_activity: float,
        fatigue_score: float,
        fatigue_label: str,
        fatigue_color: Tuple[int, int, int],
        is_microsleep_alert: bool,
        microsleep_text: str,
        total_microsleeps: int,
        model_mode: str,
        active_label: Optional[str] = None,
        draw_landmarks: bool = False,
        landmarks: Optional[List[Tuple[int, int]]] = None,
        bbox: Optional[Tuple[int, int, int, int]] = None
    ) -> np.ndarray:
        """
        Composites camera feed with HUD sidebar and telemetry overlays.
        """
        if not CV2_AVAILABLE:
            return frame

        fh, fw = frame.shape[:2]
        out_w = fw + self.panel_width
        out_h = max(fh, 720)

        # Create wide canvas: [Camera Feed | Telemetry Dashboard Panel]
        canvas = np.zeros((out_h, out_w, 3), dtype=np.uint8)
        canvas[:fh, :fw] = frame
        canvas[:, fw:] = self.PANEL_BG

        # Update graph history
        now = time.time()
        elapsed = now - self.start_time
        self.graph_history.append((elapsed, fatigue_score))
        # Keep last 300 seconds (5 minutes)
        while self.graph_history and (elapsed - self.graph_history[0][0]) > 300.0:
            self.graph_history.popleft()

        # 1. Draw camera overlays (Landmarks, BBox, Top header, Alerts)
        if bbox is not None:
            bx, by, bw, bh = bbox
            cv2.rectangle(canvas, (bx, by), (bx + bw, by + bh), self.ACCENT_CYAN, 1, cv2.LINE_AA)
            cv2.putText(canvas, "PRIMARY SUBJECT", (bx, max(20, by - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, self.ACCENT_CYAN, 1, cv2.LINE_AA)

        if draw_landmarks and landmarks:
            # Draw key points (eyes, lips, nose contour)
            for idx in [33, 133, 362, 263, 1, 61, 291, 13, 14]:
                if idx < len(landmarks):
                    cv2.circle(canvas, landmarks[idx], 2, (0, 255, 255), -1, cv2.LINE_AA)

        # Camera Header Bar
        cv2.rectangle(canvas, (0, 0), (fw, 44), self.BG_DARK, -1)
        cv2.line(canvas, (0, 44), (fw, 44), self.BORDER_COLOR, 1)

        cv2.putText(canvas, "SLEEPYCAM AI", (16, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.TEXT_WHITE, 2, cv2.LINE_AA)

        fps_text = f"FPS: {fps:.1f}"
        cv2.putText(canvas, fps_text, (fw - 110, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, self.ACCENT_CYAN, 1, cv2.LINE_AA)

        mode_badge = f"MODE: {model_mode.upper()}"
        cv2.putText(canvas, mode_badge, (180, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, self.TEXT_MUTED, 1, cv2.LINE_AA)

        if active_label:
            lbl_text = f"LABEL: [{active_label}]"
            cv2.putText(canvas, lbl_text, (330, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (120, 255, 120), 2, cv2.LINE_AA)

        # Calibration Banner
        if not is_calibrated:
            calib_bar_y = fh - 50
            cv2.rectangle(canvas, (20, calib_bar_y), (fw - 20, calib_bar_y + 36), self.BG_DARK, -1)
            cv2.rectangle(canvas, (20, calib_bar_y), (fw - 20, calib_bar_y + 36), self.ACCENT_YELLOW, 1)

            calib_pct = int(calibration_progress * 100)
            calib_msg = f"CALIBRATING YOUR BASELINE... {calib_pct}%"
            cv2.putText(canvas, calib_msg, (35, calib_bar_y + 24),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, self.ACCENT_YELLOW, 2, cv2.LINE_AA)

            # Progress meter bar
            bar_w = int((fw - 320) * calibration_progress)
            cv2.rectangle(canvas, (290, calib_bar_y + 8), (290 + bar_w, calib_bar_y + 28), self.ACCENT_YELLOW, -1)

        # Microsleep Alert Banner
        if is_microsleep_alert:
            banner_y = 60
            cv2.rectangle(canvas, (30, banner_y), (fw - 30, banner_y + 55), (20, 20, 180), -1)
            cv2.rectangle(canvas, (30, banner_y), (fw - 30, banner_y + 55), (0, 0, 255), 2)
            cv2.putText(canvas, "!!! " + (microsleep_text or "POSSIBLE MICRO-SLEEP EVENT") + " !!!",
                        (50, banner_y + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)

        # 2. Draw Side Telemetry Panel
        px = fw + 16
        py = 32

        # Panel Header
        cv2.putText(canvas, "TELEMETRY DASHBOARD", (px, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.TEXT_WHITE, 2, cv2.LINE_AA)
        py += 14
        cv2.line(canvas, (px, py), (out_w - 16, py), self.BORDER_COLOR, 1)
        py += 24

        # Biometric Progress Bars
        # 1. Eye Openness
        openness = eye_metrics.get("eye_openness", 0.0)
        self._draw_meter(canvas, px, py, "Eye openness", openness, 100.0, f"{int(openness)}%", self.ACCENT_GREEN)
        py += 36

        # 2. PERCLOS
        perclos = eye_metrics.get("perclos", 0.0)
        p_color = self.ACCENT_RED if perclos > 25.0 else (self.ACCENT_YELLOW if perclos > 12.0 else self.ACCENT_CYAN)
        self._draw_meter(canvas, px, py, "PERCLOS", perclos, 40.0, f"{int(perclos)}%", p_color)
        py += 36

        # 3. Blink Rate
        blink_rate = eye_metrics.get("blink_rate", 0.0)
        self._draw_meter(canvas, px, py, "Blink rate", blink_rate, 35.0, f"{int(blink_rate)}/min", self.ACCENT_CYAN)
        py += 36

        # 4. Yawns
        yawns_min = mouth_metrics.get("yawns_per_min", 0.0)
        y_color = self.ACCENT_RED if yawns_min >= 2.0 else self.ACCENT_ORANGE
        self._draw_meter(canvas, px, py, "Yawns", yawns_min, 4.0, f"{int(yawns_min)}/min", y_color)
        py += 36

        # 5. Head Stability
        head_stability = pose_metrics.get("stability", 80.0)
        self._draw_meter(canvas, px, py, "Head stability", head_stability, 100.0, f"{int(head_stability)}%", self.ACCENT_GREEN)
        py += 36

        # 6. Posture
        posture_score = posture_metrics.get("posture_score", 85.0)
        self._draw_meter(canvas, px, py, "Posture", posture_score, 100.0, f"{int(posture_score)}%", self.ACCENT_GREEN)
        py += 36

        # 7. Facial Activity
        self._draw_meter(canvas, px, py, "Facial activity", facial_activity, 100.0, f"{int(facial_activity)}%", self.ACCENT_CYAN)
        py += 44

        # FATIGUE SCORE BOX
        cv2.line(canvas, (px, py), (out_w - 16, py), self.BORDER_COLOR, 1)
        py += 18

        cv2.putText(canvas, "FATIGUE SCORE", (px + 60, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, self.TEXT_MUTED, 1, cv2.LINE_AA)
        py += 40

        score_text = f"{int(fatigue_score)} / 100"
        cv2.putText(canvas, score_text, (px + 45, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.15, fatigue_color, 3, cv2.LINE_AA)
        py += 28

        cv2.putText(canvas, fatigue_label, (px + 45, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, fatigue_color, 2, cv2.LINE_AA)
        py += 34

        # Counters row
        c_text = f"Yawns: {mouth_metrics.get('total_yawns', 0)}  |  Long Blinks: {eye_metrics.get('total_long_blinks', 0)}  |  Microsleeps: {total_microsleeps}"
        cv2.putText(canvas, c_text, (px - 4, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, self.TEXT_WHITE, 1, cv2.LINE_AA)
        py += 18
        cv2.line(canvas, (px, py), (out_w - 16, py), self.BORDER_COLOR, 1)
        py += 14

        # Real-time Fatigue Sparkline Graph
        self._draw_live_graph(canvas, px, py, out_w - px - 20, 110)
        py += 126

        # Disclaimer
        disc = "EXPERIMENTAL CV SYSTEM - NOT A MEDICAL DIAGNOSIS"
        cv2.putText(canvas, disc, (px - 6, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.32, self.TEXT_MUTED, 1, cv2.LINE_AA)
        py += 14
        hotkeys = "[Q] Quit  [L] Mesh  [C] Recalib  [M] Mode  [A/S/T/V] Label"
        cv2.putText(canvas, hotkeys, (px - 6, py),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.34, self.ACCENT_CYAN, 1, cv2.LINE_AA)

        return canvas

    def _draw_meter(
        self,
        canvas: np.ndarray,
        x: int,
        y: int,
        label: str,
        value: float,
        max_value: float,
        value_text: str,
        color: Tuple[int, int, int]
    ):
        """Draws a sleek segmented progress meter bar."""
        cv2.putText(canvas, label, (x, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, self.TEXT_WHITE, 1, cv2.LINE_AA)
        cv2.putText(canvas, value_text, (x + 280, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, self.TEXT_WHITE, 1, cv2.LINE_AA)

        # Bar track
        bar_x = x + 130
        bar_y = y - 11
        bar_w = 140
        bar_h = 10
        cv2.rectangle(canvas, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (45, 52, 64), -1)

        # Fill
        ratio = min(1.0, max(0.0, value / max(1e-4, max_value)))
        fill_w = int(bar_w * ratio)
        if fill_w > 0:
            cv2.rectangle(canvas, (bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h), color, -1)

    def _draw_live_graph(self, canvas: np.ndarray, x: int, y: int, width: int, height: int):
        """Draws a rolling 5-minute fatigue score line chart."""
        # Box background
        cv2.rectangle(canvas, (x, y), (x + width, y + height), self.BG_DARK, -1)
        cv2.rectangle(canvas, (x, y), (x + width, y + height), self.BORDER_COLOR, 1)

        # Grid lines (at 20, 40, 60, 80)
        for level in [20, 40, 60, 80]:
            gy = y + height - int((level / 100.0) * height)
            cv2.line(canvas, (x, gy), (x + width, gy), (35, 42, 52), 1)

        cv2.putText(canvas, "Fatigue History (Last 5m)", (x + 8, y + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, self.TEXT_MUTED, 1, cv2.LINE_AA)

        if len(self.graph_history) < 2:
            return

        now = self.graph_history[-1][0]
        pts = []
        for t, score in self.graph_history:
            # Time delta relative to now (0 to 300s)
            dt = now - t
            gx = x + width - int((dt / 300.0) * width)
            gy = y + height - int(np.clip(score / 100.0, 0.0, 1.0) * (height - 24)) - 4
            pts.append((gx, gy))

        # Draw line segments
        for i in range(len(pts) - 1):
            p1 = pts[i]
            p2 = pts[i + 1]
            if x <= p1[0] <= (x + width) and x <= p2[0] <= (x + width):
                cv2.line(canvas, p1, p2, self.ACCENT_CYAN, 2, cv2.LINE_AA)
