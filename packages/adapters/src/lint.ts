import { join } from 'node:path';
import { writeText, type AdapterResult, type AdapterViolation } from '@lab/shared';
import { runCommand } from './process.js';
import type { Adapter, AdapterInput } from './adapter.js';

export interface LintAdapterOptions {
  command?: string;
  args?: string[];
  timeoutMs?: number;
  shell?: boolean;
}

export class LintAdapter implements Adapter {
  readonly name = 'lint';

  constructor(private readonly cfg: LintAdapterOptions = {}) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const command = this.cfg.command ?? 'pnpm';
    const args = this.cfg.args ?? ['lint'];
    const result = await runCommand(command, args, {
      cwd: input.cwd,
      timeoutMs: this.cfg.timeoutMs ?? 120_000,
      shell: this.cfg.shell ?? process.platform === 'win32'
    });

    const stdoutPath = join(input.evidenceDir, 'lint.stdout.txt');
    const stderrPath = join(input.evidenceDir, 'lint.stderr.txt');
    await writeText(stdoutPath, result.stdout);
    await writeText(stderrPath, result.stderr);

    const violations: AdapterViolation[] =
      result.exitCode === 0
        ? []
        : [
            {
              rule: 'lint',
              severity: 'error',
              message: `${command} ${args.join(' ')} exited with ${result.exitCode}`
            }
          ];

    return {
      adapter: this.name,
      toolVersion: null,
      status: result.exitCode === 0 ? 'ok' : 'violation',
      metrics: {
        exit_code: result.exitCode,
        duration_ms: result.durationMs
      },
      violations,
      rawArtifactPath: stdoutPath,
      durationMs: Date.now() - start
    };
  }
}
