# Fixture: circular-deps

`a.ts -> b.ts -> c.ts -> a.ts`. Drives scenario 003. The dependency
adapter must detect at least one cycle.
