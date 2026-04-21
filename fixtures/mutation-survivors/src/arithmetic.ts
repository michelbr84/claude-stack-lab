// Module is fully covered by line-coverage but mutation-vulnerable:
// the test suite asserts only on truthy results, not on exact values.
export function maxOf(a: number, b: number): number {
  return a > b ? a : b;
}

export function isPositive(n: number): boolean {
  return n > 0;
}

export function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
