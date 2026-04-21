import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function resolveRepoRoot(startDir: string): string {
  const start = resolve(startDir);
  let dir = start;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}
