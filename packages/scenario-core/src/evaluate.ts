import type { ExpectedResult, ScenarioResult, ScenarioStatus } from '@lab/shared';

export interface EvaluationOutcome {
  status: ScenarioStatus;
  failureReason?: string;
}

export function evaluate(
  expected: ExpectedResult,
  observed: { metrics: Record<string, number>; status: ScenarioStatus }
): EvaluationOutcome {
  if (observed.status === 'error') {
    return { status: 'error', failureReason: 'adapter raised an error' };
  }

  for (const t of expected.metricThresholds ?? []) {
    const value = observed.metrics[t.metric];
    if (value === undefined) {
      return {
        status: 'fail',
        failureReason: `missing metric "${t.metric}" required by expected result`
      };
    }
    if (!compare(value, t.operator, t.value)) {
      return {
        status: 'fail',
        failureReason: `metric "${t.metric}" = ${value}, expected ${t.operator} ${t.value}`
      };
    }
  }

  if (observed.status !== expected.status) {
    return {
      status: 'fail',
      failureReason: `observed status "${observed.status}" != expected "${expected.status}"`
    };
  }

  return { status: 'pass' };
}

type Operator = '<=' | '>=' | '==' | '!=' | '<' | '>';

function compare(a: number, op: Operator, b: number): boolean {
  switch (op) {
    case '<=':
      return a <= b;
    case '>=':
      return a >= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '<':
      return a < b;
    case '>':
      return a > b;
    default:
      return false;
  }
}

export function applyEvaluation(result: ScenarioResult, outcome: EvaluationOutcome): ScenarioResult {
  return {
    ...result,
    status: outcome.status,
    failureReason: outcome.failureReason ?? result.failureReason
  };
}
