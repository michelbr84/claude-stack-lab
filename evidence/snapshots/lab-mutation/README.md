# evidence/snapshots/lab-mutation

Committed Stryker mutation-testing snapshot for the lab's own
packages (`packages/*`, `apps/*`). Refreshed via `pnpm
test:mutation`, then copied here.

## Files

- `mutation.json` — raw Stryker report in Stryker-schema v2
  format. Consumed by `@lab/adapters` `MutationAdapter` and by
  scenario 011.
- `summary.json` — condensed per-file and totals view, kept
  committed so a reader can see the score without parsing the
  full report.

## Baseline (at first adoption)

| Metric | Value |
|---|---|
| Mutants total | 1 675 |
| Killed (incl. Timeout / CompileError / RuntimeError) | 913 |
| Survived | 572 |
| No coverage | 190 |
| **Score** (killed / total) | **54.51 %** |
| Effective score (killed / (total − noCoverage)) | 61.48 % |

The V1 "nice-to-hit" target is ≥ 65 % (see `ROADMAP.md`).
The lab starts below that floor — this is honest evidence of
real assertion gaps, not a hidden failure. Scenario 011 enforces
a more conservative floor for now (see the scenario for the
exact number) and the intention is to raise it as tests get
strengthened.

## Refresh procedure

```bash
pnpm install
pnpm test:mutation                # ~15–20 minutes on a warm machine
cp reports/mutation/mutation.json evidence/snapshots/lab-mutation/
node scripts/refresh-mutation-summary.mjs   # regenerates summary.json
```

If the score rose, also tighten the threshold in scenario 011.
