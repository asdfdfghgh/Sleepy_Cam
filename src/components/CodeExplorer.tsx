import React, { useState } from 'react';
import { Code2, BookOpen, Copy, Check, Terminal, FileCode, Sparkles } from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'math' | 'code'>('math');
  const [selectedFile, setSelectedFile] = useState<string>('config.py');
  const [copied, setCopied] = useState<boolean>(false);

  const fileContents: Record<string, string> = {
    'config.py': `# SleepyCam AI - System Configuration
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

@dataclass
class EyeConfig:
    left_eye_indices: List[int] = field(default_factory=lambda: [362, 385, 387, 263, 373, 380])
    right_eye_indices: List[int] = field(default_factory=lambda: [33, 160, 158, 133, 153, 144])
    default_ear_threshold: float = 0.22
    long_blink_duration_sec: float = 0.45
    perclos_window_sec: float = 45.0
    perclos_closure_threshold_pct: float = 0.75

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
    smoothing_factor: float = 0.12`,

    'src/fatigue.py': `# Multimodal Fatigue Calculator & Scoring Engine
from typing import List, Dict, Tuple
import numpy as np

FEATURE_NAMES = [
    "EAR", "left_EAR", "right_EAR", "PERCLOS",
    "blink_rate", "average_blink_duration", "long_blink_count",
    "MAR", "yawn_rate", "average_yawn_duration",
    "head_pitch", "head_yaw", "head_roll", "head_velocity",
    "head_nod_frequency", "facial_activity", "posture_score", "posture_change"
]

class FatigueCalculator:
    def compute_score(self, features: List[float], baseline, active_closure_duration: float):
        # 1. PERCLOS component (w=0.28)
        perclos_score = min(100.0, (features[3] / 25.0) * 100.0)
        # 2. Prolonged Eye Closures (w=0.20)
        closure_score = min(100.0, (active_closure_duration / 1.5) * 100.0)
        # 3. Yawning Component (w=0.14)
        yawn_score = min(100.0, features[8] * 32.0 + features[9] * 6.0)
        # 4. Head Kinematics & Nodding (w=0.14)
        nod_score = min(100.0, features[14] * 45.0)
        # Weighted combination
        raw = (0.28 * perclos_score + 0.20 * closure_score + 
               0.14 * yawn_score + 0.14 * nod_score)
        return np.clip(raw, 0.0, 100.0)`,

    'train.py': `# Model Training & Evaluation Pipeline
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report
import joblib

def train_and_evaluate(dataset_path="data/fatigue_dataset.csv"):
    df = pd.read_csv(dataset_path)
    X = df[FEATURE_NAMES].values
    y = df["label"].values

    scaler = StandardScaler()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y)
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(n_estimators=120, class_weight="balanced")
    model.fit(X_train_scaled, y_train)

    joblib.dump(model, "models/best_model.joblib")
    joblib.dump(scaler, "models/scaler.joblib")`,

    'main.py': `# SleepyCam AI - Main Pipeline Runner
import cv2
from src.face_features import FaceTracker
from src.eye_features import EyeMetricsTracker
from src.baseline import PersonalBaseline
from src.fatigue import FatigueCalculator
from src.dashboard import DashboardRenderer

def run_sleepycam():
    cap = cv2.VideoCapture(0)
    baseline = PersonalBaseline(duration_seconds=120)
    eye_tracker = EyeMetricsTracker()
    fatigue_calc = FatigueCalculator()
    dashboard = DashboardRenderer()

    while True:
        ret, frame = cap.read()
        # Biometric tracking & scoring loop
        # Press 'q' to quit and generate session report
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContents[selectedFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Mathematical Formulations & Architecture</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Formal formulations for EAR, MAR, PERCLOS, solvePnP Head Pose, and Baseline Deviations.
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveDocTab('math')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeDocTab === 'math'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mathematical Formulas
          </button>
          <button
            onClick={() => setActiveDocTab('code')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeDocTab === 'code'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Source Code Explorer
          </button>
        </div>
      </div>

      {activeDocTab === 'math' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Eye Aspect Ratio (EAR) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                1. Eye Aspect Ratio (EAR)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Soukupová & Čech (2016)</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto text-center">
              EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Calculates the ratio of vertical eyelid distance to horizontal eye width using MediaPipe landmarks. When open, EAR averages <strong>0.25–0.32</strong>. During blinks and drowsiness, EAR drops below <strong>0.18</strong>.
            </p>
          </div>

          {/* Card 2: PERCLOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                2. PERCLOS (Percentage of Eye Closure)
              </span>
              <span className="text-[10px] font-mono text-slate-500">NHTSA Standard</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto text-center">
              PERCLOS = (1 / T) * ∫ [ EAR(t) &lt; (0.75 * EAR_base) ] dt * 100%
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Integrates the percentage of time in a rolling 45-second window where eyes are closed beyond 75% of nominal baseline. Values exceeding <strong>15%</strong> correlate with elevated drowsiness risk.
            </p>
          </div>

          {/* Card 3: Mouth Aspect Ratio (MAR) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                3. Mouth Aspect Ratio & Yawning
              </span>
              <span className="text-[10px] font-mono text-slate-500">Temporal Thresholding</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto text-center">
              MAR = (||p13-p14|| + ||p82-p87|| + ||p312-p317||) / (3 * ||p78-p308||)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Measures oral cavity expansion. To eliminate false positives from speech and smiling, a yawn requires MAR &gt; <strong>0.60</strong> continuously sustained for <strong>1.5s to 8.0s</strong>.
            </p>
          </div>

          {/* Card 4: Head Pose solvePnP */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                4. 3D Head Pose via Perspective-n-Point
              </span>
              <span className="text-[10px] font-mono text-slate-500">Levenberg-Marquardt PnP</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-purple-300 overflow-x-auto text-center">
              s * [u, v, 1]^T = K * [R | t] * [X, Y, Z, 1]^T
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Maps 6 canonical 2D facial landmarks to an anthropometric 3D metric head model to estimate Euler angles (Pitch, Yaw, Roll). Detects progressive downward pitch drooping and recovery snaps.
            </p>
          </div>

          {/* Card 5: Baseline Normalization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase">
                5. Baseline Relative Deviation
              </span>
              <span className="text-[10px] font-mono text-slate-500">Personalized Norms</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto text-center">
              Δ_rel EAR(t) = [ EAR(t) - EAR_baseline ] / EAR_baseline
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Adapts to anatomical variances (e.g., natural eye aperture, baseline blink frequency) derived during the 2-minute calibration window.
            </p>
          </div>

          {/* Card 6: Fatigue Formula */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-yellow-400 uppercase">
                6. Multimodal Fatigue Formula (0-100)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Weighted Heuristic</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-yellow-300 overflow-x-auto text-center">
              Score = 0.28*PERCLOS + 0.20*Closure + 0.14*Yawn + 0.14*Nod + 0.10*Blink + 0.08*Posture + 0.06*Facial
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Synthesizes 7 physiological indicators with exponential moving average smoothing (α = 0.12) to produce an interpretable fatigue score.
            </p>
          </div>
        </div>
      ) : (
        /* Source Code Viewer */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* File Tab Selector */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
            <div className="flex space-x-2">
              {Object.keys(fileContents).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedFile === fileName
                      ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 text-xs font-mono text-slate-400 hover:text-slate-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Code display */}
          <pre className="p-6 font-mono text-xs text-slate-300 bg-slate-950/80 overflow-x-auto leading-relaxed">
            <code>{fileContents[selectedFile]}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
