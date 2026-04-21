import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModuleSizeAdapter, countCodeLines } from '../module-size.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-modsize-'));
  await fs.mkdir(join(workdir, 'src'), { recursive: true });
  await fs.mkdir(join(workdir, 'evidence'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('countCodeLines', () => {
  it('ignores blank lines and // comments', () => {
    const src = ['// hello', '', 'const x = 1;', '// trailing', 'export {};'].join('\n');
    expect(countCodeLines(src)).toBe(2);
  });

  it('ignores /* … */ block comments spanning lines', () => {
    const src = ['/*', ' * doc', ' */', 'const x = 1;'].join('\n');
    expect(countCodeLines(src)).toBe(1);
  });

  it('handles single-line block comments', () => {
    const src = '/* x */\nconst y = 2;';
    expect(countCodeLines(src)).toBe(1);
  });
});

describe('ModuleSizeAdapter', () => {
  it('reports ok when all files are under the limit', async () => {
    await fs.writeFile(join(workdir, 'src', 'a.ts'), 'export const a = 1;\n');
    const adapter = new ModuleSizeAdapter({ include: ['src'], maxLines: 100 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.status).toBe('ok');
    expect(r.metrics.files_scanned).toBe(1);
    expect(r.violations).toHaveLength(0);
  });

  it('flags files over the limit', async () => {
    const big = Array.from({ length: 50 }, (_, i) => `const x${i} = ${i};`).join('\n');
    await fs.writeFile(join(workdir, 'src', 'big.ts'), big);
    const adapter = new ModuleSizeAdapter({ include: ['src'], maxLines: 10 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.status).toBe('violation');
    expect(r.violations).toHaveLength(1);
    expect(r.metrics.oversized_files).toBe(1);
    expect(r.metrics.max_module_lines).toBe(50);
  });

  it('skips test files by default', async () => {
    await fs.writeFile(join(workdir, 'src', 'a.test.ts'), 'export const a = 1;\n');
    const adapter = new ModuleSizeAdapter({ include: ['src'], maxLines: 100 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.metrics.files_scanned).toBe(0);
  });

  it('writes a json report', async () => {
    await fs.writeFile(join(workdir, 'src', 'a.ts'), 'export const a = 1;\n');
    const adapter = new ModuleSizeAdapter({ include: ['src'], maxLines: 100 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.rawArtifactPath).toBeTruthy();
    const parsed = JSON.parse(await fs.readFile(r.rawArtifactPath!, 'utf8'));
    expect(parsed.maxLines).toBe(100);
    expect(parsed.files).toHaveLength(1);
  });
});
