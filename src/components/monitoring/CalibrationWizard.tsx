import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { Modal, Button, ProgressBar } from '../ui/Primitives';
import { DetectionDiagnostics } from '../../types';

interface CalibrationWizardProps {
  open: boolean;
  onClose: () => void;
  step: 1 | 2 | 3 | 4;
  timer: number;
  isRunning: boolean;
  failureReason: string | null;
  diagnostics: DetectionDiagnostics;
  onRetry: () => void;
}

const STEP_DETAILS: Record<
  1 | 2 | 3 | 4,
  { hudLabel: string; instruction: string; targetDuration: number }
> = {
  1: {
    hudLabel: 'CALIBRATING EYES · OPEN GAZE',
    instruction: 'Look steadily toward the sensor with eyes comfortably open.',
    targetDuration: 4.0
  },
  2: {
    hudLabel: 'CALIBRATING EYES · RELAXED',
    instruction: 'Let eyelids relax to a comfortable half-open gaze.',
    targetDuration: 3.0
  },
  3: {
    hudLabel: 'CALIBRATING MOUTH & BLINKS',
    instruction: 'Blink naturally two or three times.',
    targetDuration: 4.0
  },
  4: {
    hudLabel: 'CALIBRATION FINALIZING · CLOSED',
    instruction: 'Gently close both eyes until the countdown finishes.',
    targetDuration: 3.5
  }
};

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  open,
  onClose,
  step,
  timer,
  isRunning,
  failureReason,
  diagnostics,
  onRetry
}) => {
  const details = STEP_DETAILS[step];
  const stepPct = Math.round(((details.targetDuration - timer) / details.targetDuration) * 100);

  const sequenceStages = [
    { label: 'FACE DETECTED', active: diagnostics.faceDetected },
    { label: 'CALIBRATING EYES', active: step === 1 || step === 2 },
    { label: 'CALIBRATING MOUTH', active: step === 3 },
    { label: 'CALIBRATION COMPLETE', active: step === 4 && timer <= 0.2 }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Biometric Eye Calibration"
      subtitle="Short guided sequence tuning personal eyelid aperture thresholds."
    >
      <div className="space-y-5">
        {/* Animated Calibration Phase Sequence */}
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s < step
                  ? 'bg-[#00d9aa] shadow-[0_0_8px_rgba(0,217,170,0.5)]'
                  : s === step
                  ? 'bg-[#00ffc6] shadow-[0_0_10px_rgba(0,255,198,0.65)]'
                  : 'bg-black/10 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider">
          {sequenceStages.map((st, idx) => (
            <span
              key={st.label}
              className={
                st.active
                  ? 'text-[#007a5f] dark:text-[#00ffc6] font-bold'
                  : idx < step - 1
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-500'
              }
            >
              {st.label}
            </span>
          ))}
        </div>

        {failureReason ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Calibration Interrupted</div>
                <p className="text-xs mt-1 text-zinc-700 dark:text-zinc-300">{failureReason}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={onRetry}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-black/15 dark:border-[#00ffc6]/25 bg-[#0a0a0a] text-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#00ffc6] text-xs font-mono font-semibold tracking-wider">
                    <Eye className="w-4 h-4" />
                    <span>{details.hudLabel}</span>
                  </div>
                  <span className="font-mono text-base font-bold text-white tabular-nums">
                    {timer.toFixed(1)}s
                  </span>
                </div>

                <p className="text-sm font-medium text-zinc-100 mt-2">
                  {details.instruction}
                </p>

                <div className="mt-4">
                  <ProgressBar value={Math.max(6, stepPct)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                <div className="rounded-lg border border-black/10 dark:border-white/10 p-2.5">
                  <div className="text-zinc-500 text-[10px]">SENSOR</div>
                  <div
                    className={`font-semibold mt-0.5 ${
                      diagnostics.isEyeValid
                        ? 'text-[#007a5f] dark:text-[#00ffc6]'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {diagnostics.isEyeValid ? 'TRACKED' : diagnostics.trackingState}
                  </div>
                </div>
                <div className="rounded-lg border border-black/10 dark:border-white/10 p-2.5">
                  <div className="text-zinc-500 text-[10px]">LEFT EAR</div>
                  <div className="font-semibold mt-0.5 text-black dark:text-white">
                    {diagnostics.leftEyeEar.toFixed(3)}
                  </div>
                </div>
                <div className="rounded-lg border border-black/10 dark:border-white/10 p-2.5">
                  <div className="text-zinc-500 text-[10px]">RIGHT EAR</div>
                  <div className="font-semibold mt-0.5 text-black dark:text-white">
                    {diagnostics.rightEyeEar.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#008f70] dark:text-[#00ffc6]" />
                  {isRunning ? 'Sampling locally...' : 'Ready'}
                </span>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
};
