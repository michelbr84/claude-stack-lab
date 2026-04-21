import { join } from 'node:path';
import { writeText, type AdapterResult, type AdapterViolation } from '@lab/shared';
import { runCommand } from './process.js';
import type { Adapter, AdapterInput } from './adapter.js';

export interface TypecheckAdapterOptions {
  command?: string;
  args?: string[];
  timeoutMs?: number;
  shell?: boolean;
}

export class TypecheckAdapter implements Adapter {
  readonly name = 'typecheck';

  constructor(private readonly cfg: TypecheckAdapterOptions = {}) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const command = this.cfg.command ?? 'pnpm';
    const args = this.cfg.args ?? ['typecheck'];
    const result = await runCommand(command, args, {
      cwd: input.cwd,
      timeoutMs: this.cfg.timeoutMs ?? 120_000,
      shell: this.cfg.shell ?? process.platform === 'win32'
    });

    const out = join(input.evidenceDir, 'typecheck.stdout.txt');
    const err = join(input.evidenceDir, 'typecheck.stderr.txt');
    await writeText(out, result.stdout);
    await writeText(err, result.stderr);

    const violations: AdapterViolation[] =
      result.exitCode === 0
        ? []
        : [
            {
              rule: 'typecheck',
              severity: 'error',
              message: `${command} ${args.join(' ')} exited with ${result.exitCode}`
            }
          ];

    return {
      adapter: this.name,
      toolVersion: null,
      status: result.exitCode === 0 ? 'ok' : 'violation',
      metrics: { exit_code: result.exitCode, duration_ms: result.durationMs },
      violations,
      rawArtifactPath: out,
      durationMs: Date.now() - start
    };
  }
}
