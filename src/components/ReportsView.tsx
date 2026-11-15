import React from 'react';
import {
  FileText,
  Download,
  Clock,
  Activity,
  AlertTriangle,
  Eye,
  ShieldAlert,
  Volume2,
  VolumeX,
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { BiometricMetrics, MicrosleepEventLog, SessionDataPoint, FatigueTier } from '../types';
import { TIER_CONFIG } from '../utils/mathFormulas';
import { audioAlert } from '../utils/audioAlertEngine';

interface ReportsViewProps {
  metrics: BiometricMetrics;
  microsleepEvents: MicrosleepEventLog[];
  sessionHistory: SessionDataPoint[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  metrics,
  microsleepEvents,
  sessionHistory
}) => {
  const durationSec = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1].timeSec : 60;
  const scores = sessionHistory.map((s) => s.fatigueScore).filter((s) => s > 0);
  const avgFatigue = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxFatigue = scores.length > 0 ? Math.round(Math.max(...scores)) : 0;
  const minFatigue = scores.length > 0 ? Math.round(Math.min(...scores)) : 0;

  // Insufficient confidence count
  const insufficientSamples = sessionHistory.filter((s) => s.isConfidenceSufficient === false).length;
  const insufficientDurationSec = Math.round((insufficientSamples / Math.max(1, sessionHistory.length)) * durationSec);
  const insufficientPct = ((insufficientSamples / Math.max(1, sessionHistory.length)) * 100).toFixed(1);

  // Audio activations count
  const audioTriggeredCount = microsleepEvents.filter((e) => e.audioTriggered).length;
  const audioMutedCount = microsleepEvents.filter((e) => e.audioMuted).length;
  const currentAudioConfig = audioAlert.getConfig();

  // Category counts
  const categoryCounts: Record<string, number> = {
    'LOW FATIGUE INDICATORS': 0,
    'MILD FATIGUE INDICATORS': 0,
    'MODERATE FATIGUE INDICATORS': 0,
    'HIGH FATIGUE INDICATORS': 0,
    'VERY HIGH FATIGUE INDICATORS': 0,
    AWAKE: 0,
    NORMAL: 0,
    'GETTING TIRED': 0,
    FATIGUED: 0,
    'VERY FATIGUED': 0,
    'EXTREME FATIGUE': 0
  };

  sessionHistory.forEach((pt) => {
    if (pt.tier && pt.tier in categoryCounts) {
      categoryCounts[pt.tier]++;
    }
  });

  const totalPts = Math.max(1, sessionHistory.length);

  const handleDownloadCSV = () => {
    const summaryLines = [
      'SleepyCam AI - Session Telemetry & Compliance Report',
      `Generated At,${new Date().toLocaleString()}`,
      `Session Duration Seconds,${durationSec}`,
      `Average Fatigue Score,${avgFatigue}`,
      `Maximum Fatigue Score,${maxFatigue}`,
      `Minimum Fatigue Score,${minFatigue}`,
      `Audio Alerts Enabled Currently,${currentAudioConfig.audioEnabled ? 'YES' : 'NO'}`,
      `Audio Alerts Sounded Count,${audioTriggeredCount}`,
      `Alerts Muted by User Count,${audioMutedCount}`,
      `Insufficient Confidence Duration Sec,${insufficientDurationSec} (${insufficientPct}%)`,
      `Total Blinks,${metrics.totalBlinks}`,
      `Average Blink Rate,${metrics.blinkRate}`,
      `Long Blinks,${metrics.longBlinks}`,
      `Total Yawns,${metrics.totalYawns}`,
      `Average Yawn Duration,${metrics.avgYawnDuration}`,
      `Possible Microsleep Events,${microsleepEvents.length}`,
      '',
      'Fatigue Category,Seconds,Percentage',
      ...Object.entries(categoryCounts)
        .filter(([_, count]) => count > 0)
        .map(([cat, count]) => {
          const pct = ((count / totalPts) * 100).toFixed(1);
          const secs = Math.round((count / totalPts) * durationSec);
          return `${cat},${secs},${pct}%`;
        }),
      '',
      'Microsleep Events Log:',
      'Time,Duration(s),PitchDroop(deg),RecoveryVelocity(deg/s),Confidence(%),AudioStatus,Notes',
      ...microsleepEvents.map(
        (e) =>
          `${e.timeFormatted},${e.durationSec},${e.pitchDropDeg},${e.recoveryVelocity},${e.confidencePct}%,${
            e.audioTriggered ? 'Audio Sounded' : e.audioMuted ? 'Muted by User' : 'Visual Only'
          },"${e.notes}"`
      ),
      '',
      'Time (s),Fatigue Score,Absolute Score,Personal Deviation,KSS Rating,Tier,EAR,PERCLOS,MAR,Pitch,Confidence%,ConfidenceSufficient,Trend,AudioMuted'
    ];

    const dataLines = sessionHistory.map(
      (s) =>
        `${s.timeSec},${s.fatigueScore},${s.absoluteScore ?? ''},${s.personalDeviationScore ?? ''},${s.kssRating ?? ''},${s.tier},${s.ear},${s.perclos},${s.mar},${s.pitch},${
          s.confidencePct ?? 100
        }%,${s.isConfidenceSufficient ?? true},${s.trend ?? 'STABLE'},${s.audioMuted ?? false}`
    );

    const fullContent = 'data:text/csv;charset=utf-8,' + [...summaryLines, ...dataLines].join('\n');
    const encoded = encodeURI(fullContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `sleepycam_session_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      sessionSummary: {
        durationSec,
        averageFatigue: avgFatigue,
        maximumFatigue: maxFatigue,
        minimumFatigue: minFatigue,
        insufficientConfidenceDurationSec: insufficientDurationSec,
        insufficientConfidencePct: insufficientPct,
        audioAlertsConfig: currentAudioConfig,
        audioTriggeredCount,
        audioMutedCount,
        categoryTimeDistribution: Object.fromEntries(
          Object.entries(categoryCounts).map(([cat, count]) => [
            cat,
            {
              seconds: Math.round((count / totalPts) * durationSec),
              percentage: Number(((count / totalPts) * 100).toFixed(1))
            }
          ])
        ),
        ocularSummary: {
          totalBlinks: metrics.totalBlinks,
          blinkRate: metrics.blinkRate,
          longBlinks: metrics.longBlinks,
          totalYawns: metrics.totalYawns,
          avgYawnDuration: metrics.avgYawnDuration,
          headNods: metrics.totalNods
        }
      },
      microsleepEvents,
      history: sessionHistory
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sleepycam_report_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Session Telemetry & Compliance Report</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Aggregated statistical summary, microsleep event log, audio alert tracking, and category breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Session Duration</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {Math.floor(durationSec / 60)}m {durationSec % 60}s
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{totalPts} samples captured</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Average Fatigue</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{avgFatigue} / 100</div>
          <div className="text-[11px] text-slate-500 mt-1">Peak: {maxFatigue} | Min: {minFatigue}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Microsleep Events</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{microsleepEvents.length} detected</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {audioTriggeredCount} beeps played | {audioMutedCount} muted
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-mono mb-1">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tracking Confidence</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {100 - Number(insufficientPct)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Insufficient: {insufficientDurationSec}s ({insufficientPct}%)
          </div>
        </div>
      </div>

      {/* Audio Alert Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${currentAudioConfig.audioEnabled ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {currentAudioConfig.audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-slate-200">
              AUDIO ALARM STATUS: {currentAudioConfig.audioEnabled ? 'ENABLED (ONLINE)' : 'MUTED BY USER'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Volume: {Math.round(currentAudioConfig.volume * 100)}% | Beep: {currentAudioConfig.beepDuration}s | Cooldown: {currentAudioConfig.cooldownSec}s | Trigger: &ge; {currentAudioConfig.microsleepThresholdSec}s closure
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Audio Activations:</span>
            <span className="font-bold text-emerald-400">{audioTriggeredCount} sounded</span>
          </div>
          <div className="text-right border-l border-slate-800 pl-4">
            <span className="text-slate-400 block text-[10px]">Muted Activations:</span>
            <span className="font-bold text-amber-400">{audioMutedCount} silent</span>
          </div>
        </div>
      </div>

      {/* Category Time Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
          Time Distribution Across Fatigue Categories (6 Tiers)
        </div>
        <div className="space-y-3 font-mono text-xs">
          {(Object.keys(categoryCounts) as FatigueTier[]).map((tierKey) => {
            const count = categoryCounts[tierKey];
            const pct = Math.round((count / totalPts) * 100);
            const secs = Math.round((count / totalPts) * durationSec);
            const cfg = TIER_CONFIG[tierKey];

            return (
              <div key={tierKey} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">{tierKey}</span>
                  <span className="text-slate-400">
                    {secs}s ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Microsleep Events Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Possible Microsleep Candidate Events Log
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Experimental Visual & Audio Temporal Detector
          </span>
        </div>

        {microsleepEvents.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
            No microsleep events detected during this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Audio Alarm</th>
                  <th className="p-2.5">Pitch Droop</th>
                  <th className="p-2.5">Recovery Velocity</th>
                  <th className="p-2.5">Confidence</th>
                  <th className="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {microsleepEvents.map((evt) => (
                  <tr key={evt.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="p-2.5 text-slate-300 font-bold">{evt.timeFormatted}</td>
                    <td className="p-2.5 text-rose-400 font-semibold">{evt.durationSec}s</td>
                    <td className="p-2.5">
                      {evt.audioTriggered ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <Volume2 className="w-3 h-3" />
                          <span>BEEP SOUNDED</span>
                        </span>
                      ) : evt.audioMuted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                          <VolumeX className="w-3 h-3" />
                          <span>MUTED</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">VISUAL ONLY</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-300">{evt.pitchDropDeg}°</td>
                    <td className="p-2.5 text-slate-300">{evt.recoveryVelocity} deg/s</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        {evt.confidencePct}%
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">{evt.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
