import { describe, it, expect } from 'vitest';
import { newRunId, isValidRunId } from '../run-id.js';

describe('newRunId', () => {
  it('produces a sortable, ISO-prefixed id with a 6-char random suffix', () => {
    const fixed = new Date('2026-04-21T09:30:00.000Z');
    const id = newRunId({ now: fixed, randomSuffix: 'a1b2c3' });
    expect(id).toBe('2026-04-21T09-30-00-000Z-a1b2c3');
  });

  it('two ids generated in sequence are sortable lexicographically by time', () => {
    const a = newRunId({ now: new Date('2026-04-21T09:30:00.000Z'), randomSuffix: 'aaaaaa' });
    const b = newRunId({ now: new Date('2026-04-21T09:31:00.000Z'), randomSuffix: 'aaaaaa' });
    expect([b, a].sort()).toEqual([a, b]);
  });

  it('isValidRunId accepts the format we produce', () => {
    const id = newRunId({ now: new Date('2026-04-21T09:30:00.000Z'), randomSuffix: 'a1b2c3' });
    expect(isValidRunId(id)).toBe(true);
  });

  it('isValidRunId rejects malformed ids', () => {
    expect(isValidRunId('not-a-run-id')).toBe(false);
    expect(isValidRunId('2026-04-21T09-30-00-000Z-XYZ')).toBe(false);
    expect(isValidRunId('')).toBe(false);
  });

  it('without options the suffix is exactly 6 hex chars', () => {
    const id = newRunId();
    const suffix = id.split('-').pop() ?? '';
    expect(suffix).toMatch(/^[a-f0-9]{6}$/);
  });
});
