import { assertValidScenario, type Scenario } from './scenario.js';

export class ScenarioRegistry {
  private readonly scenarios = new Map<string, Scenario>();

  register(scenario: Scenario): void {
    assertValidScenario(scenario);
    if (this.scenarios.has(scenario.id)) {
      throw new Error(`scenario "${scenario.id}" already registered`);
    }
    this.scenarios.set(scenario.id, scenario);
  }

  registerAll(scenarios: readonly Scenario[]): void {
    for (const s of scenarios) this.register(s);
  }

  get(id: string): Scenario {
    const s = this.scenarios.get(id);
    if (!s) throw new Error(`scenario "${id}" not found`);
    return s;
  }

  has(id: string): boolean {
    return this.scenarios.has(id);
  }

  list(): Scenario[] {
    return Array.from(this.scenarios.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  ids(): string[] {
    return this.list().map((s) => s.id);
  }

  size(): number {
    return this.scenarios.size;
  }
}
