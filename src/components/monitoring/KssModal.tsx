import React from 'react';
import { Check } from 'lucide-react';
import { KSS_LEVELS } from '../../utils/mathFormulas';
import { Modal } from '../ui/Primitives';

interface KssModalProps {
  open: boolean;
  onClose: () => void;
  currentLevel: number | null;
  onSelect: (level: number) => void;
}

export const KssModal: React.FC<KssModalProps> = ({
  open,
  onClose,
  currentLevel,
  onSelect
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rate Subjective Sleepiness (KSS 1–9)"
      subtitle="Karolinska Sleepiness Scale records how sleepy you personally feel, kept separate from observable camera indicators."
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-2">
        {Object.entries(KSS_LEVELS).map(([lvlStr, info]) => {
          const lvl = Number(lvlStr);
          const selected = currentLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                onSelect(lvl);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                selected
                  ? 'border-[#007a5f] dark:border-[#00ffc6]/65 bg-[#00ffc6]/15 shadow-[0_0_16px_rgba(0,255,198,0.16)]'
                  : 'border-black/10 dark:border-white/12 hover:bg-black/5 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="font-mono font-bold text-sm w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 tabular-nums"
                  style={{
                    backgroundColor: `${info.color}20`,
                    color: info.color
                  }}
                >
                  {lvl}
                </span>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {info.label}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {info.description}
                  </div>
                </div>
              </div>
              {selected && <Check className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6] shrink-0" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
