import { describe, expect, test } from 'vitest';
import { parseStrict, rules, term } from './parse';
import { show, f } from './term';
import { evaluate, fromProgram, normalize, system } from './rewrite';
import { acEqual, acNormalize, flatten, acMatch, searchStates, goalPattern, unflatten } from './ac';
import { EGraph, saturate, simplify } from './egraph';
import { runStrategy, envFromProgram, parseStrategy, showStrategy } from './strategy';
import { evaluateShared, dagSize, HashCons } from './share';
import { DiscriminationTree } from './indexing';
import { compileToJS, decisionTree, treeTests, showTree } from './compile';
import { parseARS, properties } from './ars';
import { parseLambda, bracketAbstraction, SKI, showCL, toDeBruijn, showDB, dbTerm, LAMBDA_UPSILON } from './lambda';
import { tmRules, tmStart, readConfig, BUSY_BEAVER_2, BUSY_BEAVER_3, solvePCP, stringSteps } from './machines';
import { normalFormAutomaton, accepts, groundTerms, isEmpty } from './automata';
import { matches } from './match';

describe('AC', () => {
  const ac = new Set(['+', '*']);
  test('flattening decides AC-equality', () => {
    expect(acEqual(term('+(a, +(b, c))'), term('+(+(c, a), b)'), ac)).toBe(true);
    expect(acEqual(term('+(a, b)'), term('*(a, b)'), ac)).toBe(false);
    expect(show(unflatten(flatten(term('+(c, +(b, a))'), ac), ac))).toBe('+(a, +(b, c))');
  });
  test('AC matching finds every split', () => {
    const ms = [...acMatch(flatten(term('+(x, y)'), ac), flatten(term('+(a, +(b, c))'), ac), ac)];
    expect(ms.length).toBe(6);
  });
  test('non-linear AC patterns: x + x', () => {
    const sys = { rules: rules('+(x, x) -> *(2, x)'), ac };
    expect(show(acNormalize(sys, term('+(a, +(b, a))')).term)).toBe('+(*(2, a), b)');
  });
  test('rewriting modulo AC with extension', () => {
    const sys = { rules: rules('+(x, 0) -> x\n*(x, 0) -> 0\n+(x, Neg(x)) -> 0'), ac };
    expect(show(acNormalize(sys, term('+(a, +(Neg(b), +(c, b)))')).term)).toBe('+(a, c)');
  });
  test('the vending machine (rewriting logic)', () => {
    const sys = { rules: rules('Dollar -> Cake\nDollar -> &(Apple, Quarter)\n&(Quarter, &(Quarter, &(Quarter, Quarter))) -> Dollar'), ac: new Set(['&']) };
    const res = searchStates(sys, term('&(Dollar, &(Dollar, Dollar))'), goalPattern(term('&(Cake, &(Apple, &(Apple, x)))'), new Set(['&'])));
    expect(res.found).not.toBeNull();
    expect(res.path.length).toBeGreaterThan(2);
  });
});

describe('e-graphs', () => {
  test('congruence: a = b implies f(a) = f(b)', () => {
    const eg = new EGraph();
    const fa = eg.add(term('F(A)')), fb = eg.add(term('F(B)'));
    eg.union(eg.add(term('A')), eg.add(term('B')));
    eg.rebuild();
    expect(eg.find(fa)).toBe(eg.find(fb));
  });
  test('(a * 2) / 2 simplifies to a', () => {
    const R = rules('/(*(x, y), z) -> *(x, /(y, z))\n/(x, x) -> 1\n*(x, 1) -> x\n*(x, 2) -> <<(x, 1)\n<<(x, 1) -> *(x, 2)');
    const r = simplify(term('/(*(a, 2), 2)'), R);
    expect(show(r.term)).toBe('a');
  });
  test('saturation stops when nothing changes', () => {
    const eg = new EGraph();
    eg.add(term('+(a, b)'));
    const rep = saturate(eg, rules('+(x, y) -> +(y, x)'));
    expect(rep.stop).toBe('saturated');
    expect(eg.size.classes).toBe(3);
  });
});

