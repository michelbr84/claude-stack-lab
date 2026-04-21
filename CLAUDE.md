# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo is **pre-implementation for the lab itself**, but **ClaudeMaxPower is installed and active**. The repo currently contains:

- Two Portuguese-language planning documents (`A_melhor_opcao.md`, `roadmap.md`) — treat them as the historical source. The approved English blueprint supersedes them and will be translated into `ROADMAP.md` / `MVP.md` during Wave 1.
- The full **ClaudeMaxPower** surface: hooks, skills, commands, agents, scripts, workflows, MCP configs, and supporting docs (see "ClaudeMaxPower Integration" below).
- No lab source tree yet (`packages/`, `apps/`, `fixtures/`, `scenarios/`, `mini-app/` are not created). The blueprint in this file is the spec that Wave 1 will scaffold.

When a session begins implementing, the target structure described below is what has already been agreed.

## Project intent (one-paragraph summary)

`claude-stack-lab` is a reproducible **validation/benchmarking monorepo** whose purpose is to prove — with evidence — that the external `awesome-claude-token-stack` and `ClaudeMaxPower` stacks actually work. It is *not* a normal application: every piece exists to feed a scenario harness that runs analyses, compares before/after, and stores artifacts. When in doubt about scope, favor "can we measure it and reproduce it?" over "is it a nice feature?".

## Target architecture (from the planning docs)

The project is designed as a **pnpm monorepo** with four apps, five shared packages, and three data directories. Keep this shape when scaffolding — scenarios and scoring depend on it.

```
apps/
  web-dashboard   React + Vite — runs, scores, diffs, evidence links
  api             Node + Fastify — trigger analyses, expose results, save runs
  runner          Node + TS — the lab's engine; executes coverage/mutation/deps/complexity/size
  cli             Node + TS — setup, run scenario, run all, compare, reset
packages/
  shared          common types/utilities
  scenario-core   scenario contract + executor (the central abstraction)
  scoring-engine  per-scenario, per-category, and global scores
  reporting       JSON / Markdown / HTML output
  adapters        integrations with specific analysis tools
fixtures/         miniature projects with known-bad code (healthy-baseline, low-coverage,
                  circular-deps, high-complexity, large-modules, mutation-survivors, …)
scenarios/        formal test definitions 001…010 (see below)
evidence/         raw, json, html, diffs, snapshots — produced by runs, compared across runs
configs/          per-tool configs (coverage, mutation, dependency, complexity, module-size, lint)
```

The mini application hosted inside the monorepo is an **"Issue Quality Dashboard"** (list/detail/priority/tags/risk score/filters + small CRUD API + import-export CLI + worker). It is deliberately small, but large enough to produce real architecture and realistic metrics.

### Why `scenario-core` is the heart

Every scenario must conform to the same contract: **objective, input, expected command, expected result, minimum evidence, pass/fail status**. Risk #1 in `roadmap.md` is the project devolving into "a pile of loose tools" — `scenario-core` is the stated mitigation. New analyses plug in as scenarios, not as one-off scripts.

### Scenarios 001–010 (canonical set)

```
001 bootstrap          project comes up clean
002 coverage           fails under threshold
003 dependency-structure   fails on circular deps / forbidden imports
004 cyclomatic-complexity  fails on over-complex functions
005 module-sizes       fails on bloated modules
006 mutation-testing   fails when too many mutants survive
007 tdd-loop           validates test-first correction flow (ClaudeMaxPower)
008 debugging          validates root-cause fix, no collateral damage (ClaudeMaxPower)
009 refactor           validates structural improvement without regression (ClaudeMaxPower)
010 full-regression    validates everything still green after changes
```

007–010 are the ClaudeMaxPower validation scenarios — each must declare which skill/flow was used, the problem given, expected outcome, and produced evidence.

## V1 (MVP) scope — what counts as done

From `roadmap.md` §9. The MVP is approved only when **all** of these hold:

