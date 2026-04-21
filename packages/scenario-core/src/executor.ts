import { join } from 'node:path';
import {
  createLogger,
  ensureDir,
  evidenceRunDir,
  newRunId,
  type Logger,
  type RunReport,
  type ScenarioContext,
  type ScenarioResult,
  type ScenarioStatus
} from '@lab/shared';
import { type Scenario } from './scenario.js';
import { type ScenarioRegistry } from './registry.js';

export interface ExecutorOptions {
  evidenceRoot: string;
  cwd: string;
  fixturesRoot: string;
  logger?: Logger;
  runId?: string;
  now?: () => Date;
}

export class ScenarioExecutor {
  private readonly logger: Logger;
  private readonly now: () => Date;

  constructor(
    private readonly registry: ScenarioRegistry,
    private readonly opts: ExecutorOptions
  ) {
    this.logger = opts.logger ?? createLogger({ prefix: 'executor' });
    this.now = opts.now ?? ((): Date => new Date());
  }

  async runOne(id: string): Promise<ScenarioResult> {
    const scenario = this.registry.get(id);
    return await this.executeScenario(scenario, this.opts.runId ?? newRunId({ now: this.now() }));
  }

  async runAll(): Promise<RunReport> {
    const runId = this.opts.runId ?? newRunId({ now: this.now() });
    const startedAt = this.now().toISOString();
    const startMs = Date.now();

    const scenarios = this.registry.list();
    const results: ScenarioResult[] = [];
    for (const s of scenarios) {
      const r = await this.executeScenario(s, runId);
      results.push(r);
    }

    const finishedAt = this.now().toISOString();
    const durationMs = Date.now() - startMs;

    const status: ScenarioStatus = results.some((r) => r.status === 'error')
      ? 'error'
      : results.some((r) => r.status === 'fail')
      ? 'fail'
      : 'pass';

    const passed = results.filter((r) => r.status === 'pass').length;
    const score = scenarios.length === 0 ? 0 : Math.round((passed / scenarios.length) * 100);

    return {
      runId,
      startedAt,
      finishedAt,
      durationMs,
      scenarios: results,
      globalScore: score,
      globalStatus: status
    };
  }

  private async executeScenario(scenario: Scenario, runId: string): Promise<ScenarioResult> {
    const evidenceDir = evidenceRunDir(this.opts.evidenceRoot, scenario.id, runId);
    await ensureDir(evidenceDir);

    const fixturePath = scenario.fixture
      ? join(this.opts.fixturesRoot, scenario.fixture)
      : null;

    const ctx: ScenarioContext = {
      runId,
      evidenceDir,
      cwd: this.opts.cwd,
      fixturePath,
      log: (msg: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void =>
        this.logger.child(scenario.id)[level](msg)
    };

    const startMs = Date.now();
    const startedAt = this.now().toISOString();
    try {
      const result = await scenario.run(ctx);
      const finishedAt = this.now().toISOString();
      return {
        ...result,
        scenarioId: scenario.id,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const finishedAt = this.now().toISOString();
      this.logger.error(`scenario ${scenario.id} threw: ${message}`);
      return {
        scenarioId: scenario.id,
        status: 'error',
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs,
        metrics: {},
        adapters: [],
        evidencePaths: [],
        notes: [],
        failureReason: message
      };
    }
  }
}
