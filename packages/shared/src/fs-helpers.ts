import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

export async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await fs.writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export async function readJson<T>(path: string): Promise<T> {
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw) as T;
}

export async function writeText(path: string, contents: string): Promise<void> {
  await ensureDir(dirname(path));
  await fs.writeFile(path, contents, 'utf8');
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

export function evidenceRunDir(root: string, scenarioId: string, runId: string): string {
  return join(root, 'raw', scenarioId, runId);
}
