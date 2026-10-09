/**
 * Runs a test file written against a tiny Vitest-like API, for exercises where the reader implements a helper
 * or an analysis rather than a whole rule. The test file imports `workbench:test`:
 *
 *     import { test, expect, lintCode } from 'workbench:test';
 *     import { areEquivalent } from '../helpers/equivalence.js';   // the reader's version
 *
 *     test('ignores whitespace', () => { expect(…).toBe(true); });
 */
import type { Rule } from 'eslint';
import { loadModule, LoadError } from './loader.js';
import { lint, type Issue } from './lint.js';

export interface TestOutcome {
  name: string;
  pass: boolean;
  message?: string;
}

export interface TestsResult {
  pass: boolean;
  loadError?: string;
  tests: TestOutcome[];
}

class AssertionError extends Error {}

function show(v: unknown): string {
  try {
    return typeof v === 'string' ? JSON.stringify(v) : (JSON.stringify(v, (_k, x) => (x instanceof Set ? [...x] : x instanceof Map ? Object.fromEntries(x) : x)) ?? String(v));
  } catch {
    return String(v);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Set && b instanceof Set) return a.size === b.size && [...a].every((x) => b.has(x));
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export function expect(actual: unknown) {
  const fail = (msg: string) => {
    throw new AssertionError(msg);
  };
  const api = {
    toBe: (expected: unknown) => Object.is(actual, expected) || fail(`expected ${show(expected)}, got ${show(actual)}`),
    toEqual: (expected: unknown) => deepEqual(actual, expected) || fail(`expected ${show(expected)}, got ${show(actual)}`),
    toContain: (item: unknown) => ((Array.isArray(actual) || typeof actual === 'string') && (actual as unknown[]).includes(item as never)) || fail(`expected ${show(actual)} to contain ${show(item)}`),
    toBeTruthy: () => !!actual || fail(`expected a truthy value, got ${show(actual)}`),
    toBeFalsy: () => !actual || fail(`expected a falsy value, got ${show(actual)}`),
    toBeUndefined: () => actual === undefined || fail(`expected undefined, got ${show(actual)}`),
    toBeGreaterThan: (n: number) => (actual as number) > n || fail(`expected more than ${n}, got ${String(actual)}`),
    toBeGreaterThanOrEqual: (n: number) => (actual as number) >= n || fail(`expected at least ${n}, got ${String(actual)}`),
    toBeLessThan: (n: number) => (actual as number) < n || fail(`expected less than ${n}, got ${String(actual)}`),
    toBeLessThanOrEqual: (n: number) => (actual as number) <= n || fail(`expected at most ${n}, got ${String(actual)}`),
    toHaveLength: (n: number) => (actual as { length: number })?.length === n || fail(`expected length ${n}, got ${(actual as { length?: number })?.length}`),
    toThrow: () => {
      try {
        (actual as () => void)();
      } catch {
        return true;
      }
      return fail('expected the function to throw');
    },
  };
  return api;
}

export function runTests(files: Record<string, string>, entry: string, libs: Map<string, string>, extra: Record<string, unknown> = {}): TestsResult {
  const registered: { name: string; fn: () => void }[] = [];
  const lintCode = (code: string, rule: Rule.RuleModule, options?: unknown[], types = true): Issue[] =>
    lint({ files: { '/test/input.ts': code }, rules: { R: rule }, options: options ? { R: options } : undefined, libs, types }).issues;
  const api = { test: (name: string, fn: () => void) => registered.push({ name, fn }), expect, lintCode, ...extra };
  try {
    loadModule({ ...files }, entry, { 'workbench:test': api });
  } catch (e) {
    return { pass: false, loadError: e instanceof Error ? e.message : String(e), tests: [] };
  }
  const tests: TestOutcome[] = registered.map(({ name, fn }) => {
    try {
      fn();
      return { name, pass: true };
    } catch (e) {
      return { name, pass: false, message: e instanceof LoadError || e instanceof AssertionError ? e.message : `${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}` };
    }
  });
  return { pass: tests.length > 0 && tests.every((t) => t.pass), tests };
}
