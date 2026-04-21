import type { Scenario } from '@lab/scenario-core';
import { ComplexityAdapter } from '@lab/adapters';
import type { ScenarioResult } from '@lab/shared';
import { join, relative } from 'node:path';

export const scenario004: Scenario = {
  id: '004-cyclomatic-complexity',
  title: 'Cyclomatic complexity',
  category: 'complexity',
  objective:
    'the high-complexity fixture must contain at least one function exceeding the V1 ceiling (12)',
  fixture: 'high-complexity',
  expectedCommand: 'lab internal: complexity analyzer',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'max_complexity', operator: '>', value: 12 }]
  },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'complexity.json', description: 'complexity report' }
  ],
  async run(ctx): Promise<ScenarioResult> {
    if (!ctx.fixturePath) {
      return error(this.id, 'fixture path not provided');
    }
    const adapter = new ComplexityAdapter({
      include: [relative(ctx.cwd, join(ctx.fixturePath, 'src')) || 'src'],
      maxComplexity: 12
    });
    const r = await adapter.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const max = r.metrics.max_complexity ?? 0;
    const status = max > 12 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: r.metrics,
      adapters: [r],
      evidencePaths: [ctx.evidenceDir],
      notes: [`max complexity observed = ${max} (expected > 12)`],
      ...(status === 'pass' ? {} : { failureReason: `expected complexity > 12, observed ${max}` })
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
