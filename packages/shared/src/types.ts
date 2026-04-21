export type ScenarioCategory =
  | 'bootstrap'
  | 'coverage'
  | 'dependency-structure'
  | 'complexity'
  | 'module-size'
  | 'mutation'
  | 'cmp-validation'
  | 'regression';

export type ScenarioStatus = 'pass' | 'fail' | 'error' | 'skipped';

export interface AdapterResult {
  adapter: string;
  toolVersion: string | null;
  status: 'ok' | 'violation' | 'error';
  metrics: Record<string, number>;
  violations: AdapterViolation[];
  rawArtifactPath: string | null;
  durationMs: number;
}

export interface AdapterViolation {
  rule: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  location?: { file: string; line?: number; column?: number };
}

export interface ExpectedResult {
  status: ScenarioStatus;
  metricThresholds?: Array<{
    metric: string;
    operator: '<=' | '>=' | '==' | '<' | '>' | '!=';
    value: number;
  }>;
}

export interface EvidenceSpec {
  kind: 'file' | 'directory';
  pathRelativeToRun: string;
  description: string;
}

export interface ScenarioContext {
  runId: string;
  evidenceDir: string;
  cwd: string;
  fixturePath: string | null;
  log: (msg: string, level?: 'debug' | 'info' | 'warn' | 'error') => void;
}

export interface ScenarioResult {
  scenarioId: string;
  status: ScenarioStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  metrics: Record<string, number>;
  adapters: AdapterResult[];
  evidencePaths: string[];
  notes: string[];
  failureReason?: string;
}

export interface RunReport {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scenarios: ScenarioResult[];
  globalScore: number;
  globalStatus: ScenarioStatus;
}
