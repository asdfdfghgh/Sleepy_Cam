import React, { useMemo, useState } from 'react';
import {
  History,
  Search,
  Trash2,
  FileBarChart,
  Clock,
  Activity,
  Download
} from 'lucide-react';
import { useAppContext } from '../hooks/useAppContext';
import { reportService } from '../services/ReportService';
import { Card, Button } from '../components/ui/Primitives';
import { MultiSessionMetric, SessionComparisonChart } from '../components/21st/AnalyticsCharts';
import { SpotlightSurface } from '../components/21st/SpotlightSurface';
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
  TimelineTime
} from '../components/21st/Timeline';

export const SessionHistoryPage: React.FC = () => {
  const { sessions, deleteSessionRecord, openSessionReport, setRoute } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'assessment' | 'monitoring'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [trendMetric, setTrendMetric] = useState<MultiSessionMetric>('comparison');

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (typeFilter !== 'all' && s.sessionType !== typeFilter) return false;
      if (dateFilter && s.dateStr !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${s.id} ${s.dateStr} ${s.startTimeStr} ${s.sessionType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dateFilter, searchQuery, sessions, typeFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            History &amp; Biometric Trends
          </h1>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-[#00ffc6]/85 mt-0.5">
            {sessions.length} LOCAL RECORDS · INDEXEDDB PERSISTENCE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setRoute('assessment')}>
            <Clock className="w-4 h-4" />
            <span>Quick Scan</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRoute('monitoring')}>
            <Activity className="w-4 h-4 text-[#007a5f] dark:text-[#00ffc6]" />
            <span>Live Monitor</span>
          </Button>
        </div>
      </div>

      {/* Glowing Animated Multi-Session Trend Analytics */}
      {sessions.length > 0 && (
        <SpotlightSurface beam className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 dark:text-[#00ffc6]/85">
                MULTI-SESSION ANALYTICS
              </div>
              <h2 className="font-display font-semibold text-base text-zinc-900 dark:text-white mt-0.5">
                Biometric Trend Curve
              </h2>
            </div>

            <div className="overflow-x-auto pb-1 md:pb-0">
              <SegmentedControl
                value={trendMetric}
                onChange={setTrendMetric}
                options={[
                  { value: 'comparison', label: 'Compare' },
                  { value: 'fatigue', label: 'Fatigue' },
                  { value: 'perclos', label: 'PERCLOS' },
                  { value: 'blinks', label: 'Blinks' },
                  { value: 'yawns', label: 'Yawns' }
                ]}
              />
            </div>
          </div>

          <SessionComparisonChart sessions={sessions} metric={trendMetric} height={225} />
        </SpotlightSurface>
      )}

      {/* Compact Filter Toolbar */}
      <Card className="p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter date, time, or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-full border border-black/15 dark:border-white/15 bg-zinc-50 dark:bg-[#0a0a0a] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#007a5f] dark:focus:border-[#00ffc6]"
          />
        </div>

        <SegmentedControl
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'assessment', label: 'Scans' },
            { value: 'monitoring', label: 'Monitors' }
          ]}
        />

        <input
          type="date"
          aria-label="Filter by date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-full border border-black/15 dark:border-white/15 bg-zinc-50 dark:bg-[#0a0a0a] text-xs px-3.5 py-2 text-zinc-800 dark:text-zinc-200"
        />

        {(searchQuery || typeFilter !== 'all' || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setDateFilter('');
            }}
          >
            Reset
          </Button>
        )}
      </Card>

      {/* Clean Chronological Timeline */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-[#00ffc6]/10 border border-black/10 dark:border-[#00ffc6]/25 mx-auto flex items-center justify-center">
            <History className="w-5 h-5 text-zinc-500 dark:text-[#00ffc6]" />
          </div>
          <h2 className="font-display font-semibold text-base text-slate-900 dark:text-white">
            {sessions.length === 0 ? 'No recordings yet' : 'No matching sessions'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {sessions.length === 0
              ? 'Run a Quick Scan or save a Live Monitor session to visualize longitudinal curves here.'
              : 'Clear or adjust filters to inspect earlier sessions.'}
          </p>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <Timeline>
            {filtered.map((s) => (
              <TimelineItem
                key={s.id}
                status={s.microsleepEvents.length > 0 ? 'warning' : 'completed'}
              >
                <TimelineSeparator>
                  <TimelineIndicator
                    variant={s.microsleepEvents.length > 0 ? 'warning' : 'teal'}
                  >
                    {s.sessionType === 'assessment' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Activity className="w-3.5 h-3.5" />
                    )}
                  </TimelineIndicator>
                  <TimelineConnector />
                </TimelineSeparator>

                <TimelineContent className="pb-5">
                  <div className="rounded-xl border border-black/10 dark:border-white/12 bg-zinc-100/85 dark:bg-[#0a0a0a]/85 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <TimelineHeader>
                        <TimelineTitle className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="font-display font-semibold text-zinc-900 dark:text-white">
                            {s.sessionType === 'assessment' ? 'Quick Scan' : 'Live Monitor'}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {Math.round(s.durationSec)}s · {s.detectionQualityPct}% qual
                          </span>
                        </TimelineTitle>
                        <TimelineTime>
                          {s.dateStr} {s.startTimeStr}
                        </TimelineTime>
                      </TimelineHeader>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-600 dark:text-zinc-300 tabular-nums">
                        <span>
                          Score{' '}
                          <strong className="text-[#007a5f] dark:text-[#00ffc6]">
                            {s.avgFatigueScore.toFixed(1)}
                          </strong>
                          /100
                        </span>
                        <span>PERCLOS {s.blinkSummary.avgPerclos.toFixed(1)}%</span>
                        <span>Blinks {s.blinkSummary.totalBlinks}</span>
                        <span>Yawns {s.yawnSummary.totalYawns}</span>
                        <span>Closures {s.microsleepEvents.length}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openSessionReport(s.id)}
                      >
                        <FileBarChart className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reportService.exportCsv(s)}
                        title="Export session telemetry CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteSessionRecord(s.id)}
                        aria-label={`Delete session ${s.id}`}
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Card>
      )}
    </div>
  );
};
