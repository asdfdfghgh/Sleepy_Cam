export type FatigueTier =
  | 'LOW FATIGUE INDICATORS'
  | 'MILD FATIGUE INDICATORS'
  | 'MODERATE FATIGUE INDICATORS'
  | 'HIGH FATIGUE INDICATORS'
  | 'VERY HIGH FATIGUE INDICATORS'
  | 'AWAKE'
  | 'NORMAL'
  | 'GETTING TIRED'
  | 'FATIGUED'
  | 'VERY FATIGUED'
  | 'EXTREME FATIGUE';

export type PersonalDeviationTier =
  | 'MINIMAL DEVIATION'
  | 'MILD DEVIATION'
  | 'MODERATE DEVIATION'
  | 'HIGH DEVIATION'
  | 'SEVERE DEVIATION';

export interface KssRating {
  level: number; // 1 to 9
  label: string; // e.g., "Sleepy, some effort to stay awake"
  description: string;
  category: 'ALERT' | 'NORMAL' | 'TIRED' | 'SLEEPY' | 'VERY SLEEPY';
  ratedAt: number;
}

export type FatigueTrend = 'INCREASING' | 'STABLE' | 'DECREASING';

export interface DualScoringConfig {
  absoluteWeight: number; // 0.65 default
  deviationWeight: number; // 0.35 default
}

export interface FatigueWeightConfig {
  perclos: number; // 0.30 (30%)
  eyeOpennessProlonged: number; // 0.25 (25%)
  blinkDurationAbnormalities: number; // 0.20 (20%)
  blinkFrequencyPatterns: number; // 0.10 (10%)
  yawning: number; // 0.10 (10%)
  postureDeterioration: number; // 0.05 (5%)
  headNodding: number; // 0.00 (0% - explicitly removed)

  // Backward compatibility aliases
  prolongedClosures?: number;
  blinkAbnormalities?: number;
  yawn?: number;
  postureChanges?: number;
  facialActivity?: number;
}

export interface BlinkTelemetry {
  blinksPerMin: number;
  avgBlinkDuration: number;
  medianBlinkDuration: number;
  longBlinks: number;
  incompleteBlinks: number;
  blinkIntervalVariability: number;
  perclos: number;
  perclosLeft: number;
  perclosRight: number;
}

export interface YawnTelemetry {
  rawMar: number;
  normalizedOpeningPct: number;
  mouthState: MouthState;
  yawnState: 'RESTING' | 'OPENING' | 'SUSTAINED' | 'CLOSING' | 'COMPLETED';
  yawnsPerMin: number;
  currentYawnDuration: number;
  avgYawnDuration: number;
  maxMar: number;
  suspectedYawns: number;
}

export interface AudioAlertConfig {
  audioEnabled: boolean;
  volume: number; // 0.0 - 1.0
  beepDuration: number; // seconds (e.g. 0.12)
  cooldownSec: number; // seconds (e.g. 5.0)
  microsleepThresholdSec: number; // seconds (e.g. 1.5)
  repeatIntervalSec: number; // seconds (e.g. 3.0)
}

export interface BiometricMetrics {
  ear: number;
  leftEar: number;
  rightEar: number;
  leftEyeOpennessPct: number | null; // 0-100% or null if UNCALIBRATED
  rightEyeOpennessPct: number | null; // 0-100% or null if UNCALIBRATED
  eyeOpennessPct: number | null; // Average 0-100% or null if UNCALIBRATED
  isEyeClosed: boolean;
  activeClosureSec: number;
  totalBlinks: number;
  blinkRate: number; // per min
  avgBlinkDuration: number;
  longBlinks: number;
  perclos: number; // 0 - 100%

  mar: number;
  mouthOpeningPct: number;
  isYawning: boolean;
  totalYawns: number;
  yawnsPerMin: number;
  avgYawnDuration: number;

  pitch: number; // degrees
  yaw: number;
  roll: number;
  headVelocity: number; // deg/s
  headStability: number; // 0 - 100%
  nodFrequency: number; // nods/min
  totalNods: number;

  postureScore: number; // 0 - 100%
  shoulderAngle: number;
  isSlouching: boolean;
  isLeaning: boolean;

