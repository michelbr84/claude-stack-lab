import { join } from 'node:path';
import {
  ScenarioExecutor,
  ScenarioRegistry,
  type Scenario,
  type ExecutorOptions
} from '@lab/scenario-core';
import { aggregate, type GlobalScore } from '@lab/scoring-engine';
import { writeJsonReport, writeMarkdownReport, writeHtmlReport } from '@lab/reporting';
import {
  ensureDir,
  newRunId,
  type RunReport,
  type ScenarioResult,
  type ScenarioCategory
} from '@lab/shared';

export interface RunnerOptions {
  cwd: string;
  evidenceRoot: string;
  fixturesRoot: string;
}

export class Runner {
  private readonly registry = new ScenarioRegistry();

  constructor(private readonly opts: RunnerOptions) {}

  register(scenario: Scenario): void {
    this.registry.register(scenario);
  }

  registerAll(scenarios: readonly Scenario[]): void {
    this.registry.registerAll(scenarios);
  }

  list(): Scenario[] {
    return this.registry.list();
  }

  has(id: string): boolean {
    return this.registry.has(id);
  }

  async runOne(id: string, executorOpts?: Partial<ExecutorOptions>): Promise<{
    result: ScenarioResult;
    score: GlobalScore;
    runId: string;
    reports: { json: string; md: string; html: string };
  }> {
    const runId = executorOpts?.runId ?? newRunId();
    const executor = new ScenarioExecutor(this.registry, {
      cwd: this.opts.cwd,
      evidenceRoot: this.opts.evidenceRoot,
      fixturesRoot: this.opts.fixturesRoot,
      runId,
      ...executorOpts
    });
    const result = await executor.runOne(id);
    const scenario = this.registry.get(id);
    const score = aggregate([{ result, category: scenario.category }]);
    const reports = await this.writeReports(id, runId, packAsRun([result], runId), score);
    return { result, score, runId, reports };
  }

  async runAll(executorOpts?: Partial<ExecutorOptions>): Promise<{
    run: RunReport;
    score: GlobalScore;
    reports: { json: string; md: string; html: string };
  }> {
    const runId = executorOpts?.runId ?? newRunId();
    const executor = new ScenarioExecutor(this.registry, {
      cwd: this.opts.cwd,
      evidenceRoot: this.opts.evidenceRoot,
      fixturesRoot: this.opts.fixturesRoot,
      runId,
      ...executorOpts
    });
    const run = await executor.runAll();
    const score = aggregate(
      run.scenarios.map((r) => ({
        result: r,
        category: this.registry.get(r.scenarioId).category
      }))
    );
    const reports = await this.writeReports('all', runId, run, score);
    return { run, score, reports };
  }

  private async writeReports(
    bucket: string,
    runId: string,
    run: RunReport,
    score: GlobalScore
  ): Promise<{ json: string; md: string; html: string }> {
    const dir = join(this.opts.evidenceRoot, 'runs', bucket, runId);
    await ensureDir(dir);
    const json = join(this.opts.evidenceRoot, 'json', `${runId}.json`);
    const md = join(dir, 'report.md');
    const html = join(this.opts.evidenceRoot, 'html', `${runId}.html`);
    await writeJsonReport(json, run, score);
    await writeMarkdownReport(md, run, score);
    await writeHtmlReport(html, run, score);
    return { json, md, html };
  }
}

function packAsRun(results: ScenarioResult[], runId: string): RunReport {
  const startedAt = results[0]?.startedAt ?? new Date().toISOString();
  const finishedAt = results[results.length - 1]?.finishedAt ?? startedAt;
  const durationMs = results.reduce((s, r) => s + r.durationMs, 0);
  const status = results.some((r) => r.status === 'error')
    ? 'error'
    : results.some((r) => r.status === 'fail')
    ? 'fail'
    : 'pass';
  const passed = results.filter((r) => r.status === 'pass').length;
  return {
    runId,
    startedAt,
    finishedAt,
    durationMs,
    scenarios: results,
    globalScore: results.length === 0 ? 0 : Math.round((passed / results.length) * 100),
    globalStatus: status
  };
}

// Re-export for convenience
export type { Scenario, ScenarioCategory };
