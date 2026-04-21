import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { writeJson, type AdapterResult, type AdapterViolation } from '@lab/shared';
import type { Adapter, AdapterInput } from './adapter.js';

export interface ModuleSizeOptions {
  include: string[];           // root dirs to scan, relative to cwd
  extensions?: string[];       // default: ['.ts', '.tsx']
  ignoreDirs?: string[];       // default: ['node_modules', 'dist', 'build', 'coverage', 'evidence', '__tests__']
  ignoreSuffixes?: string[];   // default: ['.test.ts', '.test.tsx', '.d.ts']
  maxLines: number;
}

export class ModuleSizeAdapter implements Adapter {
  readonly name = 'module-size';

  constructor(private readonly cfg: ModuleSizeOptions) {}

  async run(input: AdapterInput): Promise<AdapterResult> {
    const start = Date.now();
    const exts = this.cfg.extensions ?? ['.ts', '.tsx'];
    const ignoreDirs = new Set(
      this.cfg.ignoreDirs ?? ['node_modules', 'dist', 'build', 'coverage', 'evidence', '__tests__']
    );
    const ignoreSuffixes = this.cfg.ignoreSuffixes ?? ['.test.ts', '.test.tsx', '.d.ts'];

    const violations: AdapterViolation[] = [];
    const files: Array<{ path: string; lines: number }> = [];
    let maxLines = 0;
    let totalLines = 0;

    for (const root of this.cfg.include) {
      const abs = join(input.cwd, root);
      await walk(abs, exts, ignoreDirs, ignoreSuffixes, async (file) => {
        const text = await fs.readFile(file, 'utf8');
        const lines = countCodeLines(text);
        const rel = relative(input.cwd, file).replace(/\\/g, '/');
        files.push({ path: rel, lines });
        totalLines += lines;
        if (lines > maxLines) maxLines = lines;
        if (lines > this.cfg.maxLines) {
          violations.push({
            rule: 'max-lines',
            severity: 'error',
            message: `${rel} has ${lines} lines (max ${this.cfg.maxLines})`,
            location: { file: rel }
          });
        }
      });
    }

    const reportPath = join(input.evidenceDir, 'module-size.json');
    await writeJson(reportPath, { maxLines: this.cfg.maxLines, files });

    return {
      adapter: this.name,
      toolVersion: 'inline-1.0',
      status: violations.length === 0 ? 'ok' : 'violation',
      metrics: {
        files_scanned: files.length,
        max_module_lines: maxLines,
        total_lines: totalLines,
        oversized_files: violations.length
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

export function countCodeLines(text: string): number {
  const lines = text.split(/\r?\n/);
  let count = 0;
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    if (line === '' || line.startsWith('//')) continue;
    count++;
  }
  return count;
}
