# claude-stack-lab

A reproducible **validation and benchmarking monorepo** that proves —
with evidence — whether [`awesome-claude-token-stack`][acts] and
[`ClaudeMaxPower`][cmp] actually deliver the engineering outcomes they
promise.

This is **not** a normal application. Every package, fixture, scenario,
and report exists to feed a scenario harness that runs analyses,
compares before/after, and stores artifacts.

## What this lab measures

| Category | Tooling | Pass threshold (V1) |
|---|---|---|
| Test coverage | Vitest + V8 coverage | ≥ 80% lines |
| Mutation testing | Stryker | ≥ 65% killed |
| Dependency structure | dependency-cruiser | 0 critical cycles |
| Cyclomatic complexity | typescript AST analyzer | ≤ 12 / function |
| Module size | line counter on src files | ≤ 300 lines |
| Lint / typecheck | eslint + tsc --noEmit | 0 errors |
| Build | pnpm -r build | green |

Each metric is exposed as one or more **scenarios** (see
[`SCENARIOS.md`](./SCENARIOS.md)). Scenarios are versioned, reproducible
declarations of *objective → input → expected command → expected result
→ minimum evidence → status*.

## How it is structured

```
apps/
  runner/         the engine that executes scenarios
  cli/            user-facing command-line entry point
  api/            Fastify REST layer over the evidence directory
packages/
  shared/         common types and utilities
  scenario-core/  scenario contract + executor (the heart)
  adapters/       integrations with external analysis tools
  scoring-engine/ per-scenario, per-category, global scores
  reporting/      JSON / Markdown / HTML output
fixtures/
  healthy-baseline/    a small "Issue Quality Dashboard" mini-app
  low-coverage/        deliberately under-tested module
  circular-deps/       deliberately cyclic imports
  high-complexity/     deliberately complex function
  large-modules/       deliberately oversized file
  mutation-survivors/  deliberately weak assertions
scenarios/             001..011 scenario declarations
evidence/              run artifacts, JSON, HTML, snapshots
docs/                  English docs (legacy/ holds Portuguese originals)
```

## Quick start

```bash
# 1. install
pnpm install

# 2. verify the lab itself is healthy
pnpm verify          # lint + typecheck + tests

# 3. run a single scenario
pnpm scenario:001    # bootstrap

# 4. run the full suite
pnpm scenario:all

# 5. serve the evidence over HTTP (read-only)
pnpm --filter @lab/api run start        # http://127.0.0.1:8080
```

Outputs land in `evidence/` and are diff-friendly between runs. The
API exposes `GET /health`, `/scenarios`, `/runs`, `/runs/:runId`,
`/runs/:runId/markdown`, and `/baseline`.

## Wave 1 status

This branch is the first implementation wave. It scaffolds the
monorepo, the scenario contract, the cheapest adapters
(lint/typecheck/coverage/size/cycles/complexity), the runner and CLI,
the `healthy-baseline` fixture, and scenario 001.

See [`docs/reports/wave-1-handoff.md`](./docs/reports/wave-1-handoff.md)
for the full report.

## Documentation

- [`ROADMAP.md`](./ROADMAP.md) — phased plan from V1 to V3
- [`MVP.md`](./MVP.md) — exact V1 scope and definition-of-done
- [`SCENARIOS.md`](./SCENARIOS.md) — full scenario catalogue
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to add a scenario
- [`docs/legacy/`](./docs/legacy/) — original Portuguese planning docs
- [`CLAUDE.md`](./CLAUDE.md) — guidance for Claude Code sessions in
  this repo, including the active ClaudeMaxPower pipeline

## Engineering pipeline (ClaudeMaxPower)

Every change goes through the standard CMP flow:

```
/brainstorming  →  /writing-plans  →  /using-worktrees  →  /subagent-dev
        ↓                                                       ↓
        spec gate                            /tdd-loop, /systematic-debugging
        ↓                                                       ↓
                          /finish-branch  →  PR  →  CI gates
```

The four iron laws apply:

1. No production code without a failing test first.
2. No implementation without an approved spec.
3. No fixes without root-cause investigation.
4. No merge with failing tests.

[acts]: https://github.com/aitmlouk/awesome-claude-token-stack
[cmp]: https://github.com/michelbr84/ClaudeMaxPower
