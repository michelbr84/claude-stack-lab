import type { Scenario } from '@lab/scenario-core';
import { ModuleSizeAdapter } from '@lab/adapters';
import type { ScenarioResult } from '@lab/shared';
import { join, relative } from 'node:path';

export const scenario005: Scenario = {
  id: '005-module-sizes',
  title: 'Module sizes',
  category: 'module-size',
  objective:
    'the large-modules fixture must contain at least one file exceeding the V1 ceiling (300 lines)',
  fixture: 'large-modules',
  expectedCommand: 'lab internal: module-size analyzer',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'oversized_files', operator: '>=', value: 1 }]
  },
  minimumEvidence: [
    { kind: 'file', pathRelativeToRun: 'module-size.json', description: 'size report' }
  ],
  async run(ctx): Promise<ScenarioResult> {
    if (!ctx.fixturePath) {
      return error(this.id, 'fixture path not provided');
    }
    const adapter = new ModuleSizeAdapter({
      include: [relative(ctx.cwd, join(ctx.fixturePath, 'src')) || 'src'],
      maxLines: 300
    });
    const r = await adapter.run({ cwd: ctx.cwd, evidenceDir: ctx.evidenceDir });
    const oversized = r.metrics.oversized_files ?? 0;
    const status = oversized >= 1 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: r.metrics,
      adapters: [r],
      evidencePaths: [ctx.evidenceDir],
      notes: [`oversized files = ${oversized} (expected >= 1)`],
      ...(status === 'pass'
        ? {}
        : { failureReason: `expected at least one oversized file, found ${oversized}` })
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
