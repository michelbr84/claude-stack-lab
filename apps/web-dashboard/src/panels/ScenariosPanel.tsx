import type { JSX } from 'react';
import type { ScenarioSummary } from '../api.js';

export function ScenariosPanel({ scenarios }: { scenarios: ScenarioSummary[] | null }): JSX.Element {
  if (scenarios === null) return <p>Loading scenarios…</p>;
  if (scenarios.length === 0) return <p>No scenarios registered.</p>;

  return (
    <table className="grid" data-testid="scenarios-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Category</th>
          <th>Fixture</th>
        </tr>
      </thead>
      <tbody>
        {scenarios.map((s) => (
          <tr key={s.id}>
            <td><code>{s.id}</code></td>
            <td>{s.title}</td>
            <td>{s.category}</td>
            <td>{s.fixture ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
