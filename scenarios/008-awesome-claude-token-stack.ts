import type { Scenario } from '@lab/scenario-core';
import type { ScenarioResult } from '@lab/shared';
import { writeJson, pathExists, readJson } from '@lab/shared';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

interface Reference {
  schemaVersion: number;
  upstream: { url: string; branch: string; knownVersionAtBlueprintTime: string };
  expected: {
    libraries: string[];
    cliBinaries: string[];
    topLevelDirs: string[];
    license: string;
    language: string;
    storage: string;
  };
}

/**
 * Scenario 008 validates the awesome-claude-token-stack (ACTS)
 * upstream against the load-bearing claims captured in
 * vendor/awesome-claude-token-stack/reference.json.
 *
 * The upstream is fetched on demand by
 * scripts/fetch-awesome-claude-token-stack.sh into
 * vendor/awesome-claude-token-stack/repo/. If that directory does not
 * exist the scenario reports `skipped` (CI may choose to fail or
 * tolerate this).
 */
export const scenario008: Scenario = {
  id: '008-awesome-claude-token-stack',
  title: 'awesome-claude-token-stack integration validation',
  category: 'cmp-validation',
  objective:
    'the upstream awesome-claude-token-stack still ships every load-bearing claim from its README',
  fixture: null,
  expectedCommand: 'bash scripts/fetch-awesome-claude-token-stack.sh',
  expectedResult: {
    status: 'pass',
    metricThresholds: [{ metric: 'failed_claims', operator: '==', value: 0 }]
  },
  minimumEvidence: [
    {
      kind: 'file',
      pathRelativeToRun: 'acts-validation.json',
      description: 'per-claim pass/fail report'
    }
  ],
  async run(ctx): Promise<ScenarioResult> {
    const repoRoot = join(ctx.cwd, 'vendor', 'awesome-claude-token-stack');
    const refPath = join(repoRoot, 'reference.json');
    const upstreamPath = join(repoRoot, 'repo');

    if (!(await pathExists(refPath))) {
      return failure(
        this.id,
        ctx.evidenceDir,
        `missing reference at ${refPath}`
      );
    }

    if (!(await pathExists(upstreamPath))) {
      return {
        scenarioId: this.id,
        status: 'skipped',
        startedAt: '',
        finishedAt: '',
        durationMs: 0,
        metrics: { failed_claims: 0, total_claims: 0 },
        adapters: [],
        evidencePaths: [ctx.evidenceDir],
        notes: [
          'upstream not fetched yet — run `bash scripts/fetch-awesome-claude-token-stack.sh` and re-run this scenario'
        ]
      };
    }

    const reference = await readJson<Reference>(refPath);
    const claims: Array<{ name: string; ok: boolean; detail: string }> = [];

    // Claim 1: top-level dirs exist
    for (const dir of reference.expected.topLevelDirs) {
      const present = await pathExists(join(upstreamPath, dir));
      claims.push({
        name: `topdir:${dir}`,
        ok: present,
        detail: present ? `${dir}/ present` : `${dir}/ missing`
      });
    }

    // Claim 2: each advertised library has a package.json
    for (const lib of reference.expected.libraries) {
      const folder = lib.replace(/^@acts\//, '');
      const pkgPath = join(upstreamPath, 'packages', folder, 'package.json');
      const exists = await pathExists(pkgPath);
      let nameMatch = false;
      if (exists) {
        try {
          const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as { name?: string };
          nameMatch = pkg.name === lib;
        } catch {
          /* ignore */
        }
      }
      claims.push({
        name: `library:${lib}`,
        ok: exists && nameMatch,
        detail: !exists
          ? `${pkgPath} missing`
          : nameMatch
          ? `package.json declares ${lib}`
          : `package.json present but name field does not equal ${lib}`
      });
    }

    // Claim 3: CLI binaries are declared somewhere in packages/* package.json files
    const declaredBins = await collectAllBins(upstreamPath);
    for (const bin of reference.expected.cliBinaries) {
      const ok = declaredBins.has(bin);
      claims.push({
        name: `bin:${bin}`,
        ok,
        detail: ok ? `bin "${bin}" declared` : `bin "${bin}" not found in any package.json`
      });
    }

    // Claim 4: license is MIT
    let licenseOk = false;
    let licenseDetail = 'LICENSE missing';
    try {
      const licenseText = await fs.readFile(join(upstreamPath, 'LICENSE'), 'utf8');
      licenseOk = licenseText.toLowerCase().includes(reference.expected.license.toLowerCase());
      licenseDetail = licenseOk
        ? `LICENSE mentions "${reference.expected.license}"`
        : `LICENSE does not mention "${reference.expected.license}"`;
    } catch {
      /* keep defaults */
    }
    claims.push({ name: 'license', ok: licenseOk, detail: licenseDetail });

    // Claim 5: language is TypeScript (root tsconfig.json present)
    const tsOk = await pathExists(join(upstreamPath, 'tsconfig.json'));
    claims.push({
      name: 'language:typescript',
      ok: tsOk,
      detail: tsOk ? 'tsconfig.json at root' : 'no tsconfig.json at root'
    });

    // Claim 6: SQLite-backed (grep across package.json files)
    const sqliteHit = await grepSqlite(upstreamPath);
    claims.push({
      name: `storage:${reference.expected.storage}`,
      ok: sqliteHit,
      detail: sqliteHit ? 'sqlite/better-sqlite3 dependency found' : 'no sqlite dependency found'
    });

    const failed = claims.filter((c) => !c.ok).length;
    const total = claims.length;

    await writeJson(join(ctx.evidenceDir, 'acts-validation.json'), {
      upstream: reference.upstream,
      claims,
      total,
      failed
    });

    const status = failed === 0 ? 'pass' : 'fail';
    return {
      scenarioId: this.id,
      status,
      startedAt: '',
      finishedAt: '',
      durationMs: 0,
      metrics: {
        total_claims: total,
        passed_claims: total - failed,
        failed_claims: failed
      },
      adapters: [],
      evidencePaths: [ctx.evidenceDir],
      notes: [
        `${total - failed}/${total} claims hold against ${reference.upstream.url}#${reference.upstream.branch}`
      ],
      ...(status === 'pass'
        ? {}
        : {
            failureReason: `${failed} claim(s) failed: ${claims
              .filter((c) => !c.ok)
              .map((c) => c.name)
              .join(', ')}`
          })
    };
  }
};

interface PackageJson {
  name?: string;
  bin?: string | Record<string, string>;
  workspaces?: string[];
}

async function safeReadPackage(path: string): Promise<PackageJson> {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8')) as PackageJson;
  } catch {
    return {};
  }
}

