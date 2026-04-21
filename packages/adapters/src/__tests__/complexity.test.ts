import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComplexityAdapter, analyzeFunctions } from '../complexity.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-cx-'));
  await fs.mkdir(join(workdir, 'src'), { recursive: true });
  await fs.mkdir(join(workdir, 'evidence'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('analyzeFunctions', () => {
  it('returns complexity 1 for an empty function', () => {
    const fns = analyzeFunctions('a.ts', 'function a() {\n  return 1;\n}\n');
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe('a');
    expect(fns[0]?.complexity).toBe(1);
  });

  it('counts if/else-if/for/while/case/catch/?: && ||', () => {
    const src = `
      function f(x: number, y: number, z: string) {
        if (x === 1) {
          for (let i = 0; i < 10; i++) {
            while (y > 0) y--;
          }
        } else if (x === 2) {
          y = y > 0 ? 1 : 0;
        }
        try { /* ... */ } catch (e) { /* ... */ }
        const ok = (x === 1 && y === 2) || (z === 'x');
        switch (x) { case 1: case 2: break; }
        return ok;
      }
    `;
    const fns = analyzeFunctions('f.ts', src);
    expect(fns).toHaveLength(1);
    // 1 (base)
    // + if + else-if + for + while + ?: + catch + && + || + 2 case = 11
    expect(fns[0]?.complexity).toBeGreaterThanOrEqual(10);
  });

  it('detects arrow function bound to const', () => {
    const fns = analyzeFunctions('a.ts', 'export const g = (x: number) => { if (x) return 1; return 0; };\n');
    expect(fns.find((f) => f.name === 'g')?.complexity).toBe(2);
  });

  it('ignores logical operators inside string literals', () => {
    const fns = analyzeFunctions(
      'a.ts',
      'function h(): string { return "a && b || c ? d : e"; }\n'
    );
    expect(fns[0]?.complexity).toBe(1);
  });

  it('detects class methods', () => {
    const src = `class C {
      m(x: number) {
        if (x) return 1;
        return 0;
      }
    }`;
    const fns = analyzeFunctions('c.ts', src);
    const m = fns.find((f) => f.name === 'm');
    expect(m).toBeTruthy();
    expect(m?.complexity).toBe(2);
  });
});

describe('ComplexityAdapter', () => {
  it('reports ok when all functions are under the limit', async () => {
    await fs.writeFile(
      join(workdir, 'src', 'a.ts'),
      'export function a(x: number) { return x + 1; }\n'
    );
    const adapter = new ComplexityAdapter({ include: ['src'], maxComplexity: 5 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.status).toBe('ok');
    expect(r.metrics.functions_analyzed).toBe(1);
  });

  it('flags overly complex functions', async () => {
    const src = `
      export function bad(x: number) {
        if (x === 1) return 1;
        if (x === 2) return 2;
        if (x === 3) return 3;
        if (x === 4) return 4;
        if (x === 5) return 5;
        if (x === 6) return 6;
        return 0;
      }
    `;
    await fs.writeFile(join(workdir, 'src', 'bad.ts'), src);
    const adapter = new ComplexityAdapter({ include: ['src'], maxComplexity: 3 });
    const r = await adapter.run({ cwd: workdir, evidenceDir: join(workdir, 'evidence') });
    expect(r.status).toBe('violation');
    expect(r.violations).toHaveLength(1);
    expect(r.metrics.max_complexity).toBeGreaterThan(3);
  });
});