describe('strategies', () => {
  const p = parseStrict('[Zero] +(0, y) -> y\n[Succ] +(S(x), y) -> S(+(x, y))\n[Fold] +(1, 1) -> 2\n#strategy simp = innermost(Zero <+ Succ)');
  test('parse and print', () => {
    expect(showStrategy(parseStrategy('try(A; B) <+ C'))).toBe('(try(A; B) <+ C)');
  });
  test('innermost as a strategy', () => {
    const r = runStrategy('simp', term('+(S(S(0)), S(0))'), envFromProgram(p));
    expect(show(r.term!)).toBe('S(S(S(0)))');
    expect(r.log.length).toBe(3);
  });
  test('failure and try', () => {
    expect(runStrategy('Zero', term('+(S(0), 0)'), envFromProgram(p)).term).toBeNull();
    expect(show(runStrategy('try(Zero)', term('+(S(0), 0)'), envFromProgram(p)).term!)).toBe('+(S(0), 0)');
    expect(show(runStrategy('oncetd(Zero)', term('S(+(0, 0))'), envFromProgram(p)).term!)).toBe('S(0)');
  });
});

describe('performance', () => {
  const fib = parseStrict(`#priority
Fib(0) -> 0
Fib(S(0)) -> S(0)
Fib(S(S(n))) -> +(Fib(S(n)), Fib(n))
+(0, y) -> y
+(S(x), y) -> S(+(x, y))`);
  const sys = fromProgram(fib);
  const n = (k: number) => Array.from({ length: k }).reduce<ReturnType<typeof f>>((acc) => f('S', acc), f('0'));
  test('hash-consing shares equal subterms', () => {
    const h = new HashCons();
    expect((h.share(term('F(G(a), G(a))')) as unknown as { args: unknown[] }).args[0]).toBe(h.share(term('G(a)')));
    expect(dagSize(term('F(G(a), G(a))'))).toBe(3);
  });
  test('memoised normal forms make naive Fibonacci linear', () => {
    const plain = evaluate(sys, f('Fib', n(15)));
    const memo = evaluateShared(sys, f('Fib', n(15)));
    expect(show(memo.term)).toBe(show(plain.term));
    expect(memo.stats.steps).toBeLessThan(plain.steps / 5);
  });
  test('discrimination trees retrieve candidate rules', () => {
    const dt = new DiscriminationTree<number>();
    fib.rules.forEach((r, i) => dt.insert(r.lhs, i));
    expect(dt.retrieve(term('Fib(S(S(0)))')).sort()).toEqual([2]);
    expect(dt.retrieve(term('+(0, 0)'))).toEqual([3]);
  });
  test('decision trees and the JavaScript backend agree with the interpreter', () => {
    const tree = decisionTree(fib.rules.slice(0, 3), 1);
    expect(treeTests(tree, [n(5)]).rule).toBe(2);
    expect(showTree(tree, fib.rules)).toContain('switch x1');
    const c = compileToJS(fib.rules);
    expect(show(c.run(f('Fib', n(12))))).toBe(show(evaluate(sys, f('Fib', n(12))).term));
    const q = parseStrict('#priority\nFib(n) -> if(@lt(n, 2), n, @add(Fib(@sub(n, 1)), Fib(@sub(n, 2))))');
    expect(show(compileToJS(q.rules).run(term('Fib(20)')))).toBe('6765');
  });
});

describe('abstract reduction systems', () => {
  test("Newman's counterexample: locally confluent, not confluent, not terminating", () => {
    const p = properties(parseARS('b -> a, b -> c, c -> b, c -> d'));
    expect(p.locallyConfluent).toBe(true);
    expect(p.confluent).toBe(false);
    expect(p.terminating).toBe(false);
  });
  test('a diamond is confluent', () => {
    const p = properties(parseARS('a -> b, a -> c, b -> d, c -> d'));
    expect(p.confluent && p.terminating && p.uniqueNormalForms).toBe(true);
  });
});

describe('lambda calculus and combinators', () => {
  test('bracket abstraction then SKI reduction computes β', () => {
    const t = bracketAbstraction(parseLambda('(\\x y. x) A B'));
    expect(show(normalize(system(SKI), t).term)).toBe('A');
    const twice = bracketAbstraction(parseLambda('(\\f x. f (f x)) G C'));
    expect(showCL(normalize(system(SKI), twice).term)).toBe('G (G C)');
  });
  test('de Bruijn indices and λυ', () => {
    const e = parseLambda('\\x. \\y. x');
    expect(showDB(toDeBruijn(e))).toBe('λ λ 2');
    const r = normalize(system(LAMBDA_UPSILON), dbTerm(toDeBruijn(parseLambda('(\\x. \\y. x) A'))));
    expect(show(r.term)).toBe('Lam(Sub(A, Shift))');
  });
});

