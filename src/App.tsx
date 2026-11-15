import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DetectorView } from './components/DetectorView';
import { SimulatorView } from './components/SimulatorView';
import { TrainingView } from './components/TrainingView';
import { ReportsView } from './components/ReportsView';
import { CodeExplorer } from './components/CodeExplorer';
import {
  BiometricMetrics,
  BaselineData,
  MicrosleepEventLog,
  SessionDataPoint,
  DatasetSample,
  FatigueTier
} from './types';
import { computeHeuristicFatigueScore, TIER_CONFIG } from './utils/mathFormulas';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('detector');

  // Baseline Calibration state with localStorage persistence
  const [baseline, setBaseline] = useState<BaselineData>(() => {
    try {
      const saved = localStorage.getItem('sleepycam_baseline_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      ear: 0.28,
      mar: 0.20,
      blinkRate: 15,
      blinkDuration: 0.18,
      headPitch: 0.0,
      facialActivity: 50,
      postureScore: 90,
      isCalibrated: false,
      progressPct: 0
    };
  });

  // Real-time Biometrics state
  const [metrics, setMetrics] = useState<BiometricMetrics>({
    ear: 0.28,
    leftEar: 0.28,
    rightEar: 0.28,
    leftEyeOpennessPct: null, // UNCALIBRATED until calibrated
    rightEyeOpennessPct: null, // UNCALIBRATED until calibrated
    eyeOpennessPct: null,
    isEyeClosed: false,
    activeClosureSec: 0,
    totalBlinks: 0,
    blinkRate: 15,
    avgBlinkDuration: 0.18,
    longBlinks: 0,
    perclos: 4.2,

    mar: 0.24,
    mouthOpeningPct: 48,
    isYawning: false,
    totalYawns: 0,
    yawnsPerMin: 0,
    avgYawnDuration: 0,

    pitch: 0,
    yaw: 0,
    roll: 0,
    headVelocity: 12,
    headStability: 85,
    nodFrequency: 0,
    totalNods: 0,

    postureScore: 88,
    shoulderAngle: 0,
    isSlouching: false,
    isLeaning: false,

    facialActivity: 52
  });

  // Microsleep Events state
  const [microsleepEvents, setMicrosleepEvents] = useState<MicrosleepEventLog[]>([
    {
      id: 'init-1',
      timeFormatted: '12:45:10',
      durationSec: 1.1,
      pitchDropDeg: 14,
      recoveryVelocity: 34,
      confidencePct: 88,
      notes: 'Initial validation trial event'
    }
  ]);

  // Session History for sparklines and reports
  const [sessionHistory, setSessionHistory] = useState<SessionDataPoint[]>([
    { timeSec: 1, fatigueScore: 12, tier: 'AWAKE', ear: 0.28, perclos: 2.1, mar: 0.22, pitch: 0 },
    { timeSec: 2, fatigueScore: 14, tier: 'AWAKE', ear: 0.29, perclos: 2.3, mar: 0.23, pitch: 0 },
    { timeSec: 3, fatigueScore: 18, tier: 'AWAKE', ear: 0.27, perclos: 3.5, mar: 0.24, pitch: -1 },
    { timeSec: 4, fatigueScore: 24, tier: 'NORMAL', ear: 0.26, perclos: 4.0, mar: 0.25, pitch: -2 },
    { timeSec: 5, fatigueScore: 28, tier: 'NORMAL', ear: 0.25, perclos: 5.1, mar: 0.24, pitch: -3 }
  ]);

  // Data Collection Active Label
  const [activeLabel, setActiveLabel] = useState<{ id: number; name: string } | null>({
    id: 0,
    name: 'Awake'
  });

  // Recorded Dataset Samples
  const [dataset, setDataset] = useState<DatasetSample[]>([
    {
      id: 1,
      timestamp: new Date().toLocaleTimeString(),
      features: [0.29, 0.29, 0.29, 3.2, 14, 0.18, 0, 0.23, 0, 0, 0, 0, 0, 11, 0, 56, 92, 1.2],
      label: 0,
      labelName: 'Awake'
    },
    {
      id: 2,
      timestamp: new Date().toLocaleTimeString(),
      features: [0.21, 0.21, 0.21, 16.5, 22, 0.29, 1, 0.35, 0.5, 1.5, -7, 1, 0, 18, 0, 38, 76, 4.5],
      label: 1,
      labelName: 'Slightly Tired'
    },
    {
      id: 3,
      timestamp: new Date().toLocaleTimeString(),
      features: [0.18, 0.18, 0.18, 26.0, 26, 0.38, 3, 0.68, 2.0, 2.8, -14, 2, -1, 24, 1.5, 24, 62, 9.1],
      label: 2,
      labelName: 'Tired'
    },
    {
      id: 4,
      timestamp: new Date().toLocaleTimeString(),
      features: [0.08, 0.08, 0.08, 52.0, 9, 0.65, 5, 0.55, 3.0, 3.2, -24, 0, 1, 30, 3.0, 14, 42, 16.0],
      label: 3,
      labelName: 'Very Tired'
    }
  ]);

  // Model Mode ('heuristic' or 'ml')
  const [modelMode, setModelMode] = useState<'heuristic' | 'ml'>('heuristic');

  // Compute live score
  const { score: fatigueScore, tier: fatigueTier } = computeHeuristicFatigueScore(metrics, baseline);
  const currentTierData = TIER_CONFIG[fatigueTier] || TIER_CONFIG.NORMAL;

  // Handle label selection
  const handleCollectLabel = (id: number, name: string) => {
    setActiveLabel({ id, name });
    // Add current feature vector to dataset
    const newSample: DatasetSample = {
      id: dataset.length + 1,
      timestamp: new Date().toLocaleTimeString(),
      features: [
        metrics.ear,
        metrics.leftEar,
        metrics.rightEar,
        metrics.perclos,
        metrics.blinkRate,
        metrics.avgBlinkDuration,
        metrics.longBlinks,
        metrics.mar,
        metrics.yawnsPerMin,
        metrics.avgYawnDuration,
        metrics.pitch,
        metrics.yaw,
        metrics.roll,
        metrics.headVelocity,
        metrics.nodFrequency,
        metrics.facialActivity,
        metrics.postureScore,
        2.5
      ],
      label: id,
      labelName: name
    };
    setDataset((prev) => [newSample, ...prev]);
  };

  // Keyboard Shortcuts (A/S/T/V for labels, 1-5 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const k = e.key.toUpperCase();
      if (k === 'A') handleCollectLabel(0, 'Awake');
      if (k === 'S') handleCollectLabel(1, 'Slightly Tired');
      if (k === 'T') handleCollectLabel(2, 'Tired');
      if (k === 'V') handleCollectLabel(3, 'Very Tired');
      if (k === '1') setActiveTab('detector');
      if (k === '2') setActiveTab('simulator');
      if (k === '3') setActiveTab('training');
      if (k === '4') setActiveTab('reports');
      if (k === '5') setActiveTab('code');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metrics, dataset]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fatigueScore={fatigueScore}
        fatigueTier={fatigueTier}
        tierColor={currentTierData.color}
        isCalibrated={baseline.isCalibrated}
      />

      <main className="flex-1">
        {activeTab === 'detector' && (
          <DetectorView
            metrics={metrics}
            setMetrics={setMetrics}
            baseline={baseline}
            setBaseline={setBaseline}
            fatigueScore={fatigueScore}
            fatigueTier={fatigueTier}
            microsleepEvents={microsleepEvents}
            setMicrosleepEvents={setMicrosleepEvents}
            sessionHistory={sessionHistory}
            setSessionHistory={setSessionHistory}
            onCollectLabel={handleCollectLabel}
            activeLabel={activeLabel}
            mode={modelMode}
            setMode={setModelMode}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorView
            metrics={metrics}
            setMetrics={setMetrics}
            baseline={baseline}
          />
        )}

        {activeTab === 'training' && (
          <TrainingView
            dataset={dataset}
            setDataset={setDataset}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            metrics={metrics}
            microsleepEvents={microsleepEvents}
            sessionHistory={sessionHistory}
          />
        )}

        {activeTab === 'code' && <CodeExplorer />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SleepyCam AI © 2026 — Real-time Multimodal Fatigue Detection</span>
          <span>OpenCV • MediaPipe Face Mesh • Scikit-learn • NumPy • Pandas</span>
        </div>
      </footer>
    </div>
  );
}
