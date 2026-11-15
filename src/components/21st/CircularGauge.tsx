// Adapted from @codedthemes/uiable (MIT License) — Robot Visor Circular Ring Gauge
import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CircularGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  showPercentSymbol?: boolean;
  showTicks?: boolean;
  glow?: boolean;
  labelClassName?: string;
  className?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  max = 100,
  size = 112,
  strokeWidth = 7,
  color = '#00ffc6',
  label,
  sublabel,
  showPercentSymbol = false,
  showTicks = true,
  glow = true,
  labelClassName,
  className
}) => {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(safeMax, Math.max(0, value));
  const pct = (clamped / safeMax) * 100;
  const padding = showTicks ? 10 : 2;
  const radius = (size - strokeWidth) / 2 - padding / 2;
  const outerRadius = radius + strokeWidth / 2 + 4;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 rounded-full opacity-25 blur-xl transition-colors duration-500"
          style={{ backgroundColor: color }}
        />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10 -rotate-90">
        {showTicks && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 5"
            className="text-black/20 dark:text-white/20"
          />
        )}

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/10 dark:text-white/10"
        />

        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          style={glow ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined}
        />
      </svg>

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
        <span
          className={cn(
            'font-mono font-bold leading-none text-black dark:text-white tabular-nums',
            size >= 130 ? 'text-3xl' : size >= 96 ? 'text-xl' : 'text-base',
            labelClassName
          )}
        >
          {label ?? (showPercentSymbol ? `${Math.round(pct)}%` : clamped.toFixed(0))}
        </span>
        {sublabel && (
          <span className="font-mono text-[10px] tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
