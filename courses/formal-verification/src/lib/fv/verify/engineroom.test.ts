import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '../vouch/syntax/parser';
import { check } from '../vouch/check/checker';
import { functionRoom, systemRoom } from './engineroom';

const compile = (src: string) => check(parse(src).program);

describe('the engine room', () => {
  test('Die Hard: the engines that search far enough find the four gallons', () => {
    const src = readFileSync('src/lib/fv/vouch/examples/die-hard.vouch', 'utf8');
    const r = systemRoom(compile(src), 'DieHard', { timeout: 8000 });
    const summary = r.map((x) => `${x.engine}: ${x.verdicts.map((v) => v.status).join(',')}`);
    console.log(summary.join(' | '), r.map((x) => x.ms));
    expect(r.map((x) => x.engine)).toEqual(['explorer', 'BDD reachability', 'bounded model checking', 'k-induction', 'IC3']);
    const st = (e: string) => r.find((x) => x.engine === e)!.verdicts.map((v) => v.status);
    for (const e of ['explorer', 'BDD reachability', 'IC3']) expect(st(e), e).toContain('violated');
    // BMC finds the six-step run within its bound; k-induction, whose base case stops at its own k, proves nothing.
    expect(st('bounded model checking')).toContain('violated');
    expect(st('k-induction')).not.toContain('verified');
  }, 60000);

  test('a counter that cannot overflow: proofs from k-induction, IC3 and BDDs, a bound from BMC', () => {
    const src = `system Counter {
  var n: 0..=7 = 0
  action inc when n < 5 { n = n + 1 }
  action reset { n = 0 }
  invariant small: n <= 5
}`;
    const r = systemRoom(compile(src), 'Counter', { timeout: 8000, bound: 6 });
    const st = Object.fromEntries(r.map((x) => [x.engine, x.verdicts[0]!]));
    console.log(r.map((x) => `${x.engine}: ${x.verdicts.map((v) => v.status + ' ' + v.badge.kind).join(',')}`).join(' | '));
    expect(st['explorer']!.status).toBe('verified');
    expect(st['bounded model checking']!.badge.kind).toBe('bounded');
    expect(st['IC3']!.status).toBe('verified');
  }, 60000);

  test('a function: tests, symbolic execution, the verifier and intervals', () => {
    const src = `fn clamp(x: int, lo: int, hi: int) -> int
  requires lo <= hi
  ensures lo <= result <= hi
{
  if x < lo { return lo }
  if x > hi { return hi }
  return x
}`;
    const r = functionRoom(compile(src), 'clamp', src);
    console.log(r.map((x) => `${x.engine}: ${x.verdicts.map((v) => v.status + ' ' + v.badge.kind).join(',')}`).join(' | '));
    expect(r.map((x) => x.engine)).toEqual(['random testing', 'symbolic execution', 'program verifier', 'interval analysis']);
    expect(r.find((x) => x.engine === 'program verifier')!.verdicts[0]!.status).toBe('verified');
    expect(r.find((x) => x.engine === 'random testing')!.verdicts[0]!.badge.kind).toBe('tested');
  }, 60000);
});
