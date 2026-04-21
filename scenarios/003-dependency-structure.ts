import type { Scenario } from '@lab/scenario-core';
import { DependencyAdapter } from '@lab/adapters';
import type { ScenarioResult } from '@lab/shared';
import { join, relative } from 'node:path';

export const scenario003: Scenario = {
  id: '003-dependency-structure',
  title: 'Dependency structure (cycles)',
  category: 'dependency-structure',
  objective:
    'the circular-deps fixture must contain at least one detected dependency cycle',
  fixture: 'circular-deps',
  expectedCommand: 'lab internal: dependency analyzer',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'cycles', operator: '>=', value: 1 }]
  },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'dependency.json', description: 'dependency report' }
  ],
  async run(ctx): Promise<ScenarioResult> {
    if (!ctx.fixturePath) {
      return error(this.id, 'fixture path not provided');
    }
    const adapter = new DependencyAdapter({
      include: [relative(ctx.cwd, join(ctx.fixturePath, 'src')) || 'src']
    });
    const r = await adapter.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const cycles = r.metrics.cycles ?? 0;
    const status = cycles >= 1 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: r.metrics,
      adapters: [r],
      evidencePaths: [ctx.evidenceDir],
      notes: [`detected ${cycles} cycle(s) (expected >= 1)`],
      ...(status === 'pass' ? {} : { failureReason: `expected at least one cycle, found ${cycles}` })
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
