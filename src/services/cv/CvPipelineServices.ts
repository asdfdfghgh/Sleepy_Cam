import {
  AudioAlertConfig,
  BaselineData,
  BiometricMetrics,
  BlinkTelemetry,
  DualScoringConfig,
  EyeCalibrationData,
  FatigueWeightConfig,
  GeometricCalibration,
  KssRating,
  MicrosleepEventLog,
  MicrosleepMachineState,
  SavedSessionRecord,
  SessionDataPoint,
  YawnTelemetry
} from '../../types';
import {
  calculateNormalizedEyeOpenness,
  computeDualFatigueScore,
  DEFAULT_DUAL_CONFIG,
  DEFAULT_FATIGUE_WEIGHTS,
  FatigueScoreResult
} from '../../utils/mathFormulas';
import { faceLandmarkerService, FaceMeshResult } from '../../utils/faceLandmarkerEngine';
import { audioAlert } from '../../utils/audioAlertEngine';

export interface BlinkRecord {
  startTime: number;
  endTime: number;
  durationSec: number;
  isLong: boolean;
  isIncomplete: boolean;
}

export interface PerclosSample {
  timestamp: number;
  dt: number;
  isBilateralClosed: boolean;
  isLeftClosed: boolean;
  isRightClosed: boolean;
  isValid: boolean;
}

export interface YawnEventRecord {
  startTime: number;
  endTime: number;
  durationSec: number;
  peakMar: number;
}

export class FaceDetectionService {
  public async initialize(): Promise<void> {
    await faceLandmarkerService.initialize();
  }

  public isReady(): boolean {
    return faceLandmarkerService.isReady();
  }

  public detectFrame(
    video: HTMLVideoElement,
    timestampMs: number,
    baselineEar: number,
    baselineMar: number
  ): FaceMeshResult {
    return faceLandmarkerService.processVideoFrame(video, timestampMs, baselineEar, baselineMar);
  }
}

export class EyeAnalysisService {
  private blinkHistory: BlinkRecord[] = [];
  private perclosHistory: PerclosSample[] = [];
  private eyeClosureStart: number | null = null;
  private dipStart: number | null = null;
  private lastSampleTime: number = performance.now();
  private totalBlinksCount: number = 0;

  public reset(): void {
    this.blinkHistory = [];
    this.perclosHistory = [];
    this.eyeClosureStart = null;
    this.dipStart = null;
    this.lastSampleTime = performance.now();
    this.totalBlinksCount = 0;
  }

