#!/usr/bin/env bash
# Shallow-clones awesome-claude-token-stack into
# vendor/awesome-claude-token-stack/repo/ for scenario 008.
# Idempotent: re-runs fetch + reset on the pinned branch.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$REPO_ROOT/vendor/awesome-claude-token-stack/repo"
URL="https://github.com/michelbr84/awesome-claude-token-stack.git"
BRANCH="main"

if [ -d "$DEST/.git" ]; then
  echo "[fetch-acts] updating existing clone in $DEST"
  git -C "$DEST" fetch --depth 1 origin "$BRANCH"
  git -C "$DEST" reset --hard "origin/$BRANCH"
else
  echo "[fetch-acts] cloning $URL -> $DEST"
  rm -rf "$DEST"
  git clone --depth 1 --branch "$BRANCH" "$URL" "$DEST"
fi

cd "$DEST"
echo "[fetch-acts] head: $(git rev-parse HEAD)"
echo "[fetch-acts] done."
