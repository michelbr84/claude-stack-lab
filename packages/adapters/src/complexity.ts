import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { writeJson, type AdapterResult, type AdapterViolation } from '@lab/shared';
import type { Adapter, AdapterInput } from './adapter.js';

export interface ComplexityOptions {
  include: string[];
  extensions?: string[];
  ignoreDirs?: string[];
  ignoreSuffixes?: string[];
  maxComplexity: number;
}

export interface FunctionComplexity {
  file: string;
  startLine: number;
  name: string;
  complexity: number;
}

export class ComplexityAdapter implements Adapter {
  readonly name = 'complexity';

  constructor(private readonly cfg: ComplexityOptions) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const exts = this.cfg.extensions ?? ['.ts', '.tsx'];
    const ignoreDirs = new Set(
      this.cfg.ignoreDirs ?? ['node_modules', 'dist', 'build', 'coverage', 'evidence', '__tests__']
    );
    const ignoreSuffixes = this.cfg.ignoreSuffixes ?? ['.test.ts', '.test.tsx', '.d.ts'];

    const all: FunctionComplexity[] = [];
    const violations: AdapterViolation[] = [];

    for (const root of this.cfg.include) {
      const abs = join(input.cwd, root);
      await walk(abs, exts, ignoreDirs, ignoreSuffixes, async (file) => {
        const text = await fs.readFile(file, 'utf8');
        const rel = relative(input.cwd, file).replace(/\\/g, '/');
        for (const fn of analyzeFunctions(rel, text)) {
          all.push(fn);
          if (fn.complexity > this.cfg.maxComplexity) {
            violations.push({
              rule: 'cyclomatic-complexity',
              severity: 'error',
              message: `${fn.file}:${fn.startLine} ${fn.name} has complexity ${fn.complexity} (max ${this.cfg.maxComplexity})`,
              location: { file: fn.file, line: fn.startLine }
            });
          }
        }
      });
    }

    const reportPath = join(input.evidenceDir, 'complexity.json');
    await writeJson(reportPath, { maxComplexity: this.cfg.maxComplexity, functions: all });

    const maxObserved = all.reduce((m, f) => Math.max(m, f.complexity), 0);
    const avg = all.length === 0 ? 0 : all.reduce((s, f) => s + f.complexity, 0) / all.length;

    return {
      adapter: this.name,
      toolVersion: 'inline-1.0',
      status: violations.length === 0 ? 'ok' : 'violation',
      metrics: {
        functions_analyzed: all.length,
        max_complexity: maxObserved,
        avg_complexity: Math.round(avg * 100) / 100,
        complex_functions: violations.length
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
  onFile: (path: string) => Promise<void>
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
      await onFile(join(dir, entry.name));
    }
  }
}

const FN_DECL =
  /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
const ARROW_ASSIGN =
  /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{/g;
const METHOD_DECL =
  /(?:^|\n|\{|;)\s*(?:public|protected|private|static|readonly|async)?\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;

const DECISION_TOKENS = [
  /\bif\s*\(/g,
  /\belse\s+if\b/g,
  /\bfor\s*\(/g,
  /\bwhile\s*\(/g,
  /\bcase\s+[^:]+:/g,
  /\bcatch\s*\(/g,
  /\?\s*[^:]+:/g,
  /&&/g,
  /\|\|/g,
  /\?\?/g
];

export function analyzeFunctions(file: string, source: string): FunctionComplexity[] {
  const stripped = stripCommentsAndStrings(source);
  const candidates = collectCandidates(stripped);
  const out: FunctionComplexity[] = [];
  for (const c of candidates) {
    const body = extractBlock(stripped, c.openBraceIdx);
    if (!body) continue;
    const complexity = computeComplexity(body);
    out.push({
      file,
      startLine: lineOf(stripped, c.startIdx),
      name: c.name,
      complexity
    });
  }
  return out;
}

interface Candidate {
  name: string;
  startIdx: number;
  openBraceIdx: number;
}

const RESERVED = new Set([
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'catch',
  'try',
  'finally',
  'do',
  'return',
  'with',
  'function',
  'class',
  'new',
  'typeof',
  'instanceof',
  'void',
  'delete',
  'throw',
  'yield',
  'await'
]);

function collectCandidates(src: string): Candidate[] {
  const seen = new Set<number>();
  const out: Candidate[] = [];
  for (const re of [FN_DECL, ARROW_ASSIGN, METHOD_DECL]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[1] ?? '<anon>';
      if (RESERVED.has(name)) continue;
      const open = src.indexOf('{', m.index);
      if (open === -1 || seen.has(open)) continue;
      seen.add(open);
      out.push({ name, startIdx: m.index, openBraceIdx: open });
    }
  }
  return out;
}

function extractBlock(src: string, openIdx: number): string | null {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return null;
}

function computeComplexity(body: string): number {
  let cc = 1;
  for (const re of DECISION_TOKENS) {
    re.lastIndex = 0;
    const matches = body.match(re);
    if (matches) cc += matches.length;
  }
  return cc;
}

function lineOf(src: string, idx: number): number {
  let line = 1;
  for (let i = 0; i < idx && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

function stripCommentsAndStrings(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += ' ';
      i++;
      while (i < n) {
        const ch = src[i];
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++;
          break;
        }
        if (quote === '`' && ch === '$' && src[i + 1] === '{') {
          let depth = 1;
          i += 2;
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) i++;
          }
          i++;
          continue;
        }
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
