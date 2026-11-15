import { jsPDF } from 'jspdf';
import { SavedSessionRecord } from '../types';

class ReportServiceClass {
  public exportCsv(session: SavedSessionRecord): void {
    const headers = [
      'Session ID',
      'Date',
      'Start Time',
      'Session Type',
      'Time Elapsed (s)',
      'Fatigue Indicator Score (0-100)',
      'Category',
      'Personal Deviation (0-100)',
      'Absolute Score (0-100)',
      'EAR',
      'PERCLOS (%)',
      'MAR',
      'Head Pitch (deg)',
      'Confidence (%)',
      'KSS Rating (1-9)'
    ];

    const rows =
      session.history.length > 0
        ? session.history.map((pt) => [
            session.id,
            session.dateStr,
            session.startTimeStr,
            session.sessionType,
            pt.timeSec,
            pt.fatigueScore.toFixed(1),
            pt.tier,
            (pt.personalDeviationScore ?? 0).toFixed(1),
            (pt.absoluteScore ?? pt.fatigueScore).toFixed(1),
            pt.ear.toFixed(3),
            pt.perclos.toFixed(1),
            pt.mar.toFixed(3),
            pt.pitch.toFixed(1),
            pt.confidencePct ?? session.detectionQualityPct,
            pt.kssRating ?? session.kssRating?.level ?? ''
          ])
        : [
            [
              session.id,
              session.dateStr,
              session.startTimeStr,
              session.sessionType,
              session.durationSec,
              session.avgFatigueScore.toFixed(1),
              'SUMMARY',
              session.avgPersonalDeviation.toFixed(1),
              session.avgAbsoluteScore.toFixed(1),
              '-',
              session.blinkSummary.avgPerclos.toFixed(1),
              '-',
              '-',
              session.detectionQualityPct,
              session.kssRating?.level ?? ''
            ]
          ];

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    this.triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `sleepycam_session_${session.dateStr}_${session.id.slice(0, 6)}.csv`
    );
  }

  public exportJson(session: SavedSessionRecord): void {
    const payload = JSON.stringify(
      {
        application: 'SleepyCam AI v2.0',
        disclaimer:
          'Informational behavioral fatigue indicator report only. Not a medical diagnosis.',
        session
      },
      null,
      2
    );

    this.triggerDownload(
      new Blob([payload], { type: 'application/json' }),
      `sleepycam_session_${session.dateStr}_${session.id.slice(0, 6)}.json`
    );
  }

  public exportPdf(session: SavedSessionRecord): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 48;

    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, pageWidth, 88, 'F');

    doc.setTextColor(34, 211, 238);
    doc.setFontSize(11);
    doc.text('SLEEPYCAM AI · BEHAVIORAL FATIGUE REPORT', 42, 34);

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(20);
    doc.text(
      session.sessionType === 'assessment' ? 'Quick Assessment Summary' : 'Live Monitoring Session Report',
      42,
      62
    );

    y = 116;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(
      `Date: ${session.dateStr}   |   Started: ${session.startTimeStr}   |   Duration: ${Math.round(
        session.durationSec
      )}s   |   Detection Quality: ${session.detectionQualityPct}%`,
      42,
      y
    );

    y += 28;
    doc.setDrawColor(226, 232, 240);
    doc.line(42, y, pageWidth - 42, y);

    y += 26;
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Key Summary Measurements', 42, y);

    y += 22;
    doc.setFontSize(10);
    const summaryLines = [
      `Average Fatigue Indicator Score: ${session.avgFatigueScore.toFixed(1)} / 100  (Peak: ${session.maxFatigueScore.toFixed(1)} · Min: ${session.minFatigueScore.toFixed(1)})`,
      `Personal Behavioral Deviation: ${session.avgPersonalDeviation.toFixed(1)} / 100`,
      `Subjective Sleepiness (KSS): ${session.kssRating ? `Level ${session.kssRating.level}/9 — ${session.kssRating.label}` : 'Not rated'}`,
      `Valid Tracking Time: ${session.validTrackingSec.toFixed(1)}s  |  Invalid / Out-of-Frame Time: ${session.invalidTrackingSec.toFixed(1)}s`,
      `Ocular Telemetry: ${session.blinkSummary.totalBlinks} blinks · ${session.blinkSummary.avgBlinkRate.toFixed(1)} bpm · Avg duration ${session.blinkSummary.avgBlinkDuration.toFixed(2)}s · Avg PERCLOS ${session.blinkSummary.avgPerclos.toFixed(1)}%`,
      `Yawn Telemetry: ${session.yawnSummary.totalYawns} detected · ${session.yawnSummary.avgYawnsPerMin.toFixed(1)} yawns/min`,
      `Sustained Closure / Microsleep-Like Events: ${session.microsleepEvents.length}`
    ];

    summaryLines.forEach((line) => {
      doc.text(line, 42, y);
      y += 18;
    });

    y += 14;
    doc.setFontSize(13);
    doc.text('Time Spent by Fatigue Category', 42, y);
    y += 20;
    doc.setFontSize(10);

    Object.entries(session.categoryDurationsSec).forEach(([label, sec]) => {
      doc.text(`${label}: ${Math.round(sec)}s`, 54, y);
      y += 16;
    });

    if (session.microsleepEvents.length > 0) {
      y += 14;
      doc.setFontSize(13);
      doc.text('Recorded Microsleep-Like Events', 42, y);
      y += 20;
      doc.setFontSize(9.5);
      session.microsleepEvents.slice(0, 10).forEach((evt) => {
        doc.text(
          `${evt.timeFormatted} — Duration: ${evt.durationSec.toFixed(1)}s · Confidence: ${evt.confidencePct}% · ${evt.notes}`,
          54,
          y
        );
        y += 15;
      });
    }

    y = Math.max(y + 24, 730);
    doc.setDrawColor(226, 232, 240);
    doc.line(42, y, pageWidth - 42, y);
    y += 16;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Notice & Limitations: ${session.limitationsNote}`,
      42,
      y,
      { maxWidth: pageWidth - 84 }
    );

    doc.save(`sleepycam_report_${session.dateStr}_${session.id.slice(0, 6)}.pdf`);
  }

  public printReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const reportService = new ReportServiceClass();
