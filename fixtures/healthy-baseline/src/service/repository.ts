import type { Issue } from '../domain/issue.js';

export class IssueRepository {
  private readonly store = new Map<string, Issue>();

  insert(issue: Issue): Issue {
    if (this.store.has(issue.id)) {
      throw new Error(`issue ${issue.id} already exists`);
    }
    this.store.set(issue.id, { ...issue });
    return { ...issue };
  }

  get(id: string): Issue | null {
    const v = this.store.get(id);
    return v ? { ...v } : null;
  }

  list(): Issue[] {
    return Array.from(this.store.values()).map((v) => ({ ...v }));
  }

  update(id: string, patch: Partial<Issue>): Issue {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`issue ${id} not found`);
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return { ...updated };
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  size(): number {
    return this.store.size;
  }
}
