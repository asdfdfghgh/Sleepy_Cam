import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BiometricMetrics,
  BlinkTelemetry,
  CameraErrorInfo,
  DetectionDiagnostics,
  FatigueTrend,
  LandmarkPoint,
  MicrosleepEventLog,
  MicrosleepMachineState,
  SavedSessionRecord,
  SessionDataPoint,
  YawnTelemetry
} from '../types';
import {
  calculateFatigueTrend,
  computeDualFatigueScore,
  FatigueScoreResult
} from '../utils/mathFormulas';
import { FaceMeshResult } from '../utils/faceLandmarkerEngine';
import { audioAlert } from '../utils/audioAlertEngine';
import { cameraService } from '../services/CameraService';
import { platformAdapter } from '../services/PlatformAdapter';
import {
  calibrationService,
  eventDetectionService,
  eyeAnalysisService,
  faceDetectionService,
  fatigueScoringService,
  mouthAnalysisService,
  sessionService
} from '../services/cv/CvPipelineServices';
import { useAppContext } from './useAppContext';

export type MonitorRunState = 'idle' | 'preview' | 'running' | 'paused';

export interface ValidationChecklistState {
  eyesFullyOpen: boolean;
  eyesPartiallyOpen: boolean;
  eyesFullyClosed: boolean;
  eyesOneClosedOneOpen: boolean;
  eyesSlowClosure: boolean;
  eyesNaturalBlink: boolean;
  eyesSlowBlink: boolean;
  eyesDistanceRobustness: boolean;
  mouthResting: boolean;
  mouthSpeaking: boolean;
  mouthSmiling: boolean;
  mouthSmallYawn: boolean;
  mouthLargeYawn: boolean;
  mouthBeardImmunity: boolean;
  timer10s: boolean;
  timer30s: boolean;
  timer60s: boolean;
  noFatigueLookDown: boolean;
  noFatigueTurnHead: boolean;
  noFatigueNarrowEyes: boolean;
  noMicrosleepOnYawn: boolean;
}

const INITIAL_CHECKLIST: ValidationChecklistState = {
  eyesFullyOpen: false,
  eyesPartiallyOpen: false,
  eyesFullyClosed: false,
  eyesOneClosedOneOpen: false,
  eyesSlowClosure: false,
  eyesNaturalBlink: false,
  eyesSlowBlink: false,
  eyesDistanceRobustness: false,
  mouthResting: false,
  mouthSpeaking: false,
  mouthSmiling: false,
  mouthSmallYawn: false,
  mouthLargeYawn: false,
  mouthBeardImmunity: false,
  timer10s: false,
  timer30s: false,
  timer60s: false,
  noFatigueLookDown: false,
  noFatigueTurnHead: false,
  noFatigueNarrowEyes: false,
  noMicrosleepOnYawn: false
};

const createInitialMetrics = (): BiometricMetrics => ({
  ear: 0.28,
  leftEar: 0.28,
  rightEar: 0.28,
  leftEyeOpennessPct: null,
  rightEyeOpennessPct: null,
  eyeOpennessPct: null,
  isEyeClosed: false,
  activeClosureSec: 0,
  totalBlinks: 0,
  blinkRate: 0,
  avgBlinkDuration: 0.18,
  longBlinks: 0,
  perclos: 2.0,
  mar: 0.14,
  mouthOpeningPct: 12,
  isYawning: false,
  totalYawns: 0,
  yawnsPerMin: 0,
  avgYawnDuration: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  headVelocity: 8,
  headStability: 90,
  nodFrequency: 0,
  totalNods: 0,
  postureScore: 90,
  shoulderAngle: 0,
  isSlouching: false,
  isLeaning: false,
  facialActivity: 55
});

const INITIAL_DIAGNOSTICS: DetectionDiagnostics = {
  fps: 0,
  inferenceMs: 0,
  trackingState: 'NO FACE DETECTED',
  faceDetected: false,
  trackingConfidence: 0,
  bbox: null,
  leftEyeEar: 0,
  rightEyeEar: 0,
  avgEar: 0,
  leftEyeOpennessPct: null,
  rightEyeOpennessPct: null,
  leftEyeState: 'UNCERTAIN',
  rightEyeState: 'UNCERTAIN',
  isEyeValid: false,
  eyeCalibration: null,
  mar: 0,
  mouthState: 'UNCERTAIN',
  isYawning: false,
  isMouthValid: false,
  pitch: 0,
  yaw: 0,
  roll: 0,
  headVelocity: 0,
  microsleepState: 'NORMAL',
  activeClosureSec: 0,
  errorMessage: null,
  distanceQuality: 'UNCERTAIN'
};

export interface UseFatigueMonitorOptions {
  mode: 'setup' | 'assessment' | 'monitoring';
  autoStartOnMount?: boolean;
}

