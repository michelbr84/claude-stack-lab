#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from './args.js';
import { dispatch, type CommandContext } from './commands.js';
import { loadAllScenarios } from '@lab/runner';

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const cwd = String(parsed.flags.cwd ?? process.cwd());
  const evidenceRoot = resolve(cwd, String(parsed.flags.evidence ?? 'evidence'));
  const fixturesRoot = resolve(cwd, String(parsed.flags.fixtures ?? 'fixtures'));
  const scenarios = await loadAllScenarios();
  const ctx: CommandContext = {
    cwd,
    evidenceRoot,
    fixturesRoot,
    scenarios,
    out: (line) => console.log(line)
  };
  const code = await dispatch(parsed, ctx);
  process.exit(code);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
