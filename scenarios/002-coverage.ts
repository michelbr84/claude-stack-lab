import type { Scenario } from '@lab/scenario-core';
import { CoverageAdapter } from '@lab/adapters';
import type { ScenarioResult } from '@lab/shared';
import { join } from 'node:path';

export const scenario002: Scenario = {
  id: '002-coverage',
  title: 'Coverage threshold',
  category: 'coverage',
  objective:
    'the low-coverage fixture must report coverage well below the V1 threshold (80%)',
  fixture: 'low-coverage',
  expectedCommand: 'pnpm --filter @fixture/low-coverage test:coverage',
  expectedResult: {
    status: 'fail',
    metricThresholds: [{ metric: 'coverage_lines', operator: '<', value: 80 }]
  },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'coverage.stdout.txt', description: 'coverage output' }
  ],
  async run(ctx): Promise<ScenarioResult> {
    if (!ctx.fixturePath) {
      return errorResult(this.id, 'fixture path not provided');
    }
    const adapter = new CoverageAdapter({
      command: 'pnpm',
      args: ['--filter', '@fixture/low-coverage', 'test:coverage'],
      summaryPath: join('fixtures', 'low-coverage', 'coverage', 'coverage-summary.json'),
      minLines: 80
    });
    const r = await adapter.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const lines = r.metrics.coverage_lines ?? 0;
    const status = lines < 80 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: r.metrics,
      adapters: [r],
      evidencePaths: [ctx.evidenceDir],
      notes: [
        `lab proves a coverage drop: lines=${lines}% (expected < 80%)`,
        ...(r.status === 'error' ? ['coverage adapter error — see evidence'] : [])
      ],
      ...(status === 'pass'
        ? {}
        : { failureReason: `expected coverage < 80%, observed ${lines}%` })
    };
  }
};

function errorResult(id: string, reason: string): ScenarioResult {
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
