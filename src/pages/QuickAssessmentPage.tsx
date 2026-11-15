import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Play,
  Square,
  AlertTriangle,
  FileBarChart,
  Brain,
  RotateCcw,
  Activity
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { useFatigueMonitor } from '../hooks/useFatigueMonitor';
import { TIER_CONFIG } from '../utils/mathFormulas';
import { DESIGN_TOKENS } from '../styles/designTokens';
import { Card, Button, ProgressBar } from '../components/ui/Primitives';
import { VideoStage } from '../components/monitoring/VideoStage';
import { KssModal } from '../components/monitoring/KssModal';
import { SegmentedControl } from '../components/21st/InteractiveControls';
import { CircularGauge } from '../components/21st/CircularGauge';
import { NumberTicker } from '../components/21st/NumberTicker';
import {
  CategoryDonutChart,
  DonutSegment,
  FatigueAreaChart
} from '../components/21st/AnalyticsCharts';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';

function getTierFromScore(score: number) {
  if (score <= 20) return TIER_CONFIG['LOW FATIGUE INDICATORS'];
  if (score <= 40) return TIER_CONFIG['MILD FATIGUE INDICATORS'];
  if (score <= 60) return TIER_CONFIG['MODERATE FATIGUE INDICATORS'];
  if (score <= 80) return TIER_CONFIG['HIGH FATIGUE INDICATORS'];
  return TIER_CONFIG['VERY HIGH FATIGUE INDICATORS'];
}

