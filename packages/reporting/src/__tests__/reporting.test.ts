import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildJsonReport, writeJsonReport } from '../json.js';
import { renderMarkdownReport, writeMarkdownReport } from '../markdown.js';
import { renderHtmlReport, writeHtmlReport } from '../html.js';
import type { RunReport } from '@lab/shared';
import type { GlobalScore } from '@lab/scoring-engine';

let workdir: string;

const sampleRun: RunReport = {
  runId: '2026-04-21T09-30-00-000Z-aaaaaa',
  startedAt: '2026-04-21T09:30:00.000Z',
  finishedAt: '2026-04-21T09:30:01.000Z',
  durationMs: 1000,
  globalScore: 100,
  globalStatus: 'pass',
  scenarios: [
    {
      scenarioId: '001-bootstrap',
      status: 'pass',
      startedAt: '',
      finishedAt: '',
      durationMs: 100,
      metrics: { x: 1 },
      adapters: [
        {
          adapter: 'lint',
          toolVersion: null,
          status: 'ok',
          metrics: { exit_code: 0 },
          violations: [],
          rawArtifactPath: null,
          durationMs: 50
        }
      ],
      evidencePaths: [],
      notes: []
    }
  ]
};

const sampleScore: GlobalScore = {
  score: 100,
  status: 'pass',
  perScenario: [
    {
      scenarioId: '001-bootstrap',
      category: 'bootstrap',
      status: 'pass',
      score: 100,
      rationale: 'all expectations met'
    }
  ],
  perCategory: [{ category: 'bootstrap', score: 100, total: 1, passed: 1, failed: 0 }]
};

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-rep-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('json report', () => {
  it('builds a versioned envelope', () => {
    const r = buildJsonReport(sampleRun, sampleScore);
    expect(r.schemaVersion).toBe(1);
    expect(r.run.runId).toBe(sampleRun.runId);
    expect(r.score.score).toBe(100);
  });

  it('writes pretty JSON to disk', async () => {
    const path = join(workdir, 'report.json');
    await writeJsonReport(path, sampleRun, sampleScore);
    const text = await fs.readFile(path, 'utf8');
    expect(text).toContain('"schemaVersion": 1');
    expect(text).toContain('"runId"');
  });
});

describe('markdown report', () => {
  it('renders a header, scenarios table, and per-category table', () => {
    const md = renderMarkdownReport(sampleRun, sampleScore);
    expect(md).toContain('# claude-stack-lab — run');
    expect(md).toContain('| `001-bootstrap` | `pass`');
    expect(md).toContain('| `bootstrap` | 100');
    expect(md).toContain('## Metrics');
  });

  it('includes failure reason when present', () => {
    const failingRun: RunReport = {
      ...sampleRun,
      scenarios: [
        { ...sampleRun.scenarios[0]!, status: 'fail', failureReason: 'because reasons' }
      ]
    };
    const failingScore: GlobalScore = {
      ...sampleScore,
      score: 0,
      status: 'fail',
      perScenario: [{ ...sampleScore.perScenario[0]!, status: 'fail', score: 0 }]
    };
    expect(renderMarkdownReport(failingRun, failingScore)).toContain('Failure reason');
  });

  it('writes the markdown to disk', async () => {
    const path = join(workdir, 'report.md');
    await writeMarkdownReport(path, sampleRun, sampleScore);
    expect((await fs.readFile(path, 'utf8')).startsWith('# claude-stack-lab')).toBe(true);
  });
});

describe('html report', () => {
  it('renders an html document with the score and status', () => {
    const html = renderHtmlReport(sampleRun, sampleScore);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('100 / 100 — pass');
    expect(html).toContain('001-bootstrap');
  });

  it('escapes special characters', () => {
    const html = renderHtmlReport(sampleRun, {
      ...sampleScore,
      perScenario: [{ ...sampleScore.perScenario[0]!, rationale: 'a < b & c > d' }]
    });
    expect(html).toContain('a &lt; b &amp; c &gt; d');
  });

  it('writes the html to disk', async () => {
    const path = join(workdir, 'report.html');
    await writeHtmlReport(path, sampleRun, sampleScore);
    expect((await fs.readFile(path, 'utf8')).includes('<title>claude-stack-lab')).toBe(true);
  });
});
