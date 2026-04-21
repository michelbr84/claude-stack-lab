# Evidence

Run artifacts live here. The directory layout is contractual — see
`SCENARIOS.md` → "Evidence layout".

```
evidence/
├── raw/<scenario-id>/<run-id>/   ← per-run raw output (gitignored)
├── json/<run-id>.json            ← canonical machine-readable report
├── snapshots/<scenario-id>/baseline.json  ← latest accepted baseline
├── coverage/                     ← V8 coverage output (gitignored)
├── html/                         ← human-readable report (gitignored)
└── diffs/                        ← run-vs-run comparisons
```

Only `snapshots/` and `json/` are committed. `raw/`, `coverage/`,
and `html/` are regenerated on every run and ignored.
