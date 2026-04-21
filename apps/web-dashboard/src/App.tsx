import { useEffect, useState, type JSX } from 'react';
import { createApiClient, type ApiClient, type RunReport, type RunSummary, type ScenarioSummary } from './api.js';
import { ScenariosPanel } from './panels/ScenariosPanel.js';
import { RunsPanel } from './panels/RunsPanel.js';
import { BaselinePanel } from './panels/BaselinePanel.js';

export interface AppProps {
  apiBase: string;
  apiClient?: ApiClient;
}

export function App({ apiBase, apiClient }: AppProps): JSX.Element {
  const [client] = useState<ApiClient>(() => apiClient ?? createApiClient(apiBase));
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [baseline, setBaseline] = useState<RunReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, r, b] = await Promise.all([
          client.scenarios(),
          client.runs({ limit: 25 }),
          client.baseline()
        ]);
        if (cancelled) return;
        setScenarios(s);
        setRuns(r);
        setBaseline(b);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <main>
      <header>
        <h1>claude-stack-lab</h1>
        <p className="tagline">reproducible validation harness · read-only dashboard</p>
      </header>

      {error ? (
        <div role="alert" className="error">
          failed to reach API: {error}
        </div>
      ) : null}

      <section aria-labelledby="scenarios-heading">
        <h2 id="scenarios-heading">Scenarios</h2>
        <ScenariosPanel scenarios={scenarios} />
      </section>

      <section aria-labelledby="runs-heading">
        <h2 id="runs-heading">Recent runs</h2>
        <RunsPanel runs={runs} />
      </section>

      <section aria-labelledby="baseline-heading">
        <h2 id="baseline-heading">Baseline</h2>
        <BaselinePanel baseline={baseline} />
      </section>
    </main>
  );
}
