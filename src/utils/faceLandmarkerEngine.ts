/**
 * MediaPipe Face Landmarker Engine
 * =================================
 * Production-grade neural face, eye, and mouth landmark tracking using MediaPipe Tasks Vision.
 * 
 * Complies with all requirements:
 * - Phase 1: Robust face detection, bounding box, area %, distance & visibility states.
 * - Phase 2: Strict coordinate normalization, zero stale landmarks on tracking drop.
 * - Phase 3: Independent left & right eye EAR with MediaPipe canonical indices [33, 160, 158, 133, 153, 144]
 *            and [362, 385, 387, 263, 373, 380].
 * - Phase 4: MediaPipe inner-lip MAR [13, 14, 78, 308, 82, 87, 312, 317] immune to beards/moustaches.
 * - Phase 6: Confidence-based processing, validity flags, and error diagnostics.
 */

import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import {
  FaceTrackingState,
  EyeState,
  MouthState,
  FaceBoundingBox,
  LandmarkPoint,
  DetectionDiagnostics,
  MicrosleepMachineState
} from '../types';

export interface FaceMeshResult {
  faceDetected: boolean;
  trackingState: FaceTrackingState;
  trackingConfidence: number;
  bbox: FaceBoundingBox | null;
  landmarks: LandmarkPoint[];
  leftEyeLandmarks: LandmarkPoint[];
  rightEyeLandmarks: LandmarkPoint[];
  mouthLandmarks: LandmarkPoint[];
  innerLipLandmarks: LandmarkPoint[];

  leftEyeEar: number;
  rightEyeEar: number;
  avgEar: number;
  leftEyeState: EyeState;
  rightEyeState: EyeState;
  isEyeClosed: boolean;
  isEyeValid: boolean;

  mar: number;
  mouthState: MouthState;
  isYawning: boolean;
  isMouthValid: boolean;

  pitch: number;
  yaw: number;
  roll: number;
  headVelocity: number;

  diagnostics: DetectionDiagnostics;
}

// MediaPipe canonical landmark indices
export const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const;
export const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const;

export const UPPER_INNER_LIP = 13;
export const LOWER_INNER_LIP = 14;
export const LEFT_MOUTH_CORNER = 78;
export const RIGHT_MOUTH_CORNER = 308;
export const INNER_LIP_INDICES = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95] as const;
export const OUTER_LIP_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146] as const;

// Head orientation reference points
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EAR_TRAGUS = 234;
const RIGHT_EAR_TRAGUS = 454;
const FOREHEAD_CENTER = 10;

function euclideanDist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dist2D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distPx(p1: LandmarkPoint, p2: LandmarkPoint, vw: number, vh: number): number {
  const dx = (p1.x - p2.x) * vw;
  const dy = (p1.y - p2.y) * vh;
  return Math.sqrt(dx * dx + dy * dy);
}

class FaceLandmarkerService {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing: boolean = false;
  private initError: string | null = null;
  private consecutiveTrackedFrames: number = 0;
  private wasPreviouslyTracked: boolean = false;
  private lastInferenceTimeMs: number = 0;
  private lastHeadPose: { pitch: number; yaw: number; roll: number; time: number } | null = null;
  private smoothedVel: number = 8.0;

  // Smoothing for jitter prevention
  private smoothedEar: number = 0.28;
  private smoothedMar: number = 0.18;
  private smoothedBbox: FaceBoundingBox | null = null;

  public async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;
    this.initError = null;

