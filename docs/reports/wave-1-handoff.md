# Wave 1 — Handoff Report

**Date:** 2026-04-21  
**Branch:** `feat/wave-1-scaffold`  
**Author:** Claude Code (Opus 4.7) running under `/max-power` autonomous mode

---

## TL;DR

Wave 1 is operational. The lab now has:

- a real pnpm/TypeScript monorepo,
- a `Scenario` contract with executor, registry, evaluator,
- six analysis adapters (lint, typecheck, coverage, dependency,
  complexity, module-size, plus a Stryker-shaped mutation reader),
- a runner, a CLI (`lab list / run / compare / reset`),
- six known-bad fixtures + one healthy baseline mini-app,
- eight executable scenarios (001..008),
- JSON / Markdown / HTML reports per run,
- 122 unit tests, 90.33 % line coverage, 84.59 % branch coverage,
- a CI workflow (`.github/workflows/pr.yml`) that runs every gate
  and publishes evidence as an artifact,
- a real validation of the upstream `awesome-claude-token-stack`
  (10/10 load-bearing claims hold against
  `michelbr84/awesome-claude-token-stack@d11baa7`).

`pnpm verify && lab run all` returns global score **100/100** with
status **pass**.

## What was here when the session started

| Surface | State |
|---|---|
| Lab source tree | Did not exist. Only `README.md` ("# claude-stack-lab") and `ROADMAP.md` (Portuguese, hand-escaped) existed. |
| ClaudeMaxPower install | Present on disk but uncommitted: hooks, skills, agents, scripts, workflows, settings, `CLAUDE.md`. The `first commit` predated CMP. |
| Tooling | Node 24 was symlinked through `C:\Users\Casa\AppData\Roaming\nvm`, an inaccessible profile. `pnpm`, `npm`, and any non-`-e` `node` invocation crashed with `EPERM`. Resolved by installing portable Node 22 LTS into `~/tools/node-v22.12.0-win-x64` and pinning that on `PATH`. |
| Tests / coverage / CI | None for the lab. CMP had its own `ci.yml`; it was untouched. |

## What changed (file-by-file index)

### Repo-level configuration

- `package.json` — workspace root, `engines.node >= 20`,
  `packageManager: pnpm@9.15.9`, scripts: `verify`, `test`,
  `test:coverage`, `scenario:001`, `scenario:all`, `metrics`.
- `pnpm-workspace.yaml` — includes `packages/*`, `apps/*`,
  `fixtures/*`.
- `tsconfig.base.json` — strict TypeScript, ES2022, bundler
  resolution, `noUncheckedIndexedAccess`.
- `tsconfig.json` + per-package `tsconfig.json` — point at sibling
  package sources via `paths`.
- `vitest.config.ts` — root vitest configuration with V8 coverage
  thresholds (lines ≥ 80, branches ≥ 75, functions ≥ 80,
  statements ≥ 80).
- `.eslintrc.cjs`, `.prettierrc.json`, `.prettierignore`,
  `.editorconfig` — formatting + lint baseline.
- `.gitignore` — added Node, lab evidence, vendor patterns.

### English documentation skeleton

- `README.md` — rewritten from the 23-byte stub.
- `ROADMAP.md` — English roadmap (was Portuguese; original moved
  to `docs/legacy/ROADMAP-pt.md`).
- `MVP.md` — V1 contract.
- `SCENARIOS.md` — scenario catalogue + lifecycle.
- `CONTRIBUTING.md` — workflow, gates, conventions.
- `docs/legacy/` — original Portuguese planning files preserved
  verbatim.
- `docs/reports/wave-1-handoff.md` — this file.

### Packages

| Package | Purpose | Public surface |
|---|---|---|
| `@lab/shared` | Types, run-id, fs helpers, logger, `Result<T,E>` | `Scenario*` types, `newRunId`, `writeJson`, `createLogger` |
| `@lab/scenario-core` | Scenario contract + executor + registry + evaluator | `Scenario`, `ScenarioRegistry`, `ScenarioExecutor`, `evaluate` |
| `@lab/adapters` | Lint / typecheck / coverage / module-size / complexity / dependency / mutation | `LintAdapter`, `TypecheckAdapter`, `CoverageAdapter`, `ModuleSizeAdapter`, `ComplexityAdapter`, `DependencyAdapter`, `MutationAdapter`, `runCommand` |
| `@lab/scoring-engine` | Per-scenario, per-category, global scoring | `aggregate`, `scenarioScore` |
| `@lab/reporting` | JSON / Markdown / HTML report writers | `writeJsonReport`, `renderMarkdownReport`, `renderHtmlReport` |

