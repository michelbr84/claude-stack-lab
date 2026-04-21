import { describe, it, expect } from 'vitest';
import { isValidScenarioId, assertValidScenario, type Scenario } from '../scenario.js';

const baseScenario: Scenario = {
  id: '001-bootstrap',
  title: 'Bootstrap',
  category: 'bootstrap',
  objective: 'project comes up clean',
  fixture: null,
  expectedCommand: 'pnpm verify',
  expectedResult: { status: 'pass' },
  minimumEvidence: [],
  run: async () => ({
    scenarioId: '001-bootstrap',
    status: 'pass',
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
    metrics: {},
    adapters: [],
    evidencePaths: [],
    notes: []
  })
};

describe('isValidScenarioId', () => {
  it('accepts NNN-slug ids', () => {
    expect(isValidScenarioId('001-bootstrap')).toBe(true);
    expect(isValidScenarioId('010-full-regression')).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(isValidScenarioId('1-bootstrap')).toBe(false);
    expect(isValidScenarioId('001-Bootstrap')).toBe(false);
    expect(isValidScenarioId('001bootstrap')).toBe(false);
    expect(isValidScenarioId('')).toBe(false);
  });
});

describe('assertValidScenario', () => {
  it('passes for a complete scenario', () => {
    expect(() => assertValidScenario(baseScenario)).not.toThrow();
  });

  it('rejects empty fields', () => {
    expect(() => assertValidScenario({ ...baseScenario, title: '' })).toThrow(/empty title/);
    expect(() => assertValidScenario({ ...baseScenario, objective: '   ' })).toThrow(
      /empty objective/
    );
    expect(() => assertValidScenario({ ...baseScenario, expectedCommand: '' })).toThrow(
      /empty expectedCommand/
    );
  });

  it('rejects bad ids', () => {
    expect(() => assertValidScenario({ ...baseScenario, id: 'bad' })).toThrow(/invalid scenario id/);
  });
});
