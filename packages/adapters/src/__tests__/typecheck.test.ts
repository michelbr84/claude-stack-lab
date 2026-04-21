import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TypecheckAdapter } from '../typecheck.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-tc-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('TypecheckAdapter', () => {
  it('reports ok on success', async () => {
    const adapter = new TypecheckAdapter({
      command: process.execPath,
      args: ['-e', 'process.stdout.write("ok")'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('ok');
    expect(r.metrics.exit_code).toBe(0);
  });

  it('reports violation on failure', async () => {
    const adapter = new TypecheckAdapter({
      command: process.execPath,
      args: ['-e', 'process.exit(3)'],
      shell: false
    });
    const r = await adapter.run({ cwd: workdir, evidenceDir: workdir });
    expect(r.status).toBe('violation');
    expect(r.metrics.exit_code).toBe(3);
    expect(r.violations[0]?.message).toContain('exited with 3');
  });
});
