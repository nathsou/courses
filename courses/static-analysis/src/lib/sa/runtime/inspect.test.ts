import { expect, test } from 'vitest';
import { loadLibs } from './libs.js';
import { inspect } from './inspect.js';
import { runTests } from './tests.js';

test('inspect: ast, scopes, types, code paths', async () => {
  const libs = await loadLibs();
  const code = 'function f(c: boolean) {\n  let x = 1;\n  if (c) { x = 2; }\n  return x;\n}\n';
  const r = inspect(code, libs);
  expect(r.parseError).toBeUndefined();
  expect(r.ast!.type).toBe('Program');
  const fnScope = r.scopes.find((s) => s.type === 'function')!;
  expect(fnScope.variables.map((v) => v.name)).toEqual(['c', 'x']);
  expect(fnScope.variables[1]!.references.map((x) => [x.read, x.write])).toEqual([[false, true], [false, true], [true, false]]);
  expect(r.types.find((t) => code.slice(...t.range) === 'x' && t.range[0] > 60)?.type).toBe('number');
  const f = r.codePaths.find((c) => c.name === 'f')!;
  expect(f.segments.map((s) => s.nodes.map((n) => code.slice(...n.range)))).toEqual([['f', 'c: boolean', 'let x = 1;', 'c'], ['{ x = 2; }'], ['return x;'], []]);
  expect(f.segments.map((s) => s.reachable)).toEqual([true, true, true, false]);
  const initial = f.segments.find((s) => s.id === f.initial)!;
  expect(initial.next.length).toBe(2);
  expect(initial.nodes.map((n) => code.slice(...n.range))).toContain('let x = 1;');
});

test('runTests: passing and failing tests', async () => {
  const libs = await loadLibs();
  const files = {
    '/rules/helpers/double.ts': 'export const double = (n: number) => n * 3;',
    '/test/double.test.ts': "import { test, expect } from 'workbench:test';\nimport { double } from '../rules/helpers/double.js';\ntest('one', () => expect(double(1)).toBe(2));\ntest('zero', () => expect(double(0)).toBe(0));",
  };
  const r = runTests(files, '/test/double.test.ts', libs);
  expect(r.tests.map((t) => [t.name, t.pass])).toEqual([['one', false], ['zero', true]]);
  expect(r.tests[0]!.message).toBe('expected 2, got 3');
});
