import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { writeJson, pathExists } from '@lab/shared';
import { join } from 'node:path';

/**
 * Scenario 007 records a ClaudeMaxPower /tdd-loop validation.
 *
 * The lab cannot itself invoke `/tdd-loop` (slash commands run in
 * Claude Code, not in the runner). Instead, this scenario asserts
 * that an operator-produced manifest exists and conforms to the
 * schema. The manifest is committed under
 * `evidence/snapshots/007-tdd-loop/manifest.json` and includes the
 * skill used, the prompt given, the metric movement, and the diff
 * URL. This makes the validation cycle reproducible and auditable.
 */
export const scenario007: Scenario = {
  id: '007-tdd-loop',
  title: 'TDD loop validation (manifest)',
  category: 'cmp-validation',
  objective:
    'a /tdd-loop validation cycle has been recorded in evidence/snapshots/007-tdd-loop/manifest.json',
  fixture: 'mutation-survivors',
  expectedCommand: '/tdd-loop on the mutation-survivors fixture, then commit manifest',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'mutation_score_delta', operator: '>=', value: 10 }]
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
      '007-tdd-loop',
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
          'no /tdd-loop manifest committed yet — run the skill, then commit the manifest under evidence/snapshots/007-tdd-loop/manifest.json'
        ]
      };
    }

    const { promises: fs } = await import('node:fs');
    const raw = await fs.readFile(manifestPath, 'utf8');
    let parsed: TddLoopManifest;
    try {
      parsed = JSON.parse(raw) as TddLoopManifest;
    } catch (e) {
      return failure(this.id, ctx.evidenceDir, `manifest is not valid JSON: ${(e as Error).message}`);
    }

    const validation = validateManifest(parsed);
    if (!validation.ok) return failure(this.id, ctx.evidenceDir, validation.reason);

    await writeJson(join(ctx.evidenceDir, 'manifest.json'), parsed);

    const delta = parsed.metrics.afterMutationScore - parsed.metrics.beforeMutationScore;
    const status = delta >= 10 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        before_mutation_score: parsed.metrics.beforeMutationScore,
        after_mutation_score: parsed.metrics.afterMutationScore,
        mutation_score_delta: delta
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [`/tdd-loop moved mutation score ${parsed.metrics.beforeMutationScore} -> ${parsed.metrics.afterMutationScore} (Δ ${delta})`],
      ...(status === 'pass'
        ? {}
        : { failureReason: `mutation score delta ${delta} < required 10` })
    };
  }
};

interface TddLoopManifest {
  skill: string;
  prompt: string;
  fixture: string;
  metrics: { beforeMutationScore: number; afterMutationScore: number };
  diff?: string;
  recordedAt: string;
}

function validateManifest(m: TddLoopManifest): { ok: true } | { ok: false; reason: string } {
  if (!m.skill || !m.skill.startsWith('/')) return { ok: false, reason: 'skill must start with /' };
  if (!m.prompt || m.prompt.trim().length === 0) return { ok: false, reason: 'prompt is required' };
  if (!m.fixture) return { ok: false, reason: 'fixture is required' };
  if (typeof m.metrics?.beforeMutationScore !== 'number')
    return { ok: false, reason: 'metrics.beforeMutationScore must be a number' };
  if (typeof m.metrics?.afterMutationScore !== 'number')
    return { ok: false, reason: 'metrics.afterMutationScore must be a number' };
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
