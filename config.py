"""
SleepyCam AI - Configuration & Constants
=========================================
Configurable parameters for computer vision pipelines, feature extraction,
baseline calibration, fatigue scoring heuristics, and alert thresholds.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

@dataclass
class VideoConfig:
    camera_index: int = 0
    frame_width: int = 1280
    frame_height: int = 720
    target_fps: int = 30
    show_fps: bool = True
    draw_landmarks: bool = False
    draw_dashboard: bool = True

@dataclass
class EyeConfig:
    # Landmarks for EAR (MediaPipe Face Mesh indices)
    # Left eye: outer corner, top-1, top-2, inner corner, bot-2, bot-1
    left_eye_indices: List[int] = field(default_factory=lambda: [362, 385, 387, 263, 373, 380])
    # Right eye: outer corner, top-1, top-2, inner corner, bot-2, bot-1
    right_eye_indices: List[int] = field(default_factory=lambda: [33, 160, 158, 133, 153, 144])
    
    # Default uncalibrated thresholds (will be adapted by PersonalBaseline)
    default_ear_threshold: float = 0.22
    blink_consecutive_frames_min: int = 2
    blink_consecutive_frames_max: int = 15
    long_blink_duration_sec: float = 0.45    # Closures longer than this count as long blinks
    perclos_window_sec: float = 45.0         # Rolling window for PERCLOS evaluation
    perclos_closure_threshold_pct: float = 0.75 # Fraction of baseline EAR considered "closed"

@dataclass
class MouthConfig:
    # Landmarks for MAR
    # Outer corners: 78 (left), 308 (right)
    # Upper/lower inner lip: 13, 14; outer points 82, 312, 87, 317
    mouth_indices: List[int] = field(default_factory=lambda: [78, 308, 13, 14, 82, 312, 87, 317])
    
    default_mar_threshold: float = 0.65
    yawn_min_duration_sec: float = 1.5       # Yawn must last at least 1.5 seconds to distinguish from talking
    yawn_max_duration_sec: float = 8.0       # Cap on single yawn duration
    yawn_window_sec: float = 60.0            # Window for yawns per minute rate

@dataclass
class HeadPoseConfig:
    # Canonical 3D facial model points (metric coords in mm)
    model_points: List[Tuple[float, float, float]] = field(default_factory=lambda: [
        (0.0, 0.0, 0.0),          # Nose tip (index 1)
        (0.0, -330.0, -65.0),     # Chin (index 152)
        (-225.0, 170.0, -135.0),  # Left eye outer corner (index 263)
        (225.0, 170.0, -135.0),   # Right eye outer corner (index 33)
        (-150.0, -150.0, -125.0), # Left Mouth corner (index 291)
        (150.0, -150.0, -125.0)   # Right mouth corner (index 61)
    ])
    
    landmark_indices: List[int] = field(default_factory=lambda: [1, 152, 263, 33, 291, 61])
    
    # Nodding detection parameters
    nod_pitch_drop_deg: float = 10.0         # Downward drop threshold
    nod_recovery_window_sec: float = 1.8     # Recovery time window for nodding cycle
    stability_smoothing_alpha: float = 0.15

@dataclass
class PostureConfig:
    enable_pose: bool = True
    shoulder_left_idx: int = 11
    shoulder_right_idx: int = 12
    nose_idx: int = 0
    ear_left_idx: int = 7
    ear_right_idx: int = 8
    slouch_pitch_delta_threshold: float = 12.0
    tilt_angle_threshold_deg: float = 15.0

@dataclass
class CalibrationConfig:
    duration_seconds: float = 120.0          # 2 minutes recommended
    quick_calibration_seconds: float = 15.0  # Optional fast mode for testing
    warmup_seconds: float = 3.0
    save_baseline_path: str = "data/user_baseline.json"

@dataclass
class HeuristicWeights:
    perclos: float = 0.28
    long_blinks: float = 0.20
    blink_frequency: float = 0.10
    yawn_frequency: float = 0.14
    head_nodding: float = 0.14
    posture_degradation: float = 0.08
    facial_inactivity: float = 0.06

@dataclass
class FatigueConfig:
    weights: HeuristicWeights = field(default_factory=HeuristicWeights)
    smoothing_factor: float = 0.12           # Exponential moving average factor
    
    # Score classification ranges (0-100)
    score_ranges: Dict[str, Tuple[float, float, Tuple[int, int, int]]] = field(default_factory=lambda: {
        "AWAKE": (0.0, 20.0, (76, 217, 100)),          # Emerald green (BGR)
        "NORMAL": (20.0, 40.0, (230, 190, 50)),        # Cyan / Blue
        "GETTING TIRED": (40.0, 60.0, (50, 210, 255)), # Yellow
        "TIRED": (60.0, 80.0, (30, 140, 255)),         # Orange
        "VERY TIRED": (80.0, 95.0, (60, 70, 255)),     # Red-orange
        "BRO YOU NEED SLEEP": (95.0, 100.0, (50, 30, 240)) # Flashing Crimson
    })
    
    disclaimer: str = "EXPERIMENTAL CV SYSTEM - NOT A MEDICAL OR SAFETY CERTIFIED DEVICE"

@dataclass
class MicrosleepConfig:
    ear_drop_ratio: float = 0.65             # Current EAR < 65% of baseline
    min_closure_duration_sec: float = 0.50   # Eye closed >= 0.5s
    max_closure_duration_sec: float = 3.00   # Beyond 3.0s is considered full sleep
    downward_pitch_drop_deg: float = 8.0     # Head drooping downward
    recovery_jerk_velocity: float = 35.0     # Sudden head snap back up
    cooldown_seconds: float = 4.0

@dataclass
class SystemConfig:
    video: VideoConfig = field(default_factory=VideoConfig)
    eye: EyeConfig = field(default_factory=EyeConfig)
    mouth: MouthConfig = field(default_factory=MouthConfig)
    head_pose: HeadPoseConfig = field(default_factory=HeadPoseConfig)
    posture: PostureConfig = field(default_factory=PostureConfig)
    calibration: CalibrationConfig = field(default_factory=CalibrationConfig)
    fatigue: FatigueConfig = field(default_factory=FatigueConfig)
    microsleep: MicrosleepConfig = field(default_factory=MicrosleepConfig)
    dataset_path: str = "data/fatigue_dataset.csv"
    model_save_path: str = "models/best_model.joblib"
    scaler_save_path: str = "models/scaler.joblib"
    reports_dir: str = "reports"

# Singleton default instance
CONFIG = SystemConfig()
