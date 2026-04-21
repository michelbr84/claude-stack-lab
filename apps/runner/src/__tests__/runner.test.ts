import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Runner } from '../runner.js';
import type { Scenario } from '@lab/scenario-core';

const make = (id: string, status: 'pass' | 'fail' = 'pass'): Scenario => ({
  id,
  title: id,
  category: 'bootstrap',
  objective: 'x',
  fixture: null,
  expectedCommand: 'noop',
  expectedResult: { status: 'pass' },
  minimumEvidence: [],
  run: async (ctx) => ({
    scenarioId: id,
    status,
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: {},
    adapters: [],
    evidencePaths: [ctx.evidenceDir],
    notes: []
  })
});

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-runner-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('Runner', () => {
  it('runOne writes JSON, Markdown, and HTML reports', async () => {
    const runner = new Runner({
      cwd: workdir,
      evidenceRoot: join(workdir, 'evidence'),
      fixturesRoot: join(workdir, 'fixtures')
    });
    runner.register(make('001-a'));
    const out = await runner.runOne('001-a');
    expect(out.result.status).toBe('pass');
    expect(out.score.status).toBe('pass');
    for (const path of [out.reports.json, out.reports.md, out.reports.html]) {
      const stat = await fs.stat(path);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('runAll aggregates per-category scoring', async () => {
    const runner = new Runner({
      cwd: workdir,
      evidenceRoot: join(workdir, 'evidence'),
      fixturesRoot: join(workdir, 'fixtures')
    });
    runner.registerAll([make('001-a'), make('002-b', 'fail')]);
    const out = await runner.runAll();
    expect(out.run.scenarios).toHaveLength(2);
    expect(out.score.status).toBe('fail');
    expect(out.score.perCategory).toHaveLength(1);
  });
});
