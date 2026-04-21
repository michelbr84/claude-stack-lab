import { describe, it, expect } from 'vitest';
import { runCommand } from '../process.js';

describe('runCommand', () => {
  it('captures stdout from a successful command', async () => {
    const r = await runCommand(process.execPath, ['-e', 'process.stdout.write("hello")'], {
      cwd: process.cwd()
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('hello');
    expect(r.timedOut).toBe(false);
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('captures stderr and a non-zero exit code', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'process.stderr.write("nope"); process.exit(7)'],
      { cwd: process.cwd() }
    );
    expect(r.exitCode).toBe(7);
    expect(r.stderr).toContain('nope');
  });

  it('returns exitCode -1 when the binary cannot be spawned', async () => {
    const r = await runCommand('this-binary-definitely-does-not-exist', [], {
      cwd: process.cwd()
    });
    expect(r.exitCode).toBe(-1);
    expect(r.stderr.length).toBeGreaterThan(0);
  });

  it('honours the timeout option', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 60_000)'],
      { cwd: process.cwd(), timeoutMs: 200 }
    );
    expect(r.timedOut).toBe(true);
  });
});
