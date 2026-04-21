import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { JsonReport } from '@lab/reporting';

export interface CompareResult {
  lines: string[];
}

export async function compareRuns(
  evidenceRoot: string,
  runIdA: string,
  runIdB: string
): Promise<CompareResult> {
  const a = await readReport(evidenceRoot, runIdA);
  const b = await readReport(evidenceRoot, runIdB);

  const lines: string[] = [];
  lines.push(`compare ${runIdA} -> ${runIdB}`);
  lines.push(`global score: ${a.score.score} -> ${b.score.score} (${diffNum(a.score.score, b.score.score)})`);
  lines.push(`global status: ${a.score.status} -> ${b.score.status}`);
  lines.push('');
  lines.push('per scenario:');
  const ids = new Set([
    ...a.score.perScenario.map((s) => s.scenarioId),
    ...b.score.perScenario.map((s) => s.scenarioId)
  ]);
  for (const id of [...ids].sort()) {
    const sa = a.score.perScenario.find((s) => s.scenarioId === id);
    const sb = b.score.perScenario.find((s) => s.scenarioId === id);
    const statusA = sa?.status ?? '—';
    const statusB = sb?.status ?? '—';
    const scoreA = sa?.score ?? 0;
    const scoreB = sb?.score ?? 0;
    lines.push(
      `  ${id.padEnd(28)} ${statusA.padEnd(7)} -> ${statusB.padEnd(7)}  ${scoreA} -> ${scoreB} (${diffNum(scoreA, scoreB)})`
    );
  }
  return { lines };
}

async function readReport(evidenceRoot: string, runId: string): Promise<JsonReport> {
  const path = join(evidenceRoot, 'json', `${runId}.json`);
  return JSON.parse(await fs.readFile(path, 'utf8')) as JsonReport;
}

function diffNum(a: number, b: number): string {
  const d = b - a;
  if (d === 0) return '=';
  return d > 0 ? `+${d}` : `${d}`;
}
