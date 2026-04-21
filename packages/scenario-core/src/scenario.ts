import type {
  ScenarioCategory,
  ScenarioContext,
  ScenarioResult,
  ExpectedResult,
  EvidenceSpec
} from '@lab/shared';

export interface Scenario {
  id: string;
  title: string;
  category: ScenarioCategory;
  objective: string;
  fixture: string | null;
  expectedCommand: string;
  expectedResult: ExpectedResult;
  minimumEvidence: EvidenceSpec[];
  run(ctx: ScenarioContext): Promise<ScenarioResult>;
}

const ID_PATTERN = /^\d{3}-[a-z0-9-]+$/;

export function isValidScenarioId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function assertValidScenario(s: Scenario): void {
  if (!isValidScenarioId(s.id)) {
    throw new Error(`invalid scenario id "${s.id}" (expected NNN-slug)`);
  }
  if (!s.title.trim()) throw new Error(`scenario ${s.id} has empty title`);
  if (!s.objective.trim()) throw new Error(`scenario ${s.id} has empty objective`);
  if (!s.expectedCommand.trim()) {
    throw new Error(`scenario ${s.id} has empty expectedCommand`);
  }
  if (typeof s.run !== 'function') {
    throw new Error(`scenario ${s.id} missing run()`);
  }
}
