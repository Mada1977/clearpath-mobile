import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type Log = {
  id: string;
  type: string;
  addiction: string;
  trigger: string;
  mood?: string | null;
  outcome?: string | null;
  notes?: string | null;
  loggedAt: string;
};

type ReportData = {
  userName: string | null;
  streak: number;
  totalResisted: number;
  totalSlips: number;
  stabilityScore: number | null;
  logs: Log[];
  selectedLogIds: string[];
  weekStart: string;
  weekEnd: string;
};

const MOOD_COLOR: Record<string, string> = {
  great: '#10B981',
  good:  '#34D399',
  okay:  '#F59E0B',
  rough: '#EF4444',
};

const MOOD_LABEL: Record<string, string> = {
  great: 'Great',
  good:  'Good',
  okay:  'Okay',
  rough: 'Rough',
};

function buildHtml(data: ReportData): string {
  const { userName, streak, totalResisted, totalSlips, stabilityScore, logs, selectedLogIds, weekStart, weekEnd } = data;

  // Build last 7 days mood table
  const last7Days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toDateString());
  }

  const moodByDay: Record<string, string | null> = {};
  last7Days.forEach(day => { moodByDay[day] = null; });
  [...logs].reverse().forEach(l => {
    const day = new Date(l.loggedAt).toDateString();
    if (moodByDay[day] === null && l.mood) moodByDay[day] = l.mood;
  });

  const moodCells = last7Days.map(day => {
    const mood = moodByDay[day];
    const color = mood ? MOOD_COLOR[mood] : '#E5E7EB';
    const label = mood ? MOOD_LABEL[mood] : '—';
    const dayLabel = new Date(day).toLocaleDateString('en', { weekday: 'short' });
    return `
      <td style="text-align:center;padding:8px 4px;">
        <div style="width:32px;height:32px;border-radius:16px;background:${color};margin:0 auto;display:flex;align-items:center;justify-content:center;"></div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px;">${dayLabel}</div>
        <div style="font-size:11px;font-weight:600;color:#111827;">${label}</div>
      </td>`;
  }).join('');

  // Selected journal entries
  const selectedLogs = logs.filter(l => selectedLogIds.includes(l.id) && l.notes);
  const journalRows = selectedLogs.length > 0
    ? selectedLogs.map(l => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;">
            <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">${new Date(l.loggedAt).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} · ${l.addiction} · ${l.outcome ?? l.type}</div>
            <div style="font-size:14px;color:#111827;">${escapeHtml(l.notes ?? '')}</div>
          </td>
        </tr>`).join('')
    : '<tr><td style="padding:10px 0;color:#6B7280;font-size:13px;">No journal entries selected.</td></tr>';

  const scoreColor = stabilityScore === null ? '#6B7280'
    : stabilityScore >= 70 ? '#10B981'
    : stabilityScore >= 40 ? '#F59E0B'
    : '#EF4444';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; }
    .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }
    h1 { color: #4F46E5; font-size: 26px; margin: 0 0 4px; }
    h2 { font-size: 16px; color: #374151; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; margin: 28px 0 14px; }
    .header-meta { font-size: 13px; color: #6B7280; margin-bottom: 32px; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .stat-box { flex: 1; background: #F9FAFB; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-num { font-size: 32px; font-weight: 800; color: #4F46E5; }
    .stat-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
    .score-box { display: inline-block; background: #F9FAFB; border-radius: 12px; padding: 16px 28px; text-align: center; }
    .score-num { font-size: 48px; font-weight: 900; color: ${scoreColor}; }
    .footer { margin-top: 48px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 16px; }
  </style>
</head>
<body>
<div class="page">
  <h1>Bravely Path — Weekly Report</h1>
  <div class="header-meta">
    Prepared for <strong>${escapeHtml(userName ?? 'Anonymous')}</strong> &nbsp;·&nbsp; ${weekStart} – ${weekEnd}
  </div>

  <h2>Recovery Summary</h2>
  <div class="stats-row">
    <div class="stat-box">
      <div class="stat-num">${streak}</div>
      <div class="stat-label">Day Streak</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#10B981">${totalResisted}</div>
      <div class="stat-label">Times Resisted (7 days)</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#EF4444">${totalSlips}</div>
      <div class="stat-label">Slips (7 days)</div>
    </div>
  </div>

  ${stabilityScore !== null ? `
  <h2>Stability Score</h2>
  <div class="score-box">
    <div class="score-num">${stabilityScore}</div>
    <div style="font-size:13px;color:#6B7280;">/ 100</div>
  </div>
  ` : ''}

  <h2>Mood This Week</h2>
  <table style="width:100%;border-collapse:collapse;"><tr>${moodCells}</tr></table>

  <h2>Selected Journal Entries</h2>
  <table style="width:100%;border-collapse:collapse;">
    ${journalRows}
  </table>

  <div class="footer">
    Generated by Bravely Path on ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}.
    This report is intended to support conversations with your care team. It is not a clinical document.
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function generateAndShareReport(data: ReportData): Promise<void> {
  const html = buildHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share with your therapist',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}

export type { ReportData, Log };
