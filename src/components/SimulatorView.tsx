import React, { useState } from 'react';
import { Sliders, Sparkles, AlertCircle, Info, Zap, Check, ArrowRight } from 'lucide-react';
import { BiometricMetrics, BaselineData } from '../types';
import { computeHeuristicFatigueScore, TIER_CONFIG } from '../utils/mathFormulas';

interface SimulatorViewProps {
  metrics: BiometricMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<BiometricMetrics>>;
  baseline: BaselineData;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  metrics,
  setMetrics,
  baseline
}) => {
  const [activePreset, setActivePreset] = useState<string>('custom');

  const presets = [
    {
      id: 'awake',
      title: 'Alert & Focused',
      desc: 'Nominal resting state with wide eyes and steady head pose.',
      tier: 'AWAKE',
      values: {
        ear: 0.29,
        perclos: 3,
        blinkRate: 14,
        avgBlinkDuration: 0.18,
        activeClosureSec: 0,
        longBlinks: 0,
        mar: 0.23,
        yawnsPerMin: 0,
        avgYawnDuration: 0,
        pitch: 0,
        headVelocity: 10,
        headStability: 90,
        nodFrequency: 0,
        postureScore: 92,
        facialActivity: 60
      }
    },
    {
      id: 'tired',
      title: 'Mild Drowsiness',
      desc: 'Eyes fluttering, blink rate elevating, slight forward head tilt.',
      tier: 'GETTING TIRED',
      values: {
        ear: 0.22,
        perclos: 15,
        blinkRate: 24,
        avgBlinkDuration: 0.28,
        activeClosureSec: 0,
        longBlinks: 1,
        mar: 0.32,
        yawnsPerMin: 0.5,
        avgYawnDuration: 1.5,
        pitch: -6,
        headVelocity: 16,
        headStability: 75,
        nodFrequency: 0,
        postureScore: 78,
        facialActivity: 40
      }
    },
    {
      id: 'yawn',
      title: 'Active Yawning Episode',
      desc: 'Wide mouth expansion (>0.65 MAR) lasting >2 seconds with squinted eyes.',
      tier: 'FATIGUED',
      values: {
        ear: 0.16,
        perclos: 18,
        blinkRate: 20,
        avgBlinkDuration: 0.35,
        activeClosureSec: 0,
        longBlinks: 2,
        mar: 0.74,
        yawnsPerMin: 3.0,
        avgYawnDuration: 3.2,
        pitch: -8,
        headVelocity: 18,
        headStability: 65,
        nodFrequency: 0,
        postureScore: 70,
        facialActivity: 32
      }
    },
    {
      id: 'nodding',
      title: 'Head Drooping & Nodding',
      desc: 'Cyclical pitch drops below -15 degrees with recovery jerk snaps.',
      tier: 'VERY FATIGUED',
      values: {
        ear: 0.17,
        perclos: 28,
        blinkRate: 11,
        avgBlinkDuration: 0.48,
        activeClosureSec: 0.4,
        longBlinks: 4,
        mar: 0.38,
        yawnsPerMin: 2.0,
        avgYawnDuration: 2.5,
        pitch: -18,
        headVelocity: 28,
        headStability: 35,
        nodFrequency: 2.5,
        postureScore: 50,
        facialActivity: 20
      }
    },
    {
      id: 'microsleep',
      title: 'Critical Microsleep Event',
      desc: 'Prolonged eye closure >1.2s + downward head pitch droop + low facial movement.',
      tier: 'EXTREME FATIGUE',
      values: {
        ear: 0.05,
        perclos: 55,
        blinkRate: 8,
        avgBlinkDuration: 0.95,
        activeClosureSec: 1.6,
        longBlinks: 6,
        mar: 0.45,
        yawnsPerMin: 3.0,
        avgYawnDuration: 3.5,
        pitch: -25,
        headVelocity: 6,
        headStability: 20,
        nodFrequency: 3.0,
        postureScore: 35,
        facialActivity: 12
      }
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setActivePreset(preset.id);
    const openness = preset.values.ear < 0.16 ? 0 : Math.round(Math.min(100, Math.max(0, ((preset.values.ear - 0.12) / (baseline.ear - 0.12)) * 100)));
    setMetrics((prev) => ({
      ...prev,
      ...preset.values,
      leftEyeOpennessPct: openness,
      rightEyeOpennessPct: openness,
      eyeOpennessPct: openness,
      mouthOpeningPct: Math.round((preset.values.mar / baseline.mar) * 50),
      isEyeClosed: preset.values.ear < 0.18,
      isYawning: preset.values.mar > 0.6
    }));
  };

  const updateParam = (key: keyof BiometricMetrics, value: number) => {
    setActivePreset('custom');
    setMetrics((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'ear') {
        const openness = value < 0.16 ? 0 : Math.round(Math.min(100, Math.max(0, ((value - 0.12) / (baseline.ear - 0.12)) * 100)));
        next.leftEyeOpennessPct = openness;
        next.rightEyeOpennessPct = openness;
        next.eyeOpennessPct = openness;
        next.isEyeClosed = value < 0.18;
      }
      if (key === 'mar') {
        next.mouthOpeningPct = Math.round((value / baseline.mar) * 50);
        next.isYawning = value > 0.6;
      }
      return next;
    });
  };

  const { score, tier, components } = computeHeuristicFatigueScore(metrics, baseline);
  const tierData = TIER_CONFIG[tier];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <span>Behavioral Simulator & Parameter Sandbox</span>
        </h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Simulate multimodal facial, ocular, and kinematic conditions to analyze mathematical fatigue weighting.
        </p>
      </div>

      {/* Preset State Injectors */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          1. Select a Scenario Preset:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {presets.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{preset.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{preset.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500">Target Tier</span>
                  <span className="font-semibold text-slate-300">{preset.tier}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Outcome Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
            Calculated Fatigue Outcome
          </span>
          <div className="text-5xl font-mono font-black" style={{ color: tierData.color }}>
            {Math.round(score)} <span className="text-2xl font-normal text-slate-500">/ 100</span>
          </div>
          <div
            className="inline-block text-xs font-mono font-bold px-3 py-1 rounded-full uppercase"
            style={{
              backgroundColor: `${tierData.color}20`,
              color: tierData.color,
              border: `1px solid ${tierData.color}50`
            }}
          >
            {tier}
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Personalized against baseline EAR ({baseline.ear}) & Pitch ({baseline.headPitch}°).
          </p>
        </div>

        {/* Feature Contribution Breakdown */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="text-xs font-mono font-semibold text-slate-300 mb-2">
            Multimodal Feature Contributions:
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <ContributionRow label="PERCLOS (w=0.30)" value={components.perclos} color="#ef4444" />
            <ContributionRow label="Eye Closures (w=0.25)" value={components.prolongedClosures} color="#f97316" />
            <ContributionRow label="Blink Abnormalities (w=0.20)" value={components.blinkAbnormalities} color="#8b5cf6" />
            <ContributionRow label="Yawn Dynamics (w=0.10)" value={components.yawn} color="#eab308" />
            <ContributionRow label="Posture Degradation (w=0.05)" value={components.postureChanges} color="#10b981" />
            <ContributionRow label="Head Nodding (w=0.00)" value={components.headNodding} color="#06b6d4" />
          </div>
        </div>
      </div>

      {/* Manual Fine-Tuning Sliders */}
      <div className="space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          2. Fine-Tune Feature Parameters:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* EAR */}
          <SliderControl
            label="Eye Aspect Ratio (EAR)"
            value={metrics.ear}
            min={0.02}
            max={0.35}
            step={0.01}
            display={`${metrics.ear.toFixed(2)} (Nominal ~0.28)`}
            onChange={(v) => updateParam('ear', v)}
          />

          {/* PERCLOS */}
          <SliderControl
            label="PERCLOS (% Closed Time)"
            value={metrics.perclos}
            min={0}
            max={70}
            step={1}
            display={`${metrics.perclos}%`}
            onChange={(v) => updateParam('perclos', v)}
          />

          {/* Blink Rate */}
          <SliderControl
            label="Blink Rate (per min)"
            value={metrics.blinkRate}
            min={4}
            max={40}
            step={1}
            display={`${Math.round(metrics.blinkRate)} blinks/min`}
            onChange={(v) => updateParam('blinkRate', v)}
          />

          {/* Mouth Aspect Ratio */}
          <SliderControl
            label="Mouth Aspect Ratio (MAR)"
            value={metrics.mar}
            min={0.15}
            max={0.85}
            step={0.01}
            display={`${metrics.mar.toFixed(2)} (Yawn >0.60)`}
            onChange={(v) => updateParam('mar', v)}
          />

          {/* Yawns per minute */}
          <SliderControl
            label="Yawns Rate (per min)"
            value={metrics.yawnsPerMin}
            min={0}
            max={5}
            step={0.5}
            display={`${metrics.yawnsPerMin} yawns/min`}
            onChange={(v) => updateParam('yawnsPerMin', v)}
          />

          {/* Head Pitch */}
          <SliderControl
            label="Head Pitch (° Downward Droop)"
            value={metrics.pitch}
            min={-35}
            max={15}
            step={1}
            display={`${metrics.pitch}°`}
            onChange={(v) => updateParam('pitch', v)}
          />

          {/* Head Nodding Frequency */}
          <SliderControl
            label="Head Nod Cycles (per min)"
            value={metrics.nodFrequency}
            min={0}
            max={6}
            step={0.5}
            display={`${metrics.nodFrequency} nods/min`}
            onChange={(v) => updateParam('nodFrequency', v)}
          />

          {/* Posture Score */}
          <SliderControl
            label="Upper Body Posture Score"
            value={metrics.postureScore}
            min={20}
            max={100}
            step={1}
            display={`${metrics.postureScore}%`}
            onChange={(v) => updateParam('postureScore', v)}
          />

          {/* Facial Activity */}
          <SliderControl
            label="Facial Expression Activity"
            value={metrics.facialActivity}
            min={5}
            max={80}
            step={1}
            display={`${metrics.facialActivity}%`}
            onChange={(v) => updateParam('facialActivity', v)}
          />
        </div>
      </div>
    </div>
  );
};

const ContributionRow: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color
}) => (
  <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className="font-bold text-slate-200">{value}%</span>
    </div>
    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, display, onChange }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
    <div className="flex justify-between text-xs font-mono">
      <span className="text-slate-300 font-medium">{label}</span>
      <span className="text-cyan-400 font-bold">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
    />
  </div>
);
