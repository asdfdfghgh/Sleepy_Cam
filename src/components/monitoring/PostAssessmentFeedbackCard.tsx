import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileJson,
  MessageSquareHeart,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react';
import {
  AssessmentFeedbackMetrics,
  AssessmentFeedbackRecord,
  SavedSessionRecord,
  SelfReportedFatigueLevel
} from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { reportService } from '../../services/ReportService';
import { Card, Button } from '../ui/Primitives';

const SELF_REPORT_OPTIONS: Array<{
  level: SelfReportedFatigueLevel;
  subtitle: string;
}> = [
  { level: 'Not fatigued', subtitle: 'Alert, focused, eyes feel rested' },
  { level: 'Mildly fatigued', subtitle: 'Slight tiredness, steady attention' },
  { level: 'Moderately fatigued', subtitle: 'Noticeable heaviness or slow focus' },
  { level: 'Severely fatigued', subtitle: 'Struggling to keep eyes open' }
];

function getTierLabelFromScore(score: number): string {
  if (score <= 20) return 'LOW FATIGUE INDICATORS';
  if (score <= 40) return 'MILD FATIGUE INDICATORS';
  if (score <= 60) return 'MODERATE FATIGUE INDICATORS';
  if (score <= 80) return 'HIGH FATIGUE INDICATORS';
  return 'VERY HIGH FATIGUE INDICATORS';
}

export function buildFeedbackMetrics(session: SavedSessionRecord): AssessmentFeedbackMetrics {
  const hasTrackedData = session.validTrackingSec > 0 && session.history.length > 0;

  const validEarSamples = hasTrackedData
    ? session.history
        .filter(
          (pt) =>
            Number.isFinite(pt.ear) &&
            pt.ear > 0 &&
            (pt.confidencePct === undefined || pt.confidencePct > 0)
        )
        .map((pt) => pt.ear)
    : [];

  const avgEar =
    validEarSamples.length > 0
      ? Math.round(
          (validEarSamples.reduce((sum, val) => sum + val, 0) / validEarSamples.length) * 1000
        ) / 1000
      : null;

  const round1 = (value: number | undefined | null): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

  return {
    avgEar,
    perclosPct: hasTrackedData ? round1(session.blinkSummary?.avgPerclos) : null,
    blinkFrequencyPerMin: hasTrackedData ? round1(session.blinkSummary?.avgBlinkRate) : null,
    totalBlinks:
      hasTrackedData && typeof session.blinkSummary?.totalBlinks === 'number'
        ? session.blinkSummary.totalBlinks
        : null,
    yawnEvents:
      hasTrackedData && typeof session.yawnSummary?.totalYawns === 'number'
        ? session.yawnSummary.totalYawns
        : null,
    yawnsPerMin: hasTrackedData ? round1(session.yawnSummary?.avgYawnsPerMin) : null,
    microsleepEventsCount: Array.isArray(session.microsleepEvents)
      ? session.microsleepEvents.length
      : 0,
    predictedFatigueScore: hasTrackedData ? round1(session.avgFatigueScore) : null,
    predictedAbsoluteScore: hasTrackedData ? round1(session.avgAbsoluteScore) : null,
    predictedPersonalDeviation: hasTrackedData ? round1(session.avgPersonalDeviation) : null,
    predictedTier:
      hasTrackedData && Number.isFinite(session.avgFatigueScore)
        ? getTierLabelFromScore(session.avgFatigueScore)
        : null,
    detectionQualityPct: Number.isFinite(session.detectionQualityPct)
      ? session.detectionQualityPct
      : 0,
    validTrackingSec: Number.isFinite(session.validTrackingSec)
      ? Math.round(session.validTrackingSec * 10) / 10
      : 0,
    durationSec: Number.isFinite(session.durationSec)
      ? Math.round(session.durationSec * 10) / 10
      : 0
  };
}

