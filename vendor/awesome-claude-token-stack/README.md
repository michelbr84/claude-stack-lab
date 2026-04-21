# vendor/awesome-claude-token-stack

This directory is the **integration anchor** for the upstream
`awesome-claude-token-stack` (ACTS) repository:

- **Upstream**: <https://github.com/michelbr84/awesome-claude-token-stack>
- **Why we vendor a reference**: the lab measures whether ACTS
  actually delivers what it advertises (4 libraries, a CLI named
  `acts`, an MCP server, SQLite-backed local-first storage). A pinned
  reference makes the validation reproducible across CI runs and over
  time even if upstream changes.

## What lives here

```
vendor/awesome-claude-token-stack/
├── README.md              ← this file
├── reference.json         ← pinned upstream version + expected facts
└── repo/                  ← cloned working tree (gitignored, fetched on demand)
```

The `repo/` directory is **not committed**. It is materialized by
`scripts/fetch-awesome-claude-token-stack.sh` and consumed by
scenario 008.

## Fetching

```bash
bash scripts/fetch-awesome-claude-token-stack.sh
```

This shallow-clones the upstream into `vendor/awesome-claude-token-stack/repo/`.
CI calls the same script before running scenario 008.

## Validation surface

Scenario 008 (`008-awesome-claude-token-stack`) is the lab's
explicit assertion contract for ACTS:

| Claim (from upstream README)                 | How the lab checks |
|----------------------------------------------|--------------------|
| Provides 4 libraries (`@acts/compress`, …)   | `packages/<name>/package.json` exists for each |
| Ships a CLI named `acts`                     | `package.json` has a `bin.acts` entry |
| Provides an MCP server (`acts-mcp`)          | `bin.acts-mcp` entry, or a `mcp/` package |
| Local-first; uses SQLite/FTS5                | grep upstream for `better-sqlite3` or `sqlite` deps |
| TypeScript-only, MIT-licensed                | `tsconfig.json` + `LICENSE` present |

When all claims hold, scenario 008 records a green snapshot in
`evidence/snapshots/008-awesome-claude-token-stack/manifest.json`.
