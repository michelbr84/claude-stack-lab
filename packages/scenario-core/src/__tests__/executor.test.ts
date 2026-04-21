import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScenarioRegistry } from '../registry.js';
import { ScenarioExecutor } from '../executor.js';
import type { Scenario } from '../scenario.js';

const make = (id: string, status: 'pass' | 'fail' | 'error' = 'pass'): Scenario => ({
  id,
  title: id,
  category: 'bootstrap',
  objective: 'x',
  fixture: null,
  expectedCommand: 'noop',
  expectedResult: { status: 'pass' },
  minimumEvidence: [],
  run: async (ctx) => {
    if (status === 'error') throw new Error('boom');
    return {
      scenarioId: id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: { sample: 1 },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: []
    };
  }
});

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-exec-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('ScenarioExecutor.runOne', () => {
  it('creates the evidence dir and runs the scenario', async () => {
    const reg = new ScenarioRegistry();
    reg.register(make('001-a'));
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const r = await exec.runOne('001-a');
    expect(r.status).toBe('pass');
    expect(r.scenarioId).toBe('001-a');
    expect(r.metrics.sample).toBe(1);
    const dir = join(workdir, 'raw', '001-a');
    const entries = await fs.readdir(dir);
    expect(entries.length).toBe(1);
  });

  it('captures thrown errors as status=error with failureReason', async () => {
    const reg = new ScenarioRegistry();
    reg.register(make('001-a', 'error'));
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const r = await exec.runOne('001-a');
    expect(r.status).toBe('error');
    expect(r.failureReason).toMatch(/boom/);
  });
});

describe('ScenarioExecutor.runAll', () => {
  it('aggregates all scenarios into a RunReport', async () => {
    const reg = new ScenarioRegistry();
    reg.registerAll([make('001-a'), make('002-b')]);
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const report = await exec.runAll();
    expect(report.scenarios).toHaveLength(2);
    expect(report.globalStatus).toBe('pass');
    expect(report.globalScore).toBe(100);
    expect(report.runId).toBeTruthy();
  });

  it('marks globalStatus=fail when any scenario fails', async () => {
    const reg = new ScenarioRegistry();
    reg.registerAll([make('001-a', 'pass'), make('002-b', 'fail')]);
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const report = await exec.runAll();
    expect(report.globalStatus).toBe('fail');
    expect(report.globalScore).toBe(50);
  });

  it('marks globalStatus=error when any scenario errors', async () => {
    const reg = new ScenarioRegistry();
    reg.registerAll([make('001-a'), make('002-b', 'error')]);
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const report = await exec.runAll();
    expect(report.globalStatus).toBe('error');
  });

  it('handles an empty registry without crashing', async () => {
    const reg = new ScenarioRegistry();
    const exec = new ScenarioExecutor(reg, {
      evidenceRoot: workdir,
      cwd: workdir,
      fixturesRoot: workdir
    });
    const report = await exec.runAll();
    expect(report.scenarios).toHaveLength(0);
    expect(report.globalScore).toBe(0);
  });
});