  public update(params: {
    now: number;
    sessionElapsedSec: number;
    faceTracked: boolean;
    faceDetected: boolean;
    isEyeValid: boolean;
    leftEyeState: FaceMeshResult['leftEyeState'];
    rightEyeState: FaceMeshResult['rightEyeState'];
  }): {
    activeClosureSec: number;
    telemetry: BlinkTelemetry;
    totalBlinks: number;
    justDetectedNaturalBlink: boolean;
    justDetectedSlowBlink: boolean;
  } {
    const {
      now,
      sessionElapsedSec,
      faceTracked,
      faceDetected,
      isEyeValid,
      leftEyeState,
      rightEyeState
    } = params;

    let activeClosureSec = 0;
    let justDetectedNaturalBlink = false;
    let justDetectedSlowBlink = false;

    if (faceDetected && isEyeValid) {
      const bothClosed = leftEyeState === 'CLOSED' && rightEyeState === 'CLOSED';

      if (bothClosed) {
        if (this.eyeClosureStart === null) {
          this.eyeClosureStart = now;
        }
        activeClosureSec = (now - this.eyeClosureStart) / 1000;
      } else {
        if (this.eyeClosureStart !== null) {
          const closureDur = (now - this.eyeClosureStart) / 1000;
          this.eyeClosureStart = null;

          if (closureDur >= 0.06 && closureDur <= 1.2) {
            const isLong = closureDur > 0.4;
            this.totalBlinksCount++;
            if (isLong) {
              justDetectedSlowBlink = true;
            } else {
              justDetectedNaturalBlink = true;
            }
            this.blinkHistory.push({
              startTime: now - closureDur * 1000,
              endTime: now,
              durationSec: closureDur,
              isLong,
              isIncomplete: false
            });
          }
        }
        activeClosureSec = 0;
      }

      if (
        (leftEyeState === 'PARTIALLY OPEN' || rightEyeState === 'PARTIALLY OPEN') &&
        !bothClosed
      ) {
        if (this.dipStart === null) {
          this.dipStart = now;
        }
      } else if (this.dipStart !== null) {
        const dipDur = (now - this.dipStart) / 1000;
        this.dipStart = null;
        if (dipDur >= 0.08 && dipDur <= 0.35 && leftEyeState === 'FULLY OPEN') {
          this.blinkHistory.push({
            startTime: now - dipDur * 1000,
            endTime: now,
            durationSec: dipDur,
            isLong: false,
            isIncomplete: true
          });
        }
      }

      const sampleDt = Math.max(0.01, Math.min(0.2, (now - this.lastSampleTime) / 1000));
      this.lastSampleTime = now;

      if (faceTracked) {
        this.perclosHistory.push({
          timestamp: now,
          dt: sampleDt,
          isBilateralClosed: bothClosed,
          isLeftClosed: leftEyeState === 'CLOSED',
          isRightClosed: rightEyeState === 'CLOSED',
          isValid: true
        });
      }

      const cutoff30s = now - 30000;
      while (this.perclosHistory.length > 0 && this.perclosHistory[0].timestamp < cutoff30s) {
        this.perclosHistory.shift();
      }
    } else {
      this.eyeClosureStart = null;
      this.dipStart = null;
      this.lastSampleTime = now;
      activeClosureSec = 0;
    }

    const cutoff60s = now - 60000;
    while (this.blinkHistory.length > 0 && this.blinkHistory[0].endTime < cutoff60s) {
      this.blinkHistory.shift();
    }

    const recentBlinks = this.blinkHistory;
    const effectiveWindow = Math.max(15, Math.min(60, sessionElapsedSec));
    const blinksPerMin = Math.round(recentBlinks.length * (60 / effectiveWindow));
    const durations = recentBlinks.map((b) => b.durationSec);
    const avgBlinkDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0.18;
    const sorted = [...durations].sort((a, b) => a - b);
    const medianBlinkDuration = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0.18;
    const longBlinks = recentBlinks.filter((b) => b.isLong).length;
    const incompleteBlinks = recentBlinks.filter((b) => b.isIncomplete).length;

    let totalValidTime = 0;
    let bilateralClosedTime = 0;
    let leftClosedTime = 0;
    let rightClosedTime = 0;
    for (const s of this.perclosHistory) {
      if (s.isValid) {
        totalValidTime += s.dt;
        if (s.isBilateralClosed) bilateralClosedTime += s.dt;
        if (s.isLeftClosed) leftClosedTime += s.dt;
        if (s.isRightClosed) rightClosedTime += s.dt;
      }
    }

    const perclos =
      totalValidTime > 1.0 ? Math.round((bilateralClosedTime / totalValidTime) * 1000) / 10 : 2.0;
    const perclosLeft =
      totalValidTime > 1.0 ? Math.round((leftClosedTime / totalValidTime) * 1000) / 10 : 2.0;
    const perclosRight =
      totalValidTime > 1.0 ? Math.round((rightClosedTime / totalValidTime) * 1000) / 10 : 2.0;

    return {
      activeClosureSec,
      totalBlinks: this.totalBlinksCount,
      justDetectedNaturalBlink,
      justDetectedSlowBlink,
      telemetry: {
        blinksPerMin,
        avgBlinkDuration: Math.round(avgBlinkDuration * 100) / 100,
        medianBlinkDuration: Math.round(medianBlinkDuration * 100) / 100,
        longBlinks,
        incompleteBlinks,
        blinkIntervalVariability: 0.8,
        perclos,
        perclosLeft,
        perclosRight
      }
    };
  }
}

export class MouthAnalysisService {
  private yawnState: YawnTelemetry['yawnState'] = 'RESTING';
  private yawnStartTime: number | null = null;
  private yawnPeakMar: number = 0;
  private yawnHistory: YawnEventRecord[] = [];
  private totalYawnsCount: number = 0;
  private suspectedYawnCount: number = 0;

  public reset(): void {
    this.yawnState = 'RESTING';
    this.yawnStartTime = null;
    this.yawnPeakMar = 0;
    this.yawnHistory = [];
    this.totalYawnsCount = 0;
    this.suspectedYawnCount = 0;
  }

