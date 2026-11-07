import { describe, expect, test } from 'vitest';
import { parseProgram, parseStrict, term, rules } from './parse';
import { show, positions, at, replaceAt, showPos, apply, substOf, f, v, size } from './term';
import { match, matchTrace } from './match';
import { evaluate, normalize, redexes, reductionGraph, fromProgram, system, step, unfreeze } from './rewrite';
import { unify } from './unify';
import { lpo, kbo, precedence, embeds, multisetGreater, lpoExplain } from './orders';
import { checkInterpretation, interpretation, findLinearInterpretation, findPrecedence, dependencyPairs, dpProve, findLoop, proveTermination } from './termination';
import { criticalPairs, checkConfluence, isOrthogonal } from './confluence';
import { complete, prove } from './completion';

const PEANO = `
+(0, y) -> y
+(S(x), y) -> S(+(x, y))
*(0, y) -> 0
*(S(x), y) -> +(y, *(x, y))
`;

describe('parser', () => {
  test('Girafe rules, queries and comments', () => {
    const p = parseStrict(`${PEANO}\n-- a comment\n? *(S(S(0)), S(S(S(0))))`);
    expect(p.rules).toHaveLength(4);
    expect(show(p.rules[1]!.lhs)).toBe('+(S(x), y)');
    expect(p.queries).toHaveLength(1);
  });
  test('variables are lower case, symbols are not', () => {
    const t = term('F(x, Nil, :(y, ys), 0, -1)');
    expect(t).toEqual(f('F', v('x'), f('Nil'), f(':', v('y'), v('ys')), f('0'), f('-1')));
  });
  test('infix operators after #infixl', () => {
    const p = parseStrict('#infixl 6 +\n#infixl 7 *\nx + 0 -> x\n(x * y) * z == x * (y * z)\nS(x) + y * z -> S(x + y)');
    expect(show(p.rules[0]!.lhs)).toBe('+(x, 0)');
    expect(show(p.equations[0]!.left)).toBe('*(*(x, y), z)');
    expect(show(p.rules[1]!.lhs)).toBe('+(S(x), *(y, z))');
    expect(show(p.rules[1]!.lhs, p.fixity)).toBe('S(x) + y * z');
    expect(show(p.equations[0]!.right, p.fixity)).toBe('x * (y * z)');
  });
  test('prefix use of an infix symbol on the next line is not glued', () => {
    const p = parseStrict('#infixl 6 +\n+(0, y) -> y\n+(S(x), y) -> S(x + y)');
    expect(p.rules).toHaveLength(2);
  });
  test('labels, conditions, pragmas and lazy markers', () => {
    const p = parseStrict('#priority\n#ac + *\n#strategy s = innermost(A)\n[A] F(x) -> G(x) if H(x) ->* True, x == x\nIf(True, a?, b?) -> a\nInf(x) -> :(x, Inf(S(x))?)');
    expect(p.priority).toBe(true);
    expect([...p.ac]).toEqual(['+', '*']);
    expect(p.strategies.get('s')).toBe('innermost(A)');
    expect(p.rules[0]!.label).toBe('A');
    expect(p.rules[0]!.conditions).toHaveLength(2);
    expect(p.lazy.get('If')).toEqual([undefined, true, true]);
    expect(show(p.rules[2]!.rhs)).toBe(':(x, Inf(S(x))?)');
  });
  test('multi-line right-hand sides (as in Girafe examples)', () => {
    const p = parseStrict('F(x) ->\n  if(=(x, 0),\n    A,\n    B)\nG -> H');
    expect(p.rules).toHaveLength(2);
  });
  test('errors are reported with positions, and parsing continues', () => {
    const p = parseProgram('F(x -> x\nG(x) -> y\nH -> I');
    const errs = p.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.length).toBe(2);
    expect(errs[0]!.line).toBe(1);
    expect(errs[1]!.message).toContain('y');
    expect(p.rules.map((r) => show(r.lhs))).toEqual(['G(x)', 'H']);
  });
});

describe('terms and matching', () => {
  test('positions, subterms and replacement', () => {
    const t = term('F(G(a), b)');
    expect(positions(t).map(showPos)).toEqual(['ε', '1', '1.1', '2']);
    expect(show(at(t, [0, 0]))).toBe('a');
    expect(show(replaceAt(t, [0], term('H')))).toBe('F(H, b)');
    expect(size(t)).toBe(4);
  });
  test('substitution', () => {
    expect(show(apply(substOf({ x: term('S(0)') }), term('+(x, x)')))).toBe('+(S(0), S(0))');
  });
  test('matching, including non-linear patterns', () => {
    expect(match(term('+(S(x), y)'), term('+(S(0), S(S(0)))'))).toEqual(new Map([['x', term('0')], ['y', term('S(S(0))')]]));
    expect(match(term('F(x, x)'), term('F(A, B)'))).toBeNull();
    expect(match(term('F(x, x)'), term('F(A, A)'))).not.toBeNull();
    expect(matchTrace(term('F(x, x)'), term('F(A, B)')).steps.at(-1)!.outcome).toBe('conflict');
  });
});

