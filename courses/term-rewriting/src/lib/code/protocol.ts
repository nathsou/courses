import type { TestResult } from './harness';

/** A module of the reader's engine: the code of an exercise they passed, and the names it contributes. */
export interface EngineModule {
  id: string;
  code: string;
  provides: string[];
}

export interface RunRequest {
  id: string;
  code: string;
  tests: string;
  /** The reader's engine modules to load as `engine`, in course order. */
  engine?: EngineModule[];
}

export interface RunReport {
  /** False when the code failed to compile/load or timed out (no per-test results). */
  ok: boolean;
  error?: string;
  results: TestResult[];
  logs: string[];
  ms: number;
  /** Engine functions that came from the reader's modules (the rest were the reference's). */
  yours?: string[];
  /** Engine modules that failed to load and were replaced by the reference. */
  broken?: { id: string; error: string }[];
}
