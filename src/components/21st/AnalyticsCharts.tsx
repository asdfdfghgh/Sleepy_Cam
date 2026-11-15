// Adapted from @codedthemes/uiable (MIT License) — Enhanced HUD Charts with Neon Glow Filters
import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { SavedSessionRecord, SessionDataPoint } from '../../types';
import { DESIGN_TOKENS } from '../../styles/designTokens';
import { cn } from '../../lib/utils';

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

const ChartTooltipBox: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  unit?: string;
}> = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-black/15 dark:border-[#00ffc6]/30 bg-white/95 dark:bg-[#0a0a0a]/95 px-3 py-2 shadow-xl backdrop-blur-md text-xs">
      {label !== undefined && (
        <div className="font-mono text-[11px] text-zinc-500 dark:text-[#00ffc6] mb-1">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 font-mono">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: entry.color || '#00ffc6' }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-black dark:text-white tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FatigueAreaChart: React.FC<{
  points: SessionDataPoint[];
  height?: number;
  metric?: 'fatigue' | 'perclos' | 'dual';
  className?: string;
}> = ({ points, height = 210, metric = 'dual', className }) => {
  const data = useMemo(
    () =>
      points.map((p) => ({
        timeLabel: `${p.timeSec}s`,
        Fatigue: Math.round(p.fatigueScore * 10) / 10,
        Deviation: Math.round((p.personalDeviationScore ?? 0) * 10) / 10,
        PERCLOS: Math.round(p.perclos * 10) / 10
      })),
    [points]
  );

  if (data.length < 2) {
    return (
      <div
        style={{ height }}
        className={cn(
          'w-full rounded-lg border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-xs font-mono text-zinc-500 dark:text-zinc-400',
          className
        )}
      >
        Stream awaits live tracking telemetry...
      </div>
    );
  }

  return (
    <div style={{ height }} className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="scCyanArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ffc6" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#00ffc6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="scEmeraldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d9aa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00d9aa" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-black/10 dark:text-white/10"
          />
          <XAxis
            dataKey="timeLabel"
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltipBox />} />
          {metric === 'perclos' ? (
            <Area
              type="monotone"
              dataKey="PERCLOS"
              name="PERCLOS %"
              stroke="#00d9aa"
              strokeWidth={2.2}
              fill="url(#scEmeraldArea)"
              isAnimationActive={false}
            />
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="Fatigue"
                name="Fatigue Score"
                stroke="#00d9aa"
                strokeWidth={2.3}
                fill="url(#scCyanArea)"
                isAnimationActive={false}
              />
              {metric === 'dual' && (
                <Area
                  type="monotone"
                  dataKey="Deviation"
                  name="Personal Deviation"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  isAnimationActive={false}
                />
              )}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export const CategoryDonutChart: React.FC<{
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  height?: number;
}> = ({ segments, centerValue, centerLabel, height = 210 }) => {
  const nonZero = segments.filter((s) => s.value > 0);
  const displayData =
    nonZero.length > 0 ? nonZero : [{ name: 'No Data', value: 1, color: '#27272a' }];

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltipBox unit="s" />} />
          <Pie
            data={displayData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={76}
            paddingAngle={nonZero.length > 1 ? 3 : 0}
            stroke="none"
            isAnimationActive={true}
            animationDuration={500}
          >
            {displayData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                const { cx, cy } = viewBox;
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx}
                      y={(cy || 0) - 4}
                      className="fill-zinc-900 dark:fill-white font-mono text-xl font-bold"
                    >
                      {centerValue}
                    </tspan>
                    <tspan
                      x={cx}
                      y={(cy || 0) + 15}
                      className="fill-zinc-500 dark:fill-[#00ffc6]/80 text-[10px] font-mono uppercase tracking-wider"
                    >
                      {centerLabel}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export type MultiSessionMetric = 'fatigue' | 'perclos' | 'blinks' | 'yawns' | 'comparison';

export const SessionComparisonChart: React.FC<{
  sessions: SavedSessionRecord[];
  metric?: MultiSessionMetric;
  height?: number;
}> = ({ sessions, metric = 'comparison', height = 215 }) => {
  const data = useMemo(
    () =>
      [...sessions]
        .slice(0, 10)
        .reverse()
        .map((s) => ({
          label: `${s.dateStr.slice(5)} ${s.startTimeStr.slice(0, 5)}`,
          AvgFatigue: Math.round(s.avgFatigueScore * 10) / 10,
          Deviation: Math.round(s.avgPersonalDeviation * 10) / 10,
          PERCLOS: Math.round(s.blinkSummary.avgPerclos * 10) / 10,
          BlinkRate: Math.round(s.blinkSummary.avgBlinkRate * 10) / 10,
          YawnRate: Math.round(s.yawnSummary.avgYawnsPerMin * 10) / 10
        })),
    [sessions]
  );

  if (data.length === 0) return null;

  if (metric === 'comparison') {
    return (
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-black/10 dark:text-white/10"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltipBox />} />
            <Bar
              dataKey="AvgFatigue"
              name="Avg Fatigue"
              fill={DESIGN_TOKENS.colors.accentMint}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              animationDuration={450}
            />
            <Bar
              dataKey="Deviation"
              name="Deviation"
              fill="#00d9aa"
              fillOpacity={0.55}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              animationDuration={450}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const keyConfig = {
    fatigue: { dataKey: 'AvgFatigue', name: 'Avg Fatigue Score', color: '#00d9aa', domainMax: 100 },
    perclos: { dataKey: 'PERCLOS', name: 'Avg PERCLOS %', color: '#00ffc6', domainMax: 100 },
    blinks: { dataKey: 'BlinkRate', name: 'Blink Rate (/min)', color: '#00d9aa', domainMax: 'auto' as const },
    yawns: { dataKey: 'YawnRate', name: 'Yawn Rate (/min)', color: '#F59E0B', domainMax: 'auto' as const }
  }[metric];

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`scTrendGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={keyConfig.color} stopOpacity={0.34} />
              <stop offset="100%" stopColor={keyConfig.color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-black/10 dark:text-white/10"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={keyConfig.domainMax === 100 ? [0, 100] : [0, 'auto']}
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltipBox />} />
          <Area
            type="monotone"
            dataKey={keyConfig.dataKey}
            name={keyConfig.name}
            stroke={keyConfig.color}
            strokeWidth={2.4}
            fill={`url(#scTrendGrad-${metric})`}
            animationDuration={450}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