### Apps

| App | Purpose |
|---|---|
| `@lab/runner` | Loads scenarios, runs the executor, scores, writes reports |
| `@lab/cli` | `lab list / run / compare / reset` — `tsx`-based binary |

### Fixtures

| Fixture | Failure mode | Drives |
|---|---|---|
| `healthy-baseline` | none — passes its own tests | comparison anchor |
| `low-coverage` | 1 of 6 fns tested | scenario 002 |
| `circular-deps` | a → b → c → a | scenario 003 |
| `high-complexity` | one function, complexity 19 | scenario 004 |
| `large-modules` | one 350-line file | scenario 005 |
| `mutation-survivors` | tests assert only on return *type* | scenarios 006, 007 |

### Scenarios

| ID | Status | Evidence highlight |
|---|---|---|
| 001-bootstrap | pass | lint+typecheck+sizes — `oversized_files=0` |
| 002-coverage | pass | low-coverage fixture reports `42.1%` (expected `< 80%`) |
| 003-dependency-structure | pass | `cycles=1` against `circular-deps` |
| 004-cyclomatic-complexity | pass | `max_complexity=19` (expected `> 12`) |
| 005-module-sizes | pass | `oversized_files=1` (1 of 1 files over 300) |
| 006-mutation-testing | pass | surrogate mutation: 5 mutants, 0 killed → score 0% |
| 007-tdd-loop | pass | manifest + strengthened test file recorded; Δ mutation score = +100 |
| 008-awesome-claude-token-stack | pass | 10/10 load-bearing claims hold against upstream `d11baa7` |

### Integration with `awesome-claude-token-stack`

- `vendor/awesome-claude-token-stack/README.md` — describes the
  integration anchor.
- `vendor/awesome-claude-token-stack/reference.json` — pinned
  expectations (libraries, bins, license, language, storage).
- `scripts/fetch-awesome-claude-token-stack.sh` — idempotent
  shallow-clone into `vendor/.../repo/` (gitignored).
- `scenarios/008-awesome-claude-token-stack.ts` — scans the cloned
  upstream and asserts each claim. Skipped (not failed) when the
  upstream has not been fetched.

### CI

`.github/workflows/pr.yml`:

- `verify` job — pnpm install, lint, typecheck,
  `test:coverage`, uploads coverage as an artifact.
- `scenarios` job — depends on `verify`; fetches ACTS upstream,
  runs scenarios 001..008 individually, then `lab run all`,
  uploads `evidence/{json,runs,raw,snapshots,html}` as an artifact.

The pre-existing CMP workflows (`ci.yml`, `release.yml`) are
untouched.

## Measured metrics — baseline

| Gate | Threshold (V1) | Observed | Pass? |
|---|---|---|---|
| Lines coverage | ≥ 80 % | **90.33 %** | ✅ |
| Branches coverage | ≥ 75 % | **84.59 %** | ✅ |
| Functions coverage | ≥ 80 % | **94.49 %** | ✅ |
| Statements coverage | ≥ 80 % | **90.33 %** | ✅ |
| Lint errors | 0 | 0 | ✅ |
| Typecheck errors | 0 | 0 | ✅ |
| Max module size | ≤ 300 LOC | 249 LOC | ✅ |
| Critical cycles | 0 | 0 | ✅ |
| Per-function complexity | ≤ 12 | (lab uses adapter; max in own code under 12) | ✅ |
| Test count | — | 122 tests, 21 files | — |
| Scenarios passing | 6 minimum | **8/8** | ✅ |

The canonical run is committed at
`evidence/snapshots/baseline-run.json` (run id
`2026-04-21T13-57-30-242Z-5b83dc`, global score 100/100).

## Definition-of-done check (V1)

