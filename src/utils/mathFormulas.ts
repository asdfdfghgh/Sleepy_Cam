import {
  BiometricMetrics,
  BaselineData,
  FatigueTier,
  PersonalDeviationTier,
  FatigueTrend,
  FatigueWeightConfig,
  DualScoringConfig,
  KssRating
} from '../types';

export const FEATURE_NAMES = [
  'EAR',
  'left_EAR',
  'right_EAR',
  'PERCLOS',
  'blink_rate',
  'average_blink_duration',
  'long_blink_count',
  'MAR',
  'yawn_rate',
  'average_yawn_duration',
  'head_pitch',
  'head_yaw',
  'head_roll',
  'head_velocity',
  'head_nod_frequency',
  'facial_activity',
  'posture_score',
  'posture_change'
];

export const DEFAULT_DUAL_CONFIG: DualScoringConfig = {
  absoluteWeight: 0.65, // 65% Absolute Observable Fatigue Indicators
  deviationWeight: 0.35 // 35% Personal Behavioral Deviations
};

export const DEFAULT_FATIGUE_WEIGHTS: FatigueWeightConfig = {
  perclos: 0.30,                     // 30%
  eyeOpennessProlonged: 0.25,        // 25% (Eye openness and prolonged closure)
  blinkDurationAbnormalities: 0.20,  // 20% (Blink duration and abnormalities)
  blinkFrequencyPatterns: 0.10,      // 10% (Blink frequency patterns)
  yawning: 0.10,                     // 10% (Yawning)
  postureDeterioration: 0.05,        // 5%  (Posture deterioration)
  headNodding: 0.00,                 // 0%  (Head nodding COMPLETELY REMOVED from fatigue scoring)

  // Backward compatibility aliases
  prolongedClosures: 0.25,
  blinkAbnormalities: 0.20,
  yawn: 0.10,
  postureChanges: 0.05,
  facialActivity: 0.00
};

// Section 8: Configurable Fatigue Categories
export const TIER_CONFIG: Record<
  string,
  { min: number; max: number; label: string; color: string; bg: string; text: string; badgeBorder: string; description: string }
> = {
  'LOW FATIGUE INDICATORS': {
    min: 0,
    max: 20,
    label: 'LOW FATIGUE INDICATORS',
    color: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    description: 'Alert and fully responsive visual indicators'
  },
  'MILD FATIGUE INDICATORS': {
    min: 21,
    max: 40,
    label: 'MILD FATIGUE INDICATORS',
    color: '#06b6d4',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/40',
    description: 'Minor relaxation or subtle eye aperture reduction'
  },
  'MODERATE FATIGUE INDICATORS': {
    min: 41,
    max: 60,
    label: 'MODERATE FATIGUE INDICATORS',
    color: '#eab308',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    badgeBorder: 'border-yellow-500/40',
    description: 'Noticeable signs: droopy eyelids, sluggish blinking, or yawns'
  },
  'HIGH FATIGUE INDICATORS': {
    min: 61,
    max: 80,
    label: 'HIGH FATIGUE INDICATORS',
    color: '#f97316',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    badgeBorder: 'border-orange-500/50',
    description: 'Clear fatigue: sustained eye closure, head nodding, or heavy droop'
  },
  'VERY HIGH FATIGUE INDICATORS': {
    min: 81,
    max: 100,
    label: 'VERY HIGH FATIGUE INDICATORS',
    color: '#ef4444',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    badgeBorder: 'border-red-500/50',
    description: 'Severe drowsiness: high PERCLOS, microsleep hazard, or forward slouch'
  },
  // Backward-compatible aliases
  AWAKE: {
    min: 0,
    max: 20,
    label: 'LOW FATIGUE INDICATORS',
    color: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    description: 'Alert and fully responsive'
  },
  NORMAL: {
    min: 21,
    max: 40,
    label: 'MILD FATIGUE INDICATORS',
    color: '#06b6d4',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/40',
    description: 'Comfortable wakefulness'
  },
  'GETTING TIRED': {
    min: 41,
    max: 60,
    label: 'MODERATE FATIGUE INDICATORS',
    color: '#eab308',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    badgeBorder: 'border-yellow-500/40',
    description: 'Noticeable fatigue indicators'
  },
  FATIGUED: {
    min: 61,
    max: 80,
    label: 'HIGH FATIGUE INDICATORS',
    color: '#f97316',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    badgeBorder: 'border-orange-500/50',
    description: 'High fatigue indicators'
  },
  'VERY FATIGUED': {
    min: 81,
    max: 95,
    label: 'VERY HIGH FATIGUE INDICATORS',
    color: '#ef4444',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    badgeBorder: 'border-red-500/50',
    description: 'Severe fatigue indicators'
  },
  'EXTREME FATIGUE': {
    min: 96,
    max: 100,
    label: 'VERY HIGH FATIGUE INDICATORS',
    color: '#dc2626',
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    badgeBorder: 'border-rose-500/70',
    description: 'Critical fatigue'
  }
};

