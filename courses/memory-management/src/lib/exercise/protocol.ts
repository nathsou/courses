import type { TestResult } from './harness';
import type { StorageViolation } from '../mm/check/storage';

export interface RunRequest {
  id: string;
  code: string;
  tests: string;
  /** Apply the storage rule (allocator exercises). */
  storage?: boolean;
}

export interface RunReport {
  /** False when the code failed to compile or load, broke the storage rule, or timed out. */
  ok: boolean;
  error?: string;
  results: TestResult[];
  logs: string[];
  ms: number;
  storage?: StorageViolation[];
}
