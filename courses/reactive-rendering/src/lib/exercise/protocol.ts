import type { TestResult } from './harness';

export interface RunRequest {
  id: string;
  code: string;
  tests: string;
}

export interface RunReport {
  /** False when the code failed to compile or load, or timed out. */
  ok: boolean;
  error?: string;
  results: TestResult[];
  logs: string[];
  ms: number;
}
