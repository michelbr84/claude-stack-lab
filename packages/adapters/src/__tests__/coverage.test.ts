import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CoverageAdapter } from '../coverage.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-cov-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

const writeSummary = async (path: string, pct: number): Promise<void> => {
  const summary = {
    total: {
      lines: { pct },
      statements: { pct },
      functions: { pct },
      branches: { pct }
    }
  };
  await fs.mkdir(join(path, '..'), { recursive: true });
  await fs.writeFile(path, JSON.stringify(summary), 'utf8');
};

describe('CoverageAdapter (skipRun)', () => {
  it('returns ok when summary meets all thresholds', async () => {
    const summaryPath = join(workdir, 'coverage', 'coverage-summary.json');
    await writeSummary(summaryPath, 95);
    const adapter = new CoverageAdapter({
      summaryPath: 'coverage/coverage-summary.json',
      minLines: 80,
      minBranches: 80,
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('ok');
    expect(r.metrics.coverage_lines).toBe(95);
    expect(r.violations).toHaveLength(0);
  });

  it('returns violation when summary falls short', async () => {
    const summaryPath = join(workdir, 'coverage', 'coverage-summary.json');
    await writeSummary(summaryPath, 50);
    const adapter = new CoverageAdapter({
      summaryPath: 'coverage/coverage-summary.json',
      minLines: 80,
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('violation');
    expect(r.metrics.coverage_lines).toBe(50);
    expect(r.violations.find((v) => v.rule.includes('lines'))).toBeTruthy();
  });

  it('returns error when no summary file exists', async () => {
    const adapter = new CoverageAdapter({
      summaryPath: 'coverage/coverage-summary.json',
      skipRun: true
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('error');
    expect(r.violations[0]?.rule).toBe('coverage-summary-missing');
  });
});
