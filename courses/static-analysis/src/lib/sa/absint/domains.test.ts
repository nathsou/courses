import { describe, expect, test } from 'vitest';
import { DOMAINS, alpha, gamma, evalAbstract, evalBest, evalConcrete, parseExpr, type Domain } from './domains.js';

const window = Array.from({ length: 17 }, (_, i) => i - 8);
// Deterministic subsets of the window.
const subsets = Array.from({ length: 300 }, (_, k) => window.filter((n) => ((k * 2654435761 + (n + 8) * 40503) >>> (n + 8) % 13) % 3 === 0));
const exprs = ['x + 1', '-x', '2 * x', 'x * x', 'x - x', '(x + 1) * (x - 1)', 'x * x - 2 * x'].map(parseExpr);

describe.each(Object.values(DOMAINS) as Domain<unknown>[])('$name', (d) => {
  test('Galois connection: α(S) ⊑ a ⇔ S ⊆ γ(a)', () => {
    const abstracts = subsets.map((s) => alpha(d, s));
    for (const s of subsets) for (const a of abstracts) expect(d.leq(alpha(d, s), a)).toBe(s.every((n) => d.has(a, n)));
  });
  test('S ⊆ γ(α(S))', () => {
    for (const s of subsets) expect(s.every((n) => d.has(alpha(d, s), n))).toBe(true);
  });
  test('abstract evaluation is sound, and the best transformer is at least as precise', () => {
    for (const s of subsets) {
      const a = alpha(d, s);
      for (const e of exprs) {
        const abs = evalAbstract(d, e, a);
        for (const n of gamma(d, a, window)) expect(d.has(abs, evalConcrete(e, n))).toBe(true);
        expect(d.leq(evalBest(d, e, a, window), abs)).toBe(true);
      }
    }
  });
});

test('x - x is imprecise compositionally', () => {
  const x = parseExpr('x - x');
  expect(DOMAINS.intervals.format(evalAbstract(DOMAINS.intervals, x, { lo: 0, hi: 10 }))).toBe('[-10, 10]');
  expect(DOMAINS.intervals.format(evalBest(DOMAINS.intervals, x, { lo: 0, hi: 10 }, window))).toBe('[0]');
  expect(DOMAINS.parity.format(evalAbstract(DOMAINS.parity, x, 'odd'))).toBe('even');
  expect(DOMAINS.signs.format(evalAbstract(DOMAINS.signs, x, 'pos'))).toBe('⊤');
});
test('parser', () => {
  expect(evalConcrete(parseExpr('(x + 1) * (x - 1)'), 3)).toBe(8);
  expect(evalConcrete(parseExpr('-x * 2 + 1'), 3)).toBe(-5);
  expect(() => parseExpr('x +')).toThrow();
});