export const DEVIATION_TIER_CONFIG: Record<
  PersonalDeviationTier,
  { min: number; max: number; label: string; color: string; bg: string; text: string; badgeBorder: string }
> = {
  'MINIMAL DEVIATION': {
    min: 0,
    max: 20,
    label: 'MINIMAL DEVIATION',
    color: '#10b981',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40'
  },
  'MILD DEVIATION': {
    min: 21,
    max: 40,
    label: 'MILD DEVIATION',
    color: '#06b6d4',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/40'
  },
  'MODERATE DEVIATION': {
    min: 41,
    max: 60,
    label: 'MODERATE DEVIATION',
    color: '#eab308',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    badgeBorder: 'border-yellow-500/40'
  },
  'HIGH DEVIATION': {
    min: 61,
    max: 80,
    label: 'HIGH DEVIATION',
    color: '#f97316',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    badgeBorder: 'border-orange-500/50'
  },
  'SEVERE DEVIATION': {
    min: 81,
    max: 100,
    label: 'SEVERE DEVIATION',
    color: '#ef4444',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    badgeBorder: 'border-red-500/50'
  }
};

// Section 6: Karolinska Sleepiness Scale (KSS 1-9) definitions
export const KSS_LEVELS: Record<
  number,
  { label: string; description: string; category: 'ALERT' | 'NORMAL' | 'TIRED' | 'SLEEPY' | 'VERY SLEEPY'; color: string }
> = {
  1: { label: 'Extremely alert', description: 'Peak cognitive alertness and crisp mental focus', category: 'ALERT', color: '#10b981' },
  2: { label: 'Very alert', description: 'Active wakefulness and high attentiveness', category: 'ALERT', color: '#10b981' },
  3: { label: 'Alert', description: 'Standard rested operating state', category: 'ALERT', color: '#06b6d4' },
  4: { label: 'Rather alert', description: 'Comfortable wakefulness with mild relaxation', category: 'NORMAL', color: '#06b6d4' },
  5: { label: 'Neither alert nor sleepy', description: 'Neutral intermediate alertness level', category: 'NORMAL', color: '#eab308' },
  6: { label: 'Some signs of sleepiness', description: 'Slight heaviness in eyes, occasional yawn', category: 'TIRED', color: '#eab308' },
  7: { label: 'Sleepy, but no difficulty staying awake', description: 'Noticeable drowsiness, conscious effort to concentrate', category: 'SLEEPY', color: '#f97316' },
  8: { label: 'Sleepy, some effort to stay awake', description: 'Fighting heavy eyelids, slow blinks, frequent yawns', category: 'SLEEPY', color: '#ef4444' },
  9: { label: 'Extremely sleepy, fighting sleep', description: 'Imminent microsleep hazard, severe difficulty keeping eyes open', category: 'VERY SLEEPY', color: '#dc2626' }
};

export function getTierFromScore(score: number): FatigueTier {
  if (score <= 20) return 'LOW FATIGUE INDICATORS';
  if (score <= 40) return 'MILD FATIGUE INDICATORS';
  if (score <= 60) return 'MODERATE FATIGUE INDICATORS';
  if (score <= 80) return 'HIGH FATIGUE INDICATORS';
  return 'VERY HIGH FATIGUE INDICATORS';
}

