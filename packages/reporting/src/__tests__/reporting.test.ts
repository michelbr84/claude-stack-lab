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
  it('produces the exact expected markdown for a canonical input', () => {
    const md = renderMarkdownReport(sampleRun, sampleScore);
    const expected = [
      '# claude-stack-lab — run 2026-04-21T09-30-00-000Z-aaaaaa',
      '',
      '- **Started**: 2026-04-21T09:30:00.000Z',
      '- **Finished**: 2026-04-21T09:30:01.000Z',
      '- **Duration**: 1000 ms',
      '- **Global status**: `pass`',
      '- **Global score**: `100` / 100',
      '',
      '## Scenarios',
      '',
      '| ID | Status | Score | Notes |',
      '|---|---|---|---|',
      '| `001-bootstrap` | `pass` | 100 | all expectations met |',
      '',
      '## By category',
      '',
      '| Category | Score | Passed | Failed | Total |',
      '|---|---|---|---|---|',
      '| `bootstrap` | 100 | 1 | 0 | 1 |',
      '',
      '## Metrics',
      '',
      '### `001-bootstrap`',
      '',
      '| Metric | Value |',
      '|---|---|',
      '| x | 1 |',
      '',
      '**Adapters:**',
      '- `lint` → `ok` (0 violations)',
      ''
    ].join('\n');
    expect(md).toBe(expected);
  });

  it('renders _(no metrics)_ for a scenario with no metrics', () => {
    const emptyMetricsRun: RunReport = {
      ...sampleRun,
      scenarios: [{ ...sampleRun.scenarios[0]!, metrics: {}, adapters: [] }]
    };
    const md = renderMarkdownReport(emptyMetricsRun, sampleScore);
    expect(md).toContain('_(no metrics)_');
    expect(md).not.toContain('| Metric | Value |');
  });

  it('includes the failure reason block when present', () => {
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
    const md = renderMarkdownReport(failingRun, failingScore);
    expect(md).toContain('> **Failure reason**: because reasons');
    expect(md).toContain('- **Global status**: `fail`');
    expect(md).toContain('- **Global score**: `0` / 100');
  });

  it('escapes pipe characters and newlines in the scenario rationale', () => {
    const dirtyScore: GlobalScore = {
      ...sampleScore,
      perScenario: [
        { ...sampleScore.perScenario[0]!, rationale: 'uses |pipes|\nand\nnewlines' }
      ]
    };
    const md = renderMarkdownReport(sampleRun, dirtyScore);
    // pipes become escaped, newlines collapse to spaces
    expect(md).toContain('uses \\|pipes\\| and newlines');
    // No *unescaped* pipe inside the rationale cell — 5 table
    // delimiters plus 2 escaped \| inside the cell = 7 | characters
    // total, but the escaped ones are preceded by \.
    const scenarioRow = md.split('\n').find((l) => l.startsWith('| `001-bootstrap`')) ?? '';
    expect(scenarioRow.match(/\\\|/g)?.length).toBe(2);
    // Split on unescaped |: (?<!\\) is a negative lookbehind.
    const cells = scenarioRow.split(/(?<!\\)\|/);
    // 6 pieces: "", `001-bootstrap`, `pass`, 100, rationale, ""
    expect(cells).toHaveLength(6);
  });

  it('sample markdown never contains the Stryker sentinel', () => {
    const md = renderMarkdownReport(sampleRun, sampleScore);
    expect(md).not.toContain('Stryker was here!');
  });

  it('writes the exact rendered markdown to disk', async () => {
    const path = join(workdir, 'report.md');
    await writeMarkdownReport(path, sampleRun, sampleScore);
    const text = await fs.readFile(path, 'utf8');
    expect(text).toBe(renderMarkdownReport(sampleRun, sampleScore));
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
