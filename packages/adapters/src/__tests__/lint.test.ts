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
  });
});
