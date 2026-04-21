import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { pathExists, writeJson } from '@lab/shared';
import type { JsonReport } from '@lab/reporting';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Scenario 010 is the regression gate.
 *
 * It reads the committed baseline at
 * `evidence/snapshots/baseline-run.json` and asserts:
 *
 *   - the baseline exists and is well-formed,
 *   - its globalStatus is "pass",
 *   - its globalScore is >= 100,
 *   - scenarios 001..009 are all present,
 *   - every scenario in the baseline has status "pass".
 *
 * It is deliberately cheap and deterministic — it does not
 * re-execute the other scenarios. Its purpose is to make
 * committing a regressed baseline impossible: PR CI will run
 * 010 and fail when any scenario in the refreshed baseline has
 * slipped.
 */
export const scenario010: Scenario = {
  id: '010-full-regression',
  title: 'Full regression gate (baseline contract)',
  category: 'regression',
  objective:
    'the committed baseline still reflects a fully green lab: globalStatus pass, score 100, every scenario pass',
  fixture: null,
  expectedCommand: 'lab internal: baseline contract check',
  expectedResult: {
    status: 'pass',
    metricThresholds: [
      { metric: 'baseline_score', operator: '>=', value: 100 },
      { metric: 'failing_scenarios', operator: '==', value: 0 },
      { metric: 'missing_scenarios', operator: '==', value: 0 }
    ]
  },
  minimumEvidence: [
    {
      kind: 'file',
      pathRelativeToRun: 'regression-summary.json',
      description: 'per-scenario pass/fail comparison against the baseline'
    }
  ],
  async run(ctx): Promise<ScenarioResult> {
    const baselinePath = join(ctx.cwd, 'evidence', 'snapshots', 'baseline-run.json');
    if (!(await pathExists(baselinePath))) {
      return failure(
        this.id,
        ctx.evidenceDir,
        `missing baseline at ${baselinePath} — run "lab run all" and commit the JSON as evidence/snapshots/baseline-run.json`
      );
    }

    let report: JsonReport;
    try {
      report = JSON.parse(await fs.readFile(baselinePath, 'utf8')) as JsonReport;
    } catch (e) {
      return failure(
        this.id,
        ctx.evidenceDir,
        `baseline is not valid JSON: ${(e as Error).message}`
      );
    }

    // Score 010's own status out of the calculation — it validates the
    // other scenarios and would otherwise be a self-reference.
    const evaluated = report.run.scenarios.filter(
      (s) => s.scenarioId !== '010-full-regression'
    );
    const passedOthers = evaluated.filter((s) => s.status === 'pass').length;
    const effectiveScore =
      evaluated.length === 0 ? 0 : Math.round((passedOthers / evaluated.length) * 100);

    const violations: string[] = [];
    if (effectiveScore < 100) {
      violations.push(
        `effective score (scenarios 001..009) = ${effectiveScore}, expected >= 100`
      );
    }

    const presentIds = new Set(report.run.scenarios.map((s) => s.scenarioId));
    const requiredIds = [
      '001-bootstrap',
      '002-coverage',
      '003-dependency-structure',
      '004-cyclomatic-complexity',
      '005-module-sizes',
      '006-mutation-testing',
      '007-tdd-loop',
      '008-awesome-claude-token-stack',
      '009-refactor-module',
      '011-lab-mutation-score'
    ];
    const missing = requiredIds.filter((id) => !presentIds.has(id));
    if (missing.length > 0) {
      violations.push(`baseline missing scenarios: ${missing.join(', ')}`);
    }

    // Exclude scenario 010 itself from the failing check to break the
    // bootstrap chicken-and-egg: on first adoption the baseline will
    // briefly record 010=fail; that does not count against the check.
    const failing = report.run.scenarios.filter(
      (s) => s.status !== 'pass' && s.scenarioId !== '010-full-regression'
    );
    if (failing.length > 0) {
      violations.push(
        `baseline has non-pass scenarios: ${failing.map((s) => `${s.scenarioId}(${s.status})`).join(', ')}`
      );
    }

    await writeJson(join(ctx.evidenceDir, 'regression-summary.json'), {
      baselineRunId: report.run.runId,
      baselineScore: report.score.score,
      baselineStatus: report.score.status,
      scenariosInBaseline: report.run.scenarios.map((s) => ({
        id: s.scenarioId,
        status: s.status
      })),
      missingScenarios: missing,
      failingScenarios: failing.map((s) => s.scenarioId),
      violations
    });

    const status = violations.length === 0 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        baseline_score: effectiveScore,
        scenarios_in_baseline: report.run.scenarios.length,
        failing_scenarios: failing.length,
        missing_scenarios: missing.length
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [
        `baseline ${report.run.runId}: score=${report.score.score}, ${report.run.scenarios.length} scenarios, ${failing.length} failing, ${missing.length} missing`
      ],
      ...(status === 'pass' ? {} : { failureReason: violations.join('; ') })
    };
  }
};

function failure(id: string, evidenceDir: string, reason: string): ScenarioResult {
  return {
    scenarioId: id,
    status: 'fail',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: { failing_scenarios: 1, missing_scenarios: 0 },
    adapters: [],
    evidencePaths: [evidenceDir],
    notes: [reason],
    failureReason: reason
  };
}