- monorepo, runner, CLI, dashboard, mini app all run
- 6 fixtures exist: healthy-baseline, low-coverage, circular-deps, high-complexity, large-modules, mutation-survivors
- 6 scenarios execute end-to-end (001–006 at minimum, plus at least one ClaudeMaxPower flow)
- coverage, dependency structure, complexity, module sizes, mutation testing are all integrated
- JSON + HTML reports are produced, dashboard displays them, runs are comparable
- at least one full ClaudeMaxPower validation cycle has been run and recorded
- CI enforces the basic quality gates below

Explicit **non-goals for V1**: multi-language support, complex auth, distributed DB, multiple advanced dashboards, autonomous agent orchestration. Resist scope expansion until V1 gates are green.

## Quality gates (initial, from roadmap §12)

These are the pass thresholds for MVP CI. Do not loosen them without updating `roadmap.md`.

- coverage (global) ≥ 80 %
- mutation score ≥ 65 %
- zero critical circular dependencies
- cyclomatic complexity per function ≤ 12
- module size ≤ 300 lines in critical files
- typecheck, smoke, and integration suites 100 % green

Stricter post-MVP gates (coverage ≥ 85, mutation ≥ 75, complexity ≤ 10, size ≤ 250, zero flaky tests) are documented but not yet in force.

## Technology choices (locked for V1)

Keep it boring and TypeScript-only for V1. Multi-language is deferred.

- monorepo: **pnpm workspaces** (optionally turbo)
- web: React + Vite
- API: Node + Fastify
- runner / CLI: Node + TypeScript
- storage: SQLite
- tests: Vitest; E2E: Playwright
- coverage: Istanbul / c8
- mutation: Stryker
- CI: GitHub Actions

Do not introduce Rust/Python/Go modules during V1 — that's Phase 6 territory in `roadmap.md`.

## Working conventions for this repo

- **The project is English-only by decision.** The legacy Portuguese planning docs (`A_melhor_opcao.md`, `roadmap.md`) stay for historical reference only; all new code, docs, identifiers, comments, and planning files must be in English. During V1 hardening those two legacy files should be moved under `docs/legacy/`.
- The legacy Portuguese files use hand-escaped markdown (`\#`, `\##`, `&#x20;`, `\---`). When you create canonical `README.md` / `ROADMAP.md` / `MVP.md`, write them as normal markdown — do not propagate the escaping.
- Every new analyzer/check lands as a scenario conforming to `scenario-core`, not as a loose script.
- Every run writes to `evidence/` in a form that can be diffed against a prior run; "ran successfully" without stored artifacts does not count.
- The 30-item execution order in `roadmap.md` §14 is the recommended sequencing — prefer following it rather than jumping ahead to reporting or CI before the runtime and fixtures exist.

## When starting real work

The approved blueprint's Wave 1 (see "First Implementation Wave" in the plan) prescribes: repo-level config files first, then English docs skeleton (`README.md`, `ROADMAP.md`, `MVP.md`, `SCENARIOS.md`, `CONTRIBUTING.md`), then `packages/shared` and `packages/scenario-core`, then the cheapest adapters (lint, typecheck, unit), scenario 001, the healthy-baseline fixture, the runner and CLI, and finally a minimal `pr.yml`. Nothing beyond that wave is started until scenario 001 runs green.

---

## ClaudeMaxPower Integration (installed, active)

**ClaudeMaxPower** is installed in this repository. `/max-power` checks three install markers; all three are satisfied:

- `.claude/hooks/session-start.sh` — present
- `skills/assemble-team.md` — present
- `CLAUDE.md` contains the string `ClaudeMaxPower` — present (this section)

### Active surfaces