export const PostAssessmentFeedbackCard: React.FC<{
  session: SavedSessionRecord;
}> = ({ session }) => {
  const { feedbackRecords, submitAssessmentFeedback, showToast } = useAppContext();

  const existingRecord = useMemo(
    () => feedbackRecords.find((r) => r.sessionId === session.id) ?? null,
    [feedbackRecords, session.id]
  );

  const [step, setStep] = useState<'prompt' | 'followUp' | 'submitted'>(
    existingRecord ? 'submitted' : 'prompt'
  );
  const [lastRecord, setLastRecord] = useState<AssessmentFeedbackRecord | null>(existingRecord);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRecord) {
      setLastRecord(existingRecord);
      setStep('submitted');
    } else {
      setLastRecord(null);
      setStep('prompt');
    }
  }, [session.id, existingRecord]);

  const metrics = useMemo(() => buildFeedbackMetrics(session), [session]);

  const persistFeedback = async (
    isAccurate: boolean,
    selfReportedFatigueLevel: SelfReportedFatigueLevel | null
  ) => {
    setSaving(true);
    try {
      const now = Date.now();
      const timestamp = session.endedAt || session.startedAt || now;
      const record: AssessmentFeedbackRecord = {
        id: existingRecord?.id ?? `fb_${session.id}`,
        sessionId: session.id,
        sessionType: session.sessionType,
        assessmentTimestamp: timestamp,
        assessmentTimestampIso: new Date(timestamp).toISOString(),
        recordedAt: now,
        recordedAtIso: new Date(now).toISOString(),
        isAccurate,
        selfReportedFatigueLevel,
        metrics,
        notes: isAccurate
          ? 'User confirmed assessment matched perceived state.'
          : `User reported actual fatigue level: ${selfReportedFatigueLevel ?? 'Unspecified'}.`
      };
      await submitAssessmentFeedback(record);
      setLastRecord(record);
      setStep('submitted');
      showToast('Feedback saved locally for dataset evaluation', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4 no-print">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00ffc6]/15 border border-[#00ffc6]/35 flex items-center justify-center shrink-0">
            <MessageSquareHeart className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6]" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#007a5f] dark:text-[#00ffc6]">
              Optional Assessment Feedback
            </div>
            <h2 className="font-display font-semibold text-base text-zinc-900 dark:text-white mt-0.5">
              {step === 'followUp'
                ? 'How fatigued do you actually feel right now?'
                : 'Do these results accurately reflect how you are feeling?'}
            </h2>
          </div>
        </div>

        {feedbackRecords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              {feedbackRecords.length} labelled {feedbackRecords.length === 1 ? 'entry' : 'entries'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                reportService.exportFeedbackCsv(feedbackRecords);
                showToast('Exported feedback dataset (CSV)', 'success');
              }}
              title="Export anonymised labelled feedback dataset as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                reportService.exportFeedbackJson(feedbackRecords);
                showToast('Exported feedback dataset (JSON)', 'success');
              }}
              title="Export anonymised labelled feedback dataset as JSON"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </Button>
          </div>
        )}
      </div>

      {step === 'prompt' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void persistFeedback(true, null)}
            className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50/90 dark:bg-[#0a0a0a]/85 hover:border-[#00d9aa] hover:bg-[#00ffc6]/10 px-4 py-3.5 text-left transition-colors cursor-pointer disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6] shrink-0" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                Yes, the results seem accurate.
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Record positive confirmation with session biometrics
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => setStep('followUp')}
            className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50/90 dark:bg-[#0a0a0a]/85 hover:border-amber-400/60 hover:bg-amber-500/8 px-4 py-3.5 text-left transition-colors cursor-pointer disabled:opacity-50"
          >
            <ThumbsDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                No, the results don&apos;t seem accurate.
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Specify your actual fatigue level for future evaluation
              </div>
            </div>
          </button>
        </div>
      )}

      {step === 'followUp' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SELF_REPORT_OPTIONS.map((opt) => (
              <button
                key={opt.level}
                type="button"
                disabled={saving}
                onClick={() => void persistFeedback(false, opt.level)}
                className="rounded-xl border border-black/10 dark:border-white/15 bg-zinc-50/90 dark:bg-[#0a0a0a]/85 hover:border-[#00d9aa] hover:bg-[#00ffc6]/10 p-3.5 text-left transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {opt.level}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {opt.subtitle}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setStep('prompt')} disabled={saving}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
          </div>
        </div>
      )}

      {step === 'submitted' && lastRecord && (
        <div className="rounded-xl border border-[#00d9aa]/35 bg-[#00ffc6]/10 px-4 py-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {lastRecord.isAccurate
                    ? 'Thanks! Your feedback helps improve SleepyCam AI.'
                    : 'Thank you. Your feedback has been recorded to help improve future assessments.'}
                </p>
                {!lastRecord.isAccurate && lastRecord.selfReportedFatigueLevel && (
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 mt-0.5">
                    Self-reported state: {lastRecord.selfReportedFatigueLevel}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('prompt')}
              className="self-start sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Update Response</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums pt-1 border-t border-black/10 dark:border-white/10">
            <span>
              EAR {lastRecord.metrics.avgEar !== null ? lastRecord.metrics.avgEar.toFixed(3) : 'N/A'}
            </span>
            <span>
              PERCLOS{' '}
              {lastRecord.metrics.perclosPct !== null
                ? `${lastRecord.metrics.perclosPct.toFixed(1)}%`
                : 'N/A'}
            </span>
            <span>
              BLINKS{' '}
              {lastRecord.metrics.blinkFrequencyPerMin !== null
                ? `${lastRecord.metrics.blinkFrequencyPerMin.toFixed(1)}/min`
                : 'N/A'}
            </span>
            <span>
              YAWNS {lastRecord.metrics.yawnEvents !== null ? lastRecord.metrics.yawnEvents : 'N/A'}
            </span>
            <span>
              SCORE{' '}
              {lastRecord.metrics.predictedFatigueScore !== null
                ? `${lastRecord.metrics.predictedFatigueScore.toFixed(1)}/100`
                : 'N/A'}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        <ShieldCheck className="w-3.5 h-3.5 text-[#007a5f] dark:text-[#00ffc6] shrink-0" />
        <span>
          Stored locally in IndexedDB as separate labelled evaluation metrics only — no webcam
          footage or facial images are saved or uploaded, and predictions are never altered in real
          time.
        </span>
      </div>
    </Card>
  );
};
