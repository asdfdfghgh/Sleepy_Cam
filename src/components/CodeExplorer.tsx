import React, { useState } from 'react';
import { BookOpen, Copy, Check, FileCode } from 'lucide-react';
import { Card } from './ui/Primitives';
import { SegmentedControl } from './21st/InteractiveControls';

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
    perclos: float = 0.30
    eye_closure: float = 0.25
    blink_duration: float = 0.20
    blink_frequency: float = 0.10
    yawn_frequency: float = 0.10
    posture_support: float = 0.05
    head_nodding: float = 0.00  # Removed from scoring`,

    'src/fatigue.py': `# Multimodal Fatigue Calculator & Dual Scoring Engine
from typing import List
import numpy as np

class FatigueCalculator:
    def compute_score(self, perclos, closure_sec, blink_dur, blink_rate, yawn_rate, posture):
        # Eye-dominant indicators (95% ocular + yawning, 5% posture support, 0% head nodding)
        perclos_score = min(100.0, (perclos / 25.0) * 100.0)
        closure_score = min(100.0, (closure_sec / 1.5) * 100.0)
        blink_dur_score = min(100.0, max(0.0, (blink_dur - 0.18) / 0.35) * 100.0)
        yawn_score = min(100.0, yawn_rate * 32.0)
        raw = (
            0.30 * perclos_score +
            0.25 * closure_score +
            0.20 * blink_dur_score +
            0.10 * blink_rate +
            0.10 * yawn_score +
            0.05 * posture
        )
        return np.clip(raw, 0.0, 100.0)`,

    'src/calibration.py': `# Personalized Geometric Eye Calibration
def normalize_eye_openness(ear: float, closed_ear: float, open_ear: float) -> float:
    span = max(0.04, open_ear - closed_ear)
    pct = ((ear - closed_ear) / span) * 100.0
    return max(0.0, min(110.0, pct))`,

    'main.py': `# SleepyCam AI - Real-Time Loop Overview
def process_frame(face_landmarker, frame, baseline):
    res = face_landmarker.detect(frame)
    if res.eye_width_px < 18:
        return "FACE TOO FAR"  # Distance guard against false CLOSED classifications
    return evaluate_dual_score(res.left_ear, res.right_ear, res.inner_mar, baseline)`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContents[selectedFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Mathematical Formulations & Reference Architecture</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Formal equations for geometric EAR, inner-lip MAR, NHTSA PERCLOS, and Personal Behavioral Deviation.
          </p>
        </div>

        <SegmentedControl
          value={activeDocTab}
          onChange={setActiveDocTab}
          options={[
            { value: 'math', label: 'Mathematical Formulas' },
            { value: 'code', label: 'Reference Architecture' }
          ]}
        />
      </div>

      {activeDocTab === 'math' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: '1. Eye Aspect Ratio (EAR)',
              ref: 'Soukupová & Čech',
              formula: 'EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)',
              note: 'Computed independently for Left & Right eyes with a <18px minimum eye width distance safeguard to prevent false CLOSED classifications.'
            },
            {
              title: '2. PERCLOS (Rolling 45s)',
              ref: 'NHTSA Standard',
              formula: 'PERCLOS = (1 / T) * ∫ [ EAR(t) < threshold ] dt × 100%',
              note: 'Measures the percentage of time eyelids remain closed across a rolling window. Primary 30% weight in observable fatigue scoring.'
            },
            {
              title: '3. Inner-Lip Mouth Aspect Ratio',
              ref: 'Beard & Smile Immune',
              formula: 'MAR = ||p13 - p14|| / ||p78 - p308||',
              note: 'Tracks inner vermilion landmarks only, filtering speech cadence and horizontal lip-corner smile expansion from sustained yawns.'
            },
            {
              title: '4. Personalized Openness Normalization',
              ref: '4-Step Calibration',
              formula: 'Openness % = clamp((EAR - EAR_closed) / (EAR_open - EAR_closed), 0, 110)',
              note: 'Adjusts to your natural eye shape during guided calibration without masking or zeroing current drowsiness indicators.'
            },
            {
              title: '5. Dual-Axis Fatigue Index',
              ref: '65% Observable + 35% Deviation',
              formula: 'Score = 0.65 * ObservableFatigue + 0.35 * BehavioralDeviation',
              note: 'Eye-dominant model: PERCLOS 30%, eye openness/closure 25%, blink duration 20%, blink rate 10%, yawning 10%, posture 5%, head nodding 0%.'
            },
            {
              title: '6. Bilateral Microsleep State Machine',
              ref: 'Sustained Closure Only',
              formula: 'ALERT iff t_closed_both >= threshold_sec (default 1.5s)',
              note: 'Requires valid tracking distance, bilateral eye closure, and non-yawning ocular states before sounding Web Audio alerts.'
            }
          ].map((item) => (
            <Card key={item.title} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  {item.title}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{item.ref}</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#0D1015] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.06] font-mono text-xs text-slate-800 dark:text-teal-300 overflow-x-auto">
                {item.formula}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.note}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#0D1015] border-b border-slate-200 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(fileContents).map((fileName) => (
                <button
                  key={fileName}
                  type="button"
                  onClick={() => setSelectedFile(fileName)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                    selectedFile === fileName
                      ? 'bg-white dark:bg-[#1B2029] text-teal-600 dark:text-teal-300 border border-slate-200 dark:border-white/[0.08]'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-5 font-mono text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0B0E13] overflow-x-auto leading-relaxed">
            <code>{fileContents[selectedFile]}</code>
          </pre>
        </Card>
      )}
    </div>
  );
};
