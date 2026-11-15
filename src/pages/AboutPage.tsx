import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card } from '../components/ui/Primitives';
import { CodeExplorer } from '../components/CodeExplorer';
import { useAppContext } from '../hooks/useAppContext';
import { BiometricMetrics } from '../types';
import { computeDualFatigueScore, TIER_CONFIG } from '../utils/mathFormulas';
import { SegmentedControl, SettingsSlider } from '../components/21st/InteractiveControls';
import { CircularGauge } from '../components/21st/CircularGauge';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';
import { NumberTicker } from '../components/21st/NumberTicker';

type AboutTab = 'guide' | 'simulator' | 'reference';

export const AboutPage: React.FC = () => {
  const { baseline } = useAppContext();
  const [tab, setTab] = useState<AboutTab>('guide');

  const [simMetrics, setSimMetrics] = useState<BiometricMetrics>({
    ear: 0.28,
    leftEar: 0.28,
    rightEar: 0.28,
    leftEyeOpennessPct: 92,
    rightEyeOpennessPct: 92,
    eyeOpennessPct: 92,
    isEyeClosed: false,
    activeClosureSec: 0,
    totalBlinks: 14,
    blinkRate: 15,
    avgBlinkDuration: 0.18,
    longBlinks: 0,
    perclos: 2.8,
    mar: 0.14,
    mouthOpeningPct: 14,
    isYawning: false,
    totalYawns: 0,
    yawnsPerMin: 0,
    avgYawnDuration: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    headVelocity: 10,
    headStability: 90,
    nodFrequency: 0,
    totalNods: 0,
    postureScore: 90,
    shoulderAngle: 0,
    isSlouching: false,
    isLeaning: false,
    facialActivity: 52
  });

  const simResult = computeDualFatigueScore(simMetrics, baseline);
  const simTier = TIER_CONFIG[simResult.tier] || TIER_CONFIG['LOW FATIGUE INDICATORS'];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Methodology &amp; Simulator
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 mt-0.5">
            SCORING ARCHITECTURE · INTERACTIVE MODEL SANDBOX
          </p>
        </div>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'guide', label: 'Guide' },
            { value: 'simulator', label: 'Simulator' },
            { value: 'reference', label: 'Formulas' }
          ]}
        />
      </div>

      {tab === 'guide' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="p-6 space-y-3">
              <h2 className="font-display font-semibold text-base text-zinc-900 dark:text-white">
                Tri-Signal Alertness Architecture
              </h2>
              <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">Observable Fatigue (0–100):</strong>{' '}
                  PERCLOS (30%), eye openness &amp; closure (25%), sluggish blink duration (20%),
                  blink rate (10%), yawning (10%), optional posture (5%).
                </li>
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">Personal Deviation (0–100):</strong>{' '}
                  Measures drift from your calibrated eye dynamics without erasing existing tiredness.
                </li>
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">Subjective KSS (1–9):</strong>{' '}
                  Karolinska Sleepiness Scale stored independently alongside optical telemetry.
                </li>
              </ul>
            </Card>

            <Card className="p-6 space-y-3">
              <h2 className="font-display font-semibold text-base text-zinc-900 dark:text-white">
                Robustness Safeguards
              </h2>
              <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">Distance Floor (&gt;=18px):</strong>{' '}
                  Marks low-resolution eyes <em>UNCERTAIN</em> instead of triggering false alerts.
                </li>
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">Inner-Lip MAR:</strong>{' '}
                  Separates speaking cadence and wide smiles from genuine yawns.
                </li>
                <li>
                  <strong className="text-[#007a5f] dark:text-[#00ffc6]">0% Head-Nod Weight:</strong>{' '}
                  Looking down to read or type adds zero false fatigue penalty.
                </li>
              </ul>
            </Card>
          </div>

          <Card className="p-5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Non-clinical behavioral tool. Poor lighting or camera obstructions may lower landmark
              confidence. Never rely on automated cues instead of safe rest while driving.
            </p>
          </Card>
        </div>
      )}

      {tab === 'simulator' && (
        <div className="space-y-5">
          <SpotlightSurface
            beam
            beamColorFrom={simTier.color}
            beamColorTo="#00ffc6"
            className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
          >
            <div className="md:col-span-5 flex items-center gap-5">
              <CircularGauge
                value={simResult.score}
                size={116}
                strokeWidth={8}
                color={simTier.color}
                label={simResult.score.toFixed(0)}
                sublabel="SIM SCORE"
              />
              <div className="space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <NumberTicker
                    value={simResult.score}
                    decimals={1}
                    className="text-3xl font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-sm font-mono text-slate-400">/ 100</span>
                </div>
                <div
                  className="text-xs font-mono font-semibold"
                  style={{ color: simTier.color }}
                >
                  {simResult.tier.replace(' FATIGUE INDICATORS', '')}
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  Abs {simResult.absoluteScore.toFixed(1)} · Dev{' '}
                  {simResult.personalDeviationScore.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              {[
                { label: 'PERCLOS (30%)', val: simResult.components.perclos },
                { label: 'Eye & Closure (25%)', val: simResult.components.prolongedClosures },
                { label: 'Blink Dur (20%)', val: simResult.components.blinkAbnormalities },
                { label: 'Yawning (10%)', val: simResult.components.yawn },
                { label: 'Posture (5%)', val: simResult.components.postureChanges },
                { label: 'Head Nod (0%)', val: simResult.components.headNodding }
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-lg bg-zinc-100/85 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12"
                >
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">{item.label}</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {item.val}%
                  </div>
                </div>
              ))}
            </div>
          </SpotlightSurface>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <SettingsSlider
                label="Eye Openness"
                valueDisplay={`${simMetrics.eyeOpennessPct ?? 90}%`}
                value={simMetrics.eyeOpennessPct ?? 90}
                min={0}
                max={100}
                step={1}
                onChange={(v) =>
                  setSimMetrics((m) => ({
                    ...m,
                    eyeOpennessPct: v,
                    leftEyeOpennessPct: v,
                    rightEyeOpennessPct: v
                  }))
                }
              />
            </Card>
            <Card className="p-4">
              <SettingsSlider
                label="PERCLOS"
                valueDisplay={`${simMetrics.perclos.toFixed(1)}%`}
                value={simMetrics.perclos}
                min={0}
                max={50}
                step={0.5}
                onChange={(v) => setSimMetrics((m) => ({ ...m, perclos: v }))}
              />
            </Card>
            <Card className="p-4">
              <SettingsSlider
                label="Active Closure"
                valueDisplay={`${simMetrics.activeClosureSec.toFixed(1)}s`}
                value={simMetrics.activeClosureSec}
                min={0}
                max={2.5}
                step={0.1}
                onChange={(v) => setSimMetrics((m) => ({ ...m, activeClosureSec: v }))}
              />
            </Card>
            <Card className="p-4">
              <SettingsSlider
                label="Avg Blink Duration"
                valueDisplay={`${simMetrics.avgBlinkDuration.toFixed(2)}s`}
                value={simMetrics.avgBlinkDuration}
                min={0.1}
                max={0.7}
                step={0.02}
                onChange={(v) => setSimMetrics((m) => ({ ...m, avgBlinkDuration: v }))}
              />
            </Card>
            <Card className="p-4">
              <SettingsSlider
                label="Yawns / min"
                valueDisplay={`${simMetrics.yawnsPerMin}`}
                value={simMetrics.yawnsPerMin}
                min={0}
                max={4}
                step={0.5}
                onChange={(v) => setSimMetrics((m) => ({ ...m, yawnsPerMin: v }))}
              />
            </Card>
            <Card className="p-4">
              <SettingsSlider
                label="Posture Score"
                valueDisplay={`${simMetrics.postureScore}%`}
                value={simMetrics.postureScore}
                min={20}
                max={100}
                step={1}
                onChange={(v) => setSimMetrics((m) => ({ ...m, postureScore: v }))}
              />
            </Card>
          </div>
        </div>
      )}

      {tab === 'reference' && <CodeExplorer />}
    </div>
  );
};
