"""
Dataset Logging & Comprehensive Session Report Generation
==========================================================
Logs multi-feature vectors with manual ground truth labels to CSV,
and generates post-session analytical reports and multi-panel Matplotlib charts.
"""

import os
import csv
import time
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
import numpy as np

try:
    import matplotlib
    matplotlib.use("Agg") # Non-interactive headless backend
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    plt = None
    MATPLOTLIB_AVAILABLE = False

from fatigue import FEATURE_NAMES


LABEL_MAP = {
    "A": (0, "Awake"),
    "S": (1, "Slightly Tired"),
    "T": (2, "Tired"),
    "V": (3, "Very Tired")
}

LABEL_NAMES = ["Awake", "Slightly Tired", "Tired", "Very Tired"]


class DataLogger:
    """
    Manages continuous dataset capture for training models,
    and post-session telemetry aggregation and visualization.
    """

    def __init__(self, dataset_path: str = "data/fatigue_dataset.csv", reports_dir: str = "reports"):
        self.dataset_path = dataset_path
        self.reports_dir = reports_dir

        os.makedirs(os.path.dirname(self.dataset_path), exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)

        self._init_csv_headers()

        # Session tracking state
        self.session_start_time = time.time()
        self.session_samples: List[Dict[str, Any]] = []
        self.current_label_idx: Optional[int] = None
        self.current_label_name: Optional[str] = None

    def _init_csv_headers(self):
        """Creates dataset CSV with header if file does not exist."""
        if not os.path.exists(self.dataset_path):
            headers = ["timestamp", "formatted_time"] + FEATURE_NAMES + ["label", "label_name"]
            with open(self.dataset_path, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(headers)

    def set_label_by_key(self, key_char: str):
        """Updates current manual ground-truth label based on key press (A/S/T/V)."""
        upper = key_char.upper()
        if upper in LABEL_MAP:
            idx, name = LABEL_MAP[upper]
            self.current_label_idx = idx
            self.current_label_name = name

    def log_sample(
        self,
        features: List[float],
        fatigue_score: float,
        fatigue_label: str,
        now: Optional[float] = None,
        save_to_dataset: bool = False
    ):
        """Records telemetry sample for session report and optionally writes to dataset CSV."""
        now = now or time.time()
        formatted_t = datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S")

        sample = {
            "timestamp": now,
            "formatted_time": formatted_t,
            "relative_sec": now - self.session_start_time,
            "features": features,
            "fatigue_score": fatigue_score,
            "fatigue_label": fatigue_label,
            "label": self.current_label_idx,
            "label_name": self.current_label_name
        }
        self.session_samples.append(sample)

        # In data collection mode, append to CSV when label is assigned
        if save_to_dataset and self.current_label_idx is not None:
            row = [now, formatted_t] + [f"{x:.4f}" for x in features] + [self.current_label_idx, self.current_label_name]
            with open(self.dataset_path, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(row)

    def generate_session_report(
        self,
        eye_metrics: dict,
        mouth_metrics: dict,
        pose_metrics: dict,
        microsleep_events: List[dict]
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Compiles end-of-session statistics, saves CSV report and Matplotlib visual plot.
        Returns: (csv_report_path, png_chart_path, summary_dict)
        """
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_path = os.path.join(self.reports_dir, f"session_report_{timestamp_str}.csv")
        png_path = os.path.join(self.reports_dir, f"session_report_{timestamp_str}.png")
        latest_csv = os.path.join(self.reports_dir, "session_report.csv")
        latest_png = os.path.join(self.reports_dir, "session_report.png")

        duration_sec = time.time() - self.session_start_time

        # Calculate statistics
        scores = [s["fatigue_score"] for s in self.session_samples]
        if scores:
            avg_fatigue = float(np.mean(scores))
            max_fatigue = float(np.max(scores))
            min_fatigue = float(np.min(scores))
        else:
            avg_fatigue = max_fatigue = min_fatigue = 0.0

        # Time spent in fatigue categories
        category_counts = {
            "AWAKE": 0,
            "NORMAL": 0,
            "GETTING TIRED": 0,
            "TIRED": 0,
            "VERY TIRED": 0,
            "BRO YOU NEED SLEEP": 0
        }
        for s in self.session_samples:
            lbl = s.get("fatigue_label", "AWAKE")
            if lbl in category_counts:
                category_counts[lbl] += 1

        total_samples = max(1, len(self.session_samples))
        category_durations = {
            cat: round((count / total_samples) * duration_sec, 1)
            for cat, count in category_counts.items()
        }

        summary = {
            "session_duration_seconds": round(duration_sec, 1),
            "session_duration_formatted": f"{int(duration_sec // 60)}m {int(duration_sec % 60)}s",
            "average_fatigue": round(avg_fatigue, 1),
            "maximum_fatigue": round(max_fatigue, 1),
            "minimum_fatigue": round(min_fatigue, 1),
            "total_blinks": eye_metrics.get("total_blinks", 0),
            "average_blink_rate": round(eye_metrics.get("blink_rate", 0.0), 1),
            "long_blinks": eye_metrics.get("total_long_blinks", 0),
            "total_yawns": mouth_metrics.get("total_yawns", 0),
            "average_yawn_duration": round(mouth_metrics.get("avg_yawn_duration", 0.0), 2),
            "head_nods": pose_metrics.get("total_nods", 0),
            "microsleep_events_count": len(microsleep_events),
            "category_durations_sec": category_durations
        }

        # 1. Write CSV Report
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["SleepyCam AI - Session Telemetry Report"])
            writer.writerow(["Generated At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
            writer.writerow([])
            writer.writerow(["Metric", "Value"])
            for k, v in summary.items():
                if k != "category_durations_sec":
                    writer.writerow([k, v])
            writer.writerow([])
            writer.writerow(["Fatigue Category", "Time Spent (seconds)", "Percentage (%)"])
            for cat, dur in category_durations.items():
                pct = (dur / max(0.1, duration_sec)) * 100.0
                writer.writerow([cat, dur, f"{pct:.1f}%"])
            writer.writerow([])
            writer.writerow(["Microsleep Events Log"])
            writer.writerow(["Time", "Duration (s)", "Confidence (%)", "Notes"])
            for me in microsleep_events:
                writer.writerow([me.get("time"), me.get("duration_seconds"), me.get("confidence_percent"), me.get("notes")])
            writer.writerow([])
            writer.writerow(["Time (s)", "Fatigue Score", "Fatigue Label"] + FEATURE_NAMES)
            for s in self.session_samples:
                writer.writerow([f"{s['relative_sec']:.2f}", f"{s['fatigue_score']:.1f}", s['fatigue_label']] + s["features"])

        # Also write canonical latest CSV
        try:
            with open(latest_csv, "w") as f_out, open(csv_path, "r") as f_in:
                f_out.write(f_in.read())
        except Exception:
            pass

        # 2. Generate Multi-panel Visual Plot with Matplotlib
        if MATPLOTLIB_AVAILABLE and self.session_samples:
            self._render_report_chart(png_path, summary, microsleep_events)
            try:
                with open(latest_png, "wb") as f_out, open(png_path, "rb") as f_in:
                    f_out.write(f_in.read())
            except Exception:
                pass

        return csv_path, png_path, summary

    def _render_report_chart(self, output_path: str, summary: dict, microsleep_events: List[dict]):
        """Renders comprehensive 4-panel analytical chart."""
        fig, axes = plt.subplots(2, 2, figsize=(16, 10))
        fig.suptitle(f"SleepyCam AI - Session Report ({summary['session_duration_formatted']})", fontsize=16, fontweight="bold")

        times = [s["relative_sec"] for s in self.session_samples]
        scores = [s["fatigue_score"] for s in self.session_samples]

        # Panel 1: Fatigue Score Timeline
        ax1 = axes[0, 0]
        ax1.plot(times, scores, color="#e67e22", linewidth=2, label="Fatigue Score (0-100)")
        ax1.axhline(40, color="#f1c40f", linestyle="--", alpha=0.7, label="Getting Tired (40)")
        ax1.axhline(60, color="#e67e22", linestyle="--", alpha=0.7, label="Tired (60)")
        ax1.axhline(80, color="#e74c3c", linestyle="--", alpha=0.7, label="Very Tired (80)")
        ax1.set_ylim(0, 100)
        ax1.set_title("Fatigue Progression Over Time")
        ax1.set_xlabel("Elapsed Time (seconds)")
        ax1.set_ylabel("Fatigue Score")
        ax1.grid(True, linestyle=":", alpha=0.6)
        ax1.legend(loc="upper left", fontsize=8)

        # Panel 2: EAR & PERCLOS Timeline
        ax2 = axes[0, 1]
        ears = [s["features"][0] for s in self.session_samples]
        perclos_vals = [s["features"][3] for s in self.session_samples]
        ax2.plot(times, ears, color="#3498db", label="EAR (Eye Aspect Ratio)", linewidth=1.5)
        ax2_sub = ax2.twinx()
        ax2_sub.plot(times, perclos_vals, color="#9b59b6", linestyle="-.", label="PERCLOS %", linewidth=1.5)
        ax2.set_title("Ocular Kinematics (EAR & PERCLOS)")
        ax2.set_xlabel("Elapsed Time (seconds)")
        ax2.set_ylabel("Eye Aspect Ratio", color="#3498db")
        ax2_sub.set_ylabel("PERCLOS (%)", color="#9b59b6")
        ax2.grid(True, linestyle=":", alpha=0.6)

        # Panel 3: Head Pitch & Velocity
        ax3 = axes[1, 0]
        pitch = [s["features"][10] for s in self.session_samples]
        vel = [s["features"][13] for s in self.session_samples]
        ax3.plot(times, pitch, color="#1abc9c", label="Head Pitch (deg)", linewidth=1.5)
        ax3.plot(times, vel, color="#95a5a6", label="Velocity (deg/s)", alpha=0.6, linewidth=1)
        ax3.set_title("Head Dynamics & Nodding Excursions")
        ax3.set_xlabel("Elapsed Time (seconds)")
        ax3.set_ylabel("Degrees / Velocity")
        ax3.grid(True, linestyle=":", alpha=0.6)
        ax3.legend(loc="upper right", fontsize=8)

        # Panel 4: Time Spent by Fatigue Tier (Bar Chart)
        ax4 = axes[1, 1]
        categories = list(summary["category_durations_sec"].keys())
        durations = list(summary["category_durations_sec"].values())
        colors = ["#2ecc71", "#1abc9c", "#f1c40f", "#e67e22", "#e74c3c", "#c0392b"]
        bars = ax4.barh(categories, durations, color=colors[:len(categories)], edgecolor="black", alpha=0.85)
        ax4.set_title("Time Spent in Fatigue Categories")
        ax4.set_xlabel("Seconds")
        for bar in bars:
            w = bar.get_width()
            if w > 0:
                ax4.text(w + 1, bar.get_y() + bar.get_height() / 2, f"{w:.1f}s", va="center", fontsize=9)

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        plt.savefig(output_path, dpi=120)
        plt.close(fig)