async function collectAllBins(upstreamRoot: string): Promise<Set<string>> {
  const bins = new Set<string>();
  const candidates: string[] = [join(upstreamRoot, 'package.json')];
  const packagesDir = join(upstreamRoot, 'packages');
  try {
    for (const entry of await fs.readdir(packagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        candidates.push(join(packagesDir, entry.name, 'package.json'));
      }
    }
  } catch {
    /* ignore — no packages dir */
  }
  for (const candidate of candidates) {
    const pkg = await safeReadPackage(candidate);
    if (!pkg.bin) continue;
    if (typeof pkg.bin === 'string') {
      // single bin keyed by the package name, e.g. { "name": "foo", "bin": "./bin.js" }
      if (pkg.name) bins.add(pkg.name.replace(/^@[^/]+\//, ''));
    } else {
      for (const key of Object.keys(pkg.bin)) bins.add(key);
    }
  }
  return bins;
}

async function grepSqlite(root: string): Promise<boolean> {
  const queue = [root];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'docs']);
  let scanned = 0;
  while (queue.length > 0) {
    const dir = queue.shift()!;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        queue.push(join(dir, entry.name));
      } else if (entry.name === 'package.json') {
        scanned++;
        if (scanned > 200) return false;
        try {
          const text = await fs.readFile(join(dir, entry.name), 'utf8');
          if (/sqlite|better-sqlite3/i.test(text)) return true;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return false;
}

function failure(id: string, evidenceDir: string, reason: string): ScenarioResult {
  return {
    scenarioId: id,
    status: 'fail',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: { failed_claims: 1, total_claims: 1 },
    adapters: [],
    evidencePaths: [evidenceDir],
    notes: [reason],
    failureReason: reason
  };
}
