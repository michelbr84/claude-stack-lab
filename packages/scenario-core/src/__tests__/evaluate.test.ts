import { describe, it, expect } from 'vitest';
import { evaluate, applyEvaluation } from '../evaluate.js';
import type { ScenarioResult } from '@lab/shared';

const baseResult: ScenarioResult = {
  scenarioId: '001-bootstrap',
  status: 'pass',
  startedAt: '',
  finishedAt: '',
  durationMs: 0,
  metrics: {},
  adapters: [],
  evidencePaths: [],
  notes: []
};

describe('evaluate', () => {
  it('passes when status matches and no thresholds defined', () => {
    expect(evaluate({ status: 'pass' }, { metrics: {}, status: 'pass' })).toEqual({
      status: 'pass'
    });
  });

  it('fails when expected status differs from observed', () => {
    const out = evaluate({ status: 'pass' }, { metrics: {}, status: 'fail' });
    expect(out.status).toBe('fail');
    expect(out.failureReason).toMatch(/observed status "fail"/);
  });

  it('returns error when observed status is error', () => {
    const out = evaluate({ status: 'pass' }, { metrics: {}, status: 'error' });
    expect(out.status).toBe('error');
  });

  it('checks <= threshold', () => {
    const exp = {
      status: 'pass' as const,
      metricThresholds: [{ metric: 'complexity', operator: '<=' as const, value: 12 }]
    };
    expect(evaluate(exp, { metrics: { complexity: 10 }, status: 'pass' }).status).toBe('pass');
    expect(evaluate(exp, { metrics: { complexity: 13 }, status: 'pass' }).status).toBe('fail');
  });

  it('checks >= threshold', () => {
    const exp = {
      status: 'pass' as const,
      metricThresholds: [{ metric: 'coverage', operator: '>=' as const, value: 80 }]
    };
    expect(evaluate(exp, { metrics: { coverage: 80 }, status: 'pass' }).status).toBe('pass');
    expect(evaluate(exp, { metrics: { coverage: 79.9 }, status: 'pass' }).status).toBe('fail');
  });

  it('fails when required metric is missing', () => {
    const exp = {
      status: 'pass' as const,
      metricThresholds: [{ metric: 'mutation', operator: '>=' as const, value: 65 }]
    };
    const out = evaluate(exp, { metrics: {}, status: 'pass' });
    expect(out.status).toBe('fail');
    expect(out.failureReason).toMatch(/missing metric/);
  });

  it.each([
    ['<', 1, 2, true],
    ['<', 2, 2, false],
    ['>', 3, 2, true],
    ['>', 2, 2, false],
    ['==', 2, 2, true],
    ['==', 1, 2, false],
    ['!=', 1, 2, true],
    ['!=', 2, 2, false]
  ] as const)('compares %s', (op, a, b, ok) => {
    const exp = {
      status: 'pass' as const,
      metricThresholds: [{ metric: 'm', operator: op, value: b }]
    };
    expect(evaluate(exp, { metrics: { m: a }, status: 'pass' }).status).toBe(ok ? 'pass' : 'fail');
  });
});

describe('applyEvaluation', () => {
  it('overrides status and failure reason on the result', () => {
    const out = applyEvaluation(baseResult, { status: 'fail', failureReason: 'because' });
    expect(out.status).toBe('fail');
    expect(out.failureReason).toBe('because');
  });

  it('preserves the existing failureReason if outcome supplies none', () => {
    const r = { ...baseResult, failureReason: 'pre-existing' };
    const out = applyEvaluation(r, { status: 'pass' });
    expect(out.failureReason).toBe('pre-existing');
  });
});
