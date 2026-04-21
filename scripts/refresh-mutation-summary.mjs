#!/usr/bin/env node
// Regenerates evidence/snapshots/lab-mutation/summary.json from a
// freshly-produced Stryker report. Idempotent.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const reportPath = process.env.STRYKER_REPORT ?? join(root, 'reports', 'mutation', 'mutation.json');
const outPath =
  process.env.STRYKER_SUMMARY ??
  join(root, 'evidence', 'snapshots', 'lab-mutation', 'summary.json');

const raw = JSON.parse(readFileSync(reportPath, 'utf8'));
const KILLED_STATES = new Set(['Killed', 'Timeout', 'CompileError', 'RuntimeError']);
const SURVIVED = 'Survived';
const NO_COV = 'NoCoverage';

const perFile = {};
let killed = 0;
let survived = 0;
let noCov = 0;
let total = 0;

for (const [file, data] of Object.entries(raw.files ?? {})) {
  let fk = 0;
  let fs = 0;
  let fn = 0;
  let ft = 0;
  for (const m of data.mutants ?? []) {
    ft += 1;
    total += 1;
    if (KILLED_STATES.has(m.status)) {
      killed += 1;
      fk += 1;
    } else if (m.status === SURVIVED) {
      survived += 1;
      fs += 1;
    } else if (m.status === NO_COV) {
      noCov += 1;
      fn += 1;
    }
  }
  perFile[file] = {
    total: ft,
    killed: fk,
    survived: fs,
    noCoverage: fn,
    score: ft === 0 ? 0 : Math.round((fk / ft) * 10000) / 100
  };
}

const score = total === 0 ? 0 : Math.round((killed / total) * 10000) / 100;
const effectiveScore =
  total - noCov === 0 ? 0 : Math.round((killed / (total - noCov)) * 10000) / 100;

const out = {
  generatedAt: new Date().toISOString(),
  strykerVersion: raw.frameworkUsed ?? 'unknown',
  schemaVersion: raw.schemaVersion ?? 'unknown',
  totals: { total, killed, survived, noCoverage: noCov, score, effectiveScore },
  thresholds: raw.thresholds ?? null,
  perFile
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`wrote ${outPath} — score ${score}% (effective ${effectiveScore}%)`);