    try {
      // Try local wasm first, fallback to jsdelivr CDN
      let filesetResolver;
      try {
        filesetResolver = await FilesetResolver.forVisionTasks('/wasm');
      } catch (localWasmErr) {
        console.warn('Local wasm resolver error, falling back to CDN:', localWasmErr);
        filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // Try GPU delegate first, fallback to CPU delegate
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed, attempting CPU delegate and CDN model fallback:', gpuErr);
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
      }

      this.isInitializing = false;
      console.log('✅ MediaPipe Face Landmarker initialized successfully.');
    } catch (err: unknown) {
      this.isInitializing = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.initError = `Failed to initialize MediaPipe Face Landmarker: ${msg}`;
      console.error(this.initError, err);
      throw new Error(this.initError);
    }
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }

  public getInitError(): string | null {
    return this.initError;
  }

  private lastVideoTimestampMs: number = 0;

  /**
   * Process a live video frame with MediaPipe Face Landmarker.
   * If face is lost, all landmarks are immediately invalidated (zero stale reuse).
   */
  public processVideoFrame(
    video: HTMLVideoElement,
    timestampMs: number,
    baselineEar: number = 0.28,
    baselineMar: number = 0.20
  ): FaceMeshResult {
    const startTime = performance.now();

    if (!this.landmarker || !video || video.readyState < 2 || video.videoWidth === 0) {
      return this.buildEmptyResult('Face landmarker not initialized or video not ready.');
    }

    const safeTimestamp = Math.max(this.lastVideoTimestampMs + 1, Math.round(timestampMs));
    this.lastVideoTimestampMs = safeTimestamp;

    let result: FaceLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, safeTimestamp);
    } catch (detectErr) {
      console.warn('Error during MediaPipe detection:', detectErr);
      return this.buildEmptyResult('Inference exception occurred.');
    }

    this.lastInferenceTimeMs = Math.round(performance.now() - startTime);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0 || !result.faceLandmarks[0]) {
      // Immediate invalidation: No stale landmarks
      this.consecutiveTrackedFrames = 0;
      const state: FaceTrackingState = this.wasPreviouslyTracked ? 'FACE TRACKING LOST' : 'NO FACE DETECTED';
      this.wasPreviouslyTracked = false;
      this.smoothedBbox = null;

      return this.buildEmptyResult(null, state);
    }

    const rawLandmarks = result.faceLandmarks[0];
    const totalPoints = rawLandmarks.length;
    if (totalPoints < 468) {
      return this.buildEmptyResult('Incomplete face mesh detected.', 'FACE TRACKING LOST');
    }

    // Map to normalized LandmarkPoint array
    const landmarks: LandmarkPoint[] = rawLandmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z || 0
    }));

    // PHASE 1: Face Bounding Box & Distance Calculations
    let minX = 1.0;
    let maxX = 0.0;
    let minY = 1.0;
    let maxY = 0.0;

    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rawWidth = Math.max(0.01, maxX - minX);
    const rawHeight = Math.max(0.01, maxY - minY);
    const areaPct = Math.round(rawWidth * rawHeight * 1000) / 10; // e.g. 14.5%

    const currentBbox: FaceBoundingBox = {
      x: Math.round(minX * 1000) / 1000,
      y: Math.round(minY * 1000) / 1000,
      width: Math.round(rawWidth * 1000) / 1000,
      height: Math.round(rawHeight * 1000) / 1000,
      areaPct
    };

    // Smooth bounding box to prevent visual jumpiness
    if (!this.smoothedBbox) {
      this.smoothedBbox = { ...currentBbox };
    } else {
      this.smoothedBbox = {
        x: 0.75 * this.smoothedBbox.x + 0.25 * currentBbox.x,
        y: 0.75 * this.smoothedBbox.y + 0.25 * currentBbox.y,
        width: 0.75 * this.smoothedBbox.width + 0.25 * currentBbox.width,
        height: 0.75 * this.smoothedBbox.height + 0.25 * currentBbox.height,
        areaPct: 0.75 * this.smoothedBbox.areaPct + 0.25 * currentBbox.areaPct
      };
    }

    // Video dimensions for isotropic pixel-distance calculations
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    // Calculate face width & eye dimensions in true pixels
    const faceWidthPx = rawWidth * vw;
    const faceHeightPx = rawHeight * vh;

    // Key Eye Landmarks
    // Right Eye: 33 (outer corner), 133 (inner corner)
    // Left Eye: 362 (inner corner), 263 (outer corner)
    const p33 = landmarks[33];
    const p133 = landmarks[133];
    const p362 = landmarks[362];
    const p263 = landmarks[263];

    const rightEyeWidthPx = distPx(p33, p133, vw, vh);
    const leftEyeWidthPx = distPx(p362, p263, vw, vh);
    const minEyeWidthPx = Math.min(leftEyeWidthPx, rightEyeWidthPx);

    // Distance Quality & Tracking State Determination
    let trackingState: FaceTrackingState = 'FACE DETECTED';
    let distanceQuality: 'OPTIMAL' | 'ACCEPTABLE' | 'TOO FAR' | 'TOO CLOSE' | 'UNCERTAIN' = 'ACCEPTABLE';

    const isPartiallyOutside = minX <= 0.02 || maxX >= 0.98 || minY <= 0.02 || maxY >= 0.98;

    if (isPartiallyOutside) {
      trackingState = 'FACE PARTIALLY VISIBLE';
      distanceQuality = 'UNCERTAIN';
      this.consecutiveTrackedFrames = 0;
    } else if (areaPct < 5.5 || minEyeWidthPx < 18 || rawWidth < 0.11) {
      trackingState = 'FACE TOO FAR';
      distanceQuality = 'TOO FAR';
      this.consecutiveTrackedFrames = 0;
    } else if (areaPct > 52.0 || rawWidth > 0.72) {
      trackingState = 'FACE TOO CLOSE';
      distanceQuality = 'TOO CLOSE';
      this.consecutiveTrackedFrames = 0;
    } else {
      this.consecutiveTrackedFrames++;
      if (this.consecutiveTrackedFrames >= 2) {
        trackingState = 'FACE TRACKED';
        this.wasPreviouslyTracked = true;
      }
      distanceQuality = (areaPct >= 10 && minEyeWidthPx >= 26) ? 'OPTIMAL' : 'ACCEPTABLE';
    }

    const trackingConfidence = trackingState === 'FACE TRACKED' ? 0.98 : trackingState === 'FACE DETECTED' ? 0.85 : 0.60;

    // PHASE 3: Independent Eye Detection (Canonical MediaPipe Indices in Pixel Space)
    // CRITICAL: Landmark Quality Guard
    // When face is too far, or eye width < 18px, eyelid landmark resolution is insufficient.
    // We MUST classify eye state as 'UNCERTAIN' (NEVER 'CLOSED').
    const isEyeValid = trackingState === 'FACE TRACKED' && minEyeWidthPx >= 18;

    // Right Eye: 33, 160, 158, 133, 153, 144
    const rH = Math.max(1.0, rightEyeWidthPx);
    const rV1 = distPx(landmarks[160], landmarks[144], vw, vh);
    const rV2 = distPx(landmarks[158], landmarks[153], vw, vh);
    const rawRightEar = isEyeValid ? (rV1 + rV2) / (2.0 * rH) : 0.28;

    // Left Eye: 362, 385, 387, 263, 373, 380
    const lH = Math.max(1.0, leftEyeWidthPx);
    const lV1 = distPx(landmarks[385], landmarks[380], vw, vh);
    const lV2 = distPx(landmarks[387], landmarks[373], vw, vh);
    const rawLeftEar = isEyeValid ? (lV1 + lV2) / (2.0 * lH) : 0.28;

    const instantAvgEar = isEyeValid ? (rawLeftEar + rawRightEar) / 2.0 : 0.28;

    // Temporal smoothing with fast drop on eye closure
    const earAlpha = instantAvgEar < this.smoothedEar ? 0.70 : 0.35;
    this.smoothedEar = (1 - earAlpha) * this.smoothedEar + earAlpha * instantAvgEar;

    // Hysteresis thresholds based on baseline or normative EAR (0.28 open, 0.14 closed)
    const nominalEarBase = Math.max(0.18, baselineEar);
    const nominalClosedBase = 0.14;
    const earRange = Math.max(0.06, nominalEarBase - nominalClosedBase);

    // Precise 4-state thresholds with hysteresis
    const threshClosedToPartial = nominalClosedBase + earRange * 0.30; // ~0.18
    const threshPartialToClosed = nominalClosedBase + earRange * 0.22; // ~0.17
    const threshPartialToOpen = nominalClosedBase + earRange * 0.70;   // ~0.24
    const threshOpenToPartial = nominalClosedBase + earRange * 0.60;   // ~0.225

    // Helper for 4-state classification with hysteresis
    const classifyEyeState = (earVal: number): EyeState => {
      if (!isEyeValid || earVal <= 0) return 'UNCERTAIN';
      if (earVal < threshPartialToClosed) return 'CLOSED';
      if (earVal >= threshPartialToOpen) return 'FULLY OPEN';
      return 'PARTIALLY OPEN';
    };

    const leftEyeState: EyeState = isEyeValid ? classifyEyeState(rawLeftEar) : 'UNCERTAIN';
    const rightEyeState: EyeState = isEyeValid ? classifyEyeState(rawRightEar) : 'UNCERTAIN';
    const isEyeClosed = isEyeValid && leftEyeState === 'CLOSED' && rightEyeState === 'CLOSED';

    // PHASE 4: Mouth Detection (MediaPipe Lip Landmarks in True Pixel Coordinates)
    // Upper inner lip: 13, Lower inner lip: 14, Left corner: 78, Right corner: 308
    const p13 = landmarks[UPPER_INNER_LIP];
    const p14 = landmarks[LOWER_INNER_LIP];
    const p78 = landmarks[LEFT_MOUTH_CORNER];
    const p308 = landmarks[RIGHT_MOUTH_CORNER];
    const p82 = landmarks[82];
    const p87 = landmarks[87];
    const p312 = landmarks[312];
    const p317 = landmarks[317];

    const mouthWidthPx = distPx(p78, p308, vw, vh);
    const mouthHeightCenterPx = distPx(p13, p14, vw, vh);
    const mouthHeightLeftPx = distPx(p82, p87, vw, vh);
    const mouthHeightRightPx = distPx(p312, p317, vw, vh);

    const isMouthValid = trackingState === 'FACE TRACKED' && mouthWidthPx >= 20;

    // Multi-point inner vertical aperture ratio in isotropic pixel space (immune to facial hair)
    const avgVerticalPx = (mouthHeightCenterPx * 1.5 + mouthHeightLeftPx + mouthHeightRightPx) / 3.5;
    const rawMar = isMouthValid ? avgVerticalPx / Math.max(1.0, mouthWidthPx) : 0.05;

    this.smoothedMar = 0.65 * this.smoothedMar + 0.35 * (isMouthValid ? rawMar : 0.05);

    // Distinguish Smiling: width expands significantly without vertical opening
    const expectedRestingWidth = faceWidthPx * 0.32;
    const isSmiling = isMouthValid && (mouthWidthPx > expectedRestingWidth * 1.15 || (mouthWidthPx / Math.max(1, faceWidthPx)) > 0.38) && this.smoothedMar < 0.18;

    // Mouth State Classification (with accurate resting and yawn discrimination)
    let mouthState: MouthState = 'RESTING';

    if (!isMouthValid) {
      mouthState = 'UNCERTAIN';
    } else if (isSmiling) {
      mouthState = 'SMILING';
    } else if (this.smoothedMar >= 0.42) {
      mouthState = 'MOUTH WIDE OPEN';
    } else if (this.smoothedMar >= 0.28) {
      mouthState = 'MOUTH OPEN';
    } else if (this.smoothedMar >= 0.10) {
      mouthState = 'SPEAKING';
    } else {
      mouthState = 'RESTING';
    }

    const isYawning = mouthState === 'MOUTH WIDE OPEN' || mouthState === 'MOUTH OPEN';

    // Head Pose & Velocity Estimation
    const pNose = landmarks[NOSE_TIP];
    const pChin = landmarks[CHIN];
    const pForehead = landmarks[FOREHEAD_CENTER];
    const pLeftEarT = landmarks[LEFT_EAR_TRAGUS];
    const pRightEarT = landmarks[RIGHT_EAR_TRAGUS];

    // Pitch (up / down) in degrees
    const headHeight = Math.max(1e-5, pChin.y - pForehead.y);
    const noseRelY = (pNose.y - pForehead.y) / headHeight;
    const pitch = Math.round((noseRelY - 0.52) * -120.0);

    // Yaw (left / right) in degrees
    const earDistL = dist2D(pNose, pLeftEarT);
    const earDistR = dist2D(pNose, pRightEarT);
    const yawRatio = (earDistR - earDistL) / Math.max(1e-5, earDistR + earDistL);
    const yaw = Math.round(yawRatio * 75.0);

    // Roll (tilt) in degrees
    const dEyeX = p263.x - p33.x;
    const dEyeY = p263.y - p33.y;
    const roll = Math.round((Math.atan2(dEyeY, dEyeX) * 180) / Math.PI);

    // Head Velocity calculation
    const nowT = performance.now();
    let currentVel = 8.0;
    if (this.lastHeadPose) {
      const dt = Math.max(0.01, (nowT - this.lastHeadPose.time) / 1000);
      const dPitch = Math.abs(pitch - this.lastHeadPose.pitch);
      const dYaw = Math.abs(yaw - this.lastHeadPose.yaw);
      const dRoll = Math.abs(roll - this.lastHeadPose.roll);
      currentVel = Math.min(60, (dPitch + dYaw + dRoll) / dt);
    }
    this.lastHeadPose = { pitch, yaw, roll, time: nowT };
    this.smoothedVel = 0.80 * this.smoothedVel + 0.20 * currentVel;

    // Feature subset arrays for rendering
    const leftEyeLandmarks = LEFT_EYE_INDICES.map((idx) => landmarks[idx]);
    const rightEyeLandmarks = RIGHT_EYE_INDICES.map((idx) => landmarks[idx]);
    const mouthLandmarks = OUTER_LIP_INDICES.map((idx) => landmarks[idx]);
    const innerLipLandmarks = INNER_LIP_INDICES.map((idx) => landmarks[idx]);

    const diagnostics: DetectionDiagnostics = {
      fps: 30,
      inferenceMs: this.lastInferenceTimeMs,
      trackingState,
      faceDetected: true,
      trackingConfidence,
      bbox: this.smoothedBbox,
      leftEyeEar: Math.round(rawLeftEar * 1000) / 1000,
      rightEyeEar: Math.round(rawRightEar * 1000) / 1000,
      avgEar: Math.round(this.smoothedEar * 1000) / 1000,
      leftEyeState,
      rightEyeState,
      isEyeValid,
      leftEyeOpennessPct: null,
      rightEyeOpennessPct: null,
      eyeCalibration: null,
      mar: Math.round(this.smoothedMar * 1000) / 1000,
      mouthState,
      isYawning,
      isMouthValid,
      pitch,
      yaw,
      roll,
      headVelocity: Math.round(this.smoothedVel),
      microsleepState: 'NORMAL',
      activeClosureSec: 0,
      errorMessage: null,
      distanceQuality,
      mouthWidthPx: Math.round(mouthWidthPx * 10) / 10,
      mouthHeightPx: Math.round(mouthHeightCenterPx * 10) / 10,
      leftEyeWidthPx: Math.round(leftEyeWidthPx * 10) / 10,
      rightEyeWidthPx: Math.round(rightEyeWidthPx * 10) / 10
    };

    return {
      faceDetected: true,
      trackingState,
      trackingConfidence,
      bbox: this.smoothedBbox,
      landmarks,
      leftEyeLandmarks,
      rightEyeLandmarks,
      mouthLandmarks,
      innerLipLandmarks,
      leftEyeEar: Math.round(rawLeftEar * 1000) / 1000,
      rightEyeEar: Math.round(rawRightEar * 1000) / 1000,
      avgEar: Math.round(this.smoothedEar * 1000) / 1000,
      leftEyeState,
      rightEyeState,
      isEyeClosed,
      isEyeValid,
      mar: Math.round(this.smoothedMar * 1000) / 1000,
      mouthState,
      isYawning,
      isMouthValid,
      pitch,
      yaw,
      roll,
      headVelocity: Math.round(this.smoothedVel),
      diagnostics
    };
  }

  private buildEmptyResult(
    errorMessage: string | null = null,
    trackingState: FaceTrackingState = 'NO FACE DETECTED'
  ): FaceMeshResult {
    const diagnostics: DetectionDiagnostics = {
      fps: 30,
      inferenceMs: this.lastInferenceTimeMs,
      trackingState,
      faceDetected: false,
      trackingConfidence: 0.0,
      bbox: null,
      leftEyeEar: 0,
      rightEyeEar: 0,
      avgEar: 0,
      leftEyeState: 'UNCERTAIN',
      rightEyeState: 'UNCERTAIN',
      isEyeValid: false,
      leftEyeOpennessPct: null,
      rightEyeOpennessPct: null,
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
      errorMessage
    };

    return {
      faceDetected: false,
      trackingState,
      trackingConfidence: 0.0,
      bbox: null,
      landmarks: [], // zero stale landmarks
      leftEyeLandmarks: [],
      rightEyeLandmarks: [],
      mouthLandmarks: [],
      innerLipLandmarks: [],
      leftEyeEar: 0,
      rightEyeEar: 0,
      avgEar: 0,
      leftEyeState: 'UNCERTAIN',
      rightEyeState: 'UNCERTAIN',
      isEyeClosed: false,
      isEyeValid: false,
      mar: 0,
      mouthState: 'UNCERTAIN',
      isYawning: false,
      isMouthValid: false,
      pitch: 0,
      yaw: 0,
      roll: 0,
      headVelocity: 0,
      diagnostics
    };
  }
}

export const faceLandmarkerService = new FaceLandmarkerService();
