import { expect, test } from 'vitest';
import { parse } from '$lib/fv/vouch/syntax/parser';
import { check } from '$lib/fv/vouch/check/checker';
import { verifyFunction } from '$lib/fv/vouch/vc/verify';
import { CASES, witnessCode } from './court';

function verifies(code: string, fn: string): boolean {
  const p = parse(code);
  const c = check(p.program);
  const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
  expect(errs.map((d) => d.message)).toEqual([]);
  const r = verifyFunction(c, c.fns.get(fn)!, { timeout: 8000 });
  return r.verdicts.length > 0 && r.verdicts.every((v) => v.status === 'verified');
}

/** Each case verifies; the witnesses expose it (an implementation that should not pass does, a caller that should pass does not), except the withdraw case's decoy. */
test.each(CASES.map((c) => [c.id, c] as const))('case %s', (_id, c) => {
  expect(verifies(c.code, c.fn)).toBe(true);
  const got = c.witnesses.map((w) => {
    const { code, fn } = witnessCode(c, w);
    return verifies(code, fn);
  });
  const expected = c.witnesses.map((w) => (c.id === 'withdraw' && w.kind === 'impl' ? false : w.kind === 'impl'));
  expect(got).toEqual(expected);
  for (const l of c.fault) expect(c.code.split('\n')[l - 1]).toMatch(/requires|ensures/);
});
