#!/usr/bin/env node
import { resolve } from 'node:path';
import { buildServer } from './server.js';
import { EvidenceStore } from './store.js';
import { RunnerBridge } from './runner-bridge.js';
import { loadAllScenarios, Runner } from '@lab/runner';

async function main(): Promise<void> {
  const cwd = process.cwd();
  const evidenceRoot = resolve(cwd, process.env.LAB_EVIDENCE_ROOT ?? 'evidence');
  const fixturesRoot = resolve(cwd, process.env.LAB_FIXTURES_ROOT ?? 'fixtures');
  const port = Number.parseInt(process.env.PORT ?? '8080', 10);
  const host = process.env.HOST ?? '127.0.0.1';
  const enableTrigger = process.env.LAB_ENABLE_TRIGGER === '1';

  const scenarios = await loadAllScenarios();
  const scenarioSummaries = scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    fixture: s.fixture
  }));

  const runnerBridge = enableTrigger
    ? new RunnerBridge(() => new Runner({ cwd, evidenceRoot, fixturesRoot }), scenarios)
    : undefined;

  const server = buildServer({
    store: new EvidenceStore({ evidenceRoot }),
    scenarios: scenarioSummaries,
    runnerBridge,
    logger: true
  });

  try {
    const addr = await server.listen({ port, host });
    console.log(
      `lab-api listening at ${addr}; trigger ${enableTrigger ? 'enabled' : 'disabled'} (set LAB_ENABLE_TRIGGER=1)`
    );
  } catch (e) {
    console.error(e instanceof Error ? e.stack : String(e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
