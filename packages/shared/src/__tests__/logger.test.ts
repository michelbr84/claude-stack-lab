import { describe, it, expect } from 'vitest';
import { createLogger } from '../logger.js';

describe('createLogger', () => {
  it('routes messages through the configured sink with a level tag', () => {
    const lines: Array<[string, string]> = [];
    const log = createLogger({ sink: (lvl, line) => lines.push([lvl, line]) });
    log.info('hello');
    log.warn('uh oh');
    log.error('boom');
    expect(lines).toEqual([
      ['info', '[info] hello'],
      ['warn', '[warn] uh oh'],
      ['error', '[error] boom']
    ]);
  });

  it('debug messages are suppressed below info level', () => {
    const lines: Array<[string, string]> = [];
    const log = createLogger({ sink: (lvl, line) => lines.push([lvl, line]) });
    log.debug('ignored');
    expect(lines).toEqual([]);
  });

  it('debug messages pass through when level is debug', () => {
    const lines: Array<[string, string]> = [];
    const log = createLogger({ level: 'debug', sink: (lvl, line) => lines.push([lvl, line]) });
    log.debug('hi');
    expect(lines).toEqual([['debug', '[debug] hi']]);
  });

  it('child logger composes prefixes', () => {
    const lines: string[] = [];
    const log = createLogger({ prefix: 'runner', sink: (_lvl, line) => lines.push(line) });
    log.child('001').info('ready');
    expect(lines).toEqual(['[info] runner:001 ready']);
  });
});
