import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { writeJson, pathExists } from '@lab/shared';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Scenario 009 validates a ClaudeMaxPower /refactor-module cycle.
 *
 * Same manifest pattern as scenario 007: the lab cannot invoke the
 * slash command at scenario time, so the operator runs /refactor-module
 * against a target fixture and commits a manifest documenting the
 * before/after metrics and the diff.
 *
 * Expected shape:
 *   {
 *     "skill": "/refactor-module",
 *     "prompt": "<the ask the operator gave>",
 *     "fixture": "large-modules",
 *     "target": "fixtures/large-modules/src/oversized.ts",
 *     "metrics": {
 *       "beforeMaxModuleLines": 350,
 *       "afterMaxModuleLines":  120,
 *       "beforeModuleCount":    1,
 *       "afterModuleCount":     3,
 *       "testsGreen":           true
 *     },
 *     "diff": "<optional: evidence/snapshots/009-refactor-module/...>",
 *     "recordedAt": "ISO-8601"
 *   }
 *
 * Pass criteria:
 *   - manifest exists and is well-formed,
 *   - afterMaxModuleLines <= 300 (V1 size ceiling),
 *   - afterMaxModuleLines < beforeMaxModuleLines,
 *   - testsGreen === true.
 */
export const scenario009: Scenario = {
  id: '009-refactor-module',
  title: 'Refactor module validation (manifest)',
  category: 'cmp-validation',
  objective:
    '/refactor-module reduced a module past the V1 size ceiling without regressing tests',
  fixture: 'large-modules',
  expectedCommand: '/refactor-module on fixtures/large-modules, then commit manifest',
  expectedResult: {
    status: 'pass',
    metricThresholds: [
      { metric: 'after_max_module_lines', operator: '<=', value: 300 },
      { metric: 'module_lines_delta', operator: '>=', value: 50 }
    ]
  },
  minimumEvidence: [
    {
      kind: 'file',
      pathRelativeToRun: 'manifest.json',
      description: 'copy of the validation manifest'
    }
  ],
  async run(ctx): Promise<ScenarioResult> {
    const manifestPath = join(
      ctx.cwd,
      'evidence',
      'snapshots',
      '009-refactor-module',
      'manifest.json'
    );
    if (!(await pathExists(manifestPath))) {
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
          'no /refactor-module manifest committed yet — run the skill on fixtures/large-modules and commit evidence/snapshots/009-refactor-module/manifest.json'
        ]
      };
    }

    const raw = await fs.readFile(manifestPath, 'utf8');
    let parsed: RefactorManifest;
    try {
      parsed = JSON.parse(raw) as RefactorManifest;
    } catch (e) {
      return failure(
        this.id,
        ctx.evidenceDir,
        `manifest is not valid JSON: ${(e as Error).message}`
      );
    }

    const validation = validateManifest(parsed);
    if (!validation.ok) return failure(this.id, ctx.evidenceDir, validation.reason);

    await writeJson(join(ctx.evidenceDir, 'manifest.json'), parsed);

    const delta = parsed.metrics.beforeMaxModuleLines - parsed.metrics.afterMaxModuleLines;
    const violations: string[] = [];
    if (parsed.metrics.afterMaxModuleLines > 300) {
      violations.push(`after=${parsed.metrics.afterMaxModuleLines} still exceeds ceiling 300`);
    }
    if (delta < 50) violations.push(`delta=${delta} < required 50`);
    if (!parsed.metrics.testsGreen) violations.push('testsGreen is false');

    const status = violations.length === 0 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        before_max_module_lines: parsed.metrics.beforeMaxModuleLines,
        after_max_module_lines: parsed.metrics.afterMaxModuleLines,
        module_lines_delta: delta,
        before_module_count: parsed.metrics.beforeModuleCount,
        after_module_count: parsed.metrics.afterModuleCount,
        tests_green: parsed.metrics.testsGreen ? 1 : 0
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [
        `/refactor-module moved max lines ${parsed.metrics.beforeMaxModuleLines} → ${parsed.metrics.afterMaxModuleLines} (Δ ${delta}), modules ${parsed.metrics.beforeModuleCount} → ${parsed.metrics.afterModuleCount}`
      ],
      ...(status === 'pass' ? {} : { failureReason: violations.join('; ') })
    };
  }
};

interface RefactorManifest {
  skill: string;
  prompt: string;
  fixture: string;
  target: string;
  metrics: {
    beforeMaxModuleLines: number;
    afterMaxModuleLines: number;
    beforeModuleCount: number;
    afterModuleCount: number;
    testsGreen: boolean;
  };
  diff?: string;
  recordedAt: string;
}

function validateManifest(m: RefactorManifest): { ok: true } | { ok: false; reason: string } {
  if (!m.skill || !m.skill.startsWith('/')) return { ok: false, reason: 'skill must start with /' };
  if (!m.prompt?.trim()) return { ok: false, reason: 'prompt is required' };
  if (!m.fixture) return { ok: false, reason: 'fixture is required' };
  if (!m.target) return { ok: false, reason: 'target path is required' };
  const nums = ['beforeMaxModuleLines', 'afterMaxModuleLines', 'beforeModuleCount', 'afterModuleCount'] as const;
  for (const k of nums) {
    if (typeof m.metrics?.[k] !== 'number') return { ok: false, reason: `metrics.${k} must be a number` };
  }
  if (typeof m.metrics?.testsGreen !== 'boolean') {
    return { ok: false, reason: 'metrics.testsGreen must be a boolean' };
  }
  if (!m.recordedAt) return { ok: false, reason: 'recordedAt is required' };
  return { ok: true };
}

function failure(id: string, evidenceDir: string, reason: string): ScenarioResult {
  return {
    scenarioId: id,
    status: 'fail',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: {},
    adapters: [],
    evidencePaths: [evidenceDir],
    notes: [reason],
    failureReason: reason
  };
}
