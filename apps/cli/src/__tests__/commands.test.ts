import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dispatch, type CommandContext } from '../commands.js';
import { parseArgs } from '../args.js';
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
    metrics: { sample: 1 },
    adapters: [],
    evidencePaths: [ctx.evidenceDir],
    notes: []
  })
});

let workdir: string;
let lines: string[];

const ctxFor = (scenarios: Scenario[]): CommandContext => ({
  cwd: workdir,
  evidenceRoot: join(workdir, 'evidence'),
  fixturesRoot: join(workdir, 'fixtures'),
  scenarios,
  out: (line) => lines.push(line)
});

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-cli-'));
  lines = [];
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('dispatch', () => {
  it('help returns 0 and prints usage', async () => {
    const code = await dispatch(parseArgs(['help']), ctxFor([]));
    expect(code).toBe(0);
    expect(lines.some((l) => l.includes('Commands:'))).toBe(true);
  });

  it('unknown command returns 2', async () => {
    const code = await dispatch(parseArgs(['nope']), ctxFor([]));
    expect(code).toBe(2);
  });

  it('list prints registered scenarios', async () => {
    const code = await dispatch(parseArgs(['list']), ctxFor([make('001-a')]));
    expect(code).toBe(0);
    expect(lines.some((l) => l.includes('001-a'))).toBe(true);
  });

  it('run with no positional returns 2', async () => {
    const code = await dispatch(parseArgs(['run']), ctxFor([make('001-a')]));
    expect(code).toBe(2);
  });

  it('run on a missing scenario returns 2', async () => {
    const code = await dispatch(parseArgs(['run', '999-missing']), ctxFor([make('001-a')]));
    expect(code).toBe(2);
  });

  it('run on a passing scenario returns 0 and writes reports', async () => {
    const code = await dispatch(parseArgs(['run', '001-a']), ctxFor([make('001-a')]));
    expect(code).toBe(0);
    expect(lines.some((l) => l.startsWith('json:'))).toBe(true);
  });

  it('run on a failing scenario returns 1', async () => {
    const code = await dispatch(parseArgs(['run', '001-a']), ctxFor([make('001-a', 'fail')]));
    expect(code).toBe(1);
  });

  it('run all returns 0 when every scenario passes', async () => {
    const code = await dispatch(
      parseArgs(['run', 'all']),
      ctxFor([make('001-a'), make('002-b')])
    );
    expect(code).toBe(0);
  });

  it('reset removes generated dirs', async () => {
    await fs.mkdir(join(workdir, 'evidence', 'raw'), { recursive: true });
    const code = await dispatch(parseArgs(['reset']), ctxFor([]));
    expect(code).toBe(0);
    const stat = await fs.stat(join(workdir, 'evidence', 'raw')).catch(() => null);
    expect(stat).toBeNull();
  });
});
