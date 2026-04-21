import { describe, it, expect, beforeEach } from 'vitest';
import { IssueRepository } from '../service/repository.js';
import type { Issue } from '../domain/issue.js';

const sample: Issue = {
  id: '1',
  title: 't',
  description: 'd',
  status: 'open',
  priority: 'medium',
  tags: ['x'],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z'
};

let repo: IssueRepository;
beforeEach(() => {
  repo = new IssueRepository();
});

describe('IssueRepository', () => {
  it('insert + get + list + size', () => {
    repo.insert(sample);
    expect(repo.size()).toBe(1);
    expect(repo.get('1')).toEqual(sample);
    expect(repo.list()).toHaveLength(1);
  });

  it('rejects duplicate ids', () => {
    repo.insert(sample);
    expect(() => repo.insert(sample)).toThrow(/already exists/);
  });

  it('returns null for missing get', () => {
    expect(repo.get('nope')).toBeNull();
  });

  it('update applies a patch and bumps updatedAt', () => {
    repo.insert(sample);
    const before = repo.get('1')!;
    const after = repo.update('1', { title: 'new' });
    expect(after.title).toBe('new');
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it('update throws for missing id', () => {
    expect(() => repo.update('1', { title: 'x' })).toThrow(/not found/);
  });

  it('delete returns true when removed and false otherwise', () => {
    repo.insert(sample);
    expect(repo.delete('1')).toBe(true);
    expect(repo.delete('1')).toBe(false);
  });
});
