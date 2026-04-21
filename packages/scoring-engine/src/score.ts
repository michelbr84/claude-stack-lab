import type { ScenarioCategory, ScenarioResult, ScenarioStatus } from '@lab/shared';

export interface ScoreBreakdown {
  scenarioId: string;
  category: ScenarioCategory;
  status: ScenarioStatus;
  score: number; // 0..100
  rationale: string;
}

export interface CategoryScore {
  category: ScenarioCategory;
  score: number;
  total: number;
  passed: number;
  failed: number;
}

export interface GlobalScore {
  score: number;
  status: ScenarioStatus;
  perScenario: ScoreBreakdown[];
  perCategory: CategoryScore[];
}

const STATUS_SCORE: Record<ScenarioStatus, number> = {
  pass: 100,
  fail: 0,
  error: 0,
  skipped: 50
};

export function scenarioScore(r: ScenarioResult, category: ScenarioCategory): ScoreBreakdown {
  const score = STATUS_SCORE[r.status];
  return {
    scenarioId: r.scenarioId,
    category,
    status: r.status,
    score,
    rationale:
      r.status === 'pass'
        ? 'all expectations met'
        : r.failureReason ?? `status=${r.status}`
  };
}

export function aggregate(
  results: readonly { result: ScenarioResult; category: ScenarioCategory }[]
): GlobalScore {
  const perScenario = results.map(({ result, category }) => scenarioScore(result, category));

  const byCat = new Map<ScenarioCategory, ScoreBreakdown[]>();
  for (const s of perScenario) {
    const list = byCat.get(s.category) ?? [];
    list.push(s);
    byCat.set(s.category, list);
  }

  const perCategory: CategoryScore[] = Array.from(byCat.entries())
    .map(([category, items]): CategoryScore => {
      const passed = items.filter((i) => i.status === 'pass').length;
      const failed = items.length - passed;
      const total = items.length;
      const score = total === 0 ? 0 : Math.round(items.reduce((s, i) => s + i.score, 0) / total);
      return { category, score, total, passed, failed };
    })
    .sort((a, b) => a.category.localeCompare(b.category));

  const total = perScenario.length;
  const score =
    total === 0 ? 0 : Math.round(perScenario.reduce((s, i) => s + i.score, 0) / total);

  let status: ScenarioStatus = 'pass';
  if (perScenario.some((s) => s.status === 'error')) status = 'error';
  else if (perScenario.some((s) => s.status === 'fail')) status = 'fail';

  return { score, status, perScenario, perCategory };
}
