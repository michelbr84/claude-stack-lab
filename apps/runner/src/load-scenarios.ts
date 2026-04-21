import type { Scenario } from '@lab/scenario-core';

export async function loadAllScenarios(): Promise<Scenario[]> {
  const mod = await import('../../../scenarios/index.js');
  return mod.scenarios as Scenario[];
}
