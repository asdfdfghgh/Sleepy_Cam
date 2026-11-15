import React from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { useFatigueMonitor } from '../hooks/useFatigueMonitor';
import { Card, Button } from '../components/ui/Primitives';
import { VideoStage } from '../components/monitoring/VideoStage';
import { CalibrationWizard } from '../components/monitoring/CalibrationWizard';
import { CircularGauge } from '../components/21st/CircularGauge';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';

export const CameraSetupPage: React.FC = () => {
  const { baseline, clearBaseline, cameras, setRoute } = useAppContext();
  const monitor = useFatigueMonitor({ mode: 'setup' });

  const distanceQuality = monitor.diagnostics.distanceQuality || 'UNCERTAIN';
  const isTracked = monitor.diagnostics.trackingState === 'FACE TRACKED';
  const eyeWidthPx = monitor.diagnostics.leftEyeWidthPx ?? 0;

  const readinessScore =
    (isTracked ? 35 : 0) +
    (distanceQuality === 'OPTIMAL' ? 25 : distanceQuality === 'ACCEPTABLE' ? 15 : 0) +
    (monitor.diagnostics.isEyeValid ? 20 : 0) +
    (baseline.isCalibrated ? 20 : 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Camera &amp; Optical Calibration
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 mt-0.5">
            ALIGN FACE FRAME · VERIFY &gt;=18PX EYE WIDTH · MAP PERSONAL EAR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {monitor.runState === 'idle' ? (
            <Button variant="primary" onClick={() => monitor.startCameraPreview()}>
              <Camera className="w-4 h-4" />
              <span>Enable Camera</span>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => monitor.stopSession(true)}>
              <span>Stop Preview</span>
            </Button>
          )}
          <Button variant="secondary" onClick={() => setRoute('assessment')}>
            <span>Quick Scan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-3.5">
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
            activeAlert={null}
            showOverlay={monitor.showOverlay}
            onToggleOverlay={() => monitor.setShowOverlay((v) => !v)}
            onVideoMetadata={monitor.handleVideoMetadata}
            onEnableCamera={() => monitor.startCameraPreview()}
            onSwitchSynthetic={() => monitor.switchSourceMode('synthetic')}
            enablePromptLabel="Enable Camera Preview"
            scannerVariant="setup"
          />

          <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <label
                htmlFor="setup-camera-select"
                className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0"
              >
                Source
              </label>
              <select
                id="setup-camera-select"
                value={monitor.selectedDeviceId}
                onChange={(e) => monitor.switchCamera(e.target.value)}
                className="rounded-full border border-black/15 dark:border-white/15 bg-zinc-50 dark:bg-[#0a0a0a] text-xs px-3.5 py-1.5 text-zinc-800 dark:text-zinc-200 max-w-xs"
              >
                <option value="">Default Camera</option>
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="font-mono text-xs text-zinc-600 dark:text-[#00ffc6]/85 tabular-nums">
              L-EAR {monitor.diagnostics.leftEyeEar.toFixed(3)} · R-EAR{' '}
              {monitor.diagnostics.rightEyeEar.toFixed(3)} · EYE {eyeWidthPx || '-'}PX
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Optical Alignment Readiness */}
          <SpotlightSurface beam className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 dark:text-[#00ffc6]/85">
                  OPTICAL READINESS
                </div>
                <h2 className="font-display font-semibold text-base text-zinc-900 dark:text-white mt-0.5">
                  Signal Lock Checks
                </h2>
              </div>
              <CircularGauge
                value={readinessScore}
                size={76}
                strokeWidth={6}
                color="#00ffc6"
                showPercentSymbol
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-2 border-b border-black/10 dark:border-white/10">
                <span className="text-zinc-500 dark:text-zinc-400">FACE LOCK</span>
                <span
                  className={`font-semibold flex items-center gap-1.5 ${
                    isTracked
                      ? 'text-[#007a5f] dark:text-[#00ffc6]'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isTracked ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {monitor.diagnostics.trackingState}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-black/10 dark:border-white/10">
                <span className="text-zinc-500 dark:text-zinc-400">DISTANCE</span>
                <span
                  className={`font-semibold tabular-nums ${
                    distanceQuality === 'OPTIMAL' || distanceQuality === 'ACCEPTABLE'
                      ? 'text-[#007a5f] dark:text-[#00ffc6]'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {distanceQuality} {eyeWidthPx > 0 ? `(${eyeWidthPx}px)` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-black/10 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">EYES (&gt;=18PX)</span>
                <span
                  className={`font-semibold ${
                    monitor.diagnostics.isEyeValid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {monitor.diagnostics.isEyeValid ? 'VALID' : 'PENDING'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">INNER-LIP MAR</span>
                <span
                  className={`font-semibold ${
                    monitor.diagnostics.isMouthValid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {monitor.diagnostics.isMouthValid ? monitor.diagnostics.mouthState : 'PENDING'}
                </span>
              </div>
            </div>
          </SpotlightSurface>

          {/* Calibration Controls */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                Eye Calibration
              </h2>
              <span
                className={`text-xs font-mono font-semibold ${
                  baseline.isCalibrated
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-500'
                }`}
              >
                {baseline.isCalibrated
                  ? `${baseline.geometricCalibration?.quality || 'CALIBRATED'}`
                  : 'UNCALIBRATED'}
              </span>
            </div>

            {baseline.isCalibrated && baseline.geometricCalibration && (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono rounded-lg border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-3 tabular-nums">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">LEFT OPEN / CLOSED</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {baseline.geometricCalibration.leftOpenEar.toFixed(3)} /{' '}
                    {baseline.geometricCalibration.leftClosedEar.toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">RIGHT OPEN / CLOSED</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {baseline.geometricCalibration.rightOpenEar.toFixed(3)} /{' '}
                    {baseline.geometricCalibration.rightClosedEar.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => monitor.startGuidedCalibration()}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guided 4-Step</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => monitor.startOneClickCalibration()}
              >
                <Zap className="w-3.5 h-3.5 text-[#007a5f] dark:text-[#00ffc6]" />
                <span>1-Click Lock</span>
              </Button>
              {baseline.isCalibrated && (
                <Button variant="ghost" size="sm" onClick={() => clearBaseline()}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

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
    </div>
  );
};
