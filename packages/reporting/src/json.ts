import { writeJson, type RunReport } from '@lab/shared';
import type { GlobalScore } from '@lab/scoring-engine';

export interface JsonReport {
  schemaVersion: 1;
  run: RunReport;
  score: GlobalScore;
}

export function buildJsonReport(run: RunReport, score: GlobalScore): JsonReport {
  return { schemaVersion: 1, run, score };
}

export async function writeJsonReport(
  path: string,
  run: RunReport,
  score: GlobalScore
): Promise<void> {
  await writeJson(path, buildJsonReport(run, score));
}
