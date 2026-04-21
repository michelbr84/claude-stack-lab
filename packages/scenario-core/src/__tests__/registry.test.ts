import { describe, it, expect } from 'vitest';
import { ScenarioRegistry } from '../registry.js';
import type { Scenario } from '../scenario.js';

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

describe('ScenarioRegistry', () => {
  it('register + get + has + size', () => {
    const reg = new ScenarioRegistry();
    expect(reg.size()).toBe(0);
    reg.register(make('001-a'));
    expect(reg.size()).toBe(1);
    expect(reg.has('001-a')).toBe(true);
    expect(reg.get('001-a').id).toBe('001-a');
  });

  it('rejects duplicate ids', () => {
    const reg = new ScenarioRegistry();
    reg.register(make('001-a'));
    expect(() => reg.register(make('001-a'))).toThrow(/already registered/);
  });

  it('get throws for missing ids', () => {
    const reg = new ScenarioRegistry();
    expect(() => reg.get('999-missing')).toThrow(/not found/);
  });

  it('list returns scenarios sorted by id', () => {
    const reg = new ScenarioRegistry();
    reg.registerAll([make('003-c'), make('001-a'), make('002-b')]);
    expect(reg.ids()).toEqual(['001-a', '002-b', '003-c']);
  });

  it('rejects invalid scenarios at registration time', () => {
    const reg = new ScenarioRegistry();
    expect(() => reg.register({ ...make('001-a'), id: 'bad' })).toThrow();
  });
});
