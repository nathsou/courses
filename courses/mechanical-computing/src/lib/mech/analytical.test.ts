import { describe, expect, test } from 'vitest';
import { checkDeck, formatFixed, noteGTable, parseDeck, run, toFixed } from './analytical';

const FACTORIAL = `
N2 1      # running product
N3 1      # the constant one
×         # loop starts here (card 3)
L2
L1
S2        # V2 ← V2 × V1
-
L1
L3
S1        # V1 ← V1 − 1
-
L1
L3
S4        # test: V1 − 1 (sets the lever once V1 is 0)
CF? 1
CB 13
H
`;

describe('Analytical Engine', () => {
  test('parses every kind of card and reports bad ones', () => {
    const d = parseDeck('N1 5\n+\nL1\nZ1\nS2\nS3\'\nP\nCF 2\nCB? 3\nBELL\nH\nfrobnicate\nL1000');
    expect(d.cards.map((c) => c.kind)).toEqual(['number', 'op', 'load', 'load', 'store', 'store', 'print', 'jump', 'jump', 'bell', 'halt', 'load']);
    expect(d.errors.map((e) => e.line)).toEqual([12, 13]);
  });

  test('adds, subtracts, multiplies and divides', () => {
    const r = run('N1 12\nN2 5\n+\nL1\nL2\nS3\n-\nL1\nL2\nS4\n×\nL1\nL2\nS5\n÷\nL1\nL2\nS6\nS7\'');
    expect([3, 4, 5, 6, 7].map((v) => r.store.get(v))).toEqual([17n, 7n, 60n, 2n, 2n]);
  });

  test('Z cards clear the column they read', () => {
    const r = run('N1 4\nN2 3\n+\nZ1\nL2\nS3');
    expect(r.store.get(1)).toBeUndefined();
    expect(r.store.get(3)).toBe(7n);
  });

  test('the run-up lever is set when a subtraction goes below zero, and conditional cards read it', () => {
    const r = run('N1 3\nN2 5\n-\nL1\nL2\nS3\nCF? 1\nN9 1\nH');
    expect(r.store.get(3)).toBe(-2n);
    expect(r.store.get(9)).toBeUndefined();
    const s = run('N1 7\nN2 5\n-\nL1\nL2\nS3\nCF? 1\nN9 1\nH');
    expect(s.store.get(9)).toBe(1n);
  });

  test('a loop with a conditional exit computes a factorial', () => {
    expect(run(FACTORIAL, { 1: 5 }).store.get(2)).toBe(120n);
    expect(run(FACTORIAL, { 1: 1 }).store.get(2)).toBe(1n);
    expect(run(FACTORIAL, { 1: 20 }).store.get(2)).toBe(2432902008176640000n);
  });

  test('a deck that never stops is stopped', () => {
    const r = run('N1 1\n+\nL1\nL1\nS1\nCB 4', {}, 1000);
    expect(r.halted).toBe('limit');
  });

  test('fixed point: decimals carry through × and ÷', () => {
    const r = run('.decimal 6\nN1 1\nN2 3\n÷\nL1\nL2\nS3\n×\nL3\nL2\nS4');
    expect(formatFixed(r.store.get(3)!, 6)).toBe('0.333333');
    expect(formatFixed(r.store.get(4)!, 6)).toBe('0.999999');
    expect(toFixed('-2.5', 2)).toBe(-250n);
  });

  test('timing follows Babbage’s estimates', () => {
    const r = run('N1 2\nN2 3\n×\nL1\nL2\nS3');
    expect(r.time).toBeGreaterThan(60);
    expect(r.time).toBeLessThan(65);
  });

  test('checkDeck reports failures in words', () => {
    const ok = checkDeck(FACTORIAL, [{ set: { V1: 4 }, expect: { V2: 24 } }]);
    expect(ok.ok).toBe(true);
    const bad = checkDeck(FACTORIAL, [{ set: { V1: 4 }, expect: { V2: 25 } }]);
    expect(bad.failures[0]).toContain('V2 should hold 25 but holds 24');
  });

  test('Lovelace-style table: one row per working of the mill', () => {
    const t = noteGTable(parseDeck('×\nL1\nL2\nS4\nS5\n-\nL4\nZ3\nS6'));
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ op: '×', operands: [{ v: 1 }, { v: 2 }], results: [{ v: 4 }, { v: 5 }] });
    expect(t[1]).toMatchObject({ op: '-', operands: [{ v: 4, zero: false }, { v: 3, zero: true }] });
  });
});
