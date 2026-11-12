import { describe, expect, test } from 'vitest';
import { artifactOf, checkDecode, deviceTruth, truthTable, type DecodeInput } from './model';

const pla: DecodeInput = {
  id: 't/pla',
  device: 'pla',
  source: '# @polarity Y=low\nX = !A & B | A & !B & C\nY = A & B | B & C\n',
  inputs: ['A', 'B', 'C'],
  outputs: ['X', 'Y'],
};
const gal: DecodeInput = {
  id: 't/gal',
  device: 'gal22v10',
  source: '# @pins A=2 B=3 C=4 D=5 Y=19 Z=18\n# @polarity Z=low\nY = A & !B | C & D\nZ = !(A & B & C)\n',
  inputs: ['A', 'B', 'C', 'D'],
  outputs: ['Y', 'Z'],
};
const prom: DecodeInput = {
  id: 't/prom',
  device: 'prom',
  source: 'A1 A0 B1 B0 | P3 P2 P1 P0\n' + Array.from({ length: 16 }, (_, m) => `${[...(m >> 2).toString(2).padStart(2, '0')].join(' ')} ${[...(m & 3).toString(2).padStart(2, '0')].join(' ')} | ${[...((m >> 2) * (m & 3)).toString(2).padStart(4, '0')].join(' ')}`).join('\n') + '\n',
  inputs: ['A1', 'A0', 'B1', 'B0'],
  outputs: ['P3', 'P2', 'P1', 'P0'],
};

describe('what the reader sees', () => {
  test('a PROM: one row per word, 1 is a blown fuse', () => {
    const a = artifactOf(prom);
    expect(a.grids[0]!.rows).toHaveLength(16);
    expect(a.grids[0]!.rows[0b1011]).toMatchObject({ label: '1011', bits: '0110' });
  });
  test('a PLA: the planes of the terms in use, and the polarity row', () => {
    const g = artifactOf(pla).grids[0]!;
    expect(g.heads.map((h) => h.label).join(' ')).toBe('A !A B !B C !C X Y');
    expect(g.rows.map((r) => r.label)).toEqual(['T0', 'T1', 'T2', 'T3', 'inverts']);
    expect(g.rows[4]!.bits.trim()).toBe('01');
    // T1 = !A & B: the complement fuse of A and the true fuse of B intact, both fuses of C blown.
    expect(g.rows[1]!.bits.split(' ')[0]).toBe('100111');
  });
  test('a GAL: the rows of each output, empty rows left out, the macrocell bits, and the pins', () => {
    const a = artifactOf(gal);
    expect(a.grids[0]!.heads).toHaveLength(22);
    expect(a.grids[0]!.rows.map((r) => r.note)).toEqual(['pin 19 output enable', 'pin 19, term 1', 'pin 19, term 2', 'pin 18 output enable', 'pin 18, term 1']);
    expect(a.grids[0]!.rows.every((r) => r.bits.length === 44)).toBe(true);
    expect(a.listings.find((l) => l.title.startsWith('Macrocell'))!.rows).toEqual([['19', '1', '1', 'active high, combinational'], ['18', '0', '1', 'active low, combinational']]);
    expect(a.listings[0]!.rows).toContainEqual(['19', 'Y', 'output']);
  });

});

describe('the device, not the source, is the truth', () => {
  test('truth tables come from running the configured device', () => {
    expect(deviceTruth(pla)).toEqual([[0, 0], [0, 0], [1, 0], [1, 1], [0, 0], [1, 0], [0, 1], [0, 1]]);
  });
});

describe('checking an answer', () => {
  test('an equivalent expression passes, however it is written', () => {
    expect(checkDecode(pla, { mode: 'expression', text: 'X = !A & B | A & !B & C\nY = B & (A | C)' }).pass).toBe(true);
    expect(checkDecode(pla, { mode: 'expression', text: 'Y = !(!B | !A & !C) // by De Morgan\nX = B & !A | C & A & !B' }).pass).toBe(true);
  });
  test('a wrong one comes back as rows of input, expected and got', () => {
    const r = checkDecode(pla, { mode: 'expression', text: 'X = !A & B\nY = B & (A | C)' });
    expect(r.pass).toBe(false);
    expect(r.rows).toEqual([{ inputs: { A: '1', B: '0', C: '1' }, expected: { X: '1', Y: '0' }, got: { X: '0', Y: '0' }, differ: ['X'] }]);
  });
  test('the answer must be about these pins', () => {
    expect(checkDecode(pla, { mode: 'expression', text: 'X = A\n' }).problems).toEqual(['There is no equation for Y. Write Y = …']);
    expect(checkDecode(pla, { mode: 'expression', text: 'X = A & Q\nY = B' }).problems).toEqual(['Q is not one of the inputs (A, B, C).']);
    expect(checkDecode(pla, { mode: 'expression', text: '' }).pass).toBe(false);
  });
  test('a table must be filled in, and is compared cell by cell', () => {
    const t = truthTable(pla);
    expect(checkDecode(pla, { mode: 'table', table: { X: t.X!, Y: t.Y!.map((v, i) => (i === 3 ? null : v)) } }).problems).toEqual(['Fill in every cell of the table first.']);
    expect(checkDecode(pla, { mode: 'table', table: t }).pass).toBe(true);
    expect(checkDecode(pla, { mode: 'table', table: { ...t, X: t.X!.map((v) => (1 - v) as 0 | 1) } }).pass).toBe(false);
  });

  test('the same holds for the GAL', () => {
    expect(checkDecode(gal, { mode: 'expression', text: 'Y = A & !B | C & D\nZ = !(A & B & C)' }).pass).toBe(true);
    expect(checkDecode(gal, { mode: 'expression', text: 'Y = A & !B | C & D\nZ = A & B & C' }).pass).toBe(false);
  });
});
