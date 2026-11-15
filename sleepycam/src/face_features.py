"""
Face Feature Extraction & Face Mesh Tracking
=============================================
Manages MediaPipe Face Mesh, tracks multi-face scenarios (selecting primary face),
and calculates dynamic facial activity metrics over rolling temporal windows.
"""

import time
import math
from typing import List, Tuple, Optional, Dict, Any
from collections import deque
import numpy as np

# Optional MediaPipe import with safe fallback
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    mp = None
    MEDIAPIPE_AVAILABLE = False


class FaceTracker:
    """
    Extracts facial landmarks using MediaPipe Face Mesh.
    Robust against multiple faces, tracking the primary/closest face.
    Calculates facial activity dynamics (micro-expression displacement).
    """

    # Selected landmarks for facial expression activity tracking
    # Eyebrows, cheekbones, nose bridge, lips corners
    ACTIVITY_LANDMARK_INDICES = [
        70, 63, 105, 66, 107,     # Left eyebrow
        336, 296, 334, 293, 300,  # Right eyebrow
        1, 2, 98, 327,            # Nose bridge / tip
        205, 425,                 # Cheek landmarks
        61, 291                   # Mouth corners
    ]

    def __init__(
        self,
        max_num_faces: int = 3,
        refine_landmarks: bool = True,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        activity_window_sec: float = 6.0
    ):
        self.max_num_faces = max_num_faces
        self.refine_landmarks = refine_landmarks
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.activity_window_sec = activity_window_sec

        self.face_mesh = None
        if MEDIAPIPE_AVAILABLE and hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
            try:
                self.mp_face_mesh = mp.solutions.face_mesh
                self.face_mesh = self.mp_face_mesh.FaceMesh(
                    max_num_faces=self.max_num_faces,
                    refine_landmarks=self.refine_landmarks,
                    min_detection_confidence=self.min_detection_confidence,
                    min_tracking_confidence=self.min_tracking_confidence
                )
            except Exception:
                self.face_mesh = None

        # Activity tracking buffers
        # Format: (timestamp, np.array of shape (N, 2))
        self.recent_landmark_positions = deque()
        self.last_activity_score: float = 50.0  # Normalized 0-100

    def process_frame(
        self,
        frame_rgb: np.ndarray
    ) -> Tuple[Optional[List[Tuple[int, int]]], Optional[Tuple[int, int, int, int]]]:
        """
        Process an RGB image frame.
        Returns:
            primary_landmarks: List of (x, y) pixel coordinates (468 or 478 points), or None.
            bounding_box: (x_min, y_min, width, height) of primary face, or None.
        """
        if self.face_mesh is None:
            return None, None

        h, w = frame_rgb.shape[:2]
        results = self.face_mesh.process(frame_rgb)

        if not results.multi_face_landmarks:
            return None, None

        # Handle multiple faces: rank by bounding box area and proximity to center
        primary_landmarks = None
        primary_bbox = None
        best_score = -1.0
        center_x, center_y = w / 2.0, h / 2.0

        for face_landmarks in results.multi_face_landmarks:
            coords = []
            xs, ys = [], []
            for lm in face_landmarks.landmark:
                px = int(lm.x * w)
                py = int(lm.y * h)
                coords.append((px, py))
                xs.append(px)
                ys.append(py)

            x_min, x_max = max(0, min(xs)), min(w, max(xs))
            y_min, y_max = max(0, min(ys)), min(h, max(ys))
            box_w = max(1, x_max - x_min)
            box_h = max(1, y_max - y_min)
            area = box_w * box_h

            face_cx = (x_min + x_max) / 2.0
            face_cy = (y_min + y_max) / 2.0
            dist_to_center = math.hypot(face_cx - center_x, face_cy - center_y)
            max_dist = math.hypot(center_x, center_y)
            center_weight = 1.0 - (dist_to_center / max_dist)

            # Score = Area * center proximity weight
            score = area * (0.6 + 0.4 * center_weight)

            if score > best_score:
                best_score = score
                primary_landmarks = coords
                primary_bbox = (x_min, y_min, box_w, box_h)

        # Update facial activity tracker
        if primary_landmarks and primary_bbox:
            self._update_activity(primary_landmarks, primary_bbox)

        return primary_landmarks, primary_bbox

    def _update_activity(self, landmarks: List[Tuple[int, int]], bbox: Tuple[int, int, int, int]):
        """
        Calculates normalized facial displacement of key expressiveness landmarks
        over the rolling time window.
        """
        now = time.time()
        _, _, bw, bh = bbox
        scale = math.hypot(bw, bh)
        if scale < 1e-4:
            scale = 1.0

        # Extract selected landmarks relative to face center
        fx_center = bbox[0] + bw / 2.0
        fy_center = bbox[1] + bh / 2.0

        selected = []
        for idx in self.ACTIVITY_LANDMARK_INDICES:
            if idx < len(landmarks):
                px, py = landmarks[idx]
                selected.append([(px - fx_center) / scale, (py - fy_center) / scale])
            else:
                selected.append([0.0, 0.0])

        current_pos = np.array(selected, dtype=np.float32)
        self.recent_landmark_positions.append((now, current_pos))

        # Evict old points
        while self.recent_landmark_positions and (now - self.recent_landmark_positions[0][0]) > self.activity_window_sec:
            self.recent_landmark_positions.popleft()

        # Compute activity score: variance / standard deviation of positions over window
        if len(self.recent_landmark_positions) >= 5:
            matrices = [p[1] for p in self.recent_landmark_positions]
            stacked = np.stack(matrices, axis=0) # Shape: (T, N, 2)
            # Std across time for each landmark
            stds = np.std(stacked, axis=0) # Shape: (N, 2)
            avg_disp = float(np.mean(stds) * 1000.0) # Scaled to typical ~ 5.0 - 50.0 range
            # Map into 0 - 100 range smoothly
            # 2.0 = virtually frozen (sleepy/monotone), 25.0 = lively expressions
            norm_score = float(np.clip((avg_disp - 2.0) / (25.0 - 2.0) * 100.0, 0.0, 100.0))
            self.last_activity_score = 0.85 * self.last_activity_score + 0.15 * norm_score

    def get_facial_activity_score(self) -> float:
        """Returns 0-100 facial activity score (higher = lively, lower = frozen/fatigued)."""
        return float(self.last_activity_score)

    def close(self):
        if self.face_mesh:
            self.face_mesh.close()
