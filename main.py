"""
SleepyCam AI - Main Application Runner
======================================
Real-time webcam-based fatigue and sleepiness detection system.
Orchestrates computer vision tracking, baseline calibration, multimodal feature engineering,
heuristic & ML fatigue scoring, microsleep alert detection, and real-time OpenCV dashboard.

Usage:
  python main.py                     # Run live webcam with default 2-minute calibration
  python main.py --quick-calib 10    # Run with 10-second fast calibration
  python main.py --collect-data      # Run in dataset collection mode with hotkey labels (A/S/T/V)
  python main.py --synthetic         # Run simulated camera feed (no physical webcam required)
  python main.py --headless --duration 15  # Run automated headless verification
"""

import os
import sys
import time
import math
import argparse
from typing import Optional, Tuple
import numpy as np

# Add src/ to Python import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False

from config import CONFIG, SystemConfig
from face_features import FaceTracker
from eye_features import EyeMetricsTracker
from mouth_features import MouthMetricsTracker
from head_pose import HeadPoseEstimator
from posture import PostureTracker
from baseline import PersonalBaseline
from fatigue import FatigueCalculator
from microsleep import MicrosleepDetector
from dashboard import DashboardRenderer
from data_logger import DataLogger
from model import FatigueModelManager


class SyntheticFeedGenerator:
    """
    Generates realistic synthetic video frames with animated facial landmarks
    to facilitate headless verification and development without physical webcams.
    """

    def __init__(self, width: int = 1280, height: int = 720):
        self.width = width
        self.height = height
        self.start_time = time.time()
        self.scenario = "normal" # "normal", "tired", "yawning", "nodding", "microsleep"

    def read(self) -> Tuple[bool, np.ndarray, list, tuple]:
        """
        Generates next synthetic frame, landmarks list, and bounding box.
        """
        elapsed = time.time() - self.start_time
        frame = np.full((self.height, self.width, 3), (35, 42, 50), dtype=np.uint8)

        cx = self.width // 2
        cy = self.height // 2

        # Cycle scenarios over time
        cycle_sec = elapsed % 40.0
        if cycle_sec < 10.0:
            self.scenario = "normal"
        elif cycle_sec < 20.0:
            self.scenario = "tired"
        elif cycle_sec < 25.0:
            self.scenario = "yawning"
        elif cycle_sec < 32.0:
            self.scenario = "nodding"
        else:
            self.scenario = "microsleep"

        # Dynamics based on scenario
        ear_val = 0.28
        mar_val = 0.22
        pitch_drop = 0.0

        if self.scenario == "tired":
            # Heavy fluttering blinks and lower baseline EAR
            ear_val = 0.19 + 0.06 * math.sin(elapsed * 5.0)
        elif self.scenario == "yawning":
            mar_val = 0.75 # Wide yawn
            ear_val = 0.16 # Squinting during yawn
        elif self.scenario == "nodding":
            pitch_drop = 15.0 * (1.0 + math.sin(elapsed * 3.0))
            ear_val = 0.15
        elif self.scenario == "microsleep":
            pitch_drop = 20.0
            ear_val = 0.06 # Eyes closed

        # Draw a stylized face outline on canvas
        head_cy = cy + int(pitch_drop * 3)
        cv2.ellipse(frame, (cx, head_cy), (140, 180), 0, 0, 360, (180, 195, 210), -1)
        cv2.ellipse(frame, (cx, head_cy), (140, 180), 0, 0, 360, (230, 240, 250), 2)

        # Draw Eyes
        left_eye_x, right_eye_x = cx - 55, cx + 55
        eye_y = head_cy - 30
        eye_h = max(2, int(ear_val * 60))
        cv2.ellipse(frame, (left_eye_x, eye_y), (25, eye_h), 0, 0, 360, (30, 30, 40), -1)
        cv2.ellipse(frame, (right_eye_x, eye_y), (25, eye_h), 0, 0, 360, (30, 30, 40), -1)

        # Draw Mouth
        mouth_y = head_cy + 70
        mouth_h = max(4, int(mar_val * 70))
        cv2.ellipse(frame, (cx, mouth_y), (35, mouth_h), 0, 0, 360, (80, 40, 60), -1)

        # Synthetic 468-point landmarks mock
        fake_landmarks = [(cx, head_cy)] * 478
        # Fill key indices
        fake_landmarks[1] = (cx, head_cy + 10) # Nose tip
        fake_landmarks[152] = (cx, head_cy + 160) # Chin
        fake_landmarks[263] = (cx + 80, eye_y) # Left eye corner
        fake_landmarks[33] = (cx - 80, eye_y) # Right eye corner
        fake_landmarks[291] = (cx + 40, mouth_y) # Left mouth corner
        fake_landmarks[61] = (cx - 40, mouth_y) # Right mouth corner

        # Left eye canonical points: 362(outer), 385, 387, 263(inner), 373, 380
        fake_landmarks[362] = (left_eye_x - 25, eye_y)
        fake_landmarks[385] = (left_eye_x - 10, eye_y - eye_h)
        fake_landmarks[387] = (left_eye_x + 10, eye_y - eye_h)
        fake_landmarks[263] = (left_eye_x + 25, eye_y)
        fake_landmarks[373] = (left_eye_x + 10, eye_y + eye_h)
        fake_landmarks[380] = (left_eye_x - 10, eye_y + eye_h)

        # Right eye canonical points: 33(outer), 160, 158, 133(inner), 153, 144
        fake_landmarks[33] = (right_eye_x - 25, eye_y)
        fake_landmarks[160] = (right_eye_x - 10, eye_y - eye_h)
        fake_landmarks[158] = (right_eye_x + 10, eye_y - eye_h)
        fake_landmarks[133] = (right_eye_x + 25, eye_y)
        fake_landmarks[153] = (right_eye_x + 10, eye_y + eye_h)
        fake_landmarks[144] = (right_eye_x - 10, eye_y + eye_h)

        # Mouth indices
        fake_landmarks[78] = (cx - 35, mouth_y)
        fake_landmarks[308] = (cx + 35, mouth_y)
        fake_landmarks[13] = (cx, mouth_y - mouth_h)
        fake_landmarks[14] = (cx, mouth_y + mouth_h)
        fake_landmarks[82] = (cx - 15, mouth_y - mouth_h)
        fake_landmarks[87] = (cx - 15, mouth_y + mouth_h)
        fake_landmarks[312] = (cx + 15, mouth_y - mouth_h)
        fake_landmarks[317] = (cx + 15, mouth_y + mouth_h)

        bbox = (cx - 150, head_cy - 190, 300, 370)
        return True, frame, fake_landmarks, bbox


