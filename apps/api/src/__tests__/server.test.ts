import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildServer } from '../server.js';
import { EvidenceStore } from '../store.js';

let workdir: string;
let evidenceRoot: string;

const fakeReport = (runId: string, score = 100, status: 'pass' | 'fail' = 'pass') => ({
  schemaVersion: 1,
  run: {
    runId,
    startedAt: '2026-04-21T00:00:00.000Z',
    finishedAt: '2026-04-21T00:00:10.000Z',
    durationMs: 10000,
    scenarios: [
      {
        scenarioId: '001-bootstrap',
        status,
        startedAt: '',
        finishedAt: '',
        durationMs: 0,
        metrics: {},
        adapters: [],
        evidencePaths: [],
        notes: []
      }
    ],
    globalScore: score,
    globalStatus: status
  },
  score: {
    score,
    status,
    perScenario: [
      {
        scenarioId: '001-bootstrap',
        category: 'bootstrap',
        status,
        score,
        rationale: ''
      }
    ],
    perCategory: [
      {
        category: 'bootstrap',
        score,
        total: 1,
        passed: status === 'pass' ? 1 : 0,
        failed: status === 'pass' ? 0 : 1
      }
    ]
  }
});

const writeRunJson = async (runId: string, report: unknown): Promise<void> => {
  await fs.mkdir(join(evidenceRoot, 'json'), { recursive: true });
  await fs.writeFile(join(evidenceRoot, 'json', `${runId}.json`), JSON.stringify(report), 'utf8');
};

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-api-'));
  evidenceRoot = join(workdir, 'evidence');
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

const stubScenarios = [
  { id: '001-bootstrap', title: 'Bootstrap', category: 'bootstrap', fixture: null },
  { id: '002-coverage', title: 'Coverage threshold', category: 'coverage', fixture: 'low-coverage' }
];

const buildApp = () =>
  buildServer({
    store: new EvidenceStore({ evidenceRoot }),
    scenarios: stubScenarios
  });

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    const body = r.json<{ status: string; ts: string }>();
    expect(body.status).toBe('ok');
    expect(body.ts).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('GET /scenarios', () => {
  it('lists the registered scenarios', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/scenarios' });
    expect(r.statusCode).toBe(200);
    const body = r.json<{ count: number; scenarios: Array<{ id: string }> }>();
    expect(body.count).toBe(2);
    expect(body.scenarios.map((s) => s.id)).toEqual(['001-bootstrap', '002-coverage']);
  });
});

describe('GET /runs', () => {
  it('returns an empty array when no runs are stored', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/runs' });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ count: number }>().count).toBe(0);
  });

  it('returns newest runs first with summaries', async () => {
    await writeRunJson('2026-04-21T00-00-00-000Z-aaaaaa', fakeReport('2026-04-21T00-00-00-000Z-aaaaaa', 100));
    await writeRunJson('2026-04-21T00-00-10-000Z-bbbbbb', fakeReport('2026-04-21T00-00-10-000Z-bbbbbb', 80, 'fail'));
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/runs' });
    const body = r.json<{ count: number; runs: Array<{ runId: string; score: number }> }>();
    expect(body.count).toBe(2);
    expect(body.runs[0]!.runId).toContain('bbbbbb');
    expect(body.runs[1]!.runId).toContain('aaaaaa');
  });

  it('honours limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      const id = `2026-04-21T00-00-0${i}-000Z-run00${i}`;
      await writeRunJson(id, fakeReport(id));
    }
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/runs?limit=2&offset=1' });
    const body = r.json<{ runs: Array<{ runId: string }> }>();
    expect(body.runs).toHaveLength(2);
  });
});

describe('GET /runs/:runId', () => {
  it('returns 404 for missing runs', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/runs/missing' });
    expect(r.statusCode).toBe(404);
  });

  it('returns the stored report for a valid id', async () => {
    const id = '2026-04-21T00-00-00-000Z-cccccc';
    await writeRunJson(id, fakeReport(id));
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: `/runs/${id}` });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ run: { runId: string } }>().run.runId).toBe(id);
  });

  it('rejects malformed run ids with 400', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/runs/..%2Fetc%2Fpasswd' });
    expect(r.statusCode).toBe(400);
  });
});

describe('GET /runs/:runId/markdown', () => {
  it('renders a markdown summary for a stored run', async () => {
    const id = '2026-04-21T00-00-00-000Z-dddddd';
    await writeRunJson(id, fakeReport(id));
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: `/runs/${id}/markdown` });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toMatch(/markdown/);
    expect(r.body).toMatch(/# /);
  });
});

