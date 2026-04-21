import type { Scenario } from '@lab/scenario-core';

export type ResolveResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; suggestions: string[] };

export function resolveScenarioId(
  target: string,
  scenarios: readonly Scenario[]
): ResolveResult {
  const ids = scenarios.map((s) => s.id);

  if (ids.includes(target)) return { ok: true, id: target };

  const prefixed = ids.filter((id) => id.startsWith(`${target}-`));
  if (prefixed.length === 1) return { ok: true, id: prefixed[0]! };
  if (prefixed.length > 1) {
    return {
      ok: false,
      reason: `ambiguous scenario "${target}" — matches ${prefixed.length}`,
      suggestions: prefixed
    };
  }

  const contained = ids.filter((id) => id.includes(target));
  return {
    ok: false,
    reason: `no scenario matches "${target}"`,
    suggestions: contained.length > 0 ? contained : ids
  };
}
