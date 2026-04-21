import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Runner } from '@lab/runner';
import type { Scenario } from '@lab/scenario-core';
import { RunnerBridge } from '../runner-bridge.js';

let workdir: string;

const makeScenario = (id: string, delayMs = 0): Scenario => ({
  id,
  title: id,
  category: 'bootstrap',
  objective: 'x',
  fixture: null,
  expectedCommand: 'noop',
  expectedResult: { status: 'pass' },
  minimumEvidence: [],
  run: async (ctx) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    return {
      scenarioId: id,
      status: 'pass',
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {},
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: []
    };
  }
});

const factoryFor = (root: string) => (): Runner =>
  new Runner({
    cwd: root,
    evidenceRoot: join(root, 'evidence'),
    fixturesRoot: join(root, 'fixtures')
  });

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-bridge-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('RunnerBridge', () => {
  it('rejects empty target', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a')]);
    await expect(() => bridge.trigger('')).rejects.toThrow(/required/);
  });

  it('rejects malformed target characters', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a')]);
    await expect(() => bridge.trigger('../etc/passwd')).rejects.toThrow(/invalid target/);
  });

  it('rejects unknown scenario ids', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a')]);
    await expect(() => bridge.trigger('999-missing')).rejects.toThrow(/not registered/);
  });

  it('accepts a valid scenario and returns an accepted runId', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a')]);
    const r = await bridge.trigger('001-a');
    expect(r.accepted).toBe(true);
    expect(r.runId).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(r.target).toBe('001-a');
    await bridge.waitForActive();
    expect(bridge.isBusy()).toBe(false);
  });

  it('accepts "all" as a target', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [
      makeScenario('001-a'),
      makeScenario('002-b')
    ]);
    const r = await bridge.trigger('all');
    expect(r.accepted).toBe(true);
    expect(r.target).toBe('all');
    await bridge.waitForActive();
  });

  it('returns the active runId when a second trigger arrives while busy', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a', 200)]);
    const first = await bridge.trigger('001-a');
    expect(first.accepted).toBe(true);
    expect(bridge.isBusy()).toBe(true);
    const second = await bridge.trigger('001-a');
    expect(second.accepted).toBe(false);
    expect(second.reason).toMatch(/in progress/);
    expect(second.runId).toBe(first.runId);
    await bridge.waitForActive();
  });

  it('activeRun() returns null when idle', async () => {
    const bridge = new RunnerBridge(factoryFor(workdir), [makeScenario('001-a')]);
    expect(bridge.activeRun()).toBeNull();
  });
});