describe('GET /baseline', () => {
  it('returns 404 when no baseline is committed', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/baseline' });
    expect(r.statusCode).toBe(404);
  });

  it('returns the committed baseline when present', async () => {
    await fs.mkdir(join(evidenceRoot, 'snapshots'), { recursive: true });
    await fs.writeFile(
      join(evidenceRoot, 'snapshots', 'baseline-run.json'),
      JSON.stringify(fakeReport('baseline-x')),
      'utf8'
    );
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/baseline' });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ run: { runId: string } }>().run.runId).toBe('baseline-x');
  });
});

describe('not-found handler', () => {
  it('returns a structured 404 for unknown routes', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'GET', url: '/does/not/exist' });
    expect(r.statusCode).toBe(404);
    expect(r.json<{ error: string }>().error).toBe('not_found');
  });
});

describe('POST /runs (no bridge)', () => {
  it('responds 501 when no runner bridge is configured', async () => {
    const app = buildApp();
    const r = await app.inject({ method: 'POST', url: '/runs', payload: { target: 'all' } });
    expect(r.statusCode).toBe(501);
    expect(r.json<{ error: string }>().error).toBe('not_implemented');
  });
});

type BridgeStub = import('../runner-bridge.js').RunnerBridge;
const fakeBridge = (
  trigger: BridgeStub['trigger'],
  activeRun: BridgeStub['activeRun'] = () => null
): BridgeStub =>
  ({
    trigger,
    activeRun,
    isBusy: () => activeRun() !== null,
    waitForActive: async () => undefined
  }) as unknown as BridgeStub;

describe('POST /runs (with bridge)', () => {
  it('returns 202 with a runId for a valid target', async () => {
    const app = buildServer({
      store: new EvidenceStore({ evidenceRoot }),
      scenarios: stubScenarios,
      runnerBridge: fakeBridge(async () => ({
        runId: 'r1',
        target: '001-a',
        startedAt: 't',
        accepted: true
      }))
    });
    const r = await app.inject({ method: 'POST', url: '/runs', payload: { target: '001-a' } });
    expect(r.statusCode).toBe(202);
    expect(r.json<{ runId: string; accepted: boolean }>().runId).toBe('r1');
  });

  it('returns 409 when a run is already active', async () => {
    const app = buildServer({
      store: new EvidenceStore({ evidenceRoot }),
      scenarios: stubScenarios,
      runnerBridge: fakeBridge(async () => ({
        runId: 'r1',
        target: '001-a',
        startedAt: 't',
        accepted: false,
        reason: 'a run is already in progress'
      }))
    });
    const r = await app.inject({ method: 'POST', url: '/runs', payload: { target: '001-a' } });
    expect(r.statusCode).toBe(409);
  });

  it('returns 400 when the target is malformed', async () => {
    const app = buildServer({
      store: new EvidenceStore({ evidenceRoot }),
      scenarios: stubScenarios,
      runnerBridge: fakeBridge(async () => {
        throw new Error('invalid target "../"');
      })
    });
    const r = await app.inject({ method: 'POST', url: '/runs', payload: { target: '../' } });
    expect(r.statusCode).toBe(400);
  });

  it('GET /runs/active returns null when idle', async () => {
    const app = buildServer({
      store: new EvidenceStore({ evidenceRoot }),
      scenarios: stubScenarios,
      runnerBridge: fakeBridge(
        async () => ({ runId: 'x', target: 'y', startedAt: 't', accepted: true }),
        () => null
      )
    });
    const r = await app.inject({ method: 'GET', url: '/runs/active' });
    expect(r.statusCode).toBe(200);
    expect(r.json<{ active: null }>().active).toBeNull();
  });

  it('GET /runs/active returns the active run when busy', async () => {
    const app = buildServer({
      store: new EvidenceStore({ evidenceRoot }),
      scenarios: stubScenarios,
      runnerBridge: fakeBridge(
        async () => ({ runId: 'x', target: 'y', startedAt: 't', accepted: true }),
        () => ({ runId: 'r42', target: 'all', startedAt: 't' })
      )
    });
    const r = await app.inject({ method: 'GET', url: '/runs/active' });
    expect(r.json<{ active: { runId: string } }>().active.runId).toBe('r42');
  });
});
