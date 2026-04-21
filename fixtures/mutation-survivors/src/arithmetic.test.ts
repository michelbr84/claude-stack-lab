import { describe, it, expect } from 'vitest';
import { maxOf, isPositive, clamp } from './arithmetic.js';

describe('arithmetic (intentionally weak)', () => {
  it('maxOf returns a number', () => {
    expect(typeof maxOf(1, 2)).toBe('number');
  });

  it('isPositive returns a boolean', () => {
    expect(typeof isPositive(1)).toBe('boolean');
  });

  it('clamp returns a number', () => {
    expect(typeof clamp(1, 0, 10)).toBe('number');
  });
});
