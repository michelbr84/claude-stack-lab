import type { JSX } from 'react';
import type { RunSummary } from '../api.js';

export function RunsPanel({ runs }: { runs: RunSummary[] | null }): JSX.Element {
  if (runs === null) return <p>Loading runs…</p>;
  if (runs.length === 0) {
    return (
      <p className="empty">
        No runs recorded yet. Run <code>lab run all</code> to populate this list.
      </p>
    );
  }

  return (
    <table className="grid" data-testid="runs-table">
      <thead>
        <tr>
          <th>Run ID</th>
          <th>Status</th>
          <th>Score</th>
          <th>Scenarios</th>
          <th>Started</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.runId} data-status={r.status}>
            <td><code>{r.runId}</code></td>
            <td className={`status status-${r.status}`}>{r.status}</td>
            <td>{r.score}</td>
            <td>{r.scenarioCount}</td>
            <td>{formatTimestamp(r.startedAt)}</td>
            <td>{formatDuration(r.durationMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}
