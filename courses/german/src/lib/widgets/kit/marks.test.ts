import { describe, expect, it } from 'vitest';
import { segments, unmark, spanCount, spans, wellFormed } from './marks';

describe('highlight markup', () => {
  it('splits text into plain runs and numbered spans', () => {
    expect(segments('Das ist der Mann, {den} ich {kenne}.')).toEqual([
      { t: 'Das ist der Mann, ', i: -1 },
      { t: 'den', i: 0 },
      { t: ' ich ', i: -1 },
      { t: 'kenne', i: 1 },
      { t: '.', i: -1 },
    ]);
  });
  it('strips the markup', () => {
    expect(unmark('{Das Auto} {wird} repariert.')).toBe('Das Auto wird repariert.');
  });
  it('counts and lists spans', () => {
    expect(spanCount('a {b} c {d e}')).toBe(2);
    expect(spans('a {b} c {d e}')).toEqual(['b', 'd e']);
  });
  it('checks that braces are balanced', () => {
    expect(wellFormed('a {b} c')).toBe(true);
    expect(wellFormed('a {b c')).toBe(false);
    expect(wellFormed('a {b {c}}')).toBe(false);
    expect(wellFormed('a b} c')).toBe(false);
  });
});
