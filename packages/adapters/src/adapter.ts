import type { AdapterResult } from '@lab/shared';

export interface AdapterInput {
  cwd: string;
  evidenceDir: string;
  options?: Record<string, unknown>;
}

export interface Adapter {
  readonly name: string;
  run(input: AdapterInput): Promise<AdapterResult>;
}