| Area | Location | Purpose |
|---|---|---|
| Hooks | `.claude/hooks/` | `session-start`, `pre-tool-use` (safety + audit log), `post-tool-use` (auto-test on edit), `stop` (persist `.estado.md`) |
| Slash commands | `.claude/commands/` | 15 canonical commands including `/max-power`, `/brainstorming`, `/writing-plans`, `/subagent-dev`, `/tdd-loop`, `/systematic-debugging`, `/finish-branch`, `/using-worktrees`, `/assemble-team`, `/fix-issue`, `/review-pr`, `/refactor-module`, `/pre-commit`, `/generate-docs`, `/tdd-loop-lite` |
| Skills | `skills/` | Source of truth for the skills; commands are generated wrappers |
| Agents | `.claude/agents/` | `code-reviewer`, `security-auditor`, `doc-writer`, `team-coordinator` |
| Settings | `.claude/settings.json` | Agent teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), hook wiring, permission allow/deny |
| Scripts | `scripts/` | `setup.sh`, `verify.sh`, `verify-ci.sh`, `auto-dream.sh`, `generate-commands.py` |
| Workflow scripts | `workflows/` | `batch-fix.sh`, `dependency-graph.sh`, `mass-refactor.sh`, `parallel-review.sh` |
| MCP configs | `mcp/` | GitHub + Sentry MCP configs |
| Docs | `docs/` | Guides for hooks, skills, agents, agent teams, auto-dream, batch workflows, superpowers-integration, troubleshooting, bootstrap |
| Upstream reference | `docs/claudemaxpower/` | Verbatim copies of upstream `CLAUDE.md` and `README.md` for provenance |
| Attribution | `ATTRIBUTION.md` | Upstream `obra/superpowers` credits (MIT) |

### The unified pipeline (canonical order for new work)

```
Idea
 ├─ /brainstorming         docs/specs/YYYY-MM-DD-<topic>-design.md   (hard gate)
 ├─ /writing-plans         docs/plans/YYYY-MM-DD-<topic>-plan.md     (bite-sized tasks)
 ├─ /using-worktrees       isolated branch workspace
 ├─ /subagent-dev          fresh subagent per task + two-stage review
 │    └─ /tdd-loop            (strict Red-Green-Refactor)
 │    └─ /systematic-debugging (root cause before fix)
 └─ /finish-branch         merge / PR / keep / discard + worktree cleanup
```

### The four iron laws (apply in every session)

1. **No production code without a failing test first** (`/tdd-loop`).
2. **No implementation without an approved spec** (`/brainstorming` hard gate).
3. **No fixes without root-cause investigation** (`/systematic-debugging` phase 1).
4. **No merging with failing tests** (`/finish-branch` verification step).

### Fit with the blueprint (important)

- The CMP pipeline **is the engineering discipline** for building the lab. The lab itself **measures** CMP (and `awesome-claude-token-stack`) against scenarios 007–009 defined in the blueprint.
- Keep CMP's top-level `scripts/` and blueprint's future `scripts/` colocated; file-name collisions are to be avoided (CMP uses `*.sh`, blueprint will add `*.ts`).
- `docs/` mixes CMP guides (top-level) with future lab docs (`docs/architecture/`, `docs/scenarios/`, `docs/playbooks/`, `docs/reports/`). Do not move CMP docs during Wave 1.
- `.github/workflows/ci.yml` and `release.yml` are CMP's own CI definitions. The blueprint's lab workflows (`pr.yml`, `nightly.yml`, `baseline-refresh.yml`) will be added alongside them in Phase 9 without replacing them.
- `post-tool-use.sh` auto-runs tests on every `*.py`/`*.ts` edit. This is aligned with the lab's TDD-first stance. If it becomes noisy during early scaffolding, the hook may be temporarily narrowed — do not delete it.

### Verifying CMP health

- `bash scripts/setup.sh` — idempotent bootstrap; regenerates slash-command wrappers.
- `bash scripts/verify.sh` — checks tools, hooks, skills, agents, `.env`.
- `bash scripts/verify-ci.sh` — mirrors CMP's CI locally (shellcheck, actionlint, jq, structure).