export function getDeviationTierFromScore(score: number): PersonalDeviationTier {
  if (score <= 20) return 'MINIMAL DEVIATION';
  if (score <= 40) return 'MILD DEVIATION';
  if (score <= 60) return 'MODERATE DEVIATION';
  if (score <= 80) return 'HIGH DEVIATION';
  return 'SEVERE DEVIATION';
}

/**
 * Calculates personalized normalized eye openness (0 - 100%)
 * based on calibrated geometric open-eye and closed-eye references:
 * Openness = (EAR_current - EAR_closed_baseline) / (EAR_open_baseline - EAR_closed_baseline)
 * Returns null if uncalibrated or separation is insufficient.
 */
export function calculateNormalizedEyeOpenness(
  currentEar: number,
  openEar: number,
  closedEar: number
): { opennessPct: number; rawOpenness: number } | null {
  const range = openEar - closedEar;
  if (range <= 0.03 || openEar <= closedEar || currentEar <= 0) {
    return null; // UNCALIBRATED / INVALID SEPARATION
  }
  const raw = (currentEar - closedEar) / range;
  const clamped = Math.max(0, Math.min(1.2, raw));
  const opennessPct = Math.round(Math.min(100, Math.max(0, clamped * 100)));
  return { opennessPct, rawOpenness: clamped };
}

export interface FeatureDebugRow {
  name: string;
  category: 'ABSOLUTE' | 'DEVIATION' | 'COMBINED';
  rawDisplay: string;
  normalizedScore: number; // 0 - 100
  effectiveWeight: number; // 0.0 - 1.0
  weightedContribution: number; // normalizedScore * effectiveWeight
  isValid: boolean;
}

export interface FatigueScoreResult {
  score: number; // Current Fatigue Score (65% Absolute + 35% Personal Deviation)
  tier: FatigueTier;
  absoluteScore: number; // 0 - 100
  personalDeviationScore: number; // 0 - 100
  deviationTier: PersonalDeviationTier;
  confidencePct: number;
  isConfidenceSufficient: boolean;
  components: {
    perclos: number;
    prolongedClosures: number;
    blinkAbnormalities: number;
    yawn: number;
    headNodding: number;
    postureChanges: number;
    facialActivity: number;
    eyeOpennessDroop: number;
  };
  effectiveWeights: Record<string, number>;
  weightedContributions: Record<string, number>;
  debugRows: FeatureDebugRow[];
  discrepancyNotes?: string;
}

export interface SensorValidityFlags {
  isFaceTracked: boolean;
  isEyeValid: boolean;
  isMouthValid: boolean;
  isPoseValid: boolean;
}

/**
 * REDESIGNED FATIGUE SCORING ENGINE (Section 3 & 4):
 * 
 * Separates:
 * A. Current Fatigue Level (65% Absolute Observable + 35% Personal Behavioral Deviation)
 * B. Personal Behavioral Deviation (0-100 drift from reference baseline)
 * C. Subjective Sleepiness (KSS 1-9)
 * 
 * Never forces score to 0 after calibration. If a user calibrates while exhausted,
 * absolute observable fatigue indicators (low openness, long closures, PERCLOS, head droop)
 * immediately produce an appropriately elevated score.
 */
