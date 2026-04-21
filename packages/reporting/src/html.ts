import { writeText, type RunReport } from '@lab/shared';
import type { GlobalScore } from '@lab/scoring-engine';

export function renderHtmlReport(run: RunReport, score: GlobalScore): string {
  const rows = score.perScenario
    .map(
      (s) =>
        `<tr class="row-${s.status}"><td>${esc(s.scenarioId)}</td><td>${esc(s.status)}</td><td>${s.score}</td><td>${esc(s.rationale)}</td></tr>`
    )
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>claude-stack-lab run ${esc(run.runId)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; color: #1f2937; }
  h1 { margin-bottom: 0.25rem; }
  .meta { color: #6b7280; margin-bottom: 1rem; font-size: 0.9rem; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .row-pass td { background: #ecfdf5; }
  .row-fail td { background: #fef2f2; }
  .row-error td { background: #fee2e2; }
  .row-skipped td { background: #f9fafb; }
  .score { font-size: 2rem; font-weight: 700; }
  .status-pass { color: #047857; }
  .status-fail, .status-error { color: #b91c1c; }
</style>
</head>
<body>
<h1>claude-stack-lab</h1>
<div class="meta">run <code>${esc(run.runId)}</code> · started ${esc(run.startedAt)} · ${run.durationMs} ms</div>
<div class="score status-${esc(score.status)}">${score.score} / 100 — ${esc(score.status)}</div>
<table>
  <thead><tr><th>Scenario</th><th>Status</th><th>Score</th><th>Notes</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</body>
</html>
`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function writeHtmlReport(
  path: string,
  run: RunReport,
  score: GlobalScore
): Promise<void> {
  await writeText(path, renderHtmlReport(run, score));
}