export function useFatigueMonitor(options: UseFatigueMonitorOptions) {
  const {
    settings,
    baseline,
    saveBaseline,
    audioConfig,
    fatigueWeights,
    kssRating,
    saveSessionRecord,
    refreshCameras,
    showToast
  } = useAppContext();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [runState, setRunState] = useState<MonitorRunState>('idle');
  const [sourceType, setSourceType] = useState<'camera' | 'synthetic'>('camera');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(settings.defaultCameraId);
  const [showOverlay, setShowOverlay] = useState<boolean>(settings.showOverlaysByDefault);
  const [modelReady, setModelReady] = useState<boolean>(faceDetectionService.isReady());
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [videoAspect, setVideoAspect] = useState<string>('16 / 9');

  const [metrics, setMetrics] = useState<BiometricMetrics>(createInitialMetrics);
  const [diagnostics, setDiagnostics] = useState<DetectionDiagnostics>(INITIAL_DIAGNOSTICS);
  const [scoreResult, setScoreResult] = useState<FatigueScoreResult>(() =>
    computeDualFatigueScore(createInitialMetrics(), baseline)
  );
  const [fatigueTrend, setFatigueTrend] = useState<FatigueTrend>('STABLE');

  const [blinkTelemetry, setBlinkTelemetry] = useState<BlinkTelemetry>({
    blinksPerMin: 0,
    avgBlinkDuration: 0.18,
    medianBlinkDuration: 0.18,
    longBlinks: 0,
    incompleteBlinks: 0,
    blinkIntervalVariability: 0.8,
    perclos: 2.0,
    perclosLeft: 2.0,
    perclosRight: 2.0
  });

  const [yawnTelemetry, setYawnTelemetry] = useState<YawnTelemetry>({
    rawMar: 0.14,
    normalizedOpeningPct: 12,
    mouthState: 'RESTING',
    yawnState: 'RESTING',
    yawnsPerMin: 0,
    currentYawnDuration: 0,
    avgYawnDuration: 0,
    maxMar: 0.14,
    suspectedYawns: 0
  });

  const [microsleepState, setMicrosleepState] = useState<MicrosleepMachineState>('NORMAL');
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [microsleepEvents, setMicrosleepEvents] = useState<MicrosleepEventLog[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionDataPoint[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [validTrackingSec, setValidTrackingSec] = useState<number>(0);
  const [invalidTrackingSec, setInvalidTrackingSec] = useState<number>(0);

  // Quick Assessment state
  const [assessmentTargetDuration, setAssessmentTargetDuration] = useState<10 | 30 | 60 | 120>(
    settings.defaultAssessmentDuration || 60
  );
  const [assessmentCompletedRecord, setAssessmentCompletedRecord] =
    useState<SavedSessionRecord | null>(null);
  const [preliminaryResult, setPreliminaryResult] = useState<FatigueScoreResult | null>(null);

  // Calibration Wizard state
  const [isCalibOpen, setIsCalibOpen] = useState<boolean>(false);
  const [calibStep, setCalibStep] = useState<1 | 2 | 3 | 4>(1);
  const [calibTimer, setCalibTimer] = useState<number>(4.0);
  const [calibRunning, setCalibRunning] = useState<boolean>(false);
  const [calibFailureReason, setCalibFailureReason] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ValidationChecklistState>(INITIAL_CHECKLIST);
  const [completedMonitorSession, setCompletedMonitorSession] =
    useState<SavedSessionRecord | null>(null);

  // Refs synced safely inside the frame loop
  const runStateRef = useRef<MonitorRunState>(runState);
  runStateRef.current = runState;
  const sourceTypeRef = useRef<'camera' | 'synthetic'>(sourceType);
  sourceTypeRef.current = sourceType;
  const showOverlayRef = useRef<boolean>(showOverlay);
  showOverlayRef.current = showOverlay;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const audioConfigRef = useRef(audioConfig);
  audioConfigRef.current = audioConfig;
  const fatigueWeightsRef = useRef(fatigueWeights);
  fatigueWeightsRef.current = fatigueWeights;
  const kssRef = useRef(kssRating);
  kssRef.current = kssRating;
  const enablePostureRef = useRef(settings.enablePostureWeight);
  enablePostureRef.current = settings.enablePostureWeight;
  const diagnosticsModeRef = useRef(settings.diagnosticsMode);
  diagnosticsModeRef.current = settings.diagnosticsMode;
  const calibRunningRef = useRef(calibRunning);
  calibRunningRef.current = calibRunning;
  const calibStepRef = useRef(calibStep);
  calibStepRef.current = calibStep;
  const assessmentTargetRef = useRef(assessmentTargetDuration);
  assessmentTargetRef.current = assessmentTargetDuration;

  const sessionStartedAtRef = useRef<number | null>(null);
  const activeWallStartRef = useRef<number | null>(null);
  const pausedElapsedOffsetRef = useRef<number>(0);
  const validAccumRef = useRef<number>(0);
  const invalidAccumRef = useRef<number>(0);
  const lastSecondRecordedRef = useRef<number>(0);
  const recentScoresRef = useRef<number[]>([]);
  const metricsRef = useRef<BiometricMetrics>(createInitialMetrics());
  const sessionHistoryRef = useRef<SessionDataPoint[]>([]);
  const microsleepEventsRef = useRef<MicrosleepEventLog[]>([]);
  const checklistRef = useRef<ValidationChecklistState>(INITIAL_CHECKLIST);

  const calibSamplesRef = useRef({
    openLeft: [] as number[],
    openRight: [] as number[],
    partialLeft: [] as number[],
    partialRight: [] as number[],
    closedLeft: [] as number[],
    closedRight: [] as number[],
    mouthMar: [] as number[]
  });

  const lastDiagRef = useRef<DetectionDiagnostics>(INITIAL_DIAGNOSTICS);

  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      cameraService.stopStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    audioAlert.stopAlert();
  }, []);

  const ensureModelAndCamera = useCallback(
    async (explicitDeviceId?: string): Promise<boolean> => {
      setCameraError(null);
      if (!faceDetectionService.isReady()) {
        setModelLoading(true);
        try {
          await faceDetectionService.initialize();
          setModelReady(true);
        } catch (err) {
          setModelLoading(false);
          setCameraError({
            code: 'MODEL_LOAD_FAILED',
            title: 'Detection model failed to initialize',
            message:
              err instanceof Error ? err.message : 'Unable to load local MediaPipe vision assets.',
            guidance: 'Verify local model/WASM assets or switch to Synthetic mode in Diagnostics.'
          });
          return false;
        }
        setModelLoading(false);
      }

      if (sourceTypeRef.current === 'synthetic') {
        return true;
      }

      stopCameraStream();
      try {
        const stream = await cameraService.startStream({
          deviceId: explicitDeviceId ?? (selectedDeviceId || undefined),
          resolution: settings.resolution,
          onEnded: () => {
            setCameraError(cameraService.mapError(new Error('CAMERA_DISCONNECTED')));
            setRunState('idle');
          }
        });
        streamRef.current = stream;
        attachStreamToVideo(stream);
        void refreshCameras();
        return true;
      } catch (err) {
        const mapped = err as CameraErrorInfo;
        setCameraError(mapped);
        return false;
      }
    },
    [attachStreamToVideo, refreshCameras, selectedDeviceId, settings.resolution, stopCameraStream]
  );

  const startCameraPreview = useCallback(
    async (deviceId?: string) => {
      setSourceType('camera');
      sourceTypeRef.current = 'camera';
      const ok = await ensureModelAndCamera(deviceId);
      if (ok) {
        setRunState('preview');
      }
      return ok;
    },
    [ensureModelAndCamera]
  );

  const resetSessionAccumulators = useCallback(() => {
    eyeAnalysisService.reset();
    mouthAnalysisService.reset();
    eventDetectionService.reset();
    metricsRef.current = createInitialMetrics();
    sessionHistoryRef.current = [];
    microsleepEventsRef.current = [];
    recentScoresRef.current = [];
    validAccumRef.current = 0;
    invalidAccumRef.current = 0;
    lastSecondRecordedRef.current = 0;
    pausedElapsedOffsetRef.current = 0;
    sessionStartedAtRef.current = Date.now();
    activeWallStartRef.current = performance.now();

    setMetrics(createInitialMetrics());
    setSessionHistory([]);
    setMicrosleepEvents([]);
    setElapsedSec(0);
    setValidTrackingSec(0);
    setInvalidTrackingSec(0);
    setActiveAlert(null);
    setPreliminaryResult(null);
    setAssessmentCompletedRecord(null);
    setCompletedMonitorSession(null);
  }, []);

  const startSession = useCallback(
    async (customDuration?: 10 | 30 | 60 | 120) => {
      if (customDuration) {
        setAssessmentTargetDuration(customDuration);
        assessmentTargetRef.current = customDuration;
      }

      if (!streamRef.current && sourceTypeRef.current === 'camera') {
        const ok = await ensureModelAndCamera();
        if (!ok) return false;
      } else if (!faceDetectionService.isReady()) {
        const ok = await ensureModelAndCamera();
        if (!ok) return false;
      }

      resetSessionAccumulators();
      setRunState('running');
      runStateRef.current = 'running';
      return true;
    },
    [ensureModelAndCamera, resetSessionAccumulators]
  );

  const pauseSession = useCallback(() => {
    if (runStateRef.current !== 'running') return;
    if (activeWallStartRef.current !== null) {
      pausedElapsedOffsetRef.current += (performance.now() - activeWallStartRef.current) / 1000;
      activeWallStartRef.current = null;
    }
    audioAlert.stopAlert();
    setActiveAlert(null);
    setRunState('paused');
    runStateRef.current = 'paused';
  }, []);

  const resumeSession = useCallback(() => {
    if (runStateRef.current !== 'paused') return;
    activeWallStartRef.current = performance.now();
    setRunState('running');
    runStateRef.current = 'running';
  }, []);

  const finalizeAndSaveSession = useCallback(
    async (typeOverride?: 'monitoring' | 'assessment'): Promise<SavedSessionRecord | null> => {
      const startedAt = sessionStartedAtRef.current || Date.now();
      const endedAt = Date.now();
      const finalMetrics = metricsRef.current;
      const finalHistory = sessionHistoryRef.current;

      const record = sessionService.createSavedSessionRecord({
        sessionType:
          typeOverride || (options.mode === 'assessment' ? 'assessment' : 'monitoring'),
        startedAt,
        endedAt,
        validTrackingSec: validAccumRef.current,
        invalidTrackingSec: invalidAccumRef.current,
        history: finalHistory,
        microsleepEvents: microsleepEventsRef.current,
        kssRating: kssRef.current,
        totalBlinks: finalMetrics.totalBlinks,
        avgBlinkRate: finalMetrics.blinkRate,
        avgBlinkDuration: finalMetrics.avgBlinkDuration,
        longBlinks: finalMetrics.longBlinks,
        avgPerclos: finalMetrics.perclos,
        totalYawns: finalMetrics.totalYawns,
        avgYawnsPerMin: finalMetrics.yawnsPerMin,
        avgYawnDuration: finalMetrics.avgYawnDuration
      });

      await saveSessionRecord(record);
      return record;
    },
    [options.mode, saveSessionRecord]
  );

  const stopSession = useCallback(
    async (releaseCamera: boolean = true) => {
      const wasRunning = runStateRef.current === 'running' || runStateRef.current === 'paused';
      setRunState('idle');
      runStateRef.current = 'idle';
      audioAlert.stopAlert();
      setActiveAlert(null);

      let saved: SavedSessionRecord | null = null;
      if (wasRunning && (validAccumRef.current > 1 || sessionHistoryRef.current.length > 0)) {
        saved = await finalizeAndSaveSession(
          options.mode === 'assessment' ? 'assessment' : 'monitoring'
        );
        if (options.mode === 'assessment') {
          setAssessmentCompletedRecord(saved);
        } else {
          setCompletedMonitorSession(saved);
        }
        if (saved) {
          showToast('Session saved to local history', 'success');
        }
      }

      if (releaseCamera) {
        stopCameraStream();
      } else if (streamRef.current) {
        setRunState('preview');
        runStateRef.current = 'preview';
      }

      return saved;
    },
    [finalizeAndSaveSession, options.mode, showToast, stopCameraStream]
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (runStateRef.current !== 'idle') {
        await startCameraPreview(deviceId);
      }
    },
    [startCameraPreview]
  );

  const switchSourceMode = useCallback(
    async (next: 'camera' | 'synthetic') => {
      setSourceType(next);
      sourceTypeRef.current = next;
      if (next === 'synthetic') {
        stopCameraStream();
        setCameraError(null);
        setModelReady(true);
        if (runStateRef.current === 'idle') {
          setRunState('preview');
        }
      } else {
        await startCameraPreview(selectedDeviceId || undefined);
      }
    },
    [selectedDeviceId, startCameraPreview, stopCameraStream]
  );

  const handleVideoMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
      if (canvasRef.current) {
        canvasRef.current.width = v.videoWidth;
        canvasRef.current.height = v.videoHeight;
      }
    }
  }, []);

  // Calibration controls
  const startOneClickCalibration = useCallback(async () => {
    if (runStateRef.current === 'idle') {
      const ok = await startCameraPreview();
      if (!ok) return;
    }
    const diag = lastDiagRef.current;
    const updated = calibrationService.buildOneClickBaseline(baselineRef.current, {
      leftEar: diag.leftEyeEar || 0.28,
      rightEar: diag.rightEyeEar || 0.28,
      mar: diag.mar || 0.16,
      pitch: diag.pitch || 0,
      yaw: diag.yaw || 0,
      roll: diag.roll || 0
    });
    await saveBaseline(updated);
    showToast(
      `Quick calibration saved (L: ${updated.geometricCalibration?.leftOpenEar}, R: ${updated.geometricCalibration?.rightOpenEar})`,
      'success'
    );
  }, [saveBaseline, showToast, startCameraPreview]);

  const startGuidedCalibration = useCallback(async () => {
    if (runStateRef.current === 'idle') {
      const ok = await startCameraPreview();
      if (!ok) return;
    }
    calibSamplesRef.current = {
      openLeft: [],
      openRight: [],
      partialLeft: [],
      partialRight: [],
      closedLeft: [],
      closedRight: [],
      mouthMar: []
    };
    setCalibFailureReason(null);
    setCalibStep(1);
    setCalibTimer(4.0);
    setIsCalibOpen(true);
    setCalibRunning(true);
  }, [startCameraPreview]);

  const cancelGuidedCalibration = useCallback(() => {
    setCalibRunning(false);
    setIsCalibOpen(false);
  }, []);

  // Guided calibration countdown step sequencer
  useEffect(() => {
    if (!calibRunning || !isCalibOpen) return;

    const timer = setInterval(() => {
      setCalibTimer((prev) => {
        if (prev <= 0.1) {
          if (calibStepRef.current === 1) {
            setCalibStep(2);
            return 3.0;
          }
          if (calibStepRef.current === 2) {
            setCalibStep(3);
            return 4.0;
          }
          if (calibStepRef.current === 3) {
            setCalibStep(4);
            return 3.5;
          }

          setCalibRunning(false);
          const diag = lastDiagRef.current;
          const result = calibrationService.finalizeGuidedBaseline(baselineRef.current, {
            ...calibSamplesRef.current,
            pitch: diag.pitch,
            yaw: diag.yaw,
            roll: diag.roll
          });

          if (result.error || !result.baseline) {
            setCalibFailureReason(result.error || 'Calibration could not be completed.');
            return 0;
          }

          void saveBaseline(result.baseline);
          setIsCalibOpen(false);
          showToast(
            `Personalized calibration complete (${result.baseline.geometricCalibration?.quality})`,
            'success'
          );
          return 0;
        }
        return Math.max(0, Math.round((prev - 0.1) * 10) / 10);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [calibRunning, isCalibOpen, saveBaseline, showToast]);

  // Pause monitoring automatically when browser tab is hidden if configured
  useEffect(() => {
    const onVisibility = () => {
      if (
        document.hidden &&
        settings.pauseOnTabHidden &&
        runStateRef.current === 'running' &&
        options.mode === 'monitoring'
      ) {
        pauseSession();
        showToast('Monitoring paused because window became hidden', 'warning');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [options.mode, pauseSession, settings.pauseOnTabHidden, showToast]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Draw crisp overlays onto canvas
  const drawOverlayCanvas = useCallback(
    (
      state: DetectionDiagnostics['trackingState'],
      bbox: DetectionDiagnostics['bbox'],
      landmarks: LandmarkPoint[],
      diag: DetectionDiagnostics
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!showOverlayRef.current || sourceTypeRef.current !== 'camera') return;

      const toX = (nx: number) => (1 - nx) * w;
      const toY = (ny: number) => ny * h;

      // In camera setup mode, show gentle alignment frame guide
      if (options.mode === 'setup') {
        ctx.save();
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.38)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.28, h * 0.14, w * 0.44, h * 0.72);
        ctx.restore();
      }

      if (!bbox || landmarks.length < 468) {
        ctx.fillStyle = 'rgba(11, 14, 19, 0.88)';
        ctx.fillRect(w / 2 - 180, h / 2 - 26, 360, 52);
        ctx.strokeStyle =
          state === 'FACE TRACKING LOST' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(234, 179, 8, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w / 2 - 180, h / 2 - 26, 360, 52);
        ctx.fillStyle = state === 'FACE TRACKING LOST' ? '#ef4444' : '#facc15';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(state, w / 2, h / 2 - 4);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px "DM Sans", sans-serif';
        ctx.fillText('Center your face with even front lighting', w / 2, h / 2 + 15);
        ctx.textAlign = 'left';
        return;
      }

      const bx = toX(bbox.x + bbox.width);
      const by = toY(bbox.y);
      const bw = bbox.width * w;
      const bh = bbox.height * h;

      let boxColor = '#2dd4bf';
      if (state === 'FACE TOO CLOSE' || state === 'FACE TOO FAR') boxColor = '#f59e0b';
      if (state === 'FACE PARTIALLY VISIBLE') boxColor = '#f97316';
      if (state === 'FACE TRACKING LOST') boxColor = '#ef4444';

      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = boxColor;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(
        `${state} · ${bbox.areaPct.toFixed(1)}% FRAME`,
        Math.max(8, bx + 4),
        Math.max(16, by - 6)
      );

      if (state === 'FACE TOO FAR') {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.fillRect(0, 0, w, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `MOVE CLOSER — Eye width ${diag.leftEyeWidthPx || 12}px < 18px minimum`,
          w / 2,
          19
        );
        ctx.textAlign = 'left';
      }

      const drawEye = (
        indices: number[],
        eyeState: DetectionDiagnostics['leftEyeState'],
        earVal: number,
        prefix: string,
        topIdx: number,
        cornerA: number,
        cornerB: number
      ) => {
        const pts = indices.map((i) => landmarks[i]);
        const uncertain = eyeState === 'UNCERTAIN' || state === 'FACE TOO FAR';
        let color = '#10b981';
        let fill = 'rgba(16, 185, 129, 0.18)';
        if (uncertain) {
          color = '#94a3b8';
          fill = 'rgba(148, 163, 184, 0.14)';
        } else if (eyeState === 'PARTIALLY OPEN') {
          color = '#eab308';
          fill = 'rgba(234, 179, 8, 0.22)';
        } else if (eyeState === 'CLOSED') {
          color = '#ef4444';
          fill = 'rgba(239, 68, 68, 0.34)';
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = fill;
        ctx.lineWidth = 2;
        if (uncertain) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        pts.forEach((p, idx) => {
          const sx = toX(p.x);
          const sy = toY(p.y);
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (uncertain) ctx.setLineDash([]);

        if (diagnosticsModeRef.current) {
          ctx.fillStyle = color;
          pts.forEach((p) => {
            ctx.beginPath();
            ctx.arc(toX(p.x), toY(p.y), 2.2, 0, Math.PI * 2);
            ctx.fill();
          });

          const cx = toX((landmarks[cornerA].x + landmarks[cornerB].x) / 2);
          const cy = toY(landmarks[topIdx].y);
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(
            uncertain ? `${prefix}: UNCERTAIN` : `${prefix}: ${eyeState} (${earVal.toFixed(3)})`,
            cx - 52,
            cy - 8
          );
        }
      };

      drawEye(
        [33, 160, 158, 133, 153, 144],
        diag.rightEyeState,
        diag.rightEyeEar,
        'R',
        158,
        33,
        133
      );
      drawEye(
        [362, 385, 387, 263, 373, 380],
        diag.leftEyeState,
        diag.leftEyeEar,
        'L',
        387,
        362,
        263
      );

      // Inner lip contour
      const innerIdx = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
      const lipPts = innerIdx.map((i) => landmarks[i]);
      let mColor = '#2dd4bf';
      let mFill = 'rgba(45, 212, 191, 0.14)';
      if (diag.mouthState === 'SPEAKING') {
        mColor = '#14b8a6';
        mFill = 'rgba(20, 184, 166, 0.2)';
      } else if (diag.mouthState === 'SMILING') {
        mColor = '#10b981';
        mFill = 'rgba(16, 185, 129, 0.2)';
      } else if (diag.mouthState === 'YAWN DETECTED' || diag.mouthState === 'YAWN SUSPECTED') {
        mColor = '#f97316';
        mFill = 'rgba(249, 115, 22, 0.34)';
      } else if (diag.mouthState === 'MOUTH OPEN' || diag.mouthState === 'MOUTH WIDE OPEN') {
        mColor = '#eab308';
        mFill = 'rgba(234, 179, 8, 0.24)';
      }

      ctx.strokeStyle = mColor;
      ctx.fillStyle = mFill;
      ctx.lineWidth = 2;
      ctx.beginPath();
      lipPts.forEach((p, idx) => {
        const sx = toX(p.x);
        const sy = toY(p.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (diagnosticsModeRef.current) {
        const p13 = { x: toX(landmarks[13].x), y: toY(landmarks[13].y) };
        const p14 = { x: toX(landmarks[14].x), y: toY(landmarks[14].y) };
        const p78 = { x: toX(landmarks[78].x), y: toY(landmarks[78].y) };
        const p308 = { x: toX(landmarks[308].x), y: toY(landmarks[308].y) };

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p13.x, p13.y);
        ctx.lineTo(p14.x, p14.y);
        ctx.stroke();

        ctx.strokeStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.moveTo(p78.x, p78.y);
        ctx.lineTo(p308.x, p308.y);
        ctx.stroke();
      }
    },
    [options.mode]
  );

  // Main processing rAF loop — runs only while preview/running/paused (when not idle)
  useEffect(() => {
    if (runState === 'idle') return;

    let frameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = lastTime;
    let currentFps = 30;
    let lastUiSync = lastTime;
    let internalTime = 0;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      internalTime += dt;
      frameCount++;

      if (now - lastFpsTime >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        frameCount = 0;
        lastFpsTime = now;
      }

      const activeRun = runStateRef.current;
      const curBaseline = baselineRef.current;
      const curAudio = audioConfigRef.current;
      const effectiveWeights = {
        ...fatigueWeightsRef.current,
        postureDeterioration: enablePostureRef.current
          ? fatigueWeightsRef.current.postureDeterioration
          : 0,
        postureChanges: enablePostureRef.current ? fatigueWeightsRef.current.postureChanges : 0
      };

      let faceTracked = false;
      let faceDetected = false;
      let trackingState: DetectionDiagnostics['trackingState'] = 'NO FACE DETECTED';
      let leftEar = 0.28;
      let rightEar = 0.28;
      let avgEar = 0.28;
      let mar = 0.14;
      let pitch = 0;
      let yaw = 0;
      let roll = 0;
      let headVel = 8;
      let leftEyeState: DetectionDiagnostics['leftEyeState'] = 'UNCERTAIN';
      let rightEyeState: DetectionDiagnostics['rightEyeState'] = 'UNCERTAIN';
      let mouthState: DetectionDiagnostics['mouthState'] = 'RESTING';
      let isEyeValid = false;
      let isMouthValid = false;
      let bbox: DetectionDiagnostics['bbox'] = null;
      let landmarks: LandmarkPoint[] = [];
      let rawDiag: Partial<DetectionDiagnostics> = {};

      if (sourceTypeRef.current === 'synthetic') {
        faceTracked = true;
        faceDetected = true;
        trackingState = 'FACE TRACKED';
        isEyeValid = true;
        isMouthValid = true;

        const cycle = internalTime % 45;
        if (cycle < 12) {
          leftEar = 0.28 + 0.015 * Math.sin(internalTime * 2);
          rightEar = leftEar;
          mar = 0.14 + 0.01 * Math.sin(internalTime);
          leftEyeState = 'FULLY OPEN';
          rightEyeState = 'FULLY OPEN';
          mouthState = 'RESTING';
        } else if (cycle < 22) {
          leftEar = 0.21 + 0.015 * Math.sin(internalTime * 3);
          rightEar = leftEar;
          mar = 0.16;
          leftEyeState = 'PARTIALLY OPEN';
          rightEyeState = 'PARTIALLY OPEN';
          mouthState = 'RESTING';
        } else if (cycle < 28) {
          leftEar = 0.2;
          rightEar = 0.2;
          mar = 0.39 + 0.03 * Math.sin(internalTime * 3);
          leftEyeState = 'PARTIALLY OPEN';
          rightEyeState = 'PARTIALLY OPEN';
          mouthState = 'YAWN DETECTED';
        } else if (cycle < 36) {
          leftEar = 0.27;
          rightEar = 0.27;
          mar = 0.2 + 0.05 * Math.sin(internalTime * 8);
          leftEyeState = 'FULLY OPEN';
          rightEyeState = 'FULLY OPEN';
          mouthState = 'SPEAKING';
        } else {
          leftEar = 0.09;
          rightEar = 0.09;
          pitch = -10;
          leftEyeState = 'CLOSED';
          rightEyeState = 'CLOSED';
          mouthState = 'RESTING';
        }
        avgEar = (leftEar + rightEar) / 2;
      } else {
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const res: FaceMeshResult = faceDetectionService.detectFrame(
            video,
            now,
            curBaseline.ear,
            curBaseline.mar
          );
          trackingState = res.trackingState;
          faceDetected = res.faceDetected;
          faceTracked = res.trackingState === 'FACE TRACKED';
          bbox = res.bbox;
          landmarks = res.landmarks;
          rawDiag = res.diagnostics;

          if (res.faceDetected) {
            leftEar = res.leftEyeEar;
            rightEar = res.rightEyeEar;
            avgEar = res.avgEar;
            leftEyeState = res.leftEyeState;
            rightEyeState = res.rightEyeState;
            isEyeValid = res.isEyeValid;
            mar = res.mar;
            mouthState = res.mouthState;
            isMouthValid = res.isMouthValid;
            pitch = res.pitch;
            yaw = res.yaw;
            roll = res.roll;
            headVel = res.headVelocity;
          }
        }
      }

      // Accumulate Calibration Samples whenever Calibration Wizard is actively running
      if (calibRunningRef.current && faceDetected && isEyeValid) {
        const s = calibSamplesRef.current;
        if (calibStepRef.current === 1) {
          s.openLeft.push(leftEar);
          s.openRight.push(rightEar);
          s.mouthMar.push(mar);
        } else if (calibStepRef.current === 2) {
          s.partialLeft.push(leftEar);
          s.partialRight.push(rightEar);
        } else if (calibStepRef.current === 4) {
          s.closedLeft.push(leftEar);
          s.closedRight.push(rightEar);
        }
      }

      const sessionElapsed =
        activeRun === 'running' && activeWallStartRef.current !== null
          ? pausedElapsedOffsetRef.current + (now - activeWallStartRef.current) / 1000
          : pausedElapsedOffsetRef.current;

      // Update Eye & Mouth state machines ONLY when actively running (Pause cleanly freezes!)
      let eyeUpdate = {
        activeClosureSec: metricsRef.current.activeClosureSec,
        totalBlinks: metricsRef.current.totalBlinks,
        justDetectedNaturalBlink: false,
        justDetectedSlowBlink: false,
        telemetry: {
          blinksPerMin: metricsRef.current.blinkRate,
          avgBlinkDuration: metricsRef.current.avgBlinkDuration,
          medianBlinkDuration: metricsRef.current.avgBlinkDuration,
          longBlinks: metricsRef.current.longBlinks,
          incompleteBlinks: 0,
          blinkIntervalVariability: 0.8,
          perclos: metricsRef.current.perclos,
          perclosLeft: metricsRef.current.perclos,
          perclosRight: metricsRef.current.perclos
        }
      };

      let mouthUpdate = {
        mouthState,
        isYawning: false,
        totalYawns: metricsRef.current.totalYawns,
        telemetry: {
          rawMar: Math.round(mar * 1000) / 1000,
          normalizedOpeningPct: Math.round(
            Math.min(150, Math.max(0, (mar / Math.max(0.1, curBaseline.mar)) * 60))
          ),
          mouthState,
          yawnState: 'RESTING' as YawnTelemetry['yawnState'],
          yawnsPerMin: metricsRef.current.yawnsPerMin,
          currentYawnDuration: 0,
          avgYawnDuration: 0,
          maxMar: mar,
          suspectedYawns: 0
        }
      };

      if (activeRun === 'running' || activeRun === 'preview') {
        eyeUpdate = eyeAnalysisService.update({
          now,
          sessionElapsedSec: Math.max(1, sessionElapsed || internalTime),
          faceTracked,
          faceDetected,
          isEyeValid,
          leftEyeState,
          rightEyeState
        });

        mouthUpdate = mouthAnalysisService.update({
          now,
          faceDetected,
          isMouthValid,
          mar,
          mouthState,
          baselineMar: curBaseline.mar
        });
      }

      const openness = calibrationService.computeNormalizedOpenness(leftEar, rightEar, curBaseline);
      const nextMetrics = metricsRef.current;
      nextMetrics.ear = Math.round(avgEar * 1000) / 1000;
      nextMetrics.leftEar = Math.round(leftEar * 1000) / 1000;
      nextMetrics.rightEar = Math.round(rightEar * 1000) / 1000;
      nextMetrics.leftEyeOpennessPct = openness.left;
      nextMetrics.rightEyeOpennessPct = openness.right;
      nextMetrics.eyeOpennessPct = openness.avg;
      nextMetrics.isEyeClosed = isEyeValid && leftEyeState === 'CLOSED' && rightEyeState === 'CLOSED';
      nextMetrics.activeClosureSec = Math.round(eyeUpdate.activeClosureSec * 10) / 10;
      nextMetrics.totalBlinks = eyeUpdate.totalBlinks;
      nextMetrics.blinkRate = eyeUpdate.telemetry.blinksPerMin;
      nextMetrics.avgBlinkDuration = eyeUpdate.telemetry.avgBlinkDuration;
      nextMetrics.longBlinks = eyeUpdate.telemetry.longBlinks;
      nextMetrics.perclos = eyeUpdate.telemetry.perclos;
      nextMetrics.mar = Math.round(mar * 1000) / 1000;
      nextMetrics.mouthOpeningPct = mouthUpdate.telemetry.normalizedOpeningPct;
      nextMetrics.isYawning = mouthUpdate.isYawning;
      nextMetrics.totalYawns = mouthUpdate.totalYawns;
      nextMetrics.yawnsPerMin = mouthUpdate.telemetry.yawnsPerMin;
      nextMetrics.avgYawnDuration = mouthUpdate.telemetry.avgYawnDuration;
      nextMetrics.pitch = pitch;
      nextMetrics.yaw = yaw;
      nextMetrics.roll = roll;
      nextMetrics.headVelocity = Math.round(headVel);
      nextMetrics.headStability = Math.round(Math.max(10, Math.min(100, 100 - headVel * 1.5)));
      nextMetrics.postureScore = Math.round(Math.max(30, 92 - Math.abs(pitch) * 1.4));
      nextMetrics.facialActivity = Math.round(Math.max(10, 60 - Math.abs(pitch) * 1.2));
      nextMetrics.nodFrequency = 0;

      // Microsleep detection + scoring active ONLY in 'running' state (Pause stops accumulation & alerts!)
      let eventEval = {
        machineState: 'NORMAL' as MicrosleepMachineState,
        activeAlertBanner: null as string | null,
        newEvent: null as MicrosleepEventLog | null
      };

      if (activeRun === 'running') {
        eventEval = eventDetectionService.evaluate({
          faceTracked,
          isEyeValid,
          isEyeClosed: nextMetrics.isEyeClosed,
          activeClosureSec: eyeUpdate.activeClosureSec,
          pitch,
          headVelocity: headVel,
          audioConfig: curAudio
        });

        if (eventEval.newEvent) {
          microsleepEventsRef.current = [
            eventEval.newEvent,
            ...microsleepEventsRef.current.slice(0, 49)
          ];
          setMicrosleepEvents(microsleepEventsRef.current);
          if (settings.desktopNotificationsEnabled) {
            platformAdapter.sendNotification(
              'SleepyCam AI Alert',
              `Possible microsleep event detected (${eventEval.newEvent.durationSec.toFixed(1)}s closed)`
            );
          }
        }
      }

      const computedScore = fatigueScoringService.compute(
        nextMetrics,
        curBaseline,
        undefined,
        effectiveWeights,
        {
          isFaceTracked: faceTracked,
          isEyeValid,
          isMouthValid,
          isPoseValid: true
        }
      );

      // Update tracking durations and session timeline ONLY while running
      let autoCompleteTriggered = false;
      if (activeRun === 'running') {
        if (faceTracked && isEyeValid) {
          validAccumRef.current += dt;
        } else {
          invalidAccumRef.current += dt;
        }

        const wholeSec = Math.floor(sessionElapsed);
        if (wholeSec > lastSecondRecordedRef.current) {
          lastSecondRecordedRef.current = wholeSec;
          recentScoresRef.current.push(computedScore.score);
          if (recentScoresRef.current.length > 20) recentScoresRef.current.shift();

          const pt: SessionDataPoint = {
            timeSec: wholeSec,
            fatigueScore: computedScore.isConfidenceSufficient ? computedScore.score : 0,
            absoluteScore: computedScore.absoluteScore,
            personalDeviationScore: computedScore.personalDeviationScore,
            kssRating: kssRef.current?.level,
            tier: computedScore.tier,
            ear: nextMetrics.ear,
            perclos: nextMetrics.perclos,
            mar: nextMetrics.mar,
            pitch: nextMetrics.pitch,
            confidencePct: computedScore.confidencePct,
            isConfidenceSufficient: computedScore.isConfidenceSufficient,
            trend: calculateFatigueTrend(recentScoresRef.current),
            audioMuted: !curAudio.audioEnabled
          };
          sessionHistoryRef.current = [...sessionHistoryRef.current.slice(-599), pt];
        }

        if (options.mode === 'assessment' && sessionElapsed >= assessmentTargetRef.current) {
          autoCompleteTriggered = true;
        }
      }

      const diagSnapshot: DetectionDiagnostics = {
        fps: currentFps,
        inferenceMs: rawDiag.inferenceMs ?? 0,
        trackingState,
        faceDetected,
        trackingConfidence: computedScore.confidencePct,
        bbox,
        leftEyeEar: Math.round(leftEar * 1000) / 1000,
        rightEyeEar: Math.round(rightEar * 1000) / 1000,
        avgEar: Math.round(avgEar * 1000) / 1000,
        leftEyeOpennessPct: openness.left,
        rightEyeOpennessPct: openness.right,
        leftEyeState,
        rightEyeState,
        isEyeValid,
        eyeCalibration: curBaseline.eyeCalibration || null,
        mar: Math.round(mar * 1000) / 1000,
        mouthState: mouthUpdate.mouthState,
        isYawning: mouthUpdate.isYawning,
        isMouthValid,
        pitch,
        yaw,
        roll,
        headVelocity: Math.round(headVel),
        microsleepState: eventEval.machineState,
        activeClosureSec: Math.round(eyeUpdate.activeClosureSec * 10) / 10,
        errorMessage: null,
        distanceQuality: rawDiag.distanceQuality || 'UNCERTAIN',
        mouthWidthPx: rawDiag.mouthWidthPx,
        mouthHeightPx: rawDiag.mouthHeightPx,
        leftEyeWidthPx: rawDiag.leftEyeWidthPx,
        rightEyeWidthPx: rawDiag.rightEyeWidthPx
      };
      lastDiagRef.current = diagSnapshot;

      // Update validation checklist when diagnostics mode enabled
      if (diagnosticsModeRef.current && faceDetected) {
        const cl = checklistRef.current;
        let changed = false;
        const mark = (k: keyof ValidationChecklistState) => {
          if (!cl[k]) {
            cl[k] = true;
            changed = true;
          }
        };
        if (leftEyeState === 'FULLY OPEN' && rightEyeState === 'FULLY OPEN' && avgEar >= 0.23)
          mark('eyesFullyOpen');
        if (leftEyeState === 'PARTIALLY OPEN' && rightEyeState === 'PARTIALLY OPEN')
          mark('eyesPartiallyOpen');
        if (leftEyeState === 'CLOSED' && rightEyeState === 'CLOSED') mark('eyesFullyClosed');
        if (
          (leftEyeState === 'CLOSED' && rightEyeState === 'FULLY OPEN') ||
          (rightEyeState === 'CLOSED' && leftEyeState === 'FULLY OPEN')
        ) {
          mark('eyesOneClosedOneOpen');
        }
        if (
          trackingState === 'FACE TOO FAR' &&
          (leftEyeState === 'UNCERTAIN' || rightEyeState === 'UNCERTAIN')
        ) {
          mark('eyesDistanceRobustness');
        }
        if (eyeUpdate.justDetectedNaturalBlink) mark('eyesNaturalBlink');
        if (eyeUpdate.justDetectedSlowBlink) mark('eyesSlowBlink');
        if (eyeUpdate.activeClosureSec >= 0.5) mark('eyesSlowClosure');
        if (mouthUpdate.mouthState === 'RESTING' && mar < 0.15) mark('mouthResting');
        if (mouthUpdate.mouthState === 'SPEAKING') mark('mouthSpeaking');
        if (mouthUpdate.mouthState === 'SMILING') mark('mouthSmiling');
        if (mouthUpdate.isYawning && mar < 0.4) mark('mouthSmallYawn');
        if (mouthUpdate.isYawning && mar >= 0.4) mark('mouthLargeYawn');
        if (isMouthValid && mouthUpdate.mouthState !== 'UNCERTAIN') mark('mouthBeardImmunity');
        if (pitch < -16 && leftEyeState === 'FULLY OPEN') mark('noFatigueLookDown');
        if (Math.abs(yaw) > 18 && leftEyeState === 'FULLY OPEN') mark('noFatigueTurnHead');
        if (curBaseline.geometricCalibration?.isCalibrated) mark('noFatigueNarrowEyes');
        if (mouthUpdate.isYawning && eventEval.machineState === 'NORMAL')
          mark('noMicrosleepOnYawn');

        if (changed) {
          setChecklist({ ...cl });
        }
      }

      // Draw canvas overlay every rAF frame directly
      drawOverlayCanvas(trackingState, bbox, landmarks, diagSnapshot);

      // Throttled React UI Sync (~10 Hz) — NEVER called inside render
      if (now - lastUiSync >= 95 || autoCompleteTriggered) {
        lastUiSync = now;
        setMetrics({ ...nextMetrics });
        setDiagnostics(diagSnapshot);
        setScoreResult(computedScore);
        setFatigueTrend(calculateFatigueTrend(recentScoresRef.current));
        setBlinkTelemetry(eyeUpdate.telemetry);
        setYawnTelemetry(mouthUpdate.telemetry);
        setMicrosleepState(eventEval.machineState);
        setActiveAlert(eventEval.activeAlertBanner);

        if (activeRun === 'running') {
          setElapsedSec(Math.round(sessionElapsed * 10) / 10);
          setValidTrackingSec(Math.round(validAccumRef.current * 10) / 10);
          setInvalidTrackingSec(Math.round(invalidAccumRef.current * 10) / 10);
          setSessionHistory(sessionHistoryRef.current);

          if (options.mode === 'assessment' && validAccumRef.current >= 10) {
            setPreliminaryResult(computedScore);
          }
        }
      }

      if (autoCompleteTriggered) {
        const target = assessmentTargetRef.current;
        if (target === 10) checklistRef.current.timer10s = true;
        if (target === 30) checklistRef.current.timer30s = true;
        if (target === 60) checklistRef.current.timer60s = true;
        setChecklist({ ...checklistRef.current });
        void stopSession(true);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [drawOverlayCanvas, options.mode, runState, settings.desktopNotificationsEnabled, stopSession]);

  return {
    videoRef,
    canvasRef,
    cropCanvasRef,
    runState,
    sourceType,
    selectedDeviceId,
    showOverlay,
    setShowOverlay,
    modelReady,
    modelLoading,
    cameraError,
    videoAspect,
    handleVideoMetadata,
    startCameraPreview,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    switchCamera,
    switchSourceMode,
    metrics,
    diagnostics,
    scoreResult,
    fatigueTrend,
    blinkTelemetry,
    yawnTelemetry,
    microsleepState,
    activeAlert,
    microsleepEvents,
    sessionHistory,
    elapsedSec,
    validTrackingSec,
    invalidTrackingSec,
    assessmentTargetDuration,
    setAssessmentTargetDuration,
    assessmentCompletedRecord,
    setAssessmentCompletedRecord,
    preliminaryResult,
    completedMonitorSession,
    setCompletedMonitorSession,
    isCalibOpen,
    calibStep,
    calibTimer,
    calibRunning,
    calibFailureReason,
    startOneClickCalibration,
    startGuidedCalibration,
    cancelGuidedCalibration,
    checklist
  };
}