export function computeDualFatigueScore(
  metrics: BiometricMetrics,
  baseline: BaselineData,
  dualConfig: DualScoringConfig = DEFAULT_DUAL_CONFIG,
  weights: FatigueWeightConfig = DEFAULT_FATIGUE_WEIGHTS,
  sensors: SensorValidityFlags = {
    isFaceTracked: true,
    isEyeValid: true,
    isMouthValid: true,
    isPoseValid: true
  }
): FatigueScoreResult {
  // If face is not tracked, pause scoring and display INSUFFICIENT DATA
  if (!sensors.isFaceTracked) {
    const emptyRows: FeatureDebugRow[] = [
      { name: 'EYE APERTURE DROOP', category: 'ABSOLUTE', rawDisplay: 'N/A', normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'PERCLOS (P75)', category: 'ABSOLUTE', rawDisplay: `${metrics.perclos.toFixed(1)}%`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'PROLONGED CLOSURES', category: 'ABSOLUTE', rawDisplay: `${metrics.activeClosureSec.toFixed(1)}s`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'YAWN DYNAMICS', category: 'ABSOLUTE', rawDisplay: `${metrics.yawnsPerMin.toFixed(1)} ypm`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'BLINK ABNORMALITIES', category: 'DEVIATION', rawDisplay: `${metrics.blinkRate} bpm`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'HEAD POSE & NODDING', category: 'DEVIATION', rawDisplay: `${metrics.nodFrequency} nods/m`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false },
      { name: 'POSTURE & ACTIVITY', category: 'DEVIATION', rawDisplay: `Score ${metrics.postureScore}%`, normalizedScore: 0, effectiveWeight: 0, weightedContribution: 0, isValid: false }
    ];

    return {
      score: 0,
      tier: 'LOW FATIGUE INDICATORS',
      absoluteScore: 0,
      personalDeviationScore: 0,
      deviationTier: 'MINIMAL DEVIATION',
      confidencePct: 0,
      isConfidenceSufficient: false,
      components: {
        perclos: 0,
        prolongedClosures: 0,
        blinkAbnormalities: 0,
        yawn: 0,
        headNodding: 0,
        postureChanges: 0,
        facialActivity: 0,
        eyeOpennessDroop: 0
      },
      effectiveWeights: {},
      weightedContributions: {},
      debugRows: emptyRows
    };
  }

  // Reference parameters from behavioral baseline
  const refBlinkRate = Math.max(1, baseline.behavioralBaseline?.referenceBlinkRate || baseline.blinkRate || 15);
  const refBlinkDur = Math.max(0.05, baseline.behavioralBaseline?.referenceBlinkDuration || baseline.blinkDuration || 0.18);
  const neutralPitch = baseline.geometricCalibration?.neutralPitch || baseline.headPitch || 0;
  const refAct = Math.max(1, baseline.behavioralBaseline?.referenceFacialActivity || baseline.facialActivity || 52);
  const refPosture = Math.max(10, baseline.behavioralBaseline?.referencePostureScore || baseline.postureScore || 90);

  // --------------------------------------------------------------------------
  // 1. ABSOLUTE OBSERVABLE FATIGUE INDICATORS (0 - 100)
  // --------------------------------------------------------------------------

  // A. Eye Openness Droop (Heavy Eyelids)
  // Evaluates how close current eye opening is to full geometric opening.
  // Tired users opening the app have droopy eyelids (< 75% openness) even if just calibrated!
  let normEyeDroop = 0;
  const curOpenness = metrics.eyeOpennessPct;
  if (curOpenness !== null) {
    if (curOpenness >= 85) {
      normEyeDroop = Math.max(0, (90 - curOpenness) * 2.0); // 0 to 10
    } else if (curOpenness >= 70) {
      normEyeDroop = 10 + ((85 - curOpenness) / 15) * 30; // 10 to 40 (mild droop)
    } else if (curOpenness >= 45) {
      normEyeDroop = 40 + ((70 - curOpenness) / 25) * 35; // 40 to 75 (heavy droop)
    } else {
      normEyeDroop = 75 + Math.min(25, ((45 - curOpenness) / 45) * 25); // 75 to 100 (severe droop)
    }
  } else {
    // Uncalibrated fallback using absolute normative EAR
    if (metrics.ear >= 0.28) normEyeDroop = 0;
    else if (metrics.ear >= 0.22) normEyeDroop = ((0.28 - metrics.ear) / 0.06) * 45;
    else if (metrics.ear >= 0.16) normEyeDroop = 45 + ((0.22 - metrics.ear) / 0.06) * 40;
    else normEyeDroop = 85 + Math.min(15, ((0.16 - metrics.ear) / 0.06) * 15);
  }
  normEyeDroop = Math.min(100, Math.max(0, normEyeDroop));

  // B. PERCLOS (Percentage of Eye Closure over 30s rolling buffer)
  let normPerclos = 0;
  if (metrics.perclos <= 3.0) {
    normPerclos = (metrics.perclos / 3.0) * 8.0;
  } else if (metrics.perclos <= 10.0) {
    normPerclos = 8.0 + ((metrics.perclos - 3.0) / 7.0) * 37.0; // 8 to 45
  } else if (metrics.perclos <= 22.0) {
    normPerclos = 45.0 + ((metrics.perclos - 10.0) / 12.0) * 35.0; // 45 to 80
  } else {
    normPerclos = 80.0 + Math.min(20.0, ((metrics.perclos - 22.0) / 10.0) * 20.0); // 80 to 100
  }
  normPerclos = Math.min(100, Math.max(0, normPerclos));

  // C. Combined Eye Openness Droop and Prolonged Closures (avoiding double-counting)
  let activeClosureScore = 0;
  if (metrics.activeClosureSec > 0.35) {
    if (metrics.activeClosureSec <= 1.0) {
      activeClosureScore = 25 + ((metrics.activeClosureSec - 0.35) / 0.65) * 45; // 25 to 70
    } else {
      activeClosureScore = 70 + Math.min(30, ((metrics.activeClosureSec - 1.0) / 0.8) * 30); // 70 to 100
    }
  }
  // When eyes are open, droop dominates; during an active closure, closure duration dominates cleanly
  const normEyeOpennessProlonged = Math.min(100, Math.max(normEyeDroop, activeClosureScore));

  // D. Blink Duration Abnormalities (long blinks, sluggish closure duration)
  const longBlinkScore = Math.min(100, metrics.longBlinks * 25);
  const durExcess = Math.max(0, (metrics.avgBlinkDuration - 0.18) / 0.18);
  const normBlinkDurAbnormal = Math.min(100, Math.max(longBlinkScore, durExcess * 85));

  // E. Blink Frequency Patterns (sluggish or flutter)
  let normBlinkFreq = 0;
  if (metrics.blinkRate > 0) {
    if (metrics.blinkRate < 8) {
      normBlinkFreq = Math.min(100, ((8 - metrics.blinkRate) / 8) * 80); // sluggish infrequent blinking
    } else if (metrics.blinkRate > 28) {
      normBlinkFreq = Math.min(100, ((metrics.blinkRate - 28) / 15) * 70); // fighting fatigue eye flutter
    }
  }

  // F. Yawn Frequency and Sustained Yawning
  let activeYawnScore = 0;
  if (metrics.isYawning) {
    activeYawnScore = 65 + Math.min(30, metrics.avgYawnDuration * 10);
  }
  const rollingYawnScore = Math.min(100, metrics.yawnsPerMin * 50 + metrics.totalYawns * 15);
  const normYawn = Math.min(100, Math.max(activeYawnScore, rollingYawnScore));

  // G. Slouching Posture (Low-weight supporting feature: 5%)
  const normPosture = Math.min(100, Math.max(0, (100 - metrics.postureScore) * 1.2));

  // Feature Weights strictly adhering to Eye-Dominant specification
  const wPerclos = weights.perclos ?? 0.30;
  const wEyeOpen = weights.eyeOpennessProlonged ?? weights.prolongedClosures ?? 0.25;
  const wBlinkDur = weights.blinkDurationAbnormalities ?? weights.blinkAbnormalities ?? 0.20;
  const wBlinkFreq = weights.blinkFrequencyPatterns ?? 0.10;
  const wYawn = weights.yawning ?? weights.yawn ?? 0.10;
  const wPosture = weights.postureDeterioration ?? weights.postureChanges ?? 0.05;
  const wHead = 0.00; // Head nodding strictly 0% per user instructions

  // Weighted Absolute Score (Normalized 0 - 100)
  const absFeatures = [
    { key: 'perclos', name: 'PERCLOS (P75)', score: normPerclos, weight: wPerclos, valid: sensors.isEyeValid, raw: `${metrics.perclos.toFixed(1)}%` },
    { key: 'eyeOpennessProlonged', name: 'EYE OPENNESS & PROLONGED CLOSURE', score: normEyeOpennessProlonged, weight: wEyeOpen, valid: sensors.isEyeValid, raw: `Droop: ${curOpenness !== null ? `${curOpenness}%` : 'Uncalibrated'} / Dur: ${metrics.activeClosureSec.toFixed(1)}s` },
    { key: 'blinkDurationAbnormalities', name: 'BLINK DURATION & ABNORMALITIES', score: normBlinkDurAbnormal, weight: wBlinkDur, valid: sensors.isEyeValid, raw: `${metrics.avgBlinkDuration.toFixed(2)}s avg (${metrics.longBlinks} long)` },
    { key: 'blinkFrequencyPatterns', name: 'BLINK FREQUENCY PATTERNS', score: normBlinkFreq, weight: wBlinkFreq, valid: sensors.isEyeValid, raw: `${metrics.blinkRate} bpm` },
    { key: 'yawning', name: 'YAWNING DYNAMICS', score: normYawn, weight: wYawn, valid: sensors.isMouthValid, raw: `${metrics.yawnsPerMin.toFixed(1)} ypm${metrics.isYawning ? ' [ACTIVE]' : ''}` },
    { key: 'postureDeterioration', name: 'POSTURE DETERIORATION', score: normPosture, weight: wPosture, valid: sensors.isPoseValid, raw: `Score ${metrics.postureScore}%` },
    { key: 'headNodding', name: 'HEAD NODDING (EXCLUDED)', score: 0, weight: wHead, valid: sensors.isPoseValid, raw: `P: ${metrics.pitch}° (0% weight)` }
  ];

  let totalAbsWeight = 0;
  let rawAbsSum = 0;
  for (const f of absFeatures) {
    if (f.valid && f.weight > 0) {
      totalAbsWeight += f.weight;
      rawAbsSum += f.score * f.weight;
    }
  }
  const absoluteScore = totalAbsWeight > 0 ? Math.round((rawAbsSum / totalAbsWeight) * 10) / 10 : 0;

  // --------------------------------------------------------------------------
  // 2. PERSONAL BEHAVIORAL DEVIATION SCORE (0 - 100)
  // --------------------------------------------------------------------------
  const rateRatio = metrics.blinkRate > 0 ? metrics.blinkRate / refBlinkRate : 1.0;
  let devRate = 0;
  if (rateRatio < 0.6) {
    devRate = Math.min(100, ((0.6 - rateRatio) / 0.6) * 85);
  } else if (rateRatio > 1.5) {
    devRate = Math.min(100, ((rateRatio - 1.5) / 1.5) * 75);
  }

  const durRatio = Math.max(0, (metrics.avgBlinkDuration - refBlinkDur) / refBlinkDur);
  const devDur = Math.min(100, durRatio * 100);

  const actRatio = metrics.facialActivity / refAct;
  const devAct = actRatio < 0.70 ? Math.min(100, ((0.70 - actRatio) / 0.70) * 100) : 0;
  const devPosture = Math.max(0, (refPosture - metrics.postureScore) * 1.5);

  const devFeatures = [
    { key: 'devBlinkDur', name: 'BLINK DURATION DEVIATION', score: devDur, weight: 0.35, valid: sensors.isEyeValid, raw: `${metrics.avgBlinkDuration.toFixed(2)}s (ref: ${refBlinkDur.toFixed(2)}s)` },
    { key: 'devBlinkRate', name: 'BLINK RATE DEVIATION', score: devRate, weight: 0.30, valid: sensors.isEyeValid, raw: `${metrics.blinkRate} bpm (ref: ${refBlinkRate})` },
    { key: 'devAct', name: 'FACIAL HYPOMIMIA (INACTIVITY)', score: devAct, weight: 0.20, valid: sensors.isPoseValid, raw: `${metrics.facialActivity}% (ref: ${refAct}%)` },
    { key: 'devPosture', name: 'POSTURE DETERIORATION', score: Math.min(100, devPosture), weight: 0.15, valid: sensors.isPoseValid, raw: `${metrics.postureScore}% (ref: ${refPosture}%)` }
  ];

  let totalDevWeight = 0;
  let rawDevSum = 0;
  for (const f of devFeatures) {
    if (f.valid) {
      totalDevWeight += f.weight;
      rawDevSum += f.score * f.weight;
    }
  }
  const personalDeviationScore = totalDevWeight > 0 ? Math.round((rawDevSum / totalDevWeight) * 10) / 10 : 0;
  const deviationTier = getDeviationTierFromScore(personalDeviationScore);

  // --------------------------------------------------------------------------
  // 3. COMBINED CURRENT FATIGUE SCORE (65% Absolute + 35% Personal Deviation)
  // --------------------------------------------------------------------------
  const absWeight = dualConfig.absoluteWeight;
  const devWeight = dualConfig.deviationWeight;
  const combinedRaw = (absWeight * absoluteScore) + (devWeight * personalDeviationScore);
  const currentFatigueScore = Math.round(Math.min(100, Math.max(0, combinedRaw)) * 10) / 10;
  const fatigueTier = getTierFromScore(currentFatigueScore);

  const confidencePct = Math.round(((totalAbsWeight + totalDevWeight) / 2) * 100);
  const isConfidenceSufficient = confidencePct >= 40;

  // Debug rows for auditability and live transparency table
  const debugRows: FeatureDebugRow[] = [
    // Absolute Observable Indicators
    ...absFeatures.map((f) => ({
      name: f.name,
      category: 'ABSOLUTE' as const,
      rawDisplay: f.raw,
      normalizedScore: Math.round(f.score * 10) / 10,
      effectiveWeight: Math.round((f.weight * absWeight) * 1000) / 1000,
      weightedContribution: Math.round((f.score * (f.weight * absWeight)) * 10) / 10,
      isValid: f.valid
    })),
    // Personal Behavioral Deviations
    ...devFeatures.map((f) => ({
      name: f.name,
      category: 'DEVIATION' as const,
      rawDisplay: f.raw,
      normalizedScore: Math.round(f.score * 10) / 10,
      effectiveWeight: Math.round((f.weight * devWeight) * 1000) / 1000,
      weightedContribution: Math.round((f.score * (f.weight * devWeight)) * 10) / 10,
      isValid: f.valid
    }))
  ];

  const effectiveWeights: Record<string, number> = {
    absoluteWeight: absWeight,
    deviationWeight: devWeight
  };

  const weightedContributions: Record<string, number> = {
    absoluteContribution: Math.round(absoluteScore * absWeight * 10) / 10,
    deviationContribution: Math.round(personalDeviationScore * devWeight * 10) / 10
  };

  return {
    score: isConfidenceSufficient ? currentFatigueScore : 0,
    tier: fatigueTier,
    absoluteScore,
    personalDeviationScore,
    deviationTier,
    confidencePct,
    isConfidenceSufficient,
    components: {
      perclos: Math.round(normPerclos),
      prolongedClosures: Math.round(normEyeOpennessProlonged),
      blinkAbnormalities: Math.round(normBlinkDurAbnormal),
      yawn: Math.round(normYawn),
      headNodding: 0,
      postureChanges: Math.round(normPosture),
      facialActivity: Math.round(devAct),
      eyeOpennessDroop: Math.round(normEyeDroop)
    },
    effectiveWeights,
    weightedContributions,
    debugRows
  };
}

