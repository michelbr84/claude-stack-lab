# Snapshots — committed baselines

This directory holds **durable** evidence: things that survive a
`pnpm clean` and that PRs are diffed against.

| Path                                             | What it is |
|--------------------------------------------------|------------|
| `baseline-run.json`                              | most recently accepted full-run report from `lab run all` |
| `007-tdd-loop/manifest.json`                     | recorded ClaudeMaxPower /tdd-loop validation cycle |
| `007-tdd-loop/strengthened.arithmetic.test.ts`   | strengthened test file produced by that cycle |

When a contributor ships a meaningful improvement (better adapter,
new fixture, tightened gate), they refresh `baseline-run.json` so
future PRs are compared against the new floor.
