import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { pathExists, writeJson } from '@lab/shared';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Scenario 011 — real Stryker mutation score for the lab's own
 * packages. Reads the committed snapshot (not the ephemeral report)
 * so CI stays fast. The snapshot is refreshed by a human / nightly
 * workflow via `pnpm test:mutation`.
 *
 * Fails when the committed snapshot reports a mutation score below
 * the V1 floor. The floor starts conservatively and is intended to
 * be tightened as tests strengthen — when a refresh raises the
 * score, tighten the threshold in the same PR.
 */

// V1 floor. Current baseline is 54.51 — we set the bar a few points
// below that so normal variation does not red the gate, but still
// enough that any meaningful regression (say, a weakened test) is
// caught.
const MIN_SCORE = 50;

interface Summary {
  generatedAt: string;
  totals: {
    total: number;
    killed: number;
    survived: number;
    noCoverage: number;
    score: number;
    effectiveScore: number;
  };
  perFile: Record<string, { total: number; killed: number; score: number }>;
}

export const scenario011: Scenario = {
  id: '011-lab-mutation-score',
  title: 'Lab mutation score (committed Stryker snapshot)',
  category: 'mutation',
  objective: 'the lab\'s own packages maintain at least the V1 mutation floor',
  fixture: null,
  expectedCommand:
    'pnpm test:mutation && node scripts/refresh-mutation-summary.mjs && commit evidence/snapshots/lab-mutation/',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'mutation_score', operator: '>=', value: MIN_SCORE }]
  },
  minimumEvidence: [
    {
      kind: 'file',
      pathRelativeToRun: 'mutation-summary.json',
      description: 'copy of the committed lab-mutation summary'
    }
  ],
  async run(ctx): Promise<ScenarioResult> {
    const summaryPath = join(
      ctx.cwd,
      'evidence',
      'snapshots',
      'lab-mutation',
      'summary.json'
    );
    if (!(await pathExists(summaryPath))) {
      return {
        scenarioId: this.id,
        status: 'skipped',
        startedAt: '',
        finishedAt: '',
        durationMs: 0,
        metrics: {},
        adapters: [],
        evidencePaths: [ctx.evidenceDir],
        notes: [
          'no lab-mutation snapshot committed yet — run `pnpm test:mutation` and `node scripts/refresh-mutation-summary.mjs`, then commit evidence/snapshots/lab-mutation/'
        ]
      };
    }

    let summary: Summary;
    try {
      summary = JSON.parse(await fs.readFile(summaryPath, 'utf8')) as Summary;
    } catch (e) {
      return fail(this.id, ctx.evidenceDir, `summary is not valid JSON: ${(e as Error).message}`);
    }

    const score = summary.totals.score;
    const effective = summary.totals.effectiveScore;

    await writeJson(join(ctx.evidenceDir, 'mutation-summary.json'), summary);

    if (score < MIN_SCORE) {
      return fail(
        this.id,
        ctx.evidenceDir,
        `mutation score ${score}% < floor ${MIN_SCORE}%`,
        {
          mutation_score: score,
          effective_mutation_score: effective,
          mutants_total: summary.totals.total,
          mutants_killed: summary.totals.killed,
          mutants_survived: summary.totals.survived
        }
      );
    }

    // Rank the 3 weakest files for the human report
    const weakest = Object.entries(summary.perFile)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3)
      .map(([path, stats]) => `${path} (${stats.score}%)`);

    return {
      scenarioId: this.id,
      status: 'pass',
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        mutation_score: score,
        effective_mutation_score: effective,
        mutants_total: summary.totals.total,
        mutants_killed: summary.totals.killed,
        mutants_survived: summary.totals.survived
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [
        `mutation score ${score}% (effective ${effective}%) — floor is ${MIN_SCORE}%`,
        `weakest files: ${weakest.join(', ')}`
      ]
    };
  }
};

function fail(
  id: string,
  evidenceDir: string,
  reason: string,
  metrics: Record<string, number> = {}
): ScenarioResult {
  return {
    scenarioId: id,
    status: 'fail',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics,
    adapters: [],
    evidencePaths: [evidenceDir],
    notes: [reason],
    failureReason: reason
  };
}