  public update(params: {
    now: number;
    faceDetected: boolean;
    isMouthValid: boolean;
    mar: number;
    mouthState: FaceMeshResult['mouthState'];
    baselineMar: number;
  }): {
    mouthState: FaceMeshResult['mouthState'];
    isYawning: boolean;
    totalYawns: number;
    telemetry: YawnTelemetry;
  } {
    const { now, faceDetected, isMouthValid, mar, baselineMar } = params;
    let mouthState = params.mouthState;
    let isYawning = false;

    if (faceDetected && isMouthValid) {
      const isMouthYawnAperture =
        (mar >= 0.28 || mouthState === 'MOUTH OPEN' || mouthState === 'MOUTH WIDE OPEN') &&
        mouthState !== 'SMILING';

      if (isMouthYawnAperture) {
        if (this.yawnState === 'RESTING') {
          this.yawnState = 'OPENING';
          this.yawnStartTime = now;
          this.yawnPeakMar = mar;
        } else if (this.yawnState === 'OPENING') {
          const openingDur = (now - (this.yawnStartTime || now)) / 1000;
          if (mar > this.yawnPeakMar) this.yawnPeakMar = mar;
          if (openingDur >= 0.4 && openingDur < 0.7) {
            mouthState = 'YAWN SUSPECTED';
          } else if (openingDur >= 0.7) {
            this.yawnState = 'SUSTAINED';
            isYawning = true;
            mouthState = 'YAWN DETECTED';
            this.suspectedYawnCount++;
            this.totalYawnsCount++;
          }
        } else if (this.yawnState === 'SUSTAINED') {
          isYawning = true;
          mouthState = 'YAWN DETECTED';
          if (mar > this.yawnPeakMar) this.yawnPeakMar = mar;
        }
      } else if (this.yawnState === 'SUSTAINED' || this.yawnState === 'OPENING') {
        const totalYawnDur = (now - (this.yawnStartTime || now)) / 1000;
        if (totalYawnDur >= 0.8) {
          this.yawnHistory.push({
            startTime: this.yawnStartTime || now,
            endTime: now,
            durationSec: totalYawnDur,
            peakMar: this.yawnPeakMar
          });
        }
        this.yawnState = 'RESTING';
        this.yawnStartTime = null;
        isYawning = false;
      }
    } else {
      this.yawnState = 'RESTING';
      this.yawnStartTime = null;
      isYawning = false;
    }

    const cutoff60s = now - 60000;
    while (this.yawnHistory.length > 0 && this.yawnHistory[0].endTime < cutoff60s) {
      this.yawnHistory.shift();
    }

    const yawnsPerMin = this.yawnHistory.length;
    const activeYawnDur = this.yawnStartTime
      ? Math.round(((now - this.yawnStartTime) / 1000) * 10) / 10
      : 0;
    const normalizedOpeningPct = Math.round(
      Math.min(150, Math.max(0, (mar / Math.max(0.1, baselineMar)) * 60))
    );

    return {
      mouthState,
      isYawning,
      totalYawns: this.totalYawnsCount,
      telemetry: {
        rawMar: Math.round(mar * 1000) / 1000,
        normalizedOpeningPct,
        mouthState,
        yawnState: this.yawnState,
        yawnsPerMin,
        currentYawnDuration: activeYawnDur,
        avgYawnDuration: activeYawnDur,
        maxMar: Math.round(this.yawnPeakMar * 1000) / 1000,
        suspectedYawns: this.suspectedYawnCount
      }
    };
  }
}

export class CalibrationService {
  public computeNormalizedOpenness(
    leftEar: number,
    rightEar: number,
    baseline: BaselineData
  ): { left: number | null; right: number | null; avg: number | null } {
    const geo = baseline.geometricCalibration;
    if (!geo || !geo.isCalibrated) {
      return { left: null, right: null, avg: null };
    }
    const lRes = calculateNormalizedEyeOpenness(leftEar, geo.leftOpenEar, geo.leftClosedEar);
    const rRes = calculateNormalizedEyeOpenness(rightEar, geo.rightOpenEar, geo.rightClosedEar);
    const left = lRes ? lRes.opennessPct : null;
    const right = rRes ? rRes.opennessPct : null;
    const avg = left !== null && right !== null ? Math.round((left + right) / 2) : null;
    return { left, right, avg };
  }

