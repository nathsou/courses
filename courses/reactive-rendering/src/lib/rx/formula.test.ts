import { describe, expect, test } from 'vitest';
import { FormulaError, compile } from './formula';

const cells: Record<string, number | string> = { A1: 4, B1: 3, C1: 10, A2: 6 };
const run = (f: string, reads: string[] = []) => compile(f)((ref) => (reads.push(ref), cells[ref] ?? 0));

describe('formulas', () => {
  test('numbers, text and arithmetic with precedence', () => {
    expect(run('42')).toBe(42);
    expect(run('hello')).toBe('hello');
    expect(run('=1+2*3')).toBe(7);
    expect(run('=(1+2)*3')).toBe(9);
    expect(run('=-A1+10')).toBe(6);
    expect(run('=A1*B1')).toBe(12);
  });
  test('functions and ranges', () => {
    expect(run('=SUM(A1:B1)')).toBe(7);
    expect(run('=SUM(A1:A2)')).toBe(10);
    expect(run('=MAX(A1,B1,C1)')).toBe(10);
    expect(run('=MIN(A1:C1)')).toBe(3);
  });
  test('IF evaluates only the branch it takes', () => {
    const reads: string[] = [];
    expect(run('=IF(A1>3, B1, C1)', reads)).toBe(3);
    expect(reads).toEqual(['A1', 'B1']);
    const reads2: string[] = [];
    expect(run('=IF(A1>5, B1, C1)', reads2)).toBe(10);
    expect(reads2).toEqual(['A1', 'C1']);
  });
  test('errors', () => {
    expect(() => run('=1/0')).toThrow('#DIV/0');
    expect(() => compile('=1+')).toThrow(FormulaError);
    expect(() => compile('=FOO(1)')(() => 0)).toThrow('unknown function');
    expect(() => compile('=1 $ 2')).toThrow(FormulaError);
  });
});