  facialActivity: number; // 0 - 100%
}

export interface GeometricCalibration {
  leftOpenEar: number;
  leftPartialEar?: number;
  leftClosedEar: number;
  rightOpenEar: number;
  rightPartialEar?: number;
  rightClosedEar: number;
  neutralPitch: number;
  neutralYaw: number;
  neutralRoll: number;
  restingMar?: number;
  restingMouthWidth?: number;
  isCalibrated: boolean;
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  qualityNotes?: string;
  calibratedAt?: number;
}

export interface BehavioralBaseline {
  referenceBlinkRate: number; // typical rested bpm (default 15)
  referenceBlinkDuration: number; // typical rested duration (default 0.18s)
  referencePostureScore: number; // default 90%
  referenceFacialActivity: number; // default 52%
  isUserSpecifiedOrLearned: boolean;
}

export interface EyeCalibrationData {
  leftOpenEar: number;
  leftPartialEar?: number;
  leftClosedEar: number;
  rightOpenEar: number;
  rightPartialEar?: number;
  rightClosedEar: number;
  isCalibrated: boolean;
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  qualityNotes?: string;
  calibratedAt?: number;
}

export interface BaselineData {
  ear: number;
  mar: number;
  blinkRate: number;
  blinkDuration: number;
  headPitch: number;
  facialActivity: number;
  postureScore: number;
  isCalibrated: boolean;
  progressPct: number;
  eyeCalibration?: EyeCalibrationData;
  geometricCalibration?: GeometricCalibration;
  behavioralBaseline?: BehavioralBaseline;
}

export interface MicrosleepEventLog {
  id: string;
  timeFormatted: string;
  durationSec: number;
  pitchDropDeg: number;
  recoveryVelocity: number;
  confidencePct: number;
  notes: string;
  audioTriggered?: boolean;
  audioMuted?: boolean;
}

export interface SessionDataPoint {
  timeSec: number;
  fatigueScore: number;
  personalDeviationScore?: number;
  absoluteScore?: number;
  kssRating?: number;
  tier: FatigueTier;
  ear: number;
  perclos: number;
  mar: number;
  pitch: number;
  confidencePct?: number;
  isConfidenceSufficient?: boolean;
  trend?: FatigueTrend;
  audioMuted?: boolean;
  label?: number;
}

export interface DatasetSample {
  id: number;
  timestamp: string;
  features: number[];
  label: number;
  labelName: string;
}

export type FaceTrackingState =
  | 'NO FACE DETECTED'
  | 'FACE DETECTED'
  | 'FACE TOO FAR'
  | 'FACE TOO CLOSE'
  | 'FACE PARTIALLY VISIBLE'
  | 'FACE TRACKED'
  | 'FACE TRACKING LOST';

export type EyeState =
  | 'FULLY OPEN'
  | 'PARTIALLY OPEN'
  | 'CLOSED'
  | 'UNCERTAIN'
  | 'OPEN'; // legacy alias

export type MouthState =
  | 'RESTING'
  | 'SPEAKING'
  | 'SMILING'
  | 'MOUTH OPEN'
  | 'YAWN SUSPECTED'
  | 'YAWN DETECTED'
  | 'MOUTH CLOSED'
  | 'MOUTH SLIGHTLY OPEN'
  | 'MOUTH WIDE OPEN'
  | 'UNCERTAIN';

export type MicrosleepMachineState =
  | 'NORMAL'
  | 'POSSIBLE EYE CLOSURE'
  | 'SUSTAINED EYE CLOSURE'
  | 'ALERT ACTIVE'
  | 'RECOVERY'
  | 'EVENT ENDED';