describe('computability', () => {
  test('the two-state busy beaver as rewriting', () => {
    const r = normalize(system(tmRules(BUSY_BEAVER_2)), tmStart(BUSY_BEAVER_2));
    expect(r.steps.length).toBe(6);
    expect(readConfig(r.term).nonBlank).toBe(4);
    expect(readConfig(r.term).state).toBe('H');
  });
  test('the three-state busy beaver writes six 1s', () => {
    const r = normalize(system(tmRules(BUSY_BEAVER_3)), tmStart(BUSY_BEAVER_3));
    expect(readConfig(r.term).nonBlank).toBe(6);
    expect(r.steps.length).toBe(14);
  });
  test("Post's correspondence problem (Sipser's example)", () => {
    const sol = solvePCP([['b', 'ca'], ['a', 'ab'], ['ca', 'a'], ['abc', 'c']])!;
    expect(sol).toEqual([1, 0, 2, 1, 3]);
    expect(solvePCP([['ab', 'a'], ['b', 'bb']])).toEqual([0, 1]);
    expect(solvePCP([['abc', 'ab'], ['ca', 'a']])).toBeNull();
  });
  test('string rewriting steps', () => {
    expect(stringSteps('aab', [['ab', 'ba']]).map((s) => s.result)).toEqual(['aba']);
  });
});

describe('tree automata', () => {
  test('the normal forms of Peano addition', () => {
    const R = rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))');
    const sig = new Map([['0', 0], ['S', 1], ['+', 2]]);
    const A = normalFormAutomaton(R, sig);
    for (const t of groundTerms(sig, 2)) {
      const nf = !R.some((r) => {
        const sub = (u: typeof t): boolean => matches(r.lhs, u) || (u.type === 'fn' && u.args.some(sub));
        return sub(t);
      });
      expect(accepts(A, t)).toBe(nf);
    }
    expect(isEmpty(A)).toBe(false);
  });
});

test('Girafe example programs run', () => {
  const p = parseStrict(`
Not(True) -> False
Not(False) -> True
And(a, b) -> if(a, b, False)
Len(:(_, tl)) -> @add(Len(tl), 1)
Len(Nil) -> 0
`);
  expect(show(evaluate(fromProgram(p), term('Len(:(A, :(B, :(C, Nil))))')).term)).toBe('3');
  expect(show(evaluate(fromProgram(p), term('And(Not(False), True)')).term)).toBe('True');
});

describe("the reader's engine API", () => {
  const R = rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\nF(x) -> A\nLoop -> Loop');
  test('rootRewrite, allReducts and the two normalisers', async () => {
    const { rootRewrite, allReducts, normalizeInnermost, normalizeOutermost } = await import('./rewrite');
    expect(show(rootRewrite(R, term('+(S(0), 0)'))!)).toBe('S(+(0, 0))');
    expect(rootRewrite(R, term('S(0)'))).toBeNull();
    expect(allReducts(R, term('+(+(0, 0), +(0, 0))')).map((t) => show(t))).toEqual(['+(0, +(0, 0))', '+(+(0, 0), 0)']);
    expect(show(normalizeInnermost(R, term('+(S(S(0)), S(0))')))).toBe('S(S(S(0)))');
    expect(show(normalizeOutermost(R, term('F(Loop)')))).toBe('A');
    expect(() => normalizeInnermost(R, term('F(Loop)'), 100)).toThrow();
  });
  test('union-find', async () => {
    const { UnionFind } = await import('./egraph');
    const u = new UnionFind();
    for (let i = 0; i < 5; i++) u.make();
    u.union(0, 1);
    u.union(3, 4);
    expect(u.same(0, 1)).toBe(true);
    expect(u.same(1, 3)).toBe(false);
    u.union(1, 4);
    expect(u.same(0, 3)).toBe(true);
  });
});
