import * as harness from './harness';
import { LIBRARY, describeError, evaluate } from './modules';
import { checkStorage } from '../mm/check/storage';
import type { RunReport, RunRequest } from './protocol';

const fmt = (a: unknown) => (typeof a === 'string' ? a : harness.show(a));

/** Evaluate the reader's code and the exercise's tests (in a worker in the browser; directly under Vitest). */
export async function runInWorker({ id, code, tests, storage }: RunRequest): Promise<RunReport> {
  const start = performance.now();
  const logs: string[] = [];
  const log = (prefix: string) => (...a: unknown[]) => {
    if (logs.length < 200) logs.push(prefix + a.map(fmt).join(' '));
  };
  const cons = { log: log(''), info: log(''), warn: log('⚠ '), error: log('✖ ') };
  const userFile = `${id}/solution.ts`;
  if (storage) {
    const v = checkStorage(code);
    if (v.length) return { ok: false, error: 'The storage rule: allocator bookkeeping must live in the heap.', results: [], logs, ms: 0, storage: v };
  }
  try {
    let user: Record<string, unknown>;
    try {
      user = evaluate(code, userFile, (s) => LIBRARY[s], cons);
    } catch (err) {
      throw new Error(describeError(err, userFile));
    }
    evaluate(tests, `${id}/solution.test.ts`, (s) => (s === './solution.ts' || s === './solution' ? user : s === '@mm/test' ? harness : LIBRARY[s]), cons);
    const results = await harness.runRegistered((err) => describeError(err, userFile));
    return { ok: true, results, logs, ms: performance.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), results: [], logs, ms: performance.now() - start };
  }
}
