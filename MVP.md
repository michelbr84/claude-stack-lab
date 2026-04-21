# V1 / MVP

This document is the contract for the V1 milestone. It is intentionally
narrow.

## Scope

V1 is the **TypeScript-only monorepo** with:

- the runner and CLI engine,
- the cheapest analysis adapters (lint, typecheck, coverage,
  dependency cruiser, complexity, module size),
- the `healthy-baseline` mini-app,
- the five known-bad fixtures,
- scenarios 001..006 fully wired,
- one ClaudeMaxPower validation scenario (007),
- JSON and Markdown reports,
- the lab CI workflow (`.github/workflows/pr.yml`).

## Out of scope for V1

- the React + Vite dashboard (Phase 3)
- the Fastify API layer (Phase 4)
- SQLite persistence (Phase 4)
- multi-language adapters (Phase 6)
- nightly mutation runs (Phase 5)
- the `baseline-refresh.yml` workflow (Phase 5)

## Definition of done

The V1 milestone is approved only when all bullets pass:

1. **Toolchain**
   - `pnpm install` succeeds on a clean machine running Node ≥ 20.
   - `pnpm verify` (lint + typecheck + tests) is green.
2. **Scenarios**
   - `pnpm scenario:001` returns status `pass` with evidence written
     to `evidence/raw/001-bootstrap/<run-id>/`.
   - `pnpm scenario:all` executes 001..006 and produces a manifest.
3. **Fixtures**
   - `fixtures/healthy-baseline` is a real working mini-app whose own
     test suite passes.
   - The five known-bad fixtures each fail their corresponding
     scenario *for the right reason*.
4. **Reporting**
   - Each run produces `evidence/json/<run>.json` and
     `evidence/raw/<scenario>/<run>/report.md`.
   - A run can be diffed against a prior run by run-id.
5. **CI**
   - `.github/workflows/pr.yml` runs lint + typecheck + tests +
     coverage + scenario 001 on every PR and uploads the evidence
     directory as an artifact.
6. **ClaudeMaxPower validation**
   - At least one full validation cycle (e.g. scenario 007) is
     recorded under `evidence/` with the skill used, the input given,
     the produced diff, and the metric movement.

## Quality gates that must hold at V1

(Enforced by `pr.yml`; see `ROADMAP.md` for the table.)

- lines coverage ≥ 80%
- mutation score ≥ 65% (run on the lab's own packages, not on
  fixtures)
- 0 critical dependency cycles
- per-function cyclomatic complexity ≤ 12
- module size ≤ 300 LOC for any file under `packages/*/src` or
  `apps/*/src`

## Acceptance signal

V1 is "done" when the most recent push to `main` shows:

- ✅ `pr.yml` passing
- ✅ `evidence/` artifact uploaded
- ✅ `docs/reports/wave-1-handoff.md` present and up to date
