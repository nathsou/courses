import { describe, expect, test } from 'vitest';
import { backtrack, growth, parseRegex } from './backtrack.js';

const agrees = (source: string, flags: string, inputs: string[]) => {
  const re = new RegExp(source, flags);
  for (const input of inputs) expect(backtrack(parseRegex(source, flags), input).matched, `${source} on ${JSON.stringify(input)}`).toBe(re.test(input));
};

describe('backtracking matcher', () => {
  test('agrees with JavaScript on matching', () => {
    agrees('^(a+)+$', '', ['', 'a', 'aaa', 'aab']);
    agrees('colou?r', 'i', ['Color', 'COLOUR', 'colr']);
    agrees('^\\d{3}-\\d{2,}$', '', ['123-45', '123-4', '12-345', '123-4567']);
    agrees('\\bcat\\b', '', ['a cat!', 'concat', 'cat']);
    agrees('^(?!admin)\\w+$', '', ['admin', 'administrator', 'user']);
    agrees('^(\\w)\\w*\\1$', '', ['abca', 'abcb', 'aa']);
    agrees('^[a-c]+?c$', '', ['abc', 'ab', 'ccc']);
    agrees('^[^0-9 ]+$', '', ['abc', 'ab1', 'a b']);
    agrees('(a|ab)(c|bcd)(d*)', '', ['abcd', 'xx']);
  });

  test('step counts: linear, then exponential', () => {
    const linear = growth(parseRegex('^a+$'), '', 'a', '!', 20);
    expect(linear.every((p) => p.steps !== null && p.steps < 200)).toBe(true);
    const exponential = growth(parseRegex('^(a+)+$'), '', 'a', '!', 30, 200_000);
    expect(exponential[exponential.length - 1]!.steps).toBeNull();
    const s10 = exponential[9]!.steps!;
    const s12 = exponential[11]!.steps!;
    expect(s12 / s10).toBeGreaterThan(3.5);
  });
});
