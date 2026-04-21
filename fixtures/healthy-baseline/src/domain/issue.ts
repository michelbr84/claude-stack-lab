export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueStatus = 'open' | 'in-progress' | 'closed';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  score: number;
  factors: string[];
}

export function assessRisk(issue: Issue): RiskAssessment {
  const factors: string[] = [];
  let score = 0;
  if (issue.priority === 'urgent') {
    score += 60;
    factors.push('urgent priority');
  } else if (issue.priority === 'high') {
    score += 40;
    factors.push('high priority');
  }
  if (issue.tags.includes('security')) {
    score += 30;
    factors.push('security tag');
  }
  if (issue.tags.includes('regression')) {
    score += 15;
    factors.push('regression tag');
  }
  if (issue.status === 'open' && hoursSince(issue.createdAt) > 72) {
    score += 10;
    factors.push('stale (open > 72h)');
  }
  return { score: Math.min(100, score), factors };
}

export function hoursSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();
  return Math.max(0, Math.floor((now.getTime() - then) / (60 * 60 * 1000)));
}
