import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ValidationChecklistState } from '../../hooks/useFatigueMonitor';
import { DetectionDiagnostics, BiometricMetrics } from '../../types';
import { Card } from '../ui/Primitives';
import { SegmentedControl } from '../21st/InteractiveControls';

interface ValidationSuitePanelProps {
  checklist: ValidationChecklistState;
  diagnostics: DetectionDiagnostics;
  metrics: BiometricMetrics;
}

type SuiteTab = 'mouth' | 'eyes' | 'distance' | 'timer' | 'blinks' | 'false_signals';

export const ValidationSuitePanel: React.FC<ValidationSuitePanelProps> = ({
  checklist,
  diagnostics,
  metrics
}) => {
  const [tab, setTab] = useState<SuiteTab>('mouth');

  const items: { key: keyof ValidationChecklistState; label: string; group: SuiteTab }[] = [
    { key: 'mouthResting', label: 'Resting mouth stays RESTING (MAR < 0.15)', group: 'mouth' },
    { key: 'mouthSpeaking', label: 'Speaking classifies as SPEAKING (not yawn)', group: 'mouth' },
    { key: 'mouthSmiling', label: 'Smiling differentiates via lip corner expansion', group: 'mouth' },
    { key: 'mouthSmallYawn', label: 'Small natural yawn detected (>= 0.28 MAR >= 0.7s)', group: 'mouth' },
    { key: 'mouthLargeYawn', label: 'Large wide yawn detected (MAR >= 0.40)', group: 'mouth' },
    { key: 'mouthBeardImmunity', label: 'Inner-lip tracking active (beard/moustache immune)', group: 'mouth' },

    { key: 'eyesFullyOpen', label: 'Wide open eyes -> FULLY OPEN', group: 'eyes' },
    { key: 'eyesPartiallyOpen', label: 'Half-open eyelids -> PARTIALLY OPEN', group: 'eyes' },
    { key: 'eyesFullyClosed', label: 'Closed eyelids -> CLOSED', group: 'eyes' },
    { key: 'eyesOneClosedOneOpen', label: 'Asymmetric wink preserves independent L/R states', group: 'eyes' },
    { key: 'eyesSlowClosure', label: 'Sustained closure duration >= 0.5s tracked', group: 'eyes' },

    { key: 'eyesDistanceRobustness', label: 'Far face (<18px eye width) -> UNCERTAIN (no false CLOSED)', group: 'distance' },

    { key: 'eyesNaturalBlink', label: 'Natural quick blink recorded (< 0.4s)', group: 'blinks' },
    { key: 'eyesSlowBlink', label: 'Sluggish slow blink recorded (> 0.4s)', group: 'blinks' },

    { key: 'timer10s', label: '10s Quick Assessment timer completed cleanly', group: 'timer' },
    { key: 'timer30s', label: '30s Quick Assessment timer completed cleanly', group: 'timer' },
    { key: 'timer60s', label: '60s Quick Assessment timer completed cleanly', group: 'timer' },

    { key: 'noFatigueLookDown', label: 'Looking down (pitch < -16°) adds 0% head-nod fatigue', group: 'false_signals' },
    { key: 'noFatigueTurnHead', label: 'Turning head (> 18° yaw) keeps open eyes valid', group: 'false_signals' },
    { key: 'noFatigueNarrowEyes', label: 'Calibrated personalized eye openness applied', group: 'false_signals' },
    { key: 'noMicrosleepOnYawn', label: 'Yawning alone does not trigger microsleep machine', group: 'false_signals' }
  ];

  const tabs: { value: SuiteTab; label: string }[] = [
    { value: 'mouth', label: 'Mouth' },
    { value: 'eyes', label: 'Eyes' },
    { value: 'distance', label: 'Distance' },
    { value: 'blinks', label: 'Blinks' },
    { value: 'timer', label: 'Timers' },
    { value: 'false_signals', label: 'False Signals' }
  ];

  const activeItems = items.filter((i) => i.group === tab);
  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
            Advanced Ground-Truth Validation Checklist
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live verification telemetry ({completedCount} / {items.length} behaviors verified this session)
          </p>
        </div>
        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          EAR {metrics.ear.toFixed(3)} · MAR {metrics.mar.toFixed(3)} · Eye {diagnostics.leftEyeWidthPx ?? '-'}px
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <SegmentedControl options={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-1.5">
        {activeItems.map((item) => {
          const passed = checklist[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg bg-zinc-50 dark:bg-[#0a0a0a]/80 border border-black/10 dark:border-white/12"
            >
              {passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span
                className={
                  passed
                    ? 'text-slate-900 dark:text-slate-100 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
