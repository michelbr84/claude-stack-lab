// Strengthened version produced by a /tdd-loop validation cycle on the
// mutation-survivors fixture. Drop this file in place of
// fixtures/mutation-survivors/src/arithmetic.test.ts and re-run scenario
// 006 — the surrogate mutation will report a 100% killed score.
//
// This file is a stored evidence artifact for scenario 007. Do not import
// it from production code.
import { describe, it, expect } from 'vitest';
import { maxOf, isPositive, clamp } from '../../../../fixtures/mutation-survivors/src/arithmetic';

describe('maxOf (strengthened)', () => {
  it('returns the larger argument', () => {
    expect(maxOf(2, 3)).toBe(3);
    expect(maxOf(7, 7)).toBe(7);
    expect(maxOf(-5, -2)).toBe(-2);
  });
});

describe('isPositive (strengthened)', () => {
  it('returns true only for strictly positive numbers', () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-1)).toBe(false);
  });
});

describe('clamp (strengthened)', () => {
  it('clamps below the lower bound', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps above the upper bound', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it('returns the value when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('returns the lower bound when value equals it', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  it('returns the upper bound when value equals it', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});