  public buildOneClickBaseline(
    prev: BaselineData,
    params: {
      leftEar: number;
      rightEar: number;
      mar: number;
      pitch: number;
      yaw: number;
      roll: number;
    }
  ): BaselineData {
    const lOpen = Math.max(0.2, Math.min(0.38, params.leftEar > 0.12 ? params.leftEar : 0.28));
    const rOpen = Math.max(0.2, Math.min(0.38, params.rightEar > 0.12 ? params.rightEar : 0.28));
    const lClosed = Math.round(lOpen * 0.48 * 1000) / 1000;
    const rClosed = Math.round(rOpen * 0.48 * 1000) / 1000;
    const nominalMar = Math.max(0.12, Math.min(0.3, params.mar > 0.05 ? params.mar : 0.16));

    const geo: GeometricCalibration = {
      leftOpenEar: Math.round(lOpen * 1000) / 1000,
      leftPartialEar: Math.round(((lOpen + lClosed) / 2) * 1000) / 1000,
      leftClosedEar: lClosed,
      rightOpenEar: Math.round(rOpen * 1000) / 1000,
      rightPartialEar: Math.round(((rOpen + rClosed) / 2) * 1000) / 1000,
      rightClosedEar: rClosed,
      neutralPitch: Math.round(params.pitch * 10) / 10,
      neutralYaw: Math.round(params.yaw * 10) / 10,
      neutralRoll: Math.round(params.roll * 10) / 10,
      restingMar: Math.round(nominalMar * 1000) / 1000,
      isCalibrated: true,
      quality: 'GOOD',
      calibratedAt: Date.now()
    };

    const eyeCal: EyeCalibrationData = {
      leftOpenEar: geo.leftOpenEar,
      leftClosedEar: geo.leftClosedEar,
      rightOpenEar: geo.rightOpenEar,
      rightClosedEar: geo.rightClosedEar,
      isCalibrated: true,
      quality: 'GOOD',
      calibratedAt: Date.now()
    };

    return {
      ...prev,
      ear: Math.round(((lOpen + rOpen) / 2) * 1000) / 1000,
      mar: nominalMar,
      headPitch: geo.neutralPitch,
      isCalibrated: true,
      progressPct: 100,
      geometricCalibration: geo,
      eyeCalibration: eyeCal
    };
  }

  public finalizeGuidedBaseline(
    prev: BaselineData,
    samples: {
      openLeft: number[];
      openRight: number[];
      partialLeft: number[];
      partialRight: number[];
      closedLeft: number[];
      closedRight: number[];
      mouthMar: number[];
      pitch: number;
      yaw: number;
      roll: number;
    }
  ): { baseline?: BaselineData; error?: string } {
    const median = (arr: number[], fallback: number) => {
      if (arr.length === 0) return fallback;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    if (samples.openLeft.length < 5 || samples.closedLeft.length < 5) {
      return {
        error:
          'Not enough valid face-tracking samples were collected during calibration. Ensure your face stays centered and retry.'
      };
    }

    const lOpen = median(samples.openLeft, 0.28);
    const rOpen = median(samples.openRight, 0.28);
    const lPart = median(samples.partialLeft, (lOpen + 0.14) / 2);
    const rPart = median(samples.partialRight, (rOpen + 0.14) / 2);
    const lClosed = median(samples.closedLeft, 0.14);
    const rClosed = median(samples.closedRight, 0.14);
    const restingMar = median(samples.mouthMar, 0.16);

    const lSep = lOpen - lClosed;
    const rSep = rOpen - rClosed;

    if (lSep < 0.045 || rSep < 0.045) {
      return {
        error: `Open vs closed eye separation was too small (L: ${lSep.toFixed(3)}, R: ${rSep.toFixed(
          3
        )}). Please look directly at the camera in balanced lighting and close both eyes completely during step 4.`
      };
    }

    const quality: GeometricCalibration['quality'] =
      lSep > 0.08 && rSep > 0.08 ? 'EXCELLENT' : 'GOOD';

    const geo: GeometricCalibration = {
      leftOpenEar: Math.round(lOpen * 1000) / 1000,
      leftPartialEar: Math.round(lPart * 1000) / 1000,
      leftClosedEar: Math.round(lClosed * 1000) / 1000,
      rightOpenEar: Math.round(rOpen * 1000) / 1000,
      rightPartialEar: Math.round(rPart * 1000) / 1000,
      rightClosedEar: Math.round(rClosed * 1000) / 1000,
      neutralPitch: Math.round(samples.pitch * 10) / 10,
      neutralYaw: Math.round(samples.yaw * 10) / 10,
      neutralRoll: Math.round(samples.roll * 10) / 10,
      restingMar: Math.round(restingMar * 1000) / 1000,
      isCalibrated: true,
      quality,
      calibratedAt: Date.now()
    };

    const eyeCal: EyeCalibrationData = {
      leftOpenEar: geo.leftOpenEar,
      leftPartialEar: geo.leftPartialEar,
      leftClosedEar: geo.leftClosedEar,
      rightOpenEar: geo.rightOpenEar,
      rightPartialEar: geo.rightPartialEar,
      rightClosedEar: geo.rightClosedEar,
      isCalibrated: true,
      quality,
      calibratedAt: Date.now()
    };

    return {
      baseline: {
        ...prev,
        ear: Math.round(((lOpen + rOpen) / 2) * 1000) / 1000,
        mar: geo.restingMar || 0.16,
        headPitch: geo.neutralPitch,
        isCalibrated: true,
        progressPct: 100,
        geometricCalibration: geo,
        eyeCalibration: eyeCal
      }
    };
  }
}

export class FatigueScoringService {
  public compute(
    metrics: BiometricMetrics,
    baseline: BaselineData,
    dualConfig: DualScoringConfig = DEFAULT_DUAL_CONFIG,
    weights: FatigueWeightConfig = DEFAULT_FATIGUE_WEIGHTS,
    sensors: {
      isFaceTracked: boolean;
      isEyeValid: boolean;
      isMouthValid: boolean;
      isPoseValid: boolean;
    }
  ): FatigueScoreResult {
    return computeDualFatigueScore(metrics, baseline, dualConfig, weights, sensors);
  }
}

export class EventDetectionService {
  private machineState: MicrosleepMachineState = 'NORMAL';
  private alertTriggeredForEvent: boolean = false;

