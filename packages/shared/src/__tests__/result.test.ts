import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, unwrap } from '../result.js';

describe('Result', () => {
  it('ok wraps a value', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err wraps an error', () => {
    const e = new Error('boom');
    const r = err(e);
    expect(r.ok).toBe(false);
    expect(isErr(r)).toBe(true);
    if (!r.ok) expect(r.error).toBe(e);
  });

  it('unwrap returns value on ok', () => {
    expect(unwrap(ok('hi'))).toBe('hi');
  });

  it('unwrap throws on err', () => {
    expect(() => unwrap(err(new Error('nope')))).toThrow('nope');
  });

  it('unwrap wraps non-Error errors as Error', () => {
    expect(() => unwrap(err('string-error'))).toThrow('string-error');
  });
});