describe('rewriting', () => {
  const sys = system(rules(PEANO));
  test('2 × 3 = 6 by innermost and outermost', () => {
    const t = term('*(S(S(0)), S(S(S(0))))');
    const six = 'S(S(S(S(S(S(0))))))';
    expect(show(normalize(sys, t).term)).toBe(six);
    expect(show(normalize(sys, t, { strategy: 'outermost' }).term)).toBe(six);
    expect(show(normalize(sys, t, { strategy: 'parallel-outermost' }).term)).toBe(six);
    expect(show(evaluate(sys, t).term)).toBe(six);
  });
  test('redexes and the reduction graph', () => {
    const t = term('+(+(0, 0), +(0, 0))');
    expect(redexes(sys, t).map((r) => showPos(r.pos))).toEqual(['1', '2']);
    const g = reductionGraph(sys, t);
    expect(g.nodes.length).toBe(5);
    expect(g.edges.length).toBe(6);
  });
  test('innermost loops where outermost terminates', () => {
    const s = system(rules('F(x) -> A\nLoop -> Loop'));
    expect(normalize(s, term('F(Loop)'), { fuel: 50 }).normal).toBe(false);
    expect(show(normalize(s, term('F(Loop)'), { strategy: 'outermost' }).term)).toBe('A');
  });
  test('externals and if', () => {
    const p = parseStrict('Fact(0) -> 1\nFact(n) -> @mul(n, Fact(@sub(n, 1)))\n#priority');
    expect(show(evaluate(fromProgram(p), term('Fact(20)')).term)).toBe('2432902008176640000');
    const q = parseStrict('Fib(n) -> if(@lt(n, 2), n, @add(Fib(@sub(n, 1)), Fib(@sub(n, 2))))');
    expect(show(evaluate(fromProgram(q), term('Fib(15)')).term)).toBe('610');
    expect(show(normalize(fromProgram(q), term('Fib(6)'), { fuel: 100000 }).term)).toBe('8');
  });
  test('priority: catch-all rules after specific ones', () => {
    const src = 'IsZero(0) -> True\nIsZero(x) -> False';
    expect(redexes(system(rules(src)), term('IsZero(0)')).length).toBe(2);
    expect(redexes(fromProgram(parseStrict('#priority\n' + src)), term('IsZero(0)')).length).toBe(1);
  });
  test('laziness: infinite lists', () => {
    const p = parseStrict('#priority\nNats(n) -> :(n, Nats(S(n))?)\nTake(0, xs) -> Nil\nTake(S(k), :(x, xs)) -> :(x, Take(k, xs))');
    const sys2 = fromProgram(p);
    expect(show(unfreeze(evaluate(sys2, term('Take(S(S(0)), Nats(0))')).term))).toBe(':(0, :(S(0), Nil))');
    expect(show(unfreeze(normalize(sys2, term('Take(S(S(0)), Nats(0))')).term))).toBe(':(0, :(S(0), Nil))');
  });
  test('conditional rules', () => {
    const p = parseStrict('Max(x, y) -> x if @ge(x, y) ->* True\nMax(x, y) -> y if @lt(x, y) ->* True');
    expect(show(evaluate(fromProgram(p), term('Max(3, 7)')).term)).toBe('7');
  });
  test('one step reports its redex', () => {
    const s = step(sys, term('+(S(0), 0)'))!;
    expect(show(s.after)).toBe('S(+(0, 0))');
    expect(s.redexes[0]!.cause.kind).toBe('rule');
  });
});

describe('unification', () => {
  test('mgu and failures', () => {
    const s = unify(term('F(x, G(y))'), term('F(G(z), x)'))!;
    expect(show(apply(s, term('F(x, G(y))')))).toBe(show(apply(s, term('F(G(z), x)'))));
    expect(unify(term('F(x)'), term('G(x)'))).toBeNull();
    expect(unify(term('x'), term('F(x)'))).toBeNull();
  });
});