  public reset(): void {
    this.machineState = 'NORMAL';
    this.alertTriggeredForEvent = false;
    audioAlert.stopAlert();
  }

  public evaluate(params: {
    faceTracked: boolean;
    isEyeValid: boolean;
    isEyeClosed: boolean;
    activeClosureSec: number;
    pitch: number;
    headVelocity: number;
    audioConfig: AudioAlertConfig;
  }): {
    machineState: MicrosleepMachineState;
    activeAlertBanner: string | null;
    newEvent: MicrosleepEventLog | null;
  } {
    const {
      faceTracked,
      isEyeValid,
      isEyeClosed,
      activeClosureSec,
      pitch,
      headVelocity,
      audioConfig
    } = params;

    const closureThreshold = Math.max(1.0, Math.min(3.5, audioConfig.microsleepThresholdSec));
    let nextState: MicrosleepMachineState = 'NORMAL';
    let activeAlertBanner: string | null = null;
    let newEvent: MicrosleepEventLog | null = null;

    if (faceTracked && isEyeValid) {
      if (isEyeClosed) {
        if (activeClosureSec < 0.5) {
          nextState = 'POSSIBLE EYE CLOSURE';
        } else if (activeClosureSec < closureThreshold) {
          nextState = 'SUSTAINED EYE CLOSURE';
        } else {
          nextState = 'ALERT ACTIVE';
          const durRounded = Math.round(activeClosureSec * 10) / 10;
          activeAlertBanner = `POSSIBLE MICROSLEEP EVENT (${durRounded.toFixed(1)}s closed)`;

          if (!this.alertTriggeredForEvent) {
            this.alertTriggeredForEvent = true;
            const soundPlayed = audioAlert.triggerMicrosleepAlert(false);
            newEvent = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timeFormatted: new Date().toLocaleTimeString(),
              durationSec: durRounded,
              pitchDropDeg: Math.abs(Math.round(pitch)),
              recoveryVelocity: Math.round(headVelocity),
              confidencePct: 95,
              notes: 'Validated sustained bilateral eye closure',
              audioTriggered: soundPlayed,
              audioMuted: !audioConfig.audioEnabled
            };
          } else if (audioAlert.canRepeatAlert()) {
            audioAlert.triggerMicrosleepAlert(true);
          }
        }
      } else if (this.alertTriggeredForEvent || this.machineState === 'ALERT ACTIVE') {
        nextState = 'RECOVERY';
        audioAlert.stopAlert();
        this.alertTriggeredForEvent = false;
      }
    } else {
      if (this.alertTriggeredForEvent) {
        audioAlert.stopAlert();
        this.alertTriggeredForEvent = false;
      }
      nextState = 'NORMAL';
    }

