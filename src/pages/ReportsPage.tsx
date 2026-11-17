import React, { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Printer,
  FileJson,
  FileBarChart,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { reportService } from '../services/ReportService';
import { TIER_CONFIG } from '../utils/mathFormulas';
import { DESIGN_TOKENS } from '../styles/designTokens';
import { Card, Button } from '../components/ui/Primitives';
import { CircularGauge } from '../components/21st/CircularGauge';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';
import { NumberTicker } from '../components/21st/NumberTicker';
import {
  FatigueAreaChart,
  CategoryDonutChart,
  DonutSegment
} from '../components/21st/AnalyticsCharts';
import { PostAssessmentFeedbackCard } from '../components/monitoring/PostAssessmentFeedbackCard';
import { SegmentedControl } from '../components/21st/InteractiveControls';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineIndicator,
  TimelineConnector,
  TimelineContent,
  TimelineHeader,
  TimelineTitle,
  TimelineTime,
  TimelineDescription
} from '../components/21st/Timeline';

function getTierFromScore(score: number) {
  if (score <= 20) return TIER_CONFIG['LOW FATIGUE INDICATORS'];
  if (score <= 40) return TIER_CONFIG['MILD FATIGUE INDICATORS'];
  if (score <= 60) return TIER_CONFIG['MODERATE FATIGUE INDICATORS'];
  if (score <= 80) return TIER_CONFIG['HIGH FATIGUE INDICATORS'];
  return TIER_CONFIG['VERY HIGH FATIGUE INDICATORS'];
}

