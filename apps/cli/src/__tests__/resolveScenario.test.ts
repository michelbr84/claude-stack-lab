import { describe, it, expect } from 'vitest';
import { resolveScenarioId } from '../resolveScenario.js';
import type { Scenario } from '@lab/scenario-core';

const make = (id: string): Scenario => ({
  id,
  title: id,
  category: 'bootstrap',
  objective: 'x',
  fixture: null,
  expectedCommand: 'noop',
  expectedResult: { status: 'pass' },
  minimumEvidence: [],
  run: async () => ({
    scenarioId: id,
    status: 'pass',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: {},
    adapters: [],
    evidencePaths: [],
    notes: []
  })
});

describe('resolveScenarioId', () => {
  const scenarios = [
    make('001-bootstrap'),
    make('002-coverage'),
    make('003-dependency-structure'),
    make('010-full-regression'),
    make('011-lab-mutation-score')
  ];

  it('returns the exact id when an exact match exists', () => {
    expect(resolveScenarioId('001-bootstrap', scenarios)).toEqual({
      ok: true,
      id: '001-bootstrap'
    });
  });

  it('resolves a short numeric id to the full id by prefix', () => {
    expect(resolveScenarioId('001', scenarios)).toEqual({
      ok: true,
      id: '001-bootstrap'
    });
    expect(resolveScenarioId('003', scenarios)).toEqual({
      ok: true,
      id: '003-dependency-structure'
    });
  });

  it('reports ambiguity when the short id matches more than one scenario', () => {
    const ambiguous = [make('007-a-alpha'), make('007-a-beta')];
    const r = resolveScenarioId('007-a', ambiguous);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/ambiguous/);
      expect(r.suggestions).toEqual(['007-a-alpha', '007-a-beta']);
    }
  });

  it('reports a clear miss and lists suggestions when nothing matches', () => {
    const r = resolveScenarioId('999', scenarios);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/no scenario matches/);
      expect(r.suggestions.length).toBeGreaterThan(0);
    }
  });

  it('does not treat a partial numeric substring as a prefix match', () => {
    // "01" must not silently resolve to 001-bootstrap — prefix requires an id
    // shaped exactly as "01-something"
    const r = resolveScenarioId('01', scenarios);
    expect(r.ok).toBe(false);
  });

  it('returns suggestions containing the query substring when available', () => {
    const r = resolveScenarioId('coverage', scenarios);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.suggestions).toContain('002-coverage');
    }
  });
});
