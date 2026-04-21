import { Runner, type Scenario } from '@lab/runner';
import { newRunId } from '@lab/shared';

export interface TriggerRunResult {
  runId: string;
  target: string;
  startedAt: string;
  accepted: boolean;
  reason?: string;
}

export type RunnerFactory = () => Runner;

/**
 * RunnerBridge coordinates on-demand scenario runs triggered via
 * the API. Single in-flight guard: one run at a time per process —
 * a second POST while a run is active is accepted but returns the
 * currently-active runId.
 */
export class RunnerBridge {
  private active:
    | { runId: string; target: string; startedAt: string; finish: Promise<void> }
    | null = null;

  constructor(
    private readonly factory: RunnerFactory,
    private readonly scenarios: readonly Scenario[],
    private readonly now: () => Date = () => new Date()
  ) {}

  isBusy(): boolean {
    return this.active !== null;
  }

  activeRun(): { runId: string; target: string; startedAt: string } | null {
    if (!this.active) return null;
    return {
      runId: this.active.runId,
      target: this.active.target,
      startedAt: this.active.startedAt
    };
  }

  async trigger(target: string): Promise<TriggerRunResult> {
    const normalized = target.trim();
    if (normalized === '') {
      throw new Error('scenario id or "all" is required');
    }
    if (!/^[\w-]+$/.test(normalized)) {
      throw new Error(`invalid target "${target}"`);
    }
    if (normalized !== 'all' && !this.scenarios.some((s) => s.id === normalized)) {
      throw new Error(`scenario "${normalized}" is not registered`);
    }

    if (this.active) {
      return {
        runId: this.active.runId,
        target: this.active.target,
        startedAt: this.active.startedAt,
        accepted: false,
        reason: 'a run is already in progress'
      };
    }

    const runId = newRunId({ now: this.now() });
    const startedAt = this.now().toISOString();
    const runner = this.factory();
    runner.registerAll(this.scenarios);

    const finish = (async (): Promise<void> => {
      try {
        if (normalized === 'all') {
          await runner.runAll({ runId });
        } else {
          await runner.runOne(normalized, { runId });
        }
      } finally {
        this.active = null;
      }
    })();

    this.active = { runId, target: normalized, startedAt, finish };
    return { runId, target: normalized, startedAt, accepted: true };
  }

  async waitForActive(): Promise<void> {
    if (this.active) await this.active.finish;
  }
}
