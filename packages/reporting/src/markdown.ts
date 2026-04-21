import { writeText, type RunReport, type ScenarioResult } from '@lab/shared';
import type { GlobalScore } from '@lab/scoring-engine';

export function renderMarkdownReport(run: RunReport, score: GlobalScore): string {
  const lines: string[] = [];
  lines.push(`# claude-stack-lab — run ${run.runId}`);
  lines.push('');
  lines.push(`- **Started**: ${run.startedAt}`);
  lines.push(`- **Finished**: ${run.finishedAt}`);
  lines.push(`- **Duration**: ${run.durationMs} ms`);
  lines.push(`- **Global status**: \`${score.status}\``);
  lines.push(`- **Global score**: \`${score.score}\` / 100`);
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  lines.push('| ID | Status | Score | Notes |');
  lines.push('|---|---|---|---|');
  for (const s of score.perScenario) {
    lines.push(
      `| \`${s.scenarioId}\` | \`${s.status}\` | ${s.score} | ${escapeCell(s.rationale)} |`
    );
  }
  lines.push('');
  lines.push('## By category');
  lines.push('');
  lines.push('| Category | Score | Passed | Failed | Total |');
  lines.push('|---|---|---|---|---|');
  for (const c of score.perCategory) {
    lines.push(`| \`${c.category}\` | ${c.score} | ${c.passed} | ${c.failed} | ${c.total} |`);
  }
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  for (const r of run.scenarios) {
    lines.push(`### \`${r.scenarioId}\``);
    lines.push('');
    if (Object.keys(r.metrics).length === 0) {
      lines.push('_(no metrics)_');
    } else {
      lines.push('| Metric | Value |');
      lines.push('|---|---|');
      for (const [k, v] of Object.entries(r.metrics)) lines.push(`| ${k} | ${v} |`);
    }
    if (r.adapters.length > 0) {
      lines.push('');
      lines.push('**Adapters:**');
      for (const a of r.adapters) {
        lines.push(`- \`${a.adapter}\` → \`${a.status}\` (${a.violations.length} violations)`);
      }
    }
    appendFailureSection(lines, r);
    lines.push('');
  }
  return lines.join('\n');
}

function appendFailureSection(lines: string[], r: ScenarioResult): void {
  if (!r.failureReason) return;
  lines.push('');
  lines.push(`> **Failure reason**: ${escapeCell(r.failureReason)}`);
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export async function writeMarkdownReport(
  path: string,
  run: RunReport,
  score: GlobalScore
): Promise<void> {
  await writeText(path, renderMarkdownReport(run, score));
}
