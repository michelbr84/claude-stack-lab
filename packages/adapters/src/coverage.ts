import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { pathExists, writeText, type AdapterResult, type AdapterViolation } from '@lab/shared';
import { runCommand } from './process.js';
import type { Adapter, AdapterInput } from './adapter.js';

export interface CoverageAdapterOptions {
  command?: string;
  args?: string[];
  summaryPath?: string;     // path relative to cwd, default evidence/coverage/coverage-summary.json
  minLines?: number;
  minBranches?: number;
  minFunctions?: number;
  minStatements?: number;
  timeoutMs?: number;
  skipRun?: boolean;        // when true, only read an existing summary
}

interface CoverageSummary {
  total?: {
    lines?: { pct: number };
    statements?: { pct: number };
    functions?: { pct: number };
    branches?: { pct: number };
  };
}

export class CoverageAdapter implements Adapter {
  readonly name = 'coverage';

  constructor(private readonly cfg: CoverageAdapterOptions = {}) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const command = this.cfg.command ?? 'pnpm';
    const args = this.cfg.args ?? ['test:coverage'];
    const summaryRel = this.cfg.summaryPath ?? 'evidence/coverage/coverage-summary.json';
    const summaryAbs = join(input.cwd, summaryRel);

    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    if (!this.cfg.skipRun) {
      const r = await runCommand(command, args, {
        cwd: input.cwd,
        timeoutMs: this.cfg.timeoutMs ?? 600_000,
        shell: process.platform === 'win32'
      });
      exitCode = r.exitCode;
      stdout = r.stdout;
      stderr = r.stderr;
      await writeText(join(input.evidenceDir, 'coverage.stdout.txt'), stdout);
      await writeText(join(input.evidenceDir, 'coverage.stderr.txt'), stderr);
    }

    if (!(await pathExists(summaryAbs))) {
      return {
        adapter: this.name,
        toolVersion: null,
        status: 'error',
        metrics: { exit_code: exitCode },
        violations: [
          {
            rule: 'coverage-summary-missing',
            severity: 'error',
            message: `expected coverage summary at ${summaryRel} but none was produced`
          }
        ],
        rawArtifactPath: summaryAbs,
        durationMs: Date.now() - start
      };
    }

    const summary = JSON.parse(await fs.readFile(summaryAbs, 'utf8')) as CoverageSummary;
    const lines = summary.total?.lines?.pct ?? 0;
    const branches = summary.total?.branches?.pct ?? 0;
    const functions = summary.total?.functions?.pct ?? 0;
    const statements = summary.total?.statements?.pct ?? 0;

    const violations: AdapterViolation[] = [];
    const checks: Array<[string, number, number | undefined]> = [
      ['lines', lines, this.cfg.minLines],
      ['branches', branches, this.cfg.minBranches],
      ['functions', functions, this.cfg.minFunctions],
      ['statements', statements, this.cfg.minStatements]
    ];
    for (const [metric, observed, threshold] of checks) {
      if (threshold !== undefined && observed < threshold) {
        violations.push({
          rule: `coverage-${metric}-below-threshold`,
          severity: 'error',
          message: `${metric} coverage ${observed}% < ${threshold}%`
        });
      }
    }

    return {
      adapter: this.name,
      toolVersion: null,
      status: violations.length === 0 && exitCode === 0 ? 'ok' : 'violation',
      metrics: {
        coverage_lines: lines,
        coverage_branches: branches,
        coverage_functions: functions,
        coverage_statements: statements,
        exit_code: exitCode
      },
      violations,
      rawArtifactPath: summaryAbs,
      durationMs: Date.now() - start
    };
  }
}
