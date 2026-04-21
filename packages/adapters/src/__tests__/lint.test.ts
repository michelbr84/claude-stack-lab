import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LintAdapter } from '../lint.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-lint-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('LintAdapter', () => {
  it('exposes its name as "lint"', () => {
    expect(new LintAdapter().name).toBe('lint');
  });

  it('reports ok when the configured command exits 0', async () => {
    const adapter = new LintAdapter({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("ok")'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('ok');
    expect(r.metrics.exit_code).toBe(0);
    expect(r.violations).toHaveLength(0);
    const stdout = await fs.readFile(join(workdir, 'lint.stdout.txt'), 'utf8');
    expect(stdout).toBe('ok');
  });

  it('reports violation and an error violation when the command exits non-zero', async () => {
    const adapter = new LintAdapter({
      command: process.execPath,
      args: ['-e', 'process.exit(2)'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('violation');
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]?.severity).toBe('error');
    expect(r.violations[0]?.rule).toBe('lint');
    expect(r.violations[0]?.message).toContain('exited with 2');
  });

  it('captures stderr output alongside stdout', async () => {
    const adapter = new LintAdapter({
      command: process.execPath,
      args: ['-e', 'process.stderr.write("warnings"); process.exit(0)'],
      shell: false
    });
    await adapter.run({ cwd: workdir, evidenceDir: workdir });
    const stderr = await fs.readFile(join(workdir, 'lint.stderr.txt'), 'utf8');
    expect(stderr).toContain('warnings');
  });

  it('writes rawArtifactPath pointing at the stdout file', async () => {
    const adapter = new LintAdapter({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("x")'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.rawArtifactPath).toBe(join(workdir, 'lint.stdout.txt'));
  });

  it('populates duration and exit_code metrics', async () => {
    const adapter = new LintAdapter({
      command: process.execPath,
      args: ['-e', 'setTimeout(() => process.exit(0), 50)'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.metrics.exit_code).toBe(0);
    expect(r.metrics.duration_ms).toBeGreaterThanOrEqual(0);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });
});
