import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { writeJson, type AdapterResult, type AdapterViolation } from '@lab/shared';
import type { Adapter, AdapterInput } from './adapter.js';

export interface DependencyOptions {
  include: string[];
  extensions?: string[];
  ignoreDirs?: string[];
  ignoreSuffixes?: string[];
  maxCriticalCycles?: number; // default 0
}

export interface Cycle {
  files: string[];
}

export class DependencyAdapter implements Adapter {
  readonly name = 'dependency';

  constructor(private readonly cfg: DependencyOptions) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const exts = this.cfg.extensions ?? ['.ts', '.tsx'];
    const ignoreDirs = new Set(
      this.cfg.ignoreDirs ?? ['node_modules', 'dist', 'build', 'coverage', 'evidence']
    );
    const ignoreSuffixes = this.cfg.ignoreSuffixes ?? ['.d.ts'];
    const maxCycles = this.cfg.maxCriticalCycles ?? 0;

    const files: string[] = [];
    for (const root of this.cfg.include) {
      const abs = join(input.cwd, root);
      await walk(abs, exts, ignoreDirs, ignoreSuffixes, (p) => {
        files.push(p);
      });
    }

    const graph = new Map<string, Set<string>>();
    for (const file of files) graph.set(file, new Set());

    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const deps = extractRelativeImports(text);
      for (const d of deps) {
        const resolved = await resolveImport(file, d, exts);
        if (resolved && graph.has(resolved)) graph.get(file)!.add(resolved);
      }
    }

    const cycles = findCycles(graph);
    const violations: AdapterViolation[] = cycles.map((c) => ({
      rule: 'circular-dependency',
      severity: 'error',
      message: `cycle: ${c.files.map((f) => relative(input.cwd, f).replace(/\\/g, '/')).join(' -> ')}`
    }));

    const reportPath = join(input.evidenceDir, 'dependency.json');
    await writeJson(reportPath, {
      filesScanned: files.length,
      cycles: cycles.map((c) => ({
        files: c.files.map((f) => relative(input.cwd, f).replace(/\\/g, '/'))
      }))
    });

    return {
      adapter: this.name,
      toolVersion: 'inline-1.0',
      status: cycles.length > maxCycles ? 'violation' : 'ok',
      metrics: {
        files_scanned: files.length,
        edges: countEdges(graph),
        cycles: cycles.length
      },
      violations,
      rawArtifactPath: reportPath,
      durationMs: Date.now() - start
    };
  }
}

async function walk(
  dir: string,
  exts: readonly string[],
  ignoreDirs: ReadonlySet<string>,
  ignoreSuffixes: readonly string[],
  onFile: (p: string) => void
): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      await walk(join(dir, entry.name), exts, ignoreDirs, ignoreSuffixes, onFile);
    } else if (entry.isFile()) {
      if (!exts.some((e) => entry.name.endsWith(e))) continue;
      if (ignoreSuffixes.some((s) => entry.name.endsWith(s))) continue;
      onFile(join(dir, entry.name));
    }
  }
}

const IMPORT_RE = /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const EXPORT_FROM_RE = /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;

export function extractRelativeImports(source: string): string[] {
  const out: string[] = [];
  for (const re of [IMPORT_RE, REQUIRE_RE, DYNAMIC_IMPORT_RE, EXPORT_FROM_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const spec = m[1];
      if (!spec) continue;
      if (spec.startsWith('./') || spec.startsWith('../') || isAbsolute(spec)) {
        out.push(spec);
      }
    }
  }
  return out;
}

async function resolveImport(
  fromFile: string,
  spec: string,
  exts: readonly string[]
): Promise<string | null> {
  const base = isAbsolute(spec) ? spec : resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    ...exts.map((e) => stripExt(base) + e),
    ...exts.map((e) => base + e),
    ...exts.map((e) => join(base, 'index' + e))
  ];
  for (const c of candidates) {
    try {
      const stat = await fs.stat(c);
      if (stat.isFile()) return c;
    } catch {
      /* continue */
    }
  }
  return null;
}

function stripExt(p: string): string {
  const idx = p.lastIndexOf('.');
  if (idx === -1) return p;
  const ext = p.slice(idx);
  if (['.js', '.ts', '.tsx', '.mjs', '.cjs', '.jsx'].includes(ext)) return p.slice(0, idx);
  return p;
}

function countEdges(g: ReadonlyMap<string, ReadonlySet<string>>): number {
  let n = 0;
  for (const set of g.values()) n += set.size;
  return n;
}

export function findCycles(graph: ReadonlyMap<string, ReadonlySet<string>>): Cycle[] {
  const cycles: Cycle[] = [];
  const seen = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  const dfs = (node: string): void => {
    stack.push(node);
    onStack.add(node);
    for (const nxt of graph.get(node) ?? []) {
      if (onStack.has(nxt)) {
        const idx = stack.indexOf(nxt);
        const cycle = stack.slice(idx).concat([nxt]);
        const key = cycle.slice().sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push({ files: cycle });
        }
      } else if (!visited.has(nxt)) {
        dfs(nxt);
      }
    }
    onStack.delete(node);
    stack.pop();
    visited.add(node);
  };

  const visited = new Set<string>();
  for (const node of graph.keys()) if (!visited.has(node)) dfs(node);
  return cycles;
}
