import { describe, it, expect } from 'vitest';
import { parseArgs } from '../args.js';

describe('parseArgs', () => {
  it('returns help when invoked with no arguments', () => {
    expect(parseArgs([])).toEqual({ command: 'help', positional: [], flags: {} });
  });

  it('captures the subcommand and positional arguments', () => {
    const r = parseArgs(['run', '001-bootstrap']);
    expect(r.command).toBe('run');
    expect(r.positional).toEqual(['001-bootstrap']);
  });

  it('parses --flag value', () => {
    const r = parseArgs(['run', 'all', '--cwd', '/repo']);
    expect(r.flags.cwd).toBe('/repo');
  });

  it('parses --flag=value', () => {
    const r = parseArgs(['run', 'all', '--cwd=/repo']);
    expect(r.flags.cwd).toBe('/repo');
  });

  it('treats trailing --flag (no value) as boolean true', () => {
    const r = parseArgs(['run', '001', '--verbose']);
    expect(r.flags.verbose).toBe(true);
  });
});
