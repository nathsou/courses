/**
 * Runs an exercise's tests against a piece of code. Used by the worker, by Vitest (reference solutions) and by
 * anything else that wants a verdict without a worker.
 *
 * Modules: `solution` is the code under test, `test` the harness, `trs` the reference engine, and
 * `engine` the reader's engine: the reference engine with every function the reader has written
 * (in an earlier exercise that passed, and not switched off) put in its place.
 */
import * as harness from './harness';
import { LIBRARY, REFERENCE, describeError, evaluate } from './modules';
import type { EngineModule, RunReport } from './protocol';

const fmt = (a: unknown) => (typeof a === 'string' ? a : harness.show(a));

/** Build the reader's engine: the reference, overlaid with their modules in order. */
export function buildEngine(modules: readonly EngineModule[], cons: Pick<Console, 'log' | 'warn' | 'error' | 'info'> = console): { engine: Record<string, unknown>; yours: string[]; broken: { id: string; error: string }[] } {
  const engine: Record<string, unknown> = { ...REFERENCE };
  const yours: string[] = [];
  const broken: { id: string; error: string }[] = [];
  for (const m of modules) {
    const file = `${m.id}/engine.ts`;
    try {
      const exports = evaluate(m.code, file, (s) => (s === 'engine' ? engine : LIBRARY[s]), cons);
      for (const name of m.provides) {
        if (typeof exports[name] === 'function') {
          engine[name] = exports[name];
          if (!yours.includes(name)) yours.push(name);
        }
      }
    } catch (err) {
      broken.push({ id: m.id, error: describeError(err, file) });
    }
  }
  return { engine, yours, broken };
}

/** Evaluate `code` (the solution module) and run `tests` (which `import … from 'solution'`). */
export async function runTests(id: string, code: string, tests: string, modules: readonly EngineModule[] = []): Promise<RunReport> {
  const start = performance.now();
  const logs: string[] = [];
  const log = (prefix: string) => (...a: unknown[]) => {
    if (logs.length < 200) logs.push(prefix + a.map(fmt).join(' '));
  };
  const cons = { log: log(''), info: log(''), warn: log('⚠ '), error: log('✖ ') };
  const userFile = `${id}/solution.ts`;
  const { engine, yours, broken } = buildEngine(modules.filter((m) => m.id !== id), cons);
  const resolve = (s: string) => (s === 'engine' ? engine : LIBRARY[s]);
  try {
    let user: Record<string, unknown>;
    try {
      user = evaluate(code, userFile, resolve, cons);
    } catch (err) {
      throw new Error(describeError(err, userFile));
    }
    evaluate(tests, `${id}/solution.test.ts`, (s) => (s === 'solution' || s === './solution' ? user : s === 'test' ? harness : resolve(s)), cons);
    const results = await harness.runRegistered((err) => describeError(err, userFile));
    return { ok: true, results, logs, ms: performance.now() - start, yours, broken };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), results: [], logs, ms: performance.now() - start, yours, broken };
  }
}
