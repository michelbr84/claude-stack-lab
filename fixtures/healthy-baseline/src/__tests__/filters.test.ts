import { describe, it, expect } from 'vitest';
import { filterIssues } from '../service/filters.js';
import type { Issue } from '../domain/issue.js';

const issues: Issue[] = [
  {
    id: '1',
    title: 'login broken',
    description: 'cannot log in',
    status: 'open',
    priority: 'high',
    tags: ['security'],
    createdAt: '',
    updatedAt: ''
  },
  {
    id: '2',
    title: 'theme toggle',
    description: 'dark mode missing',
    status: 'closed',
    priority: 'low',
    tags: ['ux'],
    createdAt: '',
    updatedAt: ''
  }
];

describe('filterIssues', () => {
  it('filters by status', () => {
    expect(filterIssues(issues, { status: 'open' })).toHaveLength(1);
  });

  it('filters by priority', () => {
    expect(filterIssues(issues, { priority: 'low' })).toEqual([issues[1]]);
  });

  it('filters by tag', () => {
    expect(filterIssues(issues, { tag: 'security' })).toEqual([issues[0]]);
  });

  it('filters by text in title', () => {
    expect(filterIssues(issues, { text: 'login' })).toEqual([issues[0]]);
  });

  it('filters by text in description case-insensitively', () => {
    expect(filterIssues(issues, { text: 'DARK' })).toEqual([issues[1]]);
  });

  it('combines filters with AND semantics', () => {
    expect(filterIssues(issues, { status: 'open', priority: 'low' })).toEqual([]);
  });
});
