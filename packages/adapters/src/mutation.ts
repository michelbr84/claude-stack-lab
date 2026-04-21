import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzip as gunzipCb } from 'node:zlib';
import { pathExists, writeText, type AdapterResult, type AdapterViolation } from '@lab/shared';
import { runCommand } from './process.js';
import type { Adapter, AdapterInput } from './adapter.js';

const gunzip = promisify(gunzipCb);

export interface MutationAdapterOptions {
  command?: string;
  args?: string[];
  reportPath?: string; // relative to cwd, default reports/mutation/mutation.json
  minScore?: number;
  timeoutMs?: number;
  skipRun?: boolean;
}

interface StrykerLikeReport {
  files?: Record<string, { mutants: Array<{ status: string }> }>;
  thresholds?: { high: number; low: number; break?: number };
}

const KILLED_STATES = new Set(['Killed', 'Timeout', 'CompileError', 'RuntimeError']);
const SURVIVED_STATES = new Set(['Survived', 'NoCoverage']);

export class MutationAdapter implements Adapter {
  readonly name = 'mutation';

  constructor(private readonly cfg: MutationAdapterOptions = {}) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const command = this.cfg.command ?? 'pnpm';
    const args = this.cfg.args ?? ['test:mutation'];
    const reportRel = this.cfg.reportPath ?? 'reports/mutation/mutation.json';
    const reportAbs = join(input.cwd, reportRel);

    let exitCode = 0;
    if (!this.cfg.skipRun) {
      const r = await runCommand(command, args, {
        cwd: input.cwd,
        timeoutMs: this.cfg.timeoutMs ?? 1_200_000,
        shell: process.platform === 'win32'
      });
      exitCode = r.exitCode;
      await writeText(join(input.evidenceDir, 'mutation.stdout.txt'), r.stdout);
      await writeText(join(input.evidenceDir, 'mutation.stderr.txt'), r.stderr);
    }

    if (!(await pathExists(reportAbs))) {
      return {
        adapter: this.name,
        toolVersion: null,
        status: 'error',
        metrics: { exit_code: exitCode },
        violations: [
          {
            rule: 'mutation-report-missing',
            severity: 'error',
            message: `expected mutation report at ${reportRel}; none was found`
          }
        ],
        rawArtifactPath: reportAbs,
        durationMs: Date.now() - start
      };
    }

    const buf = await fs.readFile(reportAbs);
    const text = reportAbs.endsWith('.gz') ? (await gunzip(buf)).toString('utf8') : buf.toString('utf8');
    const json = JSON.parse(text) as StrykerLikeReport;

    let killed = 0;
    let survived = 0;
    let total = 0;
    for (const file of Object.values(json.files ?? {})) {
      for (const m of file.mutants) {
        total++;
        if (KILLED_STATES.has(m.status)) killed++;
        else if (SURVIVED_STATES.has(m.status)) survived++;
      }
    }
    const score = total === 0 ? 0 : Math.round((killed / total) * 10000) / 100;
    const violations: AdapterViolation[] = [];
    if (this.cfg.minScore !== undefined && score < this.cfg.minScore) {
      violations.push({
        rule: 'mutation-score-below-threshold',
        severity: 'error',
        message: `mutation score ${score}% < ${this.cfg.minScore}%`
      });
    }

    return {
      adapter: this.name,
      toolVersion: null,
      status: violations.length === 0 ? 'ok' : 'violation',
      metrics: {
        mutation_score: score,
        mutants_killed: killed,
        mutants_survived: survived,
        mutants_total: total
      },
      violations,
      rawArtifactPath: reportAbs,
      durationMs: Date.now() - start
    };
  }
}
