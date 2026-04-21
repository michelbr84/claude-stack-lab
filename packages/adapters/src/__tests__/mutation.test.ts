import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
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
  await fs.mkdir(join(path, '..'), { recursive: true });
  await fs.writeFile(path, JSON.stringify(report), 'utf8');
};

describe('MutationAdapter (skipRun)', () => {
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
    expect(r.metrics.mutants_total).toBe(10);
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
  });

  it('returns error when no report exists', async () => {
    const adapter = new MutationAdapter({
      reportPath: 'missing.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('error');
    expect(r.violations[0]?.rule).toBe('mutation-report-missing');
  });
});
