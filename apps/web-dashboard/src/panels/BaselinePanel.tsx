import type { JSX } from 'react';
import type { RunReport } from '../api.js';

export function BaselinePanel({ baseline }: { baseline: RunReport | null }): JSX.Element {
  if (baseline === null) {
    return (
      <p className="empty">
        No committed baseline yet. Promote a run by copying its JSON into
        <code> evidence/snapshots/baseline-run.json</code>.
      </p>
    );
  }

  return (
    <div data-testid="baseline-panel">
      <p className="summary">
        <strong>run:</strong> <code>{baseline.run.runId}</code> ·{' '}
        <strong>score:</strong>{' '}
        <span className={`status status-${baseline.score.status}`}>
          {baseline.score.score} ({baseline.score.status})
        </span>
      </p>

      <table className="grid">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Status</th>
            <th>Score</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {baseline.score.perScenario.map((s) => (
            <tr key={s.scenarioId} data-status={s.status}>
              <td><code>{s.scenarioId}</code></td>
              <td className={`status status-${s.status}`}>{s.status}</td>
              <td>{s.score}</td>
              <td className="rationale">{s.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