describe('orders and termination', () => {
  const R = rules(PEANO);
  test('LPO orients Peano with * > + > S', () => {
    const gt = lpo(precedence(['*', '+', 'S', '0']));
    for (const r of R) expect(gt(r.lhs, r.rhs)).toBe(true);
    expect(lpoExplain(precedence(['*', '+', 'S']), R[3]!.lhs, R[3]!.rhs).holds).toBe(true);
    expect(findPrecedence(R)).not.toBeNull();
  });
  test('KBO orients the group rules', () => {
    const gt = kbo({ prec: precedence(['I', '*', 'E']), weight: new Map([['I', 0], ['E', 1], ['*', 0]]) });
    expect(gt(term('*(*(x, y), z)'), term('*(x, *(y, z))'))).toBe(true);
    expect(gt(term('I(*(x, y))'), term('*(I(y), I(x))'))).toBe(true);
  });
  test('embedding and multisets', () => {
    expect(embeds(term('F(G(a), b)'), term('F(a, b)'))).toBe(true);
    expect(embeds(term('F(a)'), term('G(a)'))).toBe(false);
    const gt = (a: number, b: number) => a > b;
    expect(multisetGreater([5, 1], [4, 4, 4, 1], gt, (a, b) => a === b)).toBe(true);
    expect(multisetGreater([3], [3], gt, (a, b) => a === b)).toBe(false);
  });
  test('polynomial interpretations', () => {
    const I = interpretation({ '+': '2*x1 + x2', S: 'x1 + 1', '0': '1', '*': 'x1*x2 + x1' });
    const c = checkInterpretation(I, R.slice(0, 2));
    expect(c.ok).toBe(true);
    expect(findLinearInterpretation(R.slice(0, 2))).not.toBeNull();
  });
  test('dependency pairs prove a system no simplification order can', () => {
    // Ackermann's function terminates by LPO; this one (from Arts and Giesl) needs DPs.
    const R2 = rules('Minus(x, 0) -> x\nMinus(S(x), S(y)) -> Minus(x, y)\nQuot(0, S(y)) -> 0\nQuot(S(x), S(y)) -> S(Quot(Minus(x, y), S(y)))');
    expect(findPrecedence(R2, 'lpo')).toBeNull();
    expect(dependencyPairs(R2)).toHaveLength(3);
    expect(dpProve(R2).ok).toBe(true);
    expect(proveTermination(R2).result).toBe('terminating');
  });
  test('loops are found', () => {
    expect(findLoop(rules('F(x) -> G(F(x))'))).not.toBeNull();
    expect(proveTermination(rules('F(A, B, x) -> F(x, x, x)\nG(x, y) -> x\nG(x, y) -> y')).result).not.toBe('terminating');
  });
});

describe('confluence', () => {
  test('critical pairs of the group axioms', () => {
    const R = rules('*(E, x) -> x\n*(I(x), x) -> E\n*(*(x, y), z) -> *(x, *(y, z))');
    expect(criticalPairs(R).length).toBe(3);
  });
  test('orthogonal systems are confluent', () => {
    expect(isOrthogonal(rules(PEANO))).toBe(true);
    expect(checkConfluence(rules(PEANO)).result).toBe('confluent');
  });
  test('a non-confluent system and its witness', () => {
    const v = checkConfluence(rules('F(x) -> A\nF(x) -> B'));
    expect(v.result).toBe('not confluent');
  });
});

describe('completion', () => {
  const groups = parseStrict('*(E, x) == x\n*(I(x), x) == E\n*(*(x, y), z) == *(x, *(y, z))').equations;
  test('the group axioms complete to ten rules', () => {
    const res = complete(groups, lpo(precedence(['I', '*', 'E'])));
    expect(res.status).toBe('success');
    expect(res.rules).toHaveLength(10);
    const shown = res.rules.map((r) => `${show(r.lhs)} -> ${show(r.rhs)}`);
    expect(shown).toContain('I(*(x, y)) -> *(I(y), I(x))');
    expect(shown).toContain('I(I(x)) -> x');
  });
  test('commutativity cannot be oriented', () => {
    const res = complete(parseStrict('+(x, y) == +(y, x)').equations, lpo(precedence(['+'])));
    expect(res.status).toBe('failed');
  });
  test('unfailing completion proves that groups of exponent 2 are abelian', () => {
    const ax = parseStrict('*(E, x) == x\n*(I(x), x) == E\n*(*(x, y), z) == *(x, *(y, z))\n*(x, x) == E').equations;
    const res = prove(ax, [term('*(a, b)'), term('*(b, a)')], lpo(precedence(['I', '*', 'E', '$b', '$a'])));
    expect(res.status).toBe('proved');
  });
});
