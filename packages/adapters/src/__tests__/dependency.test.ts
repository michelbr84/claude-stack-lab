import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DependencyAdapter, extractRelativeImports, findCycles } from '../dependency.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-dep-'));
  await fs.mkdir(join(workdir, 'src'), { recursive: true });
  await fs.mkdir(join(workdir, 'evidence'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('extractRelativeImports', () => {
  it('captures static imports', () => {
    expect(extractRelativeImports("import { a } from './a';\n")).toEqual(['./a']);
  });

  it('captures bare side-effect imports', () => {
    expect(extractRelativeImports("import './setup';\n")).toEqual(['./setup']);
  });

  it('captures dynamic imports', () => {
    expect(extractRelativeImports("const m = await import('./lazy');\n")).toEqual(['./lazy']);
  });

  it('captures require()', () => {
    expect(extractRelativeImports("const x = require('./y');\n")).toEqual(['./y']);
  });

  it('captures export-from', () => {
    expect(extractRelativeImports("export * from './x';\n")).toEqual(['./x']);
  });

  it('skips bare module imports', () => {
    expect(extractRelativeImports("import x from 'lodash';\n")).toEqual([]);
  });
});

describe('findCycles', () => {
  it('finds a simple A -> B -> A cycle', () => {
    const g = new Map([
      ['/a', new Set(['/b'])],
      ['/b', new Set(['/a'])]
    ]);
    const cycles = findCycles(g);
    expect(cycles).toHaveLength(1);
    expect(new Set(cycles[0]?.files)).toEqual(new Set(['/a', '/b']));
  });

  it('returns no cycles in a DAG', () => {
    const g = new Map([
      ['/a', new Set(['/b'])],
      ['/b', new Set(['/c'])],
      ['/c', new Set<string>()]
    ]);
    expect(findCycles(g)).toEqual([]);
  });
});

describe('DependencyAdapter', () => {
  it('reports ok on a clean tree', async () => {
    await fs.writeFile(join(workdir, 'src', 'a.ts'), "export const x = 1;\n");
    await fs.writeFile(join(workdir, 'src', 'b.ts'), "import { x } from './a';\nexport const y = x;\n");
    const adapter = new DependencyAdapter({ include: ['src'] });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.status).toBe('ok');
    expect(r.metrics.cycles).toBe(0);
  });

  it('detects a circular dependency between two files', async () => {
    await fs.writeFile(join(workdir, 'src', 'a.ts'), "import { y } from './b';\nexport const x = y;\n");
    await fs.writeFile(join(workdir, 'src', 'b.ts'), "import { x } from './a';\nexport const y = x;\n");
    const adapter = new DependencyAdapter({ include: ['src'] });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.metrics.cycles).toBeGreaterThanOrEqual(1);
    expect(r.status).toBe('violation');
    expect(r.violations[0]?.rule).toBe('circular-dependency');
  });
});
