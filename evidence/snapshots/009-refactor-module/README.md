# 009-refactor-module evidence

Records a reproducible `/refactor-module` cycle on the
`large-modules` fixture.

## Files

- `manifest.json` — structured record with before/after metrics
  and the diff pointer. Consumed by scenario 009.
- `refactored/` — the output of the refactor:
  - `values-a.ts` — values 0..117 (118 code lines)
  - `values-b.ts` — values 118..235 (118 code lines)
  - `values-c.ts` — values 236..349 (114 code lines)
  - `index.ts` — barrel that re-exports all three

Drop `refactored/*.ts` into
`fixtures/large-modules/src/` (replacing `oversized.ts`) and
re-run scenario 005 — `oversized_files` drops from `1` to `0`.

The fixture is **not** updated in tree; scenario 005 must keep
detecting the oversized module.