export interface FaceBoundingBox {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number;
  height: number;
  areaPct: number; // percentage of full webcam frame (0-100)
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface DetectionDiagnostics {
  fps: number;
  inferenceMs: number;
  trackingState: FaceTrackingState;
  faceDetected: boolean;
  trackingConfidence: number;
  bbox: FaceBoundingBox | null;
  leftEyeEar: number;
  rightEyeEar: number;
  avgEar: number;
  leftEyeOpennessPct: number | null;
  rightEyeOpennessPct: number | null;
  leftEyeState: EyeState;
  rightEyeState: EyeState;
  isEyeValid: boolean;
  eyeCalibration: EyeCalibrationData | null;
  mar: number;
  mouthState: MouthState;
  isYawning: boolean;
  isMouthValid: boolean;
  pitch: number;
  yaw: number;
  roll: number;
  headVelocity: number;
  microsleepState: MicrosleepMachineState;
  activeClosureSec: number;
  errorMessage: string | null;
  distanceQuality?: 'OPTIMAL' | 'ACCEPTABLE' | 'TOO FAR' | 'TOO CLOSE' | 'UNCERTAIN';
  mouthWidthPx?: number;
  mouthHeightPx?: number;
  leftEyeWidthPx?: number;
  rightEyeWidthPx?: number;
}

export type AppRoute =
  | 'home'
  | 'setup'
  | 'assessment'
  | 'monitoring'
  | 'history'
  | 'reports'
  | 'settings'
  | 'about';

export type CameraErrorCode =
  | 'NO_CAMERA_FOUND'
  | 'CAMERA_PERMISSION_DENIED'
  | 'CAMERA_DISCONNECTED'
  | 'CAMERA_IN_USE'
  | 'MODEL_LOAD_FAILED';

export interface CameraErrorInfo {
  code: CameraErrorCode;
  title: string;
  message: string;
  guidance: string;
}

export interface CameraDeviceOption {
  deviceId: string;
  label: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  startupPage: 'home' | 'monitoring' | 'assessment';
  language: 'en';
  defaultCameraId: string;
  resolution: '640x480' | '1280x720' | '1920x1080';
  defaultAssessmentDuration: 10 | 30 | 60 | 120;
  showOverlaysByDefault: boolean;
  pauseOnTabHidden: boolean;
  enablePostureWeight: boolean;
  desktopNotificationsEnabled: boolean;
  diagnosticsMode: boolean;
  privacyAccepted: boolean;
}

export interface SavedSessionRecord {
  id: string;
  sessionType: 'monitoring' | 'assessment';
  startedAt: number;
  endedAt: number;
  dateStr: string;
  startTimeStr: string;
  durationSec: number;
  validTrackingSec: number;
  invalidTrackingSec: number;
  detectionQualityPct: number;
  avgFatigueScore: number;
  maxFatigueScore: number;
  minFatigueScore: number;
  avgPersonalDeviation: number;
  avgAbsoluteScore: number;
  kssRating: KssRating | null;
  microsleepEvents: MicrosleepEventLog[];
  categoryDurationsSec: Record<string, number>;
  blinkSummary: {
    totalBlinks: number;
    avgBlinkRate: number;
    avgBlinkDuration: number;
    longBlinks: number;
    avgPerclos: number;
  };
  yawnSummary: {
    totalYawns: number;
    avgYawnsPerMin: number;
    avgYawnDuration: number;
  };
  history: SessionDataPoint[];
  limitationsNote: string;
}

export type SelfReportedFatigueLevel =
  | 'Not fatigued'
  | 'Mildly fatigued'
  | 'Moderately fatigued'
  | 'Severely fatigued';

export interface AssessmentFeedbackMetrics {
  avgEar: number | null;
  perclosPct: number | null;
  blinkFrequencyPerMin: number | null;
  totalBlinks: number | null;
  yawnEvents: number | null;
  yawnsPerMin: number | null;
  microsleepEventsCount: number;
  predictedFatigueScore: number | null;
  predictedAbsoluteScore: number | null;
  predictedPersonalDeviation: number | null;
  predictedTier: string | null;
  detectionQualityPct: number;
  validTrackingSec: number;
  durationSec: number;
}

export interface AssessmentFeedbackRecord {
  id: string;
  sessionId: string;
  sessionType: 'assessment' | 'monitoring';
  assessmentTimestamp: number;
  assessmentTimestampIso: string;
  recordedAt: number;
  recordedAtIso: string;
  isAccurate: boolean;
  selfReportedFatigueLevel: SelfReportedFatigueLevel | null;
  metrics: AssessmentFeedbackMetrics;
  notes: string;
}
