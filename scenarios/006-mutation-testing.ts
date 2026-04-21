import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { writeJson } from '@lab/shared';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Mutation testing is expensive. For V1 we run an *inline* surrogate:
 * we apply a tiny, predictable set of mutations to the fixture, run
 * its tests, and count how many mutants survive. The intent is to
 * prove the lab can detect a weak suite even before Stryker is wired
 * up in Phase 5.
 */
export const scenario006: Scenario = {
  id: '006-mutation-testing',
  title: 'Mutation testing (surrogate)',
  category: 'mutation',
  objective:
    'the mutation-survivors fixture has weak assertions; surrogate mutation must show many survivors',
  fixture: 'mutation-survivors',
  expectedCommand: 'lab internal: surrogate mutation analyzer',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'mutation_score', operator: '<', value: 65 }]
  },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'mutation.json', description: 'surrogate mutation report' }
  ],
  async run(ctx): Promise<ScenarioResult> {
    if (!ctx.fixturePath) {
      return error(this.id, 'fixture path not provided');
    }

    const target = join(ctx.fixturePath, 'src', 'arithmetic.ts');
    const original = await fs.readFile(target, 'utf8');

    const mutants: Array<{ id: string; pattern: RegExp; replace: string }> = [
      { id: 'gt-to-lt', pattern: /a > b/, replace: 'a < b' },
      { id: 'gt-to-gte', pattern: /n > 0/, replace: 'n >= 0' },
      { id: 'lt-to-lte', pattern: /n < lo/, replace: 'n <= lo' },
      { id: 'gt-to-lt-clamp', pattern: /n > hi/, replace: 'n < hi' },
      { id: 'return-lo', pattern: /return n;\s*\n}/, replace: 'return lo;\n}' }
    ];

    let killed = 0;
    let survived = 0;
    const detail: Array<{ id: string; status: 'killed' | 'survived' }> = [];

    for (const m of mutants) {
      if (!m.pattern.test(original)) {
        // mutation does not apply — treat as not-counted
        continue;
      }
      const mutated = original.replace(m.pattern, m.replace);
      await fs.writeFile(target, mutated, 'utf8');
      try {
        const { runCommand } = await import('@lab/adapters');
        const r = await runCommand('pnpm', ['--filter', '@fixture/mutation-survivors', 'test'], {
          cwd: ctx.cwd,
          shell: process.platform === 'win32',
          timeoutMs: 120_000
        });
        if (r.exitCode !== 0) {
          killed++;
          detail.push({ id: m.id, status: 'killed' });
        } else {
          survived++;
          detail.push({ id: m.id, status: 'survived' });
        }
      } finally {
        await fs.writeFile(target, original, 'utf8');
      }
    }

    const total = killed + survived;
    const score = total === 0 ? 0 : Math.round((killed / total) * 10000) / 100;

    await writeJson(join(ctx.evidenceDir, 'mutation.json'), {
      total,
      killed,
      survived,
      score,
      mutants: detail
    });

    const status = score < 65 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        mutation_score: score,
        mutants_total: total,
        mutants_killed: killed,
        mutants_survived: survived
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [`surrogate mutation score = ${score}% (expected < 65%)`],
      ...(status === 'pass'
        ? {}
        : { failureReason: `expected mutation score < 65%, observed ${score}%` })
    };
  }
};

function error(id: string, reason: string): ScenarioResult {
  return {
    scenarioId: id,
    status: 'error',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: {},
    adapters: [],
    evidencePaths: [],
    notes: [reason],
    failureReason: reason
  };
}
