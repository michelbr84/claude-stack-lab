import { describe, it, expect } from 'vitest';
import { aggregate, scenarioScore } from '../score.js';
import type { ScenarioResult } from '@lab/shared';

const baseResult = (overrides: Partial<ScenarioResult> = {}): ScenarioResult => ({
  scenarioId: '001',
  status: 'pass',
  startedAt: '',
  finishedAt: '',
  durationMs: 0,
  metrics: {},
  adapters: [],
  evidencePaths: [],
  notes: [],
  ...overrides
});

describe('scenarioScore', () => {
  it('gives 100 for pass with default rationale', () => {
    const s = scenarioScore(baseResult(), 'bootstrap');
    expect(s.score).toBe(100);
    expect(s.rationale).toBe('all expectations met');
  });

  it('gives 0 for fail and surfaces the failure reason', () => {
    const s = scenarioScore(baseResult({ status: 'fail', failureReason: 'oops' }), 'coverage');
    expect(s.score).toBe(0);
    expect(s.rationale).toBe('oops');
  });

  it('falls back to status= when no failure reason is provided', () => {
    const s = scenarioScore(baseResult({ status: 'fail' }), 'coverage');
    expect(s.rationale).toBe('status=fail');
  });
});

describe('aggregate', () => {
  it('returns a 0 global score for an empty input set', () => {
    const g = aggregate([]);
    expect(g.score).toBe(0);
    expect(g.status).toBe('pass');
  });

  it('computes a 100 global score when every scenario passes', () => {
    const g = aggregate([
      { result: baseResult({ scenarioId: '001' }), category: 'bootstrap' },
      { result: baseResult({ scenarioId: '002' }), category: 'coverage' }
    ]);
    expect(g.score).toBe(100);
    expect(g.status).toBe('pass');
  });

  it('marks the global status as fail when any scenario fails', () => {
    const g = aggregate([
      { result: baseResult({ scenarioId: '001' }), category: 'bootstrap' },
      { result: baseResult({ scenarioId: '002', status: 'fail' }), category: 'coverage' }
    ]);
    expect(g.status).toBe('fail');
    expect(g.score).toBe(50);
  });

  it('marks the global status as error when any scenario errors', () => {
    const g = aggregate([
      { result: baseResult({ scenarioId: '001' }), category: 'bootstrap' },
      { result: baseResult({ scenarioId: '002', status: 'error' }), category: 'coverage' }
    ]);
    expect(g.status).toBe('error');
  });

  it('groups scenarios by category and sorts categories alphabetically', () => {
    const g = aggregate([
      { result: baseResult({ scenarioId: '001' }), category: 'bootstrap' },
      { result: baseResult({ scenarioId: '002', status: 'fail' }), category: 'coverage' },
      { result: baseResult({ scenarioId: '003' }), category: 'coverage' }
    ]);
    const cats = g.perCategory.map((c) => c.category);
    expect(cats).toEqual(['bootstrap', 'coverage']);
    const cov = g.perCategory.find((c) => c.category === 'coverage');
    expect(cov).toMatchObject({ total: 2, passed: 1, failed: 1, score: 50 });
  });
});
