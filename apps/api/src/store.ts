import { promises as fs } from 'node:fs';
import { join, basename } from 'node:path';
import { pathExists } from '@lab/shared';
import type { JsonReport } from '@lab/reporting';

export interface StoreOptions {
  evidenceRoot: string;
}

export interface RunSummary {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: string;
  score: number;
  scenarioCount: number;
}

export interface ListRunsOptions {
  limit?: number;
  offset?: number;
}

export class EvidenceStore {
  constructor(private readonly opts: StoreOptions) {}

  async listRuns(options: ListRunsOptions = {}): Promise<RunSummary[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const jsonDir = join(this.opts.evidenceRoot, 'json');
    if (!(await pathExists(jsonDir))) return [];

    const entries = (await fs.readdir(jsonDir))
      .filter((n) => n.endsWith('.json'))
      .sort()
      .reverse();

    const slice = entries.slice(offset, offset + limit);
    const summaries: RunSummary[] = [];
    for (const name of slice) {
      try {
        const text = await fs.readFile(join(jsonDir, name), 'utf8');
        const report = JSON.parse(text) as JsonReport;
        summaries.push(this.summarize(report, name));
      } catch {
        /* skip malformed */
      }
    }
    return summaries;
  }

  async getRun(runId: string): Promise<JsonReport | null> {
    const path = join(this.opts.evidenceRoot, 'json', `${safe(runId)}.json`);
    if (!(await pathExists(path))) {
      // Try baseline
      if (runId === 'baseline') return await this.getBaseline();
      return null;
    }
    const text = await fs.readFile(path, 'utf8');
    return JSON.parse(text) as JsonReport;
  }

  async getBaseline(): Promise<JsonReport | null> {
    const path = join(this.opts.evidenceRoot, 'snapshots', 'baseline-run.json');
    if (!(await pathExists(path))) return null;
    const text = await fs.readFile(path, 'utf8');
    return JSON.parse(text) as JsonReport;
  }

  async getMarkdown(runId: string): Promise<string | null> {
    // run bucket dir for a scenario-aware report
    if (runId === 'baseline') {
      const baseline = await this.getBaseline();
      if (!baseline) return null;
      return renderMarkdownFromReport(baseline);
    }
    // Prefer the stored markdown file
    const runsDir = join(this.opts.evidenceRoot, 'runs');
    const buckets = await safeReadDir(runsDir);
    for (const bucket of buckets) {
      const mdPath = join(runsDir, bucket, safe(runId), 'report.md');
      if (await pathExists(mdPath)) return await fs.readFile(mdPath, 'utf8');
    }
    const report = await this.getRun(runId);
    if (!report) return null;
    return renderMarkdownFromReport(report);
  }

  private summarize(report: JsonReport, filename: string): RunSummary {
    return {
      runId: report.run.runId ?? basename(filename, '.json'),
      startedAt: report.run.startedAt,
      finishedAt: report.run.finishedAt,
      durationMs: report.run.durationMs,
      status: report.score.status,
      score: report.score.score,
      scenarioCount: report.run.scenarios.length
    };
  }
}

function safe(id: string): string {
  if (!/^[\w\-.]+$/.test(id)) throw new Error(`invalid run id "${id}"`);
  return id;
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function renderMarkdownFromReport(report: JsonReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.run.runId}`);
  lines.push('');
  lines.push(`- status: ${report.score.status}`);
  lines.push(`- score: ${report.score.score}`);
  lines.push(`- scenarios: ${report.run.scenarios.length}`);
  lines.push('');
  lines.push('| Scenario | Status | Score |');
  lines.push('|---|---|---|');
  for (const s of report.score.perScenario) {
    lines.push(`| ${s.scenarioId} | ${s.status} | ${s.score} |`);
  }
  return lines.join('\n');
}
