import React from 'react';
import { X } from 'lucide-react';
import { SessionDataPoint } from '../../types';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl border border-black/10 bg-white/88 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-white/12 dark:bg-[#14161b]/88 dark:shadow-[0_12px_34px_rgba(0,0,0,0.45)] ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }
> = ({ variant = 'secondary', size = 'md', className = '', children, ...rest }) => {
  const variantClasses: Record<string, string> = {
    primary:
      'bg-[#00ffc6] text-black font-black hover:bg-[#00e5b2] shadow-[0_0_20px_rgba(0,255,198,0.4)] active:scale-[0.98] disabled:opacity-50',
    secondary:
      'bg-white text-black font-bold border border-black/10 hover:bg-zinc-100 shadow-[0_4px_14px_rgba(0,0,0,0.08)] dark:bg-[#1e2128] dark:text-white dark:border-white/15 dark:hover:bg-[#272b34] disabled:opacity-50',
    ghost:
      'text-zinc-700 hover:bg-black/8 hover:text-black font-semibold dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white disabled:opacity-50',
    danger:
      'bg-red-500/15 text-red-700 border border-red-500/35 hover:bg-red-500/25 font-bold dark:text-red-300 disabled:opacity-50'
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-4 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-full gap-2',
    lg: 'px-7 py-3 text-sm rounded-full gap-2.5'
  };

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-4 w-full text-left cursor-pointer group"
  >
    {(label || description) && (
      <div className="min-w-0 flex-1">
        {label && (
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        )}
        {description && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{description}</div>
        )}
      </div>
    )}
    <span
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors ${
        checked
          ? 'bg-[#00ffc6] shadow-[0_0_12px_rgba(0,255,198,0.5)]'
          : 'bg-zinc-300 dark:bg-white/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-xs transition-transform ${
          checked ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-white'
        }`}
      />
    </span>
  </button>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidthClass = 'max-w-lg', children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidthClass} rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#14161b] shadow-2xl overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-black/10 dark:border-white/12">
          <div>
            <h3 className="text-base font-display font-semibold text-zinc-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-zinc-500 hover:text-black hover:bg-black/8 dark:hover:text-white dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  colorClass?: string;
  colorHex?: string;
  heightClass?: string;
}> = ({
  value,
  max = 100,
  colorClass = 'bg-[#00ffc6]',
  colorHex,
  heightClass = 'h-1.5'
}) => {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100));
  return (
    <div
      className={`w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden ${heightClass}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorHex ? '' : colorClass}`}
        style={{
          width: `${pct}%`,
          ...(colorHex
            ? { backgroundColor: colorHex, boxShadow: `0 0 10px ${colorHex}66` }
            : { boxShadow: '0 0 10px rgba(0,255,198,0.45)' })
        }}
      />
    </div>
  );
};

export const FatigueTimelineChart: React.FC<{
  points: SessionDataPoint[];
  height?: number;
  showEar?: boolean;
}> = ({ points, height = 160, showEar = false }) => {
  if (points.length < 2) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-xs font-mono text-zinc-500 dark:text-zinc-400"
      >
        Timeline populates as tracking samples arrive.
      </div>
    );
  }

  const width = 640;
  const padX = 28;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const toX = (idx: number) => padX + (idx / Math.max(1, points.length - 1)) * chartW;
  const toScoreY = (val: number) =>
    padY + chartH - (Math.min(100, Math.max(0, val)) / 100) * chartH;
  const toEarY = (ear: number) =>
    padY + chartH - (Math.min(0.45, Math.max(0, ear)) / 0.45) * chartH;

  const scorePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toScoreY(p.fatigueScore).toFixed(1)}`)
    .join(' ');

  const areaPath = `${scorePath} L ${toX(points.length - 1).toFixed(1)} ${(
    padY + chartH
  ).toFixed(1)} L ${padX.toFixed(1)} ${(padY + chartH).toFixed(1)} Z`;

  const earPath = showEar
    ? points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toEarY(p.ear).toFixed(1)}`)
        .join(' ')
    : '';

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="fatigueAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ffc6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00ffc6" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((tick) => {
          const y = toScoreY(tick);
          return (
            <g key={tick}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-black/10 dark:text-white/10"
                strokeWidth="1"
              />
              <text
                x={4}
                y={y + 3}
                fontSize="9"
                fill="currentColor"
                className="text-zinc-500 font-mono"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#fatigueAreaGrad)" />
        <path
          d={scorePath}
          fill="none"
          stroke="#00d9aa"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {showEar && earPath && (
          <path
            d={earPath}
            fill="none"
            stroke="#00ffc6"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}
      </svg>
    </div>
  );
};
