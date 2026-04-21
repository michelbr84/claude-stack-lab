import { describe, it, expect } from 'vitest';
import { runCommand } from '../process.js';

describe('runCommand', () => {
  it('captures stdout from a successful command', async () => {
    const r = await runCommand(process.execPath, ['-e', 'process.stdout.write("hello")'], {
      cwd: process.cwd()
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('hello');
    expect(r.stderr).toBe('');
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
    expect(r.stdout).toBe('');
    expect(r.timedOut).toBe(false);
  });

  it('returns exitCode -1 when the binary cannot be spawned', async () => {
    const r = await runCommand('this-binary-definitely-does-not-exist', [], {
      cwd: process.cwd()
    });
    expect(r.exitCode).toBe(-1);
    expect(r.stderr.length).toBeGreaterThan(0);
    expect(r.timedOut).toBe(false);
  });

  it('honours the timeout option', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 60_000)'],
      { cwd: process.cwd(), timeoutMs: 200 }
    );
    expect(r.timedOut).toBe(true);
    // A killed process on Windows can report exitCode 0; just verify
    // the process did not run to completion — duration should be close
    // to timeoutMs, not the 60s sleep.
    expect(r.durationMs).toBeLessThan(5000);
  });

  it('forwards env to the child process', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.env.LAB_PROBE || "MISSING")'],
      { cwd: process.cwd(), env: { LAB_PROBE: 'present' } }
    );
    expect(r.stdout).toBe('present');
  });

  it('honours cwd', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.cwd())'],
      { cwd: process.cwd() }
    );
    expect(r.stdout.toLowerCase()).toBe(process.cwd().toLowerCase());
  });

  it('does not set timedOut when timeoutMs is 0', async () => {
    const r = await runCommand(
      process.execPath,
      ['-e', 'process.exit(0)'],
      { cwd: process.cwd(), timeoutMs: 0 }
    );
    expect(r.timedOut).toBe(false);
    expect(r.exitCode).toBe(0);
  });
});
