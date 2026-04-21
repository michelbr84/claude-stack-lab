import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvidenceStore } from '../store.js';

let workdir: string;
let evidenceRoot: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-store-'));
  evidenceRoot = join(workdir, 'evidence');
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

const fakeReport = (runId: string) => ({
  schemaVersion: 1,
  run: {
    runId,
    startedAt: '2026-04-21T00:00:00.000Z',
    finishedAt: '2026-04-21T00:00:10.000Z',
    durationMs: 10000,
    scenarios: [],
    globalScore: 100,
    globalStatus: 'pass' as const
  },
  score: {
    score: 100,
    status: 'pass' as const,
    perScenario: [],
    perCategory: []
  }
});

describe('EvidenceStore', () => {
  it('listRuns returns an empty list when evidence dir does not exist', async () => {
    const store = new EvidenceStore({ evidenceRoot });
    expect(await store.listRuns()).toEqual([]);
  });

  it('listRuns returns summaries newest first', async () => {
    await fs.mkdir(join(evidenceRoot, 'json'), { recursive: true });
    const idA = '2026-04-21T00-00-00-000Z-aaaaaa';
    const idB = '2026-04-21T00-00-10-000Z-bbbbbb';
    await fs.writeFile(join(evidenceRoot, 'json', `${idA}.json`), JSON.stringify(fakeReport(idA)));
    await fs.writeFile(join(evidenceRoot, 'json', `${idB}.json`), JSON.stringify(fakeReport(idB)));
    const store = new EvidenceStore({ evidenceRoot });
    const runs = await store.listRuns();
    expect(runs.map((r) => r.runId)).toEqual([idB, idA]);
  });

  it('listRuns skips malformed files', async () => {
    await fs.mkdir(join(evidenceRoot, 'json'), { recursive: true });
    await fs.writeFile(join(evidenceRoot, 'json', 'bad.json'), '{not json}');
    const store = new EvidenceStore({ evidenceRoot });
    expect(await store.listRuns()).toEqual([]);
  });

  it('getRun returns null when missing', async () => {
    const store = new EvidenceStore({ evidenceRoot });
    expect(await store.getRun('missing-x')).toBeNull();
  });

  it('getRun rejects malformed ids with a thrown error', async () => {
    const store = new EvidenceStore({ evidenceRoot });
    await expect(() => store.getRun('../etc/passwd')).rejects.toThrow(/invalid run id/);
  });

  it('getBaseline reads the committed baseline', async () => {
    await fs.mkdir(join(evidenceRoot, 'snapshots'), { recursive: true });
    await fs.writeFile(
      join(evidenceRoot, 'snapshots', 'baseline-run.json'),
      JSON.stringify(fakeReport('baseline-x'))
    );
    const store = new EvidenceStore({ evidenceRoot });
    const report = await store.getBaseline();
    expect(report?.run.runId).toBe('baseline-x');
  });

  it('getRun("baseline") delegates to the baseline file', async () => {
    await fs.mkdir(join(evidenceRoot, 'snapshots'), { recursive: true });
    await fs.writeFile(
      join(evidenceRoot, 'snapshots', 'baseline-run.json'),
      JSON.stringify(fakeReport('baseline-y'))
    );
    const store = new EvidenceStore({ evidenceRoot });
    const report = await store.getRun('baseline');
    expect(report?.run.runId).toBe('baseline-y');
  });

  it('getMarkdown renders a default report when no saved markdown exists', async () => {
    await fs.mkdir(join(evidenceRoot, 'json'), { recursive: true });
    const id = '2026-04-21T00-00-00-000Z-cccccc';
    await fs.writeFile(join(evidenceRoot, 'json', `${id}.json`), JSON.stringify(fakeReport(id)));
    const store = new EvidenceStore({ evidenceRoot });
    const md = await store.getMarkdown(id);
    expect(md).toContain(id);
    expect(md).toContain('| Scenario |');
  });

  it('getMarkdown prefers a saved report.md file when present', async () => {
    const id = '2026-04-21T00-00-00-000Z-dddddd';
    const runDir = join(evidenceRoot, 'runs', 'all', id);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(join(runDir, 'report.md'), '# preferred', 'utf8');
    const store = new EvidenceStore({ evidenceRoot });
    expect(await store.getMarkdown(id)).toBe('# preferred');
  });

  it('getMarkdown returns null when nothing found', async () => {
    const store = new EvidenceStore({ evidenceRoot });
    expect(await store.getMarkdown('does-not-exist')).toBeNull();
  });
});
