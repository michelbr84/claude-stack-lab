# Scenarios catalogue

Every analysis the lab performs is encoded as a **scenario**. A
scenario is a typed, declarative, reproducible test of *one* property
of the codebase or of the engineering pipeline.

A scenario is the smallest unit the runner understands. Adding a
scenario is how you extend the lab — *not* by adding a one-off
script.

## Scenario contract

Defined in `packages/scenario-core/src/types.ts`:

```ts
export interface Scenario {
  id: string;                  // e.g. "001-bootstrap"
  title: string;               // human label
  category: ScenarioCategory;  // bootstrap | coverage | …
  objective: string;           // what we are proving
  fixture: string | null;      // which fixture this targets, if any
  expectedCommand: string;     // exact command the scenario runs
  expectedResult: ExpectedResult; // pass criteria
  minimumEvidence: EvidenceSpec[]; // what artifacts must be produced
  run(ctx: ScenarioContext): Promise<ScenarioResult>;
}
```

## Catalogue (V1)

| ID  | Title                  | Category              | Fixture            | What it proves |
|-----|------------------------|-----------------------|--------------------|----------------|
| 001 | bootstrap              | bootstrap             | none               | the project comes up clean (lint + typecheck + unit tests + build) |
| 002 | coverage               | coverage              | low-coverage       | lab fails when coverage drops below the V1 threshold |
| 003 | dependency-structure   | dependency-structure  | circular-deps      | lab fails when a critical cycle exists |
| 004 | cyclomatic-complexity  | complexity            | high-complexity    | lab fails when a function exceeds the complexity ceiling |
| 005 | module-sizes           | module-size           | large-modules      | lab fails when a critical file exceeds the size ceiling |
| 006 | mutation-testing       | mutation              | mutation-survivors | lab fails when too many mutants survive |
| 007 | tdd-loop               | cmp-validation        | mutation-survivors | `/tdd-loop` produces a real failing test before the implementation (manifest) |
| 008 | awesome-claude-token-stack | cmp-validation    | none               | the upstream ACTS still ships every load-bearing claim from its README |
| 009 | refactor-module        | cmp-validation        | large-modules      | `/refactor-module` reduced a module past the size ceiling without regressing tests (manifest) |
| 010 | full-regression        | regression            | none               | committed baseline still records a green run of 001..009 |

Scenarios 007..010 are the **ClaudeMaxPower validation set**. They
each declare the skill used (or the upstream being validated), the
prompt given, the expected outcome, and the evidence produced.
Scenarios 007 and 009 use a **manifest** pattern — the operator runs
the slash command manually, then commits a manifest that 007/009
validate. Scenarios 008 and 010 execute live (upstream validation
and committed-baseline contract check, respectively).

## Lifecycle

```
load   → execute → score → write evidence → report
```

Each step is implemented in `packages/scenario-core` and is unit
tested. The runner orchestrates them; the CLI is the user-facing
trigger.

## Adding a new scenario

1. Create `scenarios/<NNN>-<slug>.ts` exporting a `Scenario`.
2. Register it in `scenarios/index.ts`.
3. Add a fixture under `fixtures/<slug>/` if needed.
4. Write tests under `packages/scenario-core/src/__tests__/` that
   verify the scenario passes on the healthy fixture and fails on the
   broken one.
5. Run `pnpm verify` and `pnpm scenario:<NNN>` locally.
6. Open a PR; CI runs the new scenario.

## Evidence layout

Every run writes to:

```
evidence/
├── raw/<scenario-id>/<run-id>/
│   ├── stdout.txt
│   ├── stderr.txt
│   ├── report.md
│   └── ... tool-specific artifacts (lcov, dependency graph, …)
├── json/<run-id>.json     ← canonical machine-readable report
└── snapshots/<scenario-id>/baseline.json ← latest accepted baseline
```

Run IDs are ISO-timestamp + 6-char random suffix (e.g.
`2026-04-21T09-30-00Z-a1b2c3`). They are sortable and globally unique
within a checkout.
