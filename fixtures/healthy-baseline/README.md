# Fixture: healthy-baseline

A miniature **Issue Quality Dashboard** — the lab's canonical
well-formed application. Every other fixture is a deliberate
divergence from this one.

It exposes:

- a domain model (`Issue`, `assessRisk`)
- a thin in-memory repository
- a filter helper

The fixture's own test suite must pass. It is the comparison point
for `low-coverage`, `circular-deps`, `high-complexity`,
`large-modules`, and `mutation-survivors` fixtures.