    this.machineState = nextState;
    return {
      machineState: nextState,
      activeAlertBanner,
      newEvent
    };
  }
}

export class SessionService {
  public createSavedSessionRecord(params: {
    sessionType: 'monitoring' | 'assessment';
    startedAt: number;
    endedAt: number;
    validTrackingSec: number;
    invalidTrackingSec: number;
    history: SessionDataPoint[];
    microsleepEvents: MicrosleepEventLog[];
    kssRating: KssRating | null;
    totalBlinks: number;
    avgBlinkRate: number;
    avgBlinkDuration: number;
    longBlinks: number;
    avgPerclos: number;
    totalYawns: number;
    avgYawnsPerMin: number;
    avgYawnDuration: number;
  }): SavedSessionRecord {
    const durationSec = Math.max(1, (params.endedAt - params.startedAt) / 1000);
    const totalTracked = Math.max(0.1, params.validTrackingSec + params.invalidTrackingSec);
    const detectionQualityPct = Math.round((params.validTrackingSec / totalTracked) * 100);

    const scores = params.history.map((h) => h.fatigueScore);
    const deviations = params.history.map((h) => h.personalDeviationScore ?? 0);
    const absolutes = params.history.map((h) => h.absoluteScore ?? h.fatigueScore);

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const categoryDurationsSec: Record<string, number> = {
      'LOW FATIGUE INDICATORS': 0,
      'MILD FATIGUE INDICATORS': 0,
      'MODERATE FATIGUE INDICATORS': 0,
      'HIGH FATIGUE INDICATORS': 0,
      'VERY HIGH FATIGUE INDICATORS': 0
    };

    params.history.forEach((h) => {
      const label =
        h.tier in categoryDurationsSec ? h.tier : 'LOW FATIGUE INDICATORS';
      categoryDurationsSec[label] += 1;
    });

    const d = new Date(params.startedAt);
    const dateStr = d.toISOString().slice(0, 10);
    const startTimeStr = d.toTimeString().slice(0, 8);

    const limitationsNote =
      detectionQualityPct < 60
        ? 'Tracking quality was reduced during part of this session due to distance, angle, or lighting interruptions. Interpret indicators cautiously.'
        : 'Indicators are derived purely from observable eye/mouth patterns on local video and are not a medical diagnosis.';

    return {
      id: `sess_${params.startedAt}_${Math.random().toString(36).slice(2, 6)}`,
      sessionType: params.sessionType,
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      dateStr,
      startTimeStr,
      durationSec: Math.round(durationSec * 10) / 10,
      validTrackingSec: Math.round(params.validTrackingSec * 10) / 10,
      invalidTrackingSec: Math.round(params.invalidTrackingSec * 10) / 10,
      detectionQualityPct,
      avgFatigueScore: avg(scores),
      maxFatigueScore: scores.length > 0 ? Math.max(...scores) : 0,
      minFatigueScore: scores.length > 0 ? Math.min(...scores) : 0,
      avgPersonalDeviation: avg(deviations),
      avgAbsoluteScore: avg(absolutes),
      kssRating: params.kssRating,
      microsleepEvents: params.microsleepEvents,
      categoryDurationsSec,
      blinkSummary: {
        totalBlinks: params.totalBlinks,
        avgBlinkRate: Math.round(params.avgBlinkRate * 10) / 10,
        avgBlinkDuration: Math.round(params.avgBlinkDuration * 100) / 100,
        longBlinks: params.longBlinks,
        avgPerclos: Math.round(params.avgPerclos * 10) / 10
      },
      yawnSummary: {
        totalYawns: params.totalYawns,
        avgYawnsPerMin: Math.round(params.avgYawnsPerMin * 10) / 10,
        avgYawnDuration: Math.round(params.avgYawnDuration * 10) / 10
      },
      history: params.history,
      limitationsNote
    };
  }
}

export const faceDetectionService = new FaceDetectionService();
export const eyeAnalysisService = new EyeAnalysisService();
export const mouthAnalysisService = new MouthAnalysisService();
export const calibrationService = new CalibrationService();
export const fatigueScoringService = new FatigueScoringService();
export const eventDetectionService = new EventDetectionService();
export const sessionService = new SessionService();
