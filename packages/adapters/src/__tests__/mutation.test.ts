import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MutationAdapter } from '../mutation.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-mut-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

const writeReport = async (path: string, killed: number, total: number): Promise<void> => {
  const mutants: Array<{ status: string }> = [];
  for (let i = 0; i < killed; i++) mutants.push({ status: 'Killed' });
  for (let i = 0; i < total - killed; i++) mutants.push({ status: 'Survived' });
  const report = { files: { 'a.ts': { mutants } } };
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(report), 'utf8');
};

const writeRawReport = async (path: string, report: unknown): Promise<void> => {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(report), 'utf8');
};

describe('MutationAdapter (skipRun)', () => {
  it('exposes its name as "mutation"', () => {
    expect(new MutationAdapter().name).toBe('mutation');
  });

  it('computes a mutation score from a Stryker-shaped report', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeReport(path, 8, 10);
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('ok');
    expect(r.metrics.mutation_score).toBe(80);
    expect(r.metrics.mutants_killed).toBe(8);
    expect(r.metrics.mutants_survived).toBe(2);
    expect(r.metrics.mutants_total).toBe(10);
    expect(r.violations).toHaveLength(0);
    expect(r.rawArtifactPath).toBe(path);
  });

  it('returns violation when score falls below the threshold', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeReport(path, 3, 10);
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      minScore: 65,
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('violation');
    expect(r.metrics.mutation_score).toBe(30);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]?.rule).toBe('mutation-score-below-threshold');
    expect(r.violations[0]?.severity).toBe('error');
  });

  it('returns error when no report exists', async () => {
    const adapter = new MutationAdapter({
      reportPath: 'missing.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('error');
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]?.rule).toBe('mutation-report-missing');
    expect(r.violations[0]?.severity).toBe('error');
  });

  it('returns score 0 for an empty report', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeRawReport(path, { files: {} });
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.metrics.mutation_score).toBe(0);
    expect(r.metrics.mutants_total).toBe(0);
  });

  it('counts Timeout, CompileError, and RuntimeError as killed', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeRawReport(path, {
      files: {
        'a.ts': {
          mutants: [
            { status: 'Timeout' },
            { status: 'CompileError' },
            { status: 'RuntimeError' },
            { status: 'Killed' },
            { status: 'Survived' }
          ]
        }
      }
    });
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.metrics.mutants_killed).toBe(4);
    expect(r.metrics.mutants_survived).toBe(1);
    expect(r.metrics.mutation_score).toBe(80);
  });

  it('passes when score matches threshold exactly', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeReport(path, 65, 100);
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      minScore: 65,
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('ok');
    expect(r.metrics.mutation_score).toBe(65);
  });

  it('NoCoverage mutants count as survived (not killed)', async () => {
    const path = join(workdir, 'reports', 'mutation', 'mutation.json');
    await writeRawReport(path, {
      files: {
        'a.ts': {
          mutants: [
            { status: 'Killed' },
            { status: 'NoCoverage' },
            { status: 'NoCoverage' }
          ]
        }
      }
    });
    const adapter = new MutationAdapter({
      reportPath: 'reports/mutation/mutation.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.metrics.mutants_killed).toBe(1);
    expect(r.metrics.mutants_survived).toBe(2);
    expect(r.metrics.mutation_score).toBeCloseTo(33.33, 1);
  });
});
