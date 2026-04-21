# Contributing

This lab is a validation harness, not an application. Contributions
should make analyses **more rigorous, more reproducible, or more
diff-able** — not richer in features.

## Working agreement

- All code, identifiers, comments, and new docs are **English**.
  The legacy Portuguese planning docs in `docs/legacy/` are
  preserved as historical record only.
- We use **TDD** (`/tdd-loop`). No production code without a failing
  test first.
- Every analyzer / check lands as a **scenario** under
  `scenarios/`, conforming to the `Scenario` contract in
  `packages/scenario-core`.
- Every run writes to `evidence/`. "Ran successfully" without stored
  artifacts does not count.

## Workflow

```
/brainstorming <topic>          design the change (spec gate)
/writing-plans <spec>           bite-sized tasks
/using-worktrees                isolated workspace
/subagent-dev <plan>            execute via fresh subagents
  └─ /tdd-loop                  for new logic
  └─ /systematic-debugging      for bugs
/finish-branch                  merge / PR / cleanup
```

The `/max-power` slash command sets all of this up. See
[`CLAUDE.md`](./CLAUDE.md) for the active surfaces.

## Quality gates (CI)

PRs must satisfy `.github/workflows/pr.yml`:

- `pnpm lint` — 0 errors, 0 warnings
- `pnpm typecheck` — 0 errors
- `pnpm test:coverage` — ≥ 80% lines, ≥ 75% branches
- `pnpm scenario:001` — green
- evidence artifact uploaded

The same gates can be run locally with:

```bash
pnpm verify           # lint + typecheck + tests
pnpm scenario:001     # bootstrap scenario
```

## Adding a scenario

See [`SCENARIOS.md`](./SCENARIOS.md) → "Adding a new scenario".

## Adding an adapter

An adapter wraps an external tool (eslint, dependency-cruiser, …)
and returns a normalized `AdapterResult`. Implementation lives in
`packages/adapters/src/<tool>.ts`. Each adapter must:

1. expose `run(input: AdapterInput): Promise<AdapterResult>`,
2. record the underlying tool version in the result,
3. write its raw output to `evidence/raw/<scenario>/<run>/`,
4. ship with a unit test that locks the contract.

## Commit style

We follow Conventional Commits. Scope = top-level dir
(`runner`, `scenario-core`, `adapters/coverage`, …).

```
feat(scenario-core): add ScenarioRegistry.registerAll
fix(adapters/dependency): handle empty cruise output
docs(roadmap): clarify Phase 4 scope
test(scoring): cover branch where all adapters fail
chore(ci): bump pr.yml node to 22
```
