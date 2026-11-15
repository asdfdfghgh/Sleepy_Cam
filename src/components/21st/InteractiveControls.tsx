import React from 'react';
import { cn } from '../../lib/utils';

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  className
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-black/10 dark:border-white/15 bg-black/8 dark:bg-[#0b0c0f] p-1 gap-0.5 backdrop-blur-md',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              active
                ? 'bg-[#00ffc6] text-black shadow-[0_0_12px_rgba(0,255,198,0.38)]'
                : 'text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const SettingsSlider: React.FC<{
  label: string;
  valueDisplay: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, valueDisplay, value, min, max, step, onChange }) => {
  const pct = Math.min(100, Math.max(0, ((value - min) / Math.max(0.0001, max - min)) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
        <span className="font-mono font-bold text-[#007a5f] dark:text-[#00ffc6] tabular-nums">
          {valueDisplay}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, #00ffc6 0%, #00d9aa ${pct}%, rgba(120,120,128,0.28) ${pct}%, rgba(120,120,128,0.28) 100%)`
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#00ffc6]"
        />
      </div>
    </div>
  );
};