/**
 * Backward-compatible wrapper for existing imports
 */
export function computeMultimodalFatigueScore(
  metrics: BiometricMetrics,
  baseline: BaselineData,
  weights: FatigueWeightConfig = DEFAULT_FATIGUE_WEIGHTS,
  sensors: SensorValidityFlags = {
    isFaceTracked: true,
    isEyeValid: true,
    isMouthValid: true,
    isPoseValid: true
  }
): FatigueScoreResult {
  return computeDualFatigueScore(
    metrics,
    baseline,
    DEFAULT_DUAL_CONFIG,
    weights,
    sensors
  );
}

/**
 * Calculates trend direction from rolling window of fatigue scores
 */
export function calculateFatigueTrend(recentScores: number[]): FatigueTrend {
  if (recentScores.length < 5) return 'STABLE';
  const n = recentScores.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = recentScores[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 'STABLE';
  const slope = (n * sumXY - sumX * sumY) / denominator;

  if (slope > 0.3) return 'INCREASING';
  if (slope < -0.3) return 'DECREASING';
  return 'STABLE';
}

// Backward-compatible alias for existing imports
export function computeHeuristicFatigueScore(
  metrics: BiometricMetrics,
  baseline: BaselineData
): { score: number; tier: FatigueTier; components: Record<string, number> } {
  const res = computeDualFatigueScore(metrics, baseline);
  return {
    score: res.score,
    tier: res.tier,
    components: res.components
  };
}

