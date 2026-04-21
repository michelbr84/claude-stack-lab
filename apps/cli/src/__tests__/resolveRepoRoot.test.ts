import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveRepoRoot } from '../resolveRepoRoot.js';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'lab-root-'));
  await fs.writeFile(join(root, 'pnpm-workspace.yaml'), "packages: ['apps/*']\n");
  await fs.mkdir(join(root, 'apps', 'cli'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('resolveRepoRoot', () => {
  it('finds the workspace root from the root itself', () => {
    expect(resolveRepoRoot(root)).toBe(resolve(root));
  });

  it('walks up from a nested working directory', () => {
    const nested = join(root, 'apps', 'cli');
    expect(resolveRepoRoot(nested)).toBe(resolve(root));
  });

  it('falls back to the start directory when no marker is found', async () => {
    const orphan = await fs.mkdtemp(join(tmpdir(), 'lab-orphan-'));
    try {
      expect(resolveRepoRoot(orphan)).toBe(resolve(orphan));
    } finally {
      await fs.rm(orphan, { recursive: true, force: true });
    }
  });
});
