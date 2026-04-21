import type { Issue, IssuePriority, IssueStatus } from '../domain/issue.js';

export interface IssueFilter {
  status?: IssueStatus;
  priority?: IssuePriority;
  tag?: string;
  text?: string;
}

export function filterIssues(issues: readonly Issue[], filter: IssueFilter): Issue[] {
  return issues.filter((i) => matches(i, filter));
}

function matches(issue: Issue, f: IssueFilter): boolean {
  if (f.status && issue.status !== f.status) return false;
  if (f.priority && issue.priority !== f.priority) return false;
  if (f.tag && !issue.tags.includes(f.tag)) return false;
  if (f.text) {
    const needle = f.text.toLowerCase();
    if (
      !issue.title.toLowerCase().includes(needle) &&
      !issue.description.toLowerCase().includes(needle)
    ) {
      return false;
    }
  }
  return true;
}
