# Roadmap

This is the **English source of truth**. The original Portuguese
planning documents are preserved verbatim in
[`docs/legacy/`](./docs/legacy/) for historical reference.

## Vision

`claude-stack-lab` is a reproducible monorepo whose only job is to
prove — with stored, diff-able evidence — whether
[`awesome-claude-token-stack`][acts] and
[`ClaudeMaxPower`][cmp] actually deliver the engineering outcomes
they advertise. The lab combines:

1. a small but realistic mini-application,
2. fixtures with **deliberately broken** code,
3. a runner that executes analyses and scenarios,
4. a dashboard / report layer that stores evidence and comparisons.

The goal is not "run a tool". The goal is to answer:

- did the stack detect the problem?
- did ClaudeMaxPower help fix it?
- did the fix actually move the metrics?
- did anything regress afterwards?

## Phases

### Phase 0 — Bootstrap
Repo, this roadmap, the engineering conventions, the legacy-docs move.

### Phase 1 — Foundation (V1, ✅ shipped)
Monorepo, runner, CLI, mini-app, healthy baseline, six fixtures with
known-bad code, scenarios 001..006, JSON + Markdown reports, scoring
engine, lab CI workflow (`pr.yml`). Landed via PR #1.

### Phase 2 — ClaudeMaxPower validation (✅ shipped)
Scenarios 007..010 — before/after runs around `/tdd-loop` (007),
`/refactor-module` (009), an active upstream contract check for
`awesome-claude-token-stack` (008), and a committed-baseline
regression gate (010). `/systematic-debugging` validation (was
slotted as 008 in early drafts) is now captured by the
cmp-validation category more broadly; a dedicated scenario will
land in a follow-up if a reproducible before/after artifact
proves useful.

### Phase 3 — Dashboard
React + Vite dashboard, run history, comparison view, evidence links.

### Phase 4 — API
Fastify HTTP layer over the runner, run persistence in SQLite, REST
endpoints used by the dashboard.

### Phase 5 — Hardened CI
`pr.yml`, `nightly.yml`, `baseline-refresh.yml`. Quality gates become
required checks. Mutation runs nightly to keep PR latency low.

### Phase 6 — Multi-language (post-V1)
Add fixtures and adapters for Python / Go / Rust. Out of scope for V1.

## Quality gates (V1)

These thresholds are enforced by `pr.yml`. Tightening them requires a
roadmap update.

| Metric | V1 threshold | Stretch (post-V1) |
|---|---|---|
| Lines coverage | ≥ 80% | ≥ 85% |
| Mutation score | ≥ 65% | ≥ 75% |
| Critical cycles | 0 | 0 |
| Cyclomatic complexity / function | ≤ 12 | ≤ 10 |
| Module size (critical files) | ≤ 300 LOC | ≤ 250 LOC |
| Lint / typecheck / build | green | green |

## V1 definition of done

The MVP is *only* approved when **all** of the following hold:

- [ ] monorepo, runner, CLI, healthy-baseline app all run
- [ ] 6 fixtures exist (healthy-baseline, low-coverage, circular-deps,
      high-complexity, large-modules, mutation-survivors)
- [ ] scenarios 001..006 execute end-to-end
- [ ] coverage, dependency structure, complexity, module sizes, mutation
      testing are all integrated as adapters
- [ ] JSON + Markdown reports are produced
- [ ] runs are comparable across executions
- [ ] at least one ClaudeMaxPower validation cycle (007..010) is
      recorded in `evidence/`
- [ ] CI enforces the V1 gates above

## Explicit non-goals for V1

- multi-language (Python / Go / Rust) — Phase 6
- complex auth, RBAC, distributed DB
- multiple advanced dashboards
- autonomous agent orchestration

## Technology lock-in (V1)

- **Monorepo**: pnpm workspaces
- **TypeScript** end-to-end
- **Tests**: Vitest
- **Coverage**: V8 / c8
- **Mutation**: Stryker
- **Dependencies**: dependency-cruiser
- **Lint**: ESLint
- **Storage**: filesystem JSON (SQLite arrives in Phase 4)
- **CI**: GitHub Actions

[acts]: https://github.com/aitmlouk/awesome-claude-token-stack
[cmp]: https://github.com/michelbr84/ClaudeMaxPower