function formatMmSs(sec: number): string {
  const whole = Math.max(0, Math.floor(sec));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const QuickAssessmentPage: React.FC = () => {
  const { kssRating, selectKssLevel, openSessionReport, setRoute } = useAppContext();
  const monitor = useFatigueMonitor({ mode: 'assessment' });
  const [showKssModal, setShowKssModal] = useState(false);

  const target = monitor.assessmentTargetDuration;
  const remaining = Math.max(0, Math.ceil(target - monitor.elapsedSec));
  const progressPct = Math.min(100, Math.round((monitor.elapsedSec / target) * 100));
  const isRunning = monitor.runState === 'running';
  const liveTierMeta = TIER_CONFIG[monitor.scoreResult.tier] || TIER_CONFIG['LOW FATIGUE INDICATORS'];

  const completed = monitor.assessmentCompletedRecord;
  const showResults = Boolean(completed && !isRunning);

  const completedTierMeta = completed ? getTierFromScore(completed.avgFatigueScore) : liveTierMeta;
  const completedStatusWord = completedTierMeta.label.replace(' FATIGUE INDICATORS', '');

  const donutSegments: DonutSegment[] = useMemo(() => {
    if (!completed) return [];
    return Object.entries(completed.categoryDurationsSec).map(([label, sec]) => ({
      name: label.replace(' FATIGUE INDICATORS', ''),
      value: Math.round(sec * 10) / 10,
      color: DESIGN_TOKENS.chartColors.categories[label] || '#2DD4BF'
    }));
  }, [completed]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header + Window Duration Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {showResults ? 'Scan Results' : 'Quick Fatigue Scan'}
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 mt-0.5">
            {showResults
              ? `${completed!.durationSec.toFixed(0)}S WINDOW COMPLETE · QUALITY ${completed!.detectionQualityPct}%`
              : isRunning
              ? 'SCANNING BIOMETRICS · KEEP EYES FACING SENSOR'
              : 'SELECT SCAN WINDOW & START'}
          </p>
        </div>

        <SegmentedControl
          disabled={isRunning}
          value={target}
          onChange={(d) => monitor.setAssessmentTargetDuration(d)}
          options={[
            { value: 10, label: '10s' },
            { value: 30, label: '30s' },
            { value: 60, label: '60s' },
            { value: 120, label: '120s' }
          ]}
        />
      </div>

      {/* Smooth Transition between Results View and Active Scanning HUD */}
      <AnimatePresence mode="wait">
        {showResults && completed ? (
          <motion.div
            key="results-screen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {completed.validTrackingSec < Math.min(10, target * 0.5) && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Low face visibility ({completed.validTrackingSec.toFixed(1)}s valid /{' '}
                  {completed.durationSec.toFixed(0)}s total). Improve front lighting and re-scan.
                </span>
              </div>
            )}

            <SpotlightSurface
              beam
              beamColorFrom={completedTierMeta.color}
              beamColorTo="#00ffc6"
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Big Result Ring & CURRENT STATUS */}
                <div className="lg:col-span-5 flex flex-col items-center text-center">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-[#00ffc6]/85 mb-3">
                    CURRENT STATUS
                  </div>

                  <CircularGauge
                    value={completed.avgFatigueScore}
                    size={172}
                    strokeWidth={10}
                    color={completedTierMeta.color}
                    label={completed.avgFatigueScore.toFixed(0)}
                    sublabel="FATIGUE SCORE"
                  />

                  <div
                    className="mt-4 text-sm font-mono font-bold tracking-[0.18em] px-3.5 py-1 rounded-md border"
                    style={{
                      color: completedTierMeta.color,
                      borderColor: `${completedTierMeta.color}4D`,
                      backgroundColor: `${completedTierMeta.color}18`
                    }}
                  >
                    {completedStatusWord}
                  </div>

                  <div className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Peak {completed.maxFatigueScore.toFixed(1)} · Abs{' '}
                    {completed.avgAbsoluteScore.toFixed(1)}
                  </div>

                  <div className="sr-only">
                    <NumberTicker value={completed.avgFatigueScore} decimals={1} />
                  </div>
                </div>

                {/* Compact Supporting Indicators & Donut */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Eye Behavior (PERCLOS)
                    </div>
                    <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
                      {completed.blinkSummary.avgPerclos.toFixed(1)}%
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                      {completed.validTrackingSec.toFixed(1)}s valid frames
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Blink Activity
                    </div>
                    <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
                      {completed.blinkSummary.totalBlinks} blinks
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                      {completed.blinkSummary.avgBlinkRate.toFixed(1)} bpm ·{' '}
                      {completed.blinkSummary.avgBlinkDuration.toFixed(2)}s avg
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Yawning &amp; Closures
                    </div>
                    <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
                      {completed.yawnSummary.totalYawns} yawns
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                      {completed.microsleepEvents.length} prolonged closures
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Deviation · KSS
                    </div>
                    <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white mt-1 tabular-nums">
                      {completed.avgPersonalDeviation.toFixed(1)}
                      <span className="text-xs font-normal text-zinc-500">/100</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                      KSS {completed.kssRating ? `${completed.kssRating.level}/9` : 'Unrated'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Action Bar */}
              <div className="pt-4 border-t border-black/10 dark:border-white/12 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
                  {completed.limitationsNote}
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button variant="primary" size="sm" onClick={() => openSessionReport(completed.id)}>
                    <FileBarChart className="w-4 h-4" />
                    <span>Export Report</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => monitor.startSession(target)}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Scan Again</span>
                  </Button>
                </div>
              </div>
            </SpotlightSurface>

            {/* Session Waveform + Breakdown Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Card className="lg:col-span-8 p-5 space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85">
                  Scan Signal Curve
                </div>
                <FatigueAreaChart points={completed.history} height={190} metric="dual" />
              </Card>
              <Card className="lg:col-span-4 p-5 space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 text-center">
                  State Breakdown
                </div>
                <CategoryDonutChart
                  segments={donutSegments}
                  centerValue={`${Math.round(completed.durationSec)}s`}
                  centerLabel="Window"
                  height={190}
                />
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="scanning-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
          >
            {/* Large Live Optical Feed */}
            <div className="lg:col-span-7">
              <VideoStage
                videoRef={monitor.videoRef}
                canvasRef={monitor.canvasRef}
                runState={monitor.runState}
                sourceType={monitor.sourceType}
                videoAspect={monitor.videoAspect}
                modelLoading={monitor.modelLoading}
                cameraError={monitor.cameraError}
                diagnostics={monitor.diagnostics}
                microsleepState={monitor.microsleepState}
                activeAlert={monitor.activeAlert}
                showOverlay={monitor.showOverlay}
                onToggleOverlay={() => monitor.setShowOverlay((v) => !v)}
                onVideoMetadata={monitor.handleVideoMetadata}
                onEnableCamera={() => monitor.startSession(target)}
                onSwitchSynthetic={() => monitor.switchSourceMode('synthetic')}
                enablePromptLabel={`Start ${target}s Scan`}
                scannerVariant="scanning"
              />
            </div>

            {/* Right HUD Countdown & Live States */}
            <div className="lg:col-span-5 space-y-4">
              <SpotlightSurface
                beam
                beamColorFrom="#00ffc6"
                beamColorTo="#00d9aa"
                className="p-5 sm:p-6 space-y-5"
              >
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-zinc-600 dark:text-[#00ffc6]/85">
                  <span>{isRunning ? 'SCANNING...' : 'STANDBY'}</span>
                  <span className="tabular-nums">{progressPct}% COMPLETE</span>
                </div>

                {/* Animated Circular Countdown Ring */}
                <div className="flex flex-col items-center justify-center py-1">
                  <CircularGauge
                    value={isRunning ? progressPct : 0}
                    size={156}
                    strokeWidth={8}
                    color={isRunning ? '#00ffc6' : '#00d9aa'}
                    label={formatMmSs(remaining)}
                    sublabel={isRunning ? 'SCANNING...' : `${target}S TARGET`}
                  />
                </div>

                <ProgressBar value={progressPct} />

                {/* Minimal Crisp Live Indicator States */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="rounded-lg bg-zinc-100/90 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12 p-2.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">FACE</span>
                    <span
                      className={`font-semibold truncate block mt-0.5 ${
                        monitor.diagnostics.faceDetected
                          ? 'text-[#007a5f] dark:text-[#00ffc6]'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {monitor.diagnostics.faceDetected ? 'TRACKED' : 'UNSEEN'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-zinc-100/90 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12 p-2.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">EYES</span>
                    <span className="font-semibold text-zinc-900 dark:text-[#00ffc6] truncate block mt-0.5">
                      {monitor.diagnostics.leftEyeState === monitor.diagnostics.rightEyeState
                        ? monitor.diagnostics.leftEyeState
                        : `${monitor.diagnostics.leftEyeState.slice(0, 4)} / ${monitor.diagnostics.rightEyeState.slice(0, 4)}`}
                    </span>
                  </div>

                  <div className="rounded-lg bg-zinc-100/90 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12 p-2.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">MOUTH</span>
                    <span className="font-semibold text-zinc-900 dark:text-[#00ffc6] truncate block mt-0.5">
                      {monitor.diagnostics.mouthState}
                    </span>
                  </div>
                </div>

                {/* Primary Controls */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {!isRunning ? (
                    <Button
                      variant="primary"
                      onClick={() => monitor.startSession(target)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start {target}s Scan</span>
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => monitor.stopSession(true)}
                      className="flex-1"
                    >
                      <Square className="w-4 h-4" />
                      <span>End Early &amp; Save</span>
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => setShowKssModal(true)}
                    title="Rate subjective sleepiness (Karolinska Scale 1-9)"
                  >
                    <Brain className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6]" />
                    <span>{kssRating ? `KSS ${kssRating.level}/9` : 'KSS'}</span>
                  </Button>
                </div>
              </SpotlightSurface>

              {/* Preliminary Score Card */}
              <Card className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>
                    {monitor.preliminaryResult
                      ? 'PRELIMINARY ESTIMATE (>=10S VALID)'
                      : 'LIVE ESTIMATE'}
                  </span>
                  <span className="tabular-nums">CONF {monitor.scoreResult.confidencePct}%</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-mono text-2xl font-bold tabular-nums"
                      style={{ color: liveTierMeta.color }}
                    >
                      {monitor.scoreResult.score.toFixed(1)}
                    </span>
                    <span className="font-mono text-xs text-slate-500">/ 100</span>
                  </div>
                  <span
                    className="text-[11px] font-mono font-semibold"
                    style={{ color: liveTierMeta.color }}
                  >
                    {monitor.scoreResult.tier.replace(' FATIGUE INDICATORS', '')}
                  </span>
                </div>

                <ProgressBar
                  value={monitor.scoreResult.score}
                  colorHex={liveTierMeta.color}
                  heightClass="h-1.5"
                />

                <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    Valid {monitor.validTrackingSec.toFixed(1)}s · Unseen{' '}
                    {monitor.invalidTrackingSec.toFixed(1)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setRoute('monitoring')}
                    className="inline-flex items-center gap-1 text-[#007a5f] dark:text-[#00ffc6] font-medium hover:underline cursor-pointer"
                  >
                    <Activity className="w-3 h-3" />
                    <span>Continuous Monitor</span>
                  </button>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <KssModal
        open={showKssModal}
        onClose={() => setShowKssModal(false)}
        currentLevel={kssRating?.level ?? null}
        onSelect={(lvl) => selectKssLevel(lvl)}
      />
    </div>
  );
};
