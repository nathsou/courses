import { describe, expect, test } from 'vitest';
import { DatalogError, parse, run } from './datalog.js';

const chain = (n: number) => Array.from({ length: n }, (_, i) => `edge(n${i}, n${i + 1}).`).join('\n');
const tc = `path(X, Y) :- edge(X, Y).
path(X, Y) :- edge(X, Z), path(Z, Y).`;

describe('datalog', () => {
  test('transitive closure', () => {
    const r = run(`${chain(4)}\n${tc}\n?- path(n0, Y).`);
    expect(r.answers[0]!.rows).toEqual([['n1'], ['n2'], ['n3'], ['n4']]);
    expect(r.relations.get('path')!.size).toBe(10);
  });
  test('naive and semi-naive agree, and semi-naive does less work', () => {
    const src = `${chain(30)}\n${tc}`;
    const naive = run(src, { seminaive: false });
    const semi = run(src, { seminaive: true });
    expect(semi.relations.get('path')!.size).toBe(naive.relations.get('path')!.size);
    expect(semi.relations.get('path')!.size).toBe((30 * 31) / 2);
    expect(semi.stats.derivations).toBeLessThan(naive.stats.derivations / 3);
  });
  test('comparisons and constants', () => {
    const r = run(`pts(a, o1). pts(b, o1). pts(c, o2).
alias(X, Y) :- pts(X, O), pts(Y, O), X != Y.
?- alias(X, Y).`);
    expect(r.answers[0]!.rows).toEqual([['a', 'b'], ['b', 'a']]);
  });
  test('Andersen in Datalog', () => {
    const r = run(`new(a, o1). new(b, o2). assign(p, a). assign(q, b). assign(p, q).
store(p, f, a). load(r, q, f).
pts(V, O) :- new(V, O).
pts(V, O) :- assign(V, W), pts(W, O).
heap(O, F, P) :- store(V, F, W), pts(V, O), pts(W, P).
pts(V, P) :- load(V, W, F), pts(W, O), heap(O, F, P).
?- pts(r, O).`);
    expect(r.answers[0]!.rows).toEqual([['o1']]);
  });
  test('errors', () => {
    expect(() => parse('p(X).')).toThrow(DatalogError);
    expect(() => parse('p(X) :- q(Y).')).toThrow(/X is not bound/);
    expect(() => parse('p(a) :- q(a)')).toThrow(/expected “\.”/);
  });
});
