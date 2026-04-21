export interface ScenarioSummary {
  id: string;
  title: string;
  category: string;
  fixture: string | null;
}

export interface RunSummary {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: string;
  score: number;
  scenarioCount: number;
}

export interface RunReport {
  run: {
    runId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    scenarios: Array<{ scenarioId: string; status: string; durationMs: number }>;
  };
  score: {
    score: number;
    status: string;
    perScenario: Array<{ scenarioId: string; status: string; score: number; rationale: string }>;
    perCategory: Array<{ category: string; score: number; passed: number; failed: number; total: number }>;
  };
}

export interface ApiClient {
  scenarios(): Promise<ScenarioSummary[]>;
  runs(opts?: { limit?: number }): Promise<RunSummary[]>;
  baseline(): Promise<RunReport | null>;
}

export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ApiClient {
  const base = baseUrl.replace(/\/$/, '');
  const get = async <T,>(path: string): Promise<T> => {
    const res = await fetchImpl(`${base}${path}`);
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  return {
    async scenarios() {
      const r = await get<{ count: number; scenarios: ScenarioSummary[] }>('/scenarios');
      return r.scenarios;
    },
    async runs(opts = {}) {
      const qs = new URLSearchParams();
      if (opts.limit !== undefined) qs.set('limit', String(opts.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const r = await get<{ count: number; runs: RunSummary[] }>(`/runs${suffix}`);
      return r.runs;
    },
    async baseline() {
      try {
        return await get<RunReport>('/baseline');
      } catch (e) {
        if (/HTTP 404/.test((e as Error).message)) return null;
        throw e;
      }
    }
  };
}
