import { describe, it, expect } from 'vitest';
import { assessRisk, hoursSince, type Issue } from '../domain/issue.js';

const baseIssue: Issue = {
  id: '1',
  title: 't',
  description: 'd',
  status: 'open',
  priority: 'low',
  tags: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z'
};

describe('assessRisk', () => {
  it('returns 0 for a low priority, untagged, fresh issue', () => {
    const r = assessRisk({ ...baseIssue, createdAt: new Date().toISOString() });
    expect(r.score).toBe(0);
    expect(r.factors).toEqual([]);
  });

  it('weights urgent priority highly', () => {
    const r = assessRisk({ ...baseIssue, priority: 'urgent', createdAt: new Date().toISOString() });
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.factors).toContain('urgent priority');
  });

  it('adds factor for security tag', () => {
    const r = assessRisk({
      ...baseIssue,
      priority: 'medium',
      tags: ['security'],
      createdAt: new Date().toISOString()
    });
    expect(r.factors).toContain('security tag');
  });

  it('flags stale open issues older than 72h', () => {
    const stale = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
    const r = assessRisk({ ...baseIssue, createdAt: stale });
    expect(r.factors).toContain('stale (open > 72h)');
  });

  it('caps score at 100', () => {
    const r = assessRisk({
      ...baseIssue,
      priority: 'urgent',
      tags: ['security', 'regression'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1000).toISOString()
    });
    expect(r.score).toBe(100);
  });
});

describe('hoursSince', () => {
  it('returns 0 for "now"', () => {
    const now = new Date('2026-04-21T00:00:00.000Z');
    expect(hoursSince('2026-04-21T00:00:00.000Z', now)).toBe(0);
  });

  it('counts whole hours back', () => {
    const now = new Date('2026-04-21T05:00:00.000Z');
    expect(hoursSince('2026-04-21T02:00:00.000Z', now)).toBe(3);
  });

  it('clamps negative differences to 0', () => {
    const now = new Date('2026-04-21T00:00:00.000Z');
    expect(hoursSince('2027-01-01T00:00:00.000Z', now)).toBe(0);
  });
});
