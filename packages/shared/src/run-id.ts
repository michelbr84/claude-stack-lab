import { randomBytes } from 'node:crypto';

export interface RunIdOptions {
  now?: Date;
  randomSuffix?: string;
}

export function newRunId(opts: RunIdOptions = {}): string {
  const now = opts.now ?? new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const suffix = opts.randomSuffix ?? randomBytes(3).toString('hex');
  return `${iso}-${suffix}`;
}

const RUN_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{6}$/;

export function isValidRunId(id: string): boolean {
  return RUN_ID_PATTERN.test(id);
}