export const ReportsPage: React.FC = () => {
  const { sessions, selectedReportId, openSessionReport, setRoute } = useAppContext();
  const [chartMetric, setChartMetric] = useState<'dual' | 'perclos'>('dual');

  const activeSession =
    sessions.find((s) => s.id === selectedReportId) || sessions[0] || null;

  const donutSegments: DonutSegment[] = useMemo(() => {
    if (!activeSession) return [];
    return Object.entries(activeSession.categoryDurationsSec).map(([label, sec]) => ({
      name: label.replace(' FATIGUE INDICATORS', ''),
      value: Math.round(sec * 10) / 10,
      color: DESIGN_TOKENS.chartColors.categories[label] || '#2DD4BF'
    }));
  }, [activeSession]);

  if (!activeSession) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-[#00ffc6]/10 border border-black/10 dark:border-[#00ffc6]/25 mx-auto flex items-center justify-center">
            <FileBarChart className="w-6 h-6 text-zinc-500 dark:text-[#00ffc6]" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            No Session Report Available
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Complete a Quick Scan or Live Monitor run to inspect glowing charts and export reports.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => setRoute('assessment')}>
              <Clock className="w-4 h-4" />
              <span>Start Quick Scan</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const totalCatSec = Math.max(
    1,
    Object.values(activeSession.categoryDurationsSec).reduce((a, b) => a + b, 0)
  );
  const tierMeta = getTierFromScore(activeSession.avgFatigueScore);
  const shortStatus = tierMeta.label.replace(' FATIGUE INDICATORS', '');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      {/* Header & Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#007a5f] dark:text-[#00ffc6]">
            BIOMETRIC REPORT ·{' '}
            {activeSession.sessionType === 'assessment' ? 'QUICK SCAN' : 'LIVE MONITOR'}
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {activeSession.dateStr} · {activeSession.startTimeStr}
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {Math.round(activeSession.durationSec)}s window ·{' '}
            {activeSession.validTrackingSec.toFixed(1)}s tracked (
            {activeSession.detectionQualityPct}%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <select
            aria-label="Select saved session"
            value={activeSession.id}
            onChange={(e) => openSessionReport(e.target.value)}
            className="rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#0a0a0a] text-xs px-3.5 py-2 text-zinc-800 dark:text-zinc-200"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dateStr} {s.startTimeStr} ({s.sessionType})
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => reportService.exportCsv(activeSession)}
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => reportService.exportPdf(activeSession)}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reportService.exportJson(activeSession)}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => reportService.printReport()}>
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Hero Ring + Supporting Biometrics */}
      <SpotlightSurface
        beam
        beamColorFrom={tierMeta.color}
        beamColorTo="#00ffc6"
        className="p-6 print-break-inside-avoid"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 flex flex-col items-center text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-[#00ffc6]/85 mb-2">
              CURRENT STATUS
            </div>
            <CircularGauge
              value={activeSession.avgFatigueScore}
              size={146}
              strokeWidth={9}
              color={tierMeta.color}
              label={activeSession.avgFatigueScore.toFixed(0)}
              sublabel="AVG SCORE"
            />
            <div
              className="mt-3 text-xs font-mono font-bold tracking-widest px-3 py-0.5 rounded border"
              style={{
                color: tierMeta.color,
                borderColor: `${tierMeta.color}44`,
                backgroundColor: `${tierMeta.color}14`
              }}
            >
              {shortStatus}
            </div>
            <div className="mt-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Peak {activeSession.maxFatigueScore.toFixed(1)} · Min{' '}
              {activeSession.minFatigueScore.toFixed(1)}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Personal Deviation
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <NumberTicker
                  value={activeSession.avgPersonalDeviation}
                  decimals={1}
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                />
                <span className="font-mono text-xs text-zinc-500">/ 100</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                Abs avg {activeSession.avgAbsoluteScore.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                PERCLOS &amp; Blinks
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <NumberTicker
                  value={activeSession.blinkSummary.avgPerclos}
                  decimals={1}
                  suffix="%"
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                />
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                {activeSession.blinkSummary.totalBlinks} blinks ·{' '}
                {activeSession.blinkSummary.avgBlinkRate.toFixed(1)} bpm
              </div>
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Closures · Yawns · KSS
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <NumberTicker
                  value={activeSession.microsleepEvents.length}
                  className="text-2xl font-bold text-zinc-900 dark:text-white"
                />
                <span className="font-mono text-xs text-zinc-500">alerts</span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
                {activeSession.yawnSummary.totalYawns} yawns · KSS{' '}
                {activeSession.kssRating ? `${activeSession.kssRating.level}/9` : '--'}
              </div>
            </div>
          </div>
        </div>
      </SpotlightSurface>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print-break-inside-avoid">
        <Card className="lg:col-span-8 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                Fatigue Progression Curve
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {activeSession.history.length} telemetry frames
              </p>
            </div>
            <div className="no-print">
              <SegmentedControl
                value={chartMetric}
                onChange={setChartMetric}
                options={[
                  { value: 'dual', label: 'Fatigue & Deviation' },
                  { value: 'perclos', label: 'PERCLOS %' }
                ]}
              />
            </div>
          </div>
          <FatigueAreaChart points={activeSession.history} height={235} metric={chartMetric} />
        </Card>

        <Card className="lg:col-span-4 p-5 space-y-3">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            State Distribution
          </h2>
          <CategoryDonutChart
            segments={donutSegments}
            centerValue={`${Math.round(totalCatSec)}s`}
            centerLabel="Tracked"
            height={185}
          />
          <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/12 text-xs">
            {donutSegments.map((seg) => {
              const pct = Math.round((seg.value / totalCatSec) * 100);
              return (
                <div key={seg.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate">{seg.name}</span>
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {Math.round(seg.value)}s ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Microsleep Events Timeline */}
      <Card className="p-5 sm:p-6 space-y-4 print-break-inside-avoid">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            Sustained Eye Closures ({activeSession.microsleepEvents.length})
          </h2>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Avg Blink {activeSession.blinkSummary.avgBlinkDuration.toFixed(2)}s · Long Blinks{' '}
            {activeSession.blinkSummary.longBlinks}
          </span>
        </div>

        {activeSession.microsleepEvents.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            No sustained closure alerts were triggered during this session.
          </p>
        ) : (
          <Timeline variant="compact">
            {activeSession.microsleepEvents.map((evt) => (
              <TimelineItem key={evt.id} status="error">
                <TimelineSeparator>
                  <TimelineIndicator variant="error">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </TimelineIndicator>
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <TimelineHeader>
                    <TimelineTitle className="font-mono text-red-500 dark:text-red-400">
                      {evt.durationSec.toFixed(1)}s bilateral closure
                    </TimelineTitle>
                    <TimelineTime>{evt.timeFormatted}</TimelineTime>
                  </TimelineHeader>
                  <TimelineDescription>
                    Confidence {evt.confidencePct}% ·{' '}
                    {evt.audioMuted
                      ? 'Audio muted'
                      : evt.audioTriggered
                      ? 'Audio alert sounded'
                      : 'Cooldown'}{' '}
                    — {evt.notes}
                  </TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Card>

      <PostAssessmentFeedbackCard session={activeSession} />

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Notice: {activeSession.limitationsNote}
      </p>
    </div>
  );
};
