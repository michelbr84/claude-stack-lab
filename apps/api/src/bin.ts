#!/usr/bin/env node
import { resolve } from 'node:path';
import { buildServer } from './server.js';
import { EvidenceStore } from './store.js';
import { loadAllScenarios } from '@lab/runner';

async function main(): Promise<void> {
  const cwd = process.cwd();
  const evidenceRoot = resolve(cwd, process.env.LAB_EVIDENCE_ROOT ?? 'evidence');
  const port = Number.parseInt(process.env.PORT ?? '8080', 10);
  const host = process.env.HOST ?? '127.0.0.1';

  const scenarios = (await loadAllScenarios()).map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    fixture: s.fixture
  }));

  const server = buildServer({
    store: new EvidenceStore({ evidenceRoot }),
    scenarios,
    logger: true
  });

  try {
    const addr = await server.listen({ port, host });
    console.log(`lab-api listening at ${addr}`);
  } catch (e) {
    console.error(e instanceof Error ? e.stack : String(e));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