def run_sleepycam(
    source: int = 0,
    synthetic: bool = False,
    collect_data: bool = False,
    quick_calib: Optional[float] = None,
    skip_calib: bool = False,
    headless: bool = False,
    max_duration: Optional[float] = None,
    model_path: Optional[str] = None
):
    """Main execution loop for SleepyCam AI."""
    print("=" * 60)
    print("  SLEEPYCAM AI - Real-Time Fatigue & Sleepiness Detection")
    print("=" * 60)

    # Initialize subsystems
    calib_duration = quick_calib if quick_calib is not None else CONFIG.calibration.duration_seconds
    baseline = PersonalBaseline(duration_seconds=calib_duration)
    if skip_calib:
        baseline.is_calibrated = True
        print("[System] Skipping calibration: using nominal reference baseline.")
    else:
        print(f"[System] Calibration scheduled: {calib_duration:.0f} seconds.")

    face_tracker = FaceTracker()
    eye_tracker = EyeMetricsTracker()
    mouth_tracker = MouthMetricsTracker()
    head_pose_est = HeadPoseEstimator()
    posture_tracker = PostureTracker()
    fatigue_calc = FatigueCalculator()
    microsleep_det = MicrosleepDetector()
    dashboard = DashboardRenderer()
    data_logger = DataLogger()

    # Model Manager
    model_mgr = FatigueModelManager(model_path=model_path or CONFIG.model_save_path)
    if model_mgr.is_ready():
        fatigue_calc.set_ml_model(model_mgr)
        current_model_mode = "Machine Learning (RF/XGB)"
        print("[System] Loaded trained machine learning model.")
    else:
        current_model_mode = "Heuristic Engine"
        print("[System] Using weighted behavioral heuristic model.")

    if collect_data:
        print("[System] DATA COLLECTION MODE ACTIVE. Use [A] [S] [T] [V] keys to record labels.")

    # Video Source Setup
    synthetic_gen = None
    cap = None

    if synthetic:
        print("[System] Initialized synthetic video simulator.")
        synthetic_gen = SyntheticFeedGenerator(CONFIG.video.frame_width, CONFIG.video.frame_height)
    else:
        if not CV2_AVAILABLE:
            print("[Warning] OpenCV not available or headless. Switching to synthetic feed.")
            synthetic_gen = SyntheticFeedGenerator(CONFIG.video.frame_width, CONFIG.video.frame_height)
        else:
            try:
                cap = cv2.VideoCapture(source)
                if not cap.isOpened():
                    print(f"[Warning] Cannot open webcam index {source}. Falling back to synthetic feed.")
                    synthetic_gen = SyntheticFeedGenerator(CONFIG.video.frame_width, CONFIG.video.frame_height)
                    cap = None
                else:
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CONFIG.video.frame_width)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CONFIG.video.frame_height)
            except Exception as e:
                print(f"[Warning] Camera error: {e}. Falling back to synthetic generator.")
                synthetic_gen = SyntheticFeedGenerator(CONFIG.video.frame_width, CONFIG.video.frame_height)
                cap = None

    fps = 0.0
    frame_count = 0
    t_start = time.time()
    last_fps_time = t_start
    draw_landmarks_wireframe = False
    active_key_label = None

    print("[System] Detection pipeline started. Press 'q' to quit.")

    try:
        while True:
            t_now = time.time()
            frame_count += 1

            # Check max duration
            if max_duration and (t_now - t_start) >= max_duration:
                print(f"[System] Reached target duration of {max_duration:.1f}s. Exiting...")
                break

            # Read frame
            synthetic_landmarks = None
            synthetic_bbox = None
            if synthetic_gen:
                ret, frame, synthetic_landmarks, synthetic_bbox = synthetic_gen.read()
                time.sleep(0.03) # Approximate 30 FPS
            else:
                ret, frame = cap.read()
                if not ret:
                    print("[Warning] Camera frame read failure. Exiting...")
                    break

            # FPS calculation
            if (t_now - last_fps_time) >= 1.0:
                fps = frame_count / (t_now - last_fps_time)
                frame_count = 0
                last_fps_time = t_now

            # 1. Face & Landmark Tracking
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB) if CV2_AVAILABLE else frame

            if synthetic_gen:
                landmarks = synthetic_landmarks
                bbox = synthetic_bbox
                facial_activity = 42.0 + 10.0 * math.sin(t_now)
            else:
                landmarks, bbox = face_tracker.process_frame(rgb)
                facial_activity = face_tracker.get_facial_activity_score()

            # 2. Eye & Blink Metrics
            eye_metrics = eye_tracker.process(landmarks, baseline.data.get("ear"), now=t_now)

            # 3. Mouth & Yawn Metrics
            mouth_metrics = mouth_tracker.process(landmarks, baseline.data.get("mar"), now=t_now)

            # 4. Head Pose & Nodding
            pose_metrics = head_pose_est.estimate_pose(landmarks, (h, w), now=t_now)

            # 5. Posture Tracking
            posture_metrics = posture_tracker.process(rgb, baseline.data, now=t_now)

            # 6. Baseline Calibration Progression
            calib_progress = baseline.update(
                eye_metrics, mouth_metrics, pose_metrics, posture_metrics, facial_activity, now=t_now
            )

            # 7. Assemble 18-Feature Vector
            features = fatigue_calc.build_feature_vector(
                eye_metrics, mouth_metrics, pose_metrics, posture_metrics, facial_activity
            )

            # 8. Fatigue Score Calculation
            closure_dur = eye_metrics.get("closure_duration", 0.0)
            fatigue_score, fatigue_label, fatigue_color, _ = fatigue_calc.compute_score(
                features, baseline, active_closure_duration=closure_dur
            )

            # 9. Microsleep Event Detection
            is_microsleep, ms_event = microsleep_det.process(
                ear=eye_metrics.get("ear", 0.25),
                is_closed=eye_metrics.get("is_closed", False),
                closure_duration=closure_dur,
                pitch=pose_metrics.get("pitch", 0.0),
                velocity=pose_metrics.get("velocity", 0.0),
                facial_activity=facial_activity,
                baseline=baseline,
                now=t_now
            )
            if ms_event:
                print(f"[ALERT] {ms_event.notes} at {ms_event.formatted_time} (Confidence: {ms_event.confidence_pct}%)")

            # 10. Data Logging
            data_logger.log_sample(
                features=features,
                fatigue_score=fatigue_score,
                fatigue_label=fatigue_label,
                now=t_now,
                save_to_dataset=collect_data
            )

            # 11. Render Dashboard
            if CV2_AVAILABLE and not headless:
                composite = dashboard.draw_dashboard(
                    frame=frame,
                    fps=fps,
                    calibration_progress=calib_progress,
                    is_calibrated=baseline.is_calibrated,
                    eye_metrics=eye_metrics,
                    mouth_metrics=mouth_metrics,
                    pose_metrics=pose_metrics,
                    posture_metrics=posture_metrics,
                    facial_activity=facial_activity,
                    fatigue_score=fatigue_score,
                    fatigue_label=fatigue_label,
                    fatigue_color=fatigue_color,
                    is_microsleep_alert=is_microsleep,
                    microsleep_text=microsleep_det.alert_text,
                    total_microsleeps=microsleep_det.total_events,
                    model_mode=current_model_mode,
                    active_label=active_key_label,
                    draw_landmarks=draw_landmarks_wireframe,
                    landmarks=landmarks,
                    bbox=bbox
                )

                try:
                    cv2.imshow("SleepyCam AI - Telemetry Console", composite)
                    key = cv2.waitKey(1) & 0xFF

                    if key == ord('q') or key == 27:
                        print("[System] User requested quit.")
                        break
                    elif key == ord('l'):
                        draw_landmarks_wireframe = not draw_landmarks_wireframe
                    elif key == ord('c'):
                        print("[System] Recalibrating baseline...")
                        baseline.start()
                    elif key == ord('m'):
                        # Toggle model mode
                        if current_model_mode.startswith("Machine") or not model_mgr.is_ready():
                            current_model_mode = "Heuristic Engine"
                            fatigue_calc.set_ml_model(None)
                        else:
                            current_model_mode = "Machine Learning (RF/XGB)"
                            fatigue_calc.set_ml_model(model_mgr)
                    elif key in [ord('a'), ord('A')]:
                        data_logger.set_label_by_key("A")
                        active_key_label = "0: Awake"
                        print("[Data Collection] Label updated: AWAKE")
                    elif key in [ord('s'), ord('S')]:
                        data_logger.set_label_by_key("S")
                        active_key_label = "1: Slightly Tired"
                        print("[Data Collection] Label updated: SLIGHTLY TIRED")
                    elif key in [ord('t'), ord('T')]:
                        data_logger.set_label_by_key("T")
                        active_key_label = "2: Tired"
                        print("[Data Collection] Label updated: TIRED")
                    elif key in [ord('v'), ord('V')]:
                        data_logger.set_label_by_key("V")
                        active_key_label = "3: Very Tired"
                        print("[Data Collection] Label updated: VERY TIRED")
                except Exception:
                    # Non-interactive display environment
                    pass

    except KeyboardInterrupt:
        print("\n[System] Session interrupted by user.")
    finally:
        # Cleanup
        if cap:
            cap.release()
        if CV2_AVAILABLE:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
        face_tracker.close()
        posture_tracker.close()

        # Save session report
        print("\n[Report] Compiling session analytics...")
        csv_rep, png_rep, summary = data_logger.generate_session_report(
            eye_metrics=eye_metrics,
            mouth_metrics=mouth_metrics,
            pose_metrics=pose_metrics,
            microsleep_events=microsleep_det.get_event_summary()
        )
        print(f"[Report] CSV Report saved: {csv_rep}")
        print(f"[Report] Visual Chart saved: {png_rep}")
        print(f"[Report] Duration: {summary['session_duration_formatted']}, Avg Fatigue: {summary['average_fatigue']}/100")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="SleepyCam AI - Real-time Fatigue Detection")
    parser.add_argument("--source", type=int, default=0, help="Webcam device index (default 0)")
    parser.add_argument("--synthetic", action="store_true", help="Use simulated video stream instead of physical camera")
    parser.add_argument("--collect-data", action="store_true", help="Enable dataset collection and manual ground-truth labeling")
    parser.add_argument("--quick-calib", type=float, default=None, help="Fast calibration duration in seconds (e.g. 10)")
    parser.add_argument("--skip-calib", action="store_true", help="Skip calibration and use default baseline")
    parser.add_argument("--headless", action="store_true", help="Run without graphical windows (headless mode)")
    parser.add_argument("--duration", type=float, default=None, help="Run for N seconds then generate report and quit")
    parser.add_argument("--model", type=str, default=None, help="Path to custom trained joblib model")

    args = parser.parse_args()

    run_sleepycam(
        source=args.source,
        synthetic=args.synthetic,
        collect_data=args.collect_data,
        quick_calib=args.quick_calib,
        skip_calib=args.skip_calib,
        headless=args.headless,
        max_duration=args.duration,
        model_path=args.model
    )


if __name__ == "__main__":
    main()
