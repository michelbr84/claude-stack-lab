export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('division by zero');
  return a / b;
}

export function negate(a: number): number {
  return -a;
}

export function isPositive(a: number): boolean {
  return a > 0;
}
