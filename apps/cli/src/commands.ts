import { Runner } from '@lab/runner';
import type { Scenario } from '@lab/scenario-core';
import { type RunReport, type ScenarioResult } from '@lab/shared';
import type { GlobalScore } from '@lab/scoring-engine';
import type { ParsedArgs } from './args.js';
import { resolveScenarioId } from './resolveScenario.js';

export interface CommandContext {
  cwd: string;
  evidenceRoot: string;
  fixturesRoot: string;
  scenarios: readonly Scenario[];
  out: (line: string) => void;
}

export async function dispatch(parsed: ParsedArgs, ctx: CommandContext): Promise<number> {
  switch (parsed.command) {
    case 'list':
      return await cmdList(ctx);
    case 'run':
      return await cmdRun(parsed, ctx);
    case 'compare':
      return await cmdCompare(parsed, ctx);
    case 'reset':
      return await cmdReset(ctx);
    case 'help':
    case '':
    case undefined as unknown as string:
      return cmdHelp(ctx);
    default:
      ctx.out(`unknown command: ${parsed.command}`);
      cmdHelp(ctx);
      return 2;
  }
}

function cmdHelp(ctx: CommandContext): number {
  ctx.out('lab — claude-stack-lab CLI');
  ctx.out('');
  ctx.out('Commands:');
  ctx.out('  list                       list registered scenarios');
  ctx.out('  run <id|all>               run a scenario or every scenario');
  ctx.out('                             (short ids accepted — "001" matches "001-bootstrap")');
  ctx.out('  compare <runIdA> <runIdB>  diff two runs (json reports)');
  ctx.out('  reset                      delete generated evidence dirs');
  ctx.out('');
  ctx.out('Flags:');
  ctx.out('  --cwd <path>             override working directory');
  ctx.out('  --evidence <path>        override evidence root');
  ctx.out('  --fixtures <path>        override fixtures root');
  return 0;
}

async function cmdList(ctx: CommandContext): Promise<number> {
  for (const s of [...ctx.scenarios].sort((a, b) => a.id.localeCompare(b.id))) {
    ctx.out(`${s.id.padEnd(28)} ${s.category.padEnd(22)} ${s.title}`);
  }
  return 0;
}

async function cmdRun(parsed: ParsedArgs, ctx: CommandContext): Promise<number> {
  const target = parsed.positional[0];
  if (!target) {
    ctx.out('usage: lab run <scenario-id|all>');
    return 2;
  }
  const runner = new Runner({
    cwd: ctx.cwd,
    evidenceRoot: ctx.evidenceRoot,
    fixturesRoot: ctx.fixturesRoot
  });
  runner.registerAll(ctx.scenarios);

  if (target === 'all') {
    const out = await runner.runAll();
    printRunSummary(out.run, out.score, ctx.out);
    ctx.out(`json:     ${out.reports.json}`);
    ctx.out(`markdown: ${out.reports.md}`);
    ctx.out(`html:     ${out.reports.html}`);
    return out.score.status === 'pass' ? 0 : 1;
  }

  const resolved = resolveScenarioId(target, ctx.scenarios);
  if (!resolved.ok) {
    ctx.out(resolved.reason);
    if (resolved.suggestions.length > 0) {
      ctx.out('did you mean:');
      for (const s of resolved.suggestions) ctx.out(`  ${s}`);
    }
    return 2;
  }
  const out = await runner.runOne(resolved.id);
  printScenarioSummary(out.result, ctx.out);
  ctx.out(`score:    ${out.score.score} / 100 (${out.score.status})`);
  ctx.out(`json:     ${out.reports.json}`);
  ctx.out(`markdown: ${out.reports.md}`);
  ctx.out(`html:     ${out.reports.html}`);
  return out.score.status === 'pass' ? 0 : 1;
}

async function cmdCompare(parsed: ParsedArgs, ctx: CommandContext): Promise<number> {
  const [a, b] = parsed.positional;
  if (!a || !b) {
    ctx.out('usage: lab compare <runIdA> <runIdB>');
    return 2;
  }
  const { compareRuns } = await import('./compare.js');
  const result = await compareRuns(ctx.evidenceRoot, a, b);
  for (const line of result.lines) ctx.out(line);
  return 0;
}

async function cmdReset(ctx: CommandContext): Promise<number> {
  const { promises: fs } = await import('node:fs');
  const { join } = await import('node:path');
  for (const sub of ['raw', 'coverage', 'html', 'runs', 'diffs']) {
    await fs
      .rm(join(ctx.evidenceRoot, sub), { recursive: true, force: true })
      .catch(() => undefined);
  }
  ctx.out('reset: removed evidence/{raw,coverage,html,runs,diffs}');
  return 0;
}

function printScenarioSummary(r: ScenarioResult, out: (line: string) => void): void {
  out(`scenario: ${r.scenarioId}`);
  out(`status:   ${r.status}`);
  if (r.failureReason) out(`reason:   ${r.failureReason}`);
  out(`duration: ${r.durationMs} ms`);
  if (Object.keys(r.metrics).length > 0) {
    out('metrics:');
    for (const [k, v] of Object.entries(r.metrics)) out(`  ${k}: ${v}`);
  }
}

function printRunSummary(run: RunReport, score: GlobalScore, out: (line: string) => void): void {
  out(`run:      ${run.runId}`);
  out(`status:   ${score.status}`);
  out(`score:    ${score.score} / 100`);
  for (const s of score.perScenario) {
    out(`  ${s.scenarioId.padEnd(28)} ${s.status.padEnd(7)} ${s.score}`);
  }
}
