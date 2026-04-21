import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenariosPanel } from '../panels/ScenariosPanel.js';
import { RunsPanel, formatDuration, formatTimestamp } from '../panels/RunsPanel.js';
import { BaselinePanel } from '../panels/BaselinePanel.js';

describe('ScenariosPanel', () => {
  it('shows a loading state when scenarios is null', () => {
    render(<ScenariosPanel scenarios={null} />);
    expect(screen.getByText(/Loading scenarios/)).toBeInTheDocument();
  });

  it('shows an empty-state message when the list is empty', () => {
    render(<ScenariosPanel scenarios={[]} />);
    expect(screen.getByText(/No scenarios registered/)).toBeInTheDocument();
  });

  it('renders one row per scenario with id, title, category, and fixture', () => {
    render(
      <ScenariosPanel
        scenarios={[
          { id: '001-bootstrap', title: 'Bootstrap', category: 'bootstrap', fixture: null },
          {
            id: '002-coverage',
            title: 'Coverage threshold',
            category: 'coverage',
            fixture: 'low-coverage'
          }
        ]}
      />
    );
    expect(screen.getByText('001-bootstrap')).toBeInTheDocument();
    expect(screen.getByText('Coverage threshold')).toBeInTheDocument();
    expect(screen.getByText('coverage')).toBeInTheDocument();
    // null fixture renders as em dash
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('RunsPanel', () => {
  it('shows loading when null', () => {
    render(<RunsPanel runs={null} />);
    expect(screen.getByText(/Loading runs/)).toBeInTheDocument();
  });

  it('shows an empty-state hint when no runs are recorded', () => {
    render(<RunsPanel runs={[]} />);
    expect(screen.getByText(/No runs recorded yet/)).toBeInTheDocument();
  });

  it('renders a run row with status, score, and counts', () => {
    render(
      <RunsPanel
        runs={[
          {
            runId: '2026-04-21T00-00-00-000Z-aaaaaa',
            startedAt: '2026-04-21T00:00:00.000Z',
            finishedAt: '2026-04-21T00:00:10.000Z',
            durationMs: 10_000,
            status: 'pass',
            score: 100,
            scenarioCount: 11
          }
        ]}
      />
    );
    expect(screen.getByText('2026-04-21T00-00-00-000Z-aaaaaa')).toBeInTheDocument();
    expect(screen.getByText('pass')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});

describe('formatTimestamp', () => {
  it('returns em dash for an empty input', () => {
    expect(formatTimestamp('')).toBe('—');
  });

  it('formats a valid ISO timestamp', () => {
    expect(formatTimestamp('2026-04-21T09:30:00.000Z')).toBe('2026-04-21 09:30:00Z');
  });

  it('returns the input if it cannot be parsed', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDuration', () => {
  it('returns em dash for negative', () => {
    expect(formatDuration(-5)).toBe('—');
  });

  it('formats milliseconds under a second', () => {
    expect(formatDuration(250)).toBe('250 ms');
  });

  it('formats seconds with one decimal place', () => {
    expect(formatDuration(5_500)).toBe('5.5 s');
  });

  it('formats minutes and seconds for long durations', () => {
    expect(formatDuration(125_000)).toBe('2m 5s');
  });
});

describe('BaselinePanel', () => {
  it('shows an empty state when no baseline is committed', () => {
    render(<BaselinePanel baseline={null} />);
    expect(screen.getByText(/No committed baseline/)).toBeInTheDocument();
  });

  it('renders the per-scenario breakdown for a committed baseline', () => {
    render(
      <BaselinePanel
        baseline={{
          run: {
            runId: 'baseline-x',
            startedAt: '',
            finishedAt: '',
            durationMs: 0,
            scenarios: []
          },
          score: {
            score: 100,
            status: 'pass',
            perScenario: [
              {
                scenarioId: '001-bootstrap',
                status: 'pass',
                score: 100,
                rationale: 'all green'
              }
            ],
            perCategory: []
          }
        }}
      />
    );
    expect(screen.getByText('baseline-x')).toBeInTheDocument();
    expect(screen.getByText('001-bootstrap')).toBeInTheDocument();
    expect(screen.getByText('all green')).toBeInTheDocument();
  });
});