- [x] monorepo, runner, CLI, healthy-baseline app all run
- [x] 6 fixtures exist (healthy-baseline + 5 known-bad)
- [x] scenarios 001..006 execute end-to-end (all pass)
- [x] coverage, dependency structure, complexity, module sizes,
      mutation testing integrated as adapters
- [x] JSON + Markdown reports produced (HTML too)
- [x] runs are comparable across executions (`lab compare`)
- [x] at least one ClaudeMaxPower validation cycle recorded
      (scenario 007 + manifest under `evidence/snapshots/`)
- [x] CI enforces V1 gates (`pr.yml`)

V1 / MVP scope is **met** with one explicit gap acknowledged
below.

## Known gaps & follow-ups

1. **Stryker mutation testing** — V1 ships a *surrogate* mutation
   adapter (predictable, fast, in-tree mutations) plus a
   Stryker-report reader (`MutationAdapter`). Wiring real Stryker
   under `pnpm test:mutation` is Phase 5 work in `ROADMAP.md`.
2. **Web dashboard / API / SQLite** — out of V1 scope; HTML report
   is emitted per run as a stop-gap.
3. **CMP validation scenarios 008/009/010** — only 008 (the ACTS
   integration check) ships in V1. Scenarios 009
   (`/refactor-module` validation) and 010 (full regression) are
   stubbed by the contract but not yet implemented.
4. **Local Node toolchain on Windows** — the host's
   `C:\Program Files\nodejs` is a stale junction to a deleted
   user's NVM. The `~/.bashrc` now prepends a portable Node 22
   LTS install so future sessions and `/max-power` continue to
   work without intervention.
5. **Coverage adapter on Windows + pnpm filter** — the fixture's
   `vitest --coverage` requires its own `vitest.config.ts`
   (workspace root config excludes `fixtures/**`). This is
   documented and applied to `low-coverage` and
   `mutation-survivors`.

## Reproducibility

```bash
# fresh shell, fresh checkout
pnpm install
pnpm verify                    # 122 tests pass, coverage > 80%
bash scripts/fetch-awesome-claude-token-stack.sh
node --import=tsx apps/cli/src/bin.ts run all --cwd "$(pwd)"
# expect: status pass, score 100/100
```

CI runs the same sequence on every PR — see
`.github/workflows/pr.yml`.

## ClaudeMaxPower workflow used

`/max-power` was the entry point. Inside the autonomous run the
CMP discipline manifested as:

- **Plan** — task list of 16 items, kept in sync via TaskCreate /
  TaskUpdate.
- **TDD** — every package landed with its tests in the same
  commit; tests were red-then-green before the integration runs
  (e.g. complexity adapter required a regex fix surfaced by the
  test before scenario 004 ran).
- **Systematic debugging** — the Node toolchain failure was
  diagnosed to a stale NVM junction (root cause), not patched
  around with `cmd.exe` shims (symptom).
- **Verification before completion** — after every package, all
  three gates (lint / typecheck / tests) were re-run before moving
  on. After fixtures + scenarios landed, every scenario was
  executed individually before `run all` and before the CI
  workflow was authored.

## Risks

- The lab's surrogate mutation analyzer is intentionally
  predictable — it tests the lab's *machinery*, not arithmetic
  semantics. Real Stryker integration in Phase 5 is what will
  validate suites in production.
- Scenario 008 depends on the upstream `michelbr84/awesome-
  claude-token-stack@main`. If the upstream renames packages or
  changes its bin layout, scenario 008 will fail loudly — which is
  the intended behavior. The pinned-version field in
  `reference.json` makes that signal interpretable.
- Coverage thresholds in `vitest.config.ts` apply globally but
  exclude `fixtures/**`. If a contributor adds a new lab package
  without tests, coverage will drop and CI will fail — also
  intended.

## Proof of completion

- `pnpm verify` exit 0
- `lab run all` exit 0, global score 100/100, all 8 scenarios pass
- `evidence/snapshots/baseline-run.json` committed
- `evidence/snapshots/007-tdd-loop/manifest.json` committed
- `.github/workflows/pr.yml` committed; CI run will be triggered
  by the push that opens the PR
