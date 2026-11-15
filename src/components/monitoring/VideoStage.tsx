import React from 'react';
import {
  Camera,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { CameraErrorInfo, DetectionDiagnostics, MicrosleepMachineState } from '../../types';
import { MonitorRunState } from '../../hooks/useFatigueMonitor';
import { Button } from '../ui/Primitives';
import { HudScannerOverlay } from './HudScannerOverlay';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  runState: MonitorRunState;
  sourceType: 'camera' | 'synthetic';
  videoAspect: string;
  modelLoading: boolean;
  cameraError: CameraErrorInfo | null;
  diagnostics: DetectionDiagnostics;
  microsleepState: MicrosleepMachineState;
  activeAlert: string | null;
  showOverlay: boolean;
  onToggleOverlay: () => void;
  onVideoMetadata: () => void;
  onEnableCamera: () => void;
  onSwitchSynthetic?: () => void;
  enablePromptLabel?: string;
  scannerVariant?: 'setup' | 'scanning' | 'monitoring';
}

export const VideoStage: React.FC<VideoStageProps> = ({
  videoRef,
  canvasRef,
  runState,
  sourceType,
  videoAspect,
  modelLoading,
  cameraError,
  diagnostics,
  microsleepState,
  activeAlert,
  showOverlay,
  onToggleOverlay,
  onVideoMetadata,
  onEnableCamera,
  onSwitchSynthetic,
  enablePromptLabel = 'Enable Camera',
  scannerVariant = 'monitoring'
}) => {
  const isStandby = runState === 'idle' && sourceType === 'camera' && !cameraError;
  const isActivelyScanning = !isStandby && !cameraError && runState !== 'paused';

  return (
    <div className="space-y-3">
      {activeAlert && (
        <div
          role="alert"
          className="rounded-xl bg-red-600/90 border border-red-400/50 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-[0_0_28px_rgba(239,68,68,0.4)] backdrop-blur-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-display font-semibold text-sm tracking-tight">{activeAlert}</div>
              <div className="text-xs text-red-100">
                Sustained eye closure detected. Rest your eyes safely.
              </div>
            </div>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider shrink-0 tabular-nums">
            {microsleepState}
          </span>
        </div>
      )}

      <div
        className="relative w-full rounded-2xl overflow-hidden border border-black/15 dark:border-white/15 bg-[#0a0a0a] shadow-[0_14px_40px_rgba(0,0,0,0.38)] flex items-center justify-center"
        style={{ aspectRatio: videoAspect, minHeight: 300, maxHeight: 580 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={onVideoMetadata}
          className={`w-full h-full object-contain -scale-x-100 ${
            sourceType === 'camera' && !isStandby && !cameraError ? 'block' : 'hidden'
          }`}
        />

        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none object-contain ${
            sourceType === 'camera' && !isStandby && !cameraError ? 'block' : 'hidden'
          }`}
        />

        {/* Pure-visual futuristic HUD reticle & scanline sweep (zero interference with video/CV math) */}
        <HudScannerOverlay active={isActivelyScanning} variant={scannerVariant} />

        {sourceType === 'synthetic' && (
          <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#00ffc6]">
              Synthetic Telemetry Simulation
            </div>
            <div className="mt-2 text-lg font-display font-semibold text-white">
              Simulated Behavioral Cycle
            </div>
            <div className="mt-5 grid grid-cols-3 gap-6 font-mono text-xs text-zinc-200 tabular-nums">
              <div>
                <span className="text-zinc-500 block text-[11px]">EAR</span>
                {diagnostics.avgEar.toFixed(3)}
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">MAR</span>
                {diagnostics.mar.toFixed(3)}
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">MOUTH</span>
                {diagnostics.mouthState}
              </div>
            </div>
          </div>
        )}

        {isStandby && (
          <div className="absolute inset-0 bg-[#0a0a0a]/96 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#00ffc6]/10 border border-[#00ffc6]/35 shadow-[0_0_24px_rgba(0,255,198,0.2)] flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-[#00ffc6]" />
            </div>
            <h3 className="font-display font-semibold text-base text-white tracking-tight">
              Optical Visor Standby
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mt-1.5">
              Camera activates only on start. Video stays strictly on-device.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onClick={onEnableCamera}>
                <Camera className="w-4 h-4" />
                <span>{enablePromptLabel}</span>
              </Button>
            </div>
          </div>
        )}

        {modelLoading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/88 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
            <Loader2 className="w-7 h-7 text-[#00ffc6] animate-spin mb-3" />
            <div className="font-mono text-xs uppercase tracking-widest text-[#00ffc6]">
              INITIALISING CAMERA &amp; LANDMARKER
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-[#0a0a0a]/95 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="font-display font-semibold text-base text-white">
              {cameraError.title}
            </div>
            <p className="text-xs text-zinc-300 max-w-md mt-1">{cameraError.message}</p>
            <p className="text-xs text-zinc-400 max-w-md mt-1">{cameraError.guidance}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Button variant="primary" size="sm" onClick={onEnableCamera}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </Button>
              {onSwitchSynthetic && (
                <Button variant="secondary" size="sm" onClick={onSwitchSynthetic}>
                  <span>Synthetic Mode</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Top HUD Status Bar */}
        {!isStandby && !cameraError && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
            <div className="px-3.5 py-1 rounded-full bg-[#0a0a0a]/82 border border-[#00ffc6]/25 text-[11px] font-mono text-zinc-100 flex items-center gap-2 backdrop-blur-md tabular-nums">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00ffc6] shrink-0" />
              <span>{diagnostics.faceDetected ? 'FACE DETECTED' : diagnostics.trackingState}</span>
              <span className="text-zinc-500">·</span>
              <span className="text-[#00ffc6]">{diagnostics.fps} FPS</span>
            </div>

            <button
              type="button"
              onClick={onToggleOverlay}
              title={showOverlay ? 'Hide tracking overlay' : 'Show tracking overlay'}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a0a0a]/82 border border-white/15 text-[11px] font-mono text-zinc-100 hover:bg-black backdrop-blur-md cursor-pointer transition-colors"
            >
              {showOverlay ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-[#00ffc6]" />
                  <span>HUD ON</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>HUD OFF</span>
                </>
              )}
            </button>
          </div>
        )}

        {runState === 'paused' && (
          <div className="absolute inset-0 bg-[#0a0a0a]/72 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
            <div className="px-5 py-2 rounded-full bg-[#0a0a0a]/95 border border-amber-400/40 text-xs font-mono uppercase tracking-widest text-amber-300">
              PAUSED · ACCUMULATION FROZEN
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
