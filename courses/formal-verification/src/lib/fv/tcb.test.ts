import { describe, expect, test } from 'vitest';
import { tcbOf } from './tcb';
import type { Verdict } from './engines';

const verdict = (over: Partial<Verdict>): Verdict => ({
  engine: 'vc',
  status: 'verified',
  subject: 'f',
  badge: { kind: 'verified', scope: 'all inputs' },
  certificate: { kind: 'smt-proof', checked: true, checker: 'the certificate checker' },
  assumptions: [],
  stats: {},
  ...over,
});
const roles = (v: Verdict) => Object.fromEntries(tcbOf(v).map((p) => [p.name, p.role]));

describe('the TCB meter', () => {
  test('a certified proof trusts the VC generator and the checker, not the solver', () => {
    expect(roles(verdict({}))).toEqual({ specification: 'trusted', 'front end': 'trusted', 'VC generator': 'trusted', 'SMT solver': 'checked', 'certificate checker': 'trusted' });
  });
  test('an uncertified proof trusts the solver', () => {
    expect(roles(verdict({ certificate: { kind: 'smt-proof', checked: false, checker: '' } }))['SMT solver']).toBe('trusted');
  });
  test('a replayed counterexample trusts the interpreter, not the search', () => {
    const r = roles(verdict({ engine: 'bmc', status: 'violated', badge: { kind: 'violated', replayed: true }, certificate: { kind: 'trace', checked: true, checker: 'replay' } }));
    expect(r['interpreter']).toBe('trusted');
    expect(r['unrolling to SAT']).toBe('untrusted');
    expect(r['SAT solver']).toBeUndefined();
  });
  test('an exploration without certificate trusts the explorer', () => {
    expect(roles(verdict({ engine: 'explore', badge: { kind: 'exhaustive', states: 10, instance: 'S' }, certificate: { kind: 'state-space', checked: false, checker: 'the explorer itself' } }))['explorer']).toBe('trusted');
  });
});
