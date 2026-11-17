import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Eye,
  Smile,
  AlertTriangle,
  Brain,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  FileBarChart
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { useFatigueMonitor } from '../hooks/useFatigueMonitor';
import { DEVIATION_TIER_CONFIG, TIER_CONFIG } from '../utils/mathFormulas';
import { Card, Button, ProgressBar } from '../components/ui/Primitives';
import { VideoStage } from '../components/monitoring/VideoStage';
import { KssModal } from '../components/monitoring/KssModal';
import { CalibrationWizard } from '../components/monitoring/CalibrationWizard';
import { ValidationSuitePanel } from '../components/monitoring/ValidationSuitePanel';
import { PostAssessmentFeedbackCard } from '../components/monitoring/PostAssessmentFeedbackCard';
import { CircularGauge } from '../components/21st/CircularGauge';
import { NumberTicker } from '../components/21st/NumberTicker';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';
import { FatigueAreaChart } from '../components/21st/AnalyticsCharts';
import { SegmentedControl } from '../components/21st/InteractiveControls';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineIndicator,
  TimelineConnector,
  TimelineContent,
  TimelineHeader,
  TimelineTitle,
  TimelineTime,
  TimelineDescription
} from '../components/21st/Timeline';

export const LiveMonitoringPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    baseline,
    kssRating,
    selectKssLevel,
    audioConfig,
    toggleAudioMute,
    cameras,
    openSessionReport
  } = useAppContext();

  const monitor = useFatigueMonitor({ mode: 'monitoring' });
  const [showKssModal, setShowKssModal] = useState(false);
  const [chartMetric, setChartMetric] = useState<'dual' | 'perclos'>('dual');

  const tierMeta = TIER_CONFIG[monitor.scoreResult.tier] || TIER_CONFIG['LOW FATIGUE INDICATORS'];
  const devMeta =
    DEVIATION_TIER_CONFIG[monitor.scoreResult.deviationTier] ||
    DEVIATION_TIER_CONFIG['MINIMAL DEVIATION'];
  const shortTier = monitor.scoreResult.tier.replace(' FATIGUE INDICATORS', '');

  const formatDuration = (sec: number) => {
    const whole = Math.max(0, Math.floor(sec));
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
      {/* Compact HUD Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                monitor.runState === 'running'
                  ? 'bg-[#00d9aa] shadow-[0_0_8px_#00ffc6]'
                  : monitor.runState === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-zinc-400 dark:bg-white/30'
              }`}
            />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Live Monitor
            </h1>
          </div>
          <span className="font-mono text-xs px-3 py-1 rounded-full border border-black/15 dark:border-[#00ffc6]/25 bg-white/85 dark:bg-[#0a0a0a]/90 text-zinc-800 dark:text-[#00ffc6] tabular-nums">
            {formatDuration(monitor.elapsedSec)}
          </span>
        </div>

        {/* Utility Icon Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={audioConfig.audioEnabled ? 'secondary' : 'danger'}
            size="sm"
            onClick={toggleAudioMute}
            title="Toggle Audio Alerts (Shortcut: M)"
          >
            {audioConfig.audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#007a5f] dark:text-[#00ffc6]" />
                <span>Audio [M]</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Muted [M]</span>
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => monitor.startGuidedCalibration()}
            title="Run 4-step personal eye calibration"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#007a5f] dark:text-[#00ffc6]" />
            <span>{baseline.isCalibrated ? 'Recalibrate' : 'Calibrate'}</span>
          </Button>

          <Button
            variant={settings.diagnosticsMode ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => updateSettings({ diagnosticsMode: !settings.diagnosticsMode })}
            title="Toggle multimodal scoring audit & validation"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </Button>
        </div>
      </div>

      {/* Saved Session Notice & Optional Post-Session Feedback */}
      {monitor.completedMonitorSession && monitor.runState === 'idle' && (
        <div className="space-y-4">
          <Card className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono text-zinc-700 dark:text-zinc-200 tabular-nums">
              SAVED · {monitor.completedMonitorSession.durationSec.toFixed(0)}s · AVG{' '}
              <strong className="text-[#007a5f] dark:text-[#00ffc6]">
                {monitor.completedMonitorSession.avgFatigueScore.toFixed(1)}
              </strong>
              /100
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openSessionReport(monitor.completedMonitorSession!.id)}
            >
              <FileBarChart className="w-3.5 h-3.5" />
              <span>Full Report</span>
            </Button>
          </Card>

          <PostAssessmentFeedbackCard session={monitor.completedMonitorSession} />
        </div>
      )}

      {/* Main HUD Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Camera Feed + Compact Icon Controls */}
        <div className="lg:col-span-8 space-y-3.5">
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
            onEnableCamera={() => monitor.startSession()}
            onSwitchSynthetic={() => monitor.switchSourceMode('synthetic')}
            enablePromptLabel="Start Monitoring"
            scannerVariant="monitoring"
          />

          <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {monitor.runState === 'idle' || monitor.runState === 'preview' ? (
                <Button variant="primary" onClick={() => monitor.startSession()} title="Start live fatigue monitoring">
                  <Play className="w-4 h-4" />
                  <span>Start Monitor</span>
                </Button>
              ) : monitor.runState === 'running' ? (
                <>
                  <Button variant="secondary" onClick={() => monitor.pauseSession()} title="Pause monitoring">
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </Button>
                  <Button variant="danger" onClick={() => monitor.stopSession(true)} title="Stop and save session">
                    <Square className="w-4 h-4" />
                    <span>Stop &amp; Save</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" onClick={() => monitor.resumeSession()} title="Resume monitoring">
                    <Play className="w-4 h-4" />
                    <span>Resume</span>
                  </Button>
                  <Button variant="danger" onClick={() => monitor.stopSession(true)} title="Stop and save session">
                    <Square className="w-4 h-4" />
                    <span>Stop &amp; Save</span>
                  </Button>
                </>
              )}

              <select
                aria-label="Camera selection"
                value={monitor.selectedDeviceId}
                onChange={(e) => monitor.switchCamera(e.target.value)}
                className="rounded-full border border-black/15 dark:border-white/15 bg-zinc-50 dark:bg-[#0a0a0a] text-xs px-3.5 py-2 text-zinc-800 dark:text-zinc-200 max-w-[200px]"
              >
                <option value="">Default Camera</option>
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </option>
                ))}
              </select>

              {settings.diagnosticsMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    monitor.switchSourceMode(
                      monitor.sourceType === 'camera' ? 'synthetic' : 'camera'
                    )
                  }
                >
                  <span>
                    {monitor.sourceType === 'camera' ? 'Synthetic Input' : 'Live Camera'}
                  </span>
                </Button>
              )}
            </div>

            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              VALID {monitor.validTrackingSec.toFixed(0)}s · UNSEEN{' '}
              {monitor.invalidTrackingSec.toFixed(0)}s
            </div>
          </Card>
        </div>

        {/* Right Telemetry Stack: Dominant Fatigue Score Ring + Subordinate Widgets */}
        <div className="lg:col-span-4 space-y-4">
          <SpotlightSurface
            beam
            beamColorFrom={tierMeta.color}
            beamColorTo="#00ffc6"
            className="p-5 space-y-4"
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85">
              <span>FATIGUE SCORE</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                {monitor.fatigueTrend === 'INCREASING' && (
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                )}
                {monitor.fatigueTrend === 'DECREASING' && (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {monitor.fatigueTrend === 'STABLE' && <Minus className="w-3.5 h-3.5" />}
                {monitor.fatigueTrend}
              </span>
            </div>

            {/* Dominant Circular Fatigue Gauge */}
            <div className="flex flex-col items-center justify-center py-1 text-center">
              <CircularGauge
                value={monitor.scoreResult.score}
                size={156}
                strokeWidth={9}
                color={tierMeta.color}
                label={monitor.scoreResult.score.toFixed(0)}
                sublabel="OUT OF 100"
              />

              <div className="mt-3 flex items-center gap-2">
                <span
                  className="text-xs font-mono font-bold tracking-widest px-2.5 py-0.5 rounded border"
                  style={{
                    color: tierMeta.color,
                    borderColor: `${tierMeta.color}44`,
                    backgroundColor: `${tierMeta.color}14`
                  }}
                >
                  {shortTier}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  CONF {monitor.scoreResult.confidencePct}%
                </span>
              </div>

              <div className="sr-only">
                <NumberTicker value={monitor.scoreResult.score} decimals={1} />
              </div>
            </div>

            {/* Dual Axis Deviation & Subjective KSS Split */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/10 dark:border-white/12">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Deviation
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-mono text-lg font-bold tabular-nums"
                    style={{ color: devMeta.color }}
                  >
                    {monitor.scoreResult.personalDeviationScore.toFixed(1)}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">/100</span>
                </div>
                <ProgressBar
                  value={monitor.scoreResult.personalDeviationScore}
                  colorHex={devMeta.color}
                  heightClass="h-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span>KSS Rating</span>
                  <Brain className="w-3 h-3 text-[#007a5f] dark:text-[#00ffc6]" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-lg font-bold text-zinc-900 dark:text-white tabular-nums">
                    {kssRating ? `${kssRating.level}/9` : '--'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKssModal(true)}
                    className="text-[11px] font-mono font-semibold text-[#007a5f] dark:text-[#00ffc6] hover:underline cursor-pointer"
                  >
                    {kssRating ? 'Edit' : 'Rate'}
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {kssRating ? kssRating.label : 'Self-report'}
                </div>
              </div>
            </div>
          </SpotlightSurface>

          {/* Compact Ocular Telemetry */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6]" />
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                  Eye Telemetry
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-[#007a5f] dark:text-[#00ffc6] tabular-nums">
                PERCLOS {monitor.blinkTelemetry.perclos.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-zinc-100/90 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12 px-3 py-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span>LEFT EYE</span>
                  <span>
                    {monitor.metrics.leftEyeOpennessPct !== null
                      ? `${monitor.metrics.leftEyeOpennessPct}%`
                      : monitor.metrics.leftEar.toFixed(2)}
                  </span>
                </div>
                <div className="font-mono font-semibold text-zinc-900 dark:text-white mt-0.5 truncate">
                  {monitor.diagnostics.leftEyeState}
                </div>
                <ProgressBar
                  value={monitor.metrics.leftEyeOpennessPct ?? monitor.metrics.leftEar * 250}
                  colorHex="#00ffc6"
                  heightClass="h-1 mt-1.5"
                />
              </div>

              <div className="rounded-lg bg-zinc-100/90 dark:bg-[#0a0a0a]/85 border border-black/10 dark:border-white/12 px-3 py-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span>RIGHT EYE</span>
                  <span>
                    {monitor.metrics.rightEyeOpennessPct !== null
                      ? `${monitor.metrics.rightEyeOpennessPct}%`
                      : monitor.metrics.rightEar.toFixed(2)}
                  </span>
                </div>
                <div className="font-mono font-semibold text-zinc-900 dark:text-white mt-0.5 truncate">
                  {monitor.diagnostics.rightEyeState}
                </div>
                <ProgressBar
                  value={monitor.metrics.rightEyeOpennessPct ?? monitor.metrics.rightEar * 250}
                  colorHex="#00d9aa"
                  heightClass="h-1 mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono tabular-nums">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">BLINKS</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.blinkTelemetry.blinksPerMin}/m
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">DURATION</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.blinkTelemetry.avgBlinkDuration.toFixed(2)}s
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">LONG</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.blinkTelemetry.longBlinks}
                </span>
              </div>
            </div>
          </Card>

          {/* Compact Mouth & Yawn HUD */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6]" />
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                  Oral &amp; Posture
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-[#007a5f] dark:text-[#00ffc6]">
                {monitor.yawnTelemetry.mouthState}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">MAR</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.yawnTelemetry.rawMar.toFixed(3)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">YAWNS</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.metrics.totalYawns}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">RATE</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.yawnTelemetry.yawnsPerMin}/m
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">POSTURE</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {monitor.metrics.postureScore}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Biometric Waveform & Sustained Closure Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                Biometric Signal Trace
              </h2>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {monitor.sessionHistory.length} SAMPLES · LIVE 1 HZ TELEMETRY
              </p>
            </div>
            <SegmentedControl
              value={chartMetric}
              onChange={setChartMetric}
              options={[
                { value: 'dual', label: 'Fatigue & Deviation' },
                { value: 'perclos', label: 'PERCLOS %' }
              ]}
            />
          </div>

          <FatigueAreaChart points={monitor.sessionHistory} height={205} metric={chartMetric} />
        </Card>

        <Card className="lg:col-span-4 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                Closure Events
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {monitor.microsleepEvents.length}
            </span>
          </div>

          {monitor.microsleepEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 dark:border-white/15 p-5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
              No sustained closures (&gt;= {audioConfig.microsleepThresholdSec.toFixed(1)}s) logged.
            </div>
          ) : (
            <div className="max-h-[205px] overflow-y-auto pr-1">
              <Timeline variant="compact">
                {monitor.microsleepEvents.map((evt) => (
                  <TimelineItem key={evt.id} status="error">
                    <TimelineSeparator>
                      <TimelineIndicator variant="error">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </TimelineIndicator>
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <TimelineHeader>
                        <TimelineTitle className="text-xs font-mono text-red-500 dark:text-red-400">
                          {evt.durationSec.toFixed(1)}s closure
                        </TimelineTitle>
                        <TimelineTime>{evt.timeFormatted}</TimelineTime>
                      </TimelineHeader>
                      <TimelineDescription>
                        {evt.audioMuted
                          ? 'Muted'
                          : evt.audioTriggered
                          ? 'Audio triggered'
                          : 'Cooldown'}{' '}
                        · {evt.confidencePct}%
                      </TimelineDescription>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
          )}
        </Card>
      </div>

      {/* Collapsible Diagnostics Audit & Ground-Truth Validation */}
      {settings.diagnosticsMode && (
        <div className="space-y-5">
          <Card className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                Multimodal Score Audit
              </h3>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Observable {monitor.scoreResult.absoluteScore.toFixed(1)} (65%) + Deviation{' '}
                {monitor.scoreResult.personalDeviationScore.toFixed(1)} (35%) ·{' '}
                {monitor.diagnostics.inferenceMs}ms
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 px-3 font-medium">Raw</th>
                    <th className="py-2 px-3 font-medium">Norm</th>
                    <th className="py-2 px-3 font-medium">Weight</th>
                    <th className="py-2 pl-3 font-medium text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] font-mono tabular-nums">
                  {monitor.scoreResult.debugRows.map((row) => (
                    <tr key={row.name}>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{row.name}</td>
                      <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400">
                        {row.rawDisplay}
                      </td>
                      <td className="py-1.5 px-3">{row.normalizedScore.toFixed(1)}</td>
                      <td className="py-1.5 px-3">{(row.effectiveWeight * 100).toFixed(1)}%</td>
                      <td className="py-1.5 pl-3 text-right">
                        {row.weightedContribution.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <ValidationSuitePanel
            checklist={monitor.checklist}
            diagnostics={monitor.diagnostics}
            metrics={monitor.metrics}
          />
        </div>
      )}

      <CalibrationWizard
        open={monitor.isCalibOpen}
        onClose={monitor.cancelGuidedCalibration}
        step={monitor.calibStep}
        timer={monitor.calibTimer}
        isRunning={monitor.calibRunning}
        failureReason={monitor.calibFailureReason}
        diagnostics={monitor.diagnostics}
        onRetry={monitor.startGuidedCalibration}
      />

      <KssModal
        open={showKssModal}
        onClose={() => setShowKssModal(false)}
        currentLevel={kssRating?.level ?? null}
        onSelect={(lvl) => selectKssLevel(lvl)}
      />
    </div>
  );
};
