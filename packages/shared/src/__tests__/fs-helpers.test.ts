import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ensureDir,
  writeJson,
  readJson,
  writeText,
  pathExists,
  evidenceRunDir
} from '../fs-helpers.js';

let workdir: string;

beforeEach(async () => {
  workdir = await fs.mkdtemp(join(tmpdir(), 'lab-fs-'));
});

afterEach(async () => {
  await fs.rm(workdir, { recursive: true, force: true });
});

describe('ensureDir', () => {
  it('creates nested directories idempotently', async () => {
    const target = join(workdir, 'a', 'b', 'c');
    await ensureDir(target);
    await ensureDir(target);
    expect(await pathExists(target)).toBe(true);
  });
});

describe('writeJson / readJson', () => {
  it('roundtrips a value via the filesystem', async () => {
    const target = join(workdir, 'nested', 'value.json');
    await writeJson(target, { hello: 'world', n: 42 });
    const back = await readJson<{ hello: string; n: number }>(target);
    expect(back).toEqual({ hello: 'world', n: 42 });
  });

  it('writeJson creates intermediate directories', async () => {
    const target = join(workdir, 'deeply', 'nested', 'thing.json');
    await writeJson(target, { x: 1 });
    expect(await pathExists(target)).toBe(true);
  });
});

describe('writeText', () => {
  it('writes plain text and creates intermediate directories', async () => {
    const target = join(workdir, 'a', 'b.txt');
    await writeText(target, 'hello');
    const back = await fs.readFile(target, 'utf8');
    expect(back).toBe('hello');
  });
});

describe('pathExists', () => {
  it('returns false for missing paths', async () => {
    expect(await pathExists(join(workdir, 'no'))).toBe(false);
  });
});

describe('evidenceRunDir', () => {
  it('joins root + raw + scenario + run id', () => {
    expect(evidenceRunDir('/e', '001-bootstrap', 'r1')).toMatch(/raw[\\/]001-bootstrap[\\/]r1$/);
  });
});
