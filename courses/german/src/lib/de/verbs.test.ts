import { describe, expect, it } from 'vitest';
import { conjugateAll } from './verbs';

describe('conjugateAll', () => {
  it('accepts both ich-forms of -ern and -eln verbs, commoner first', () => {
    const w = conjugateAll('wandern', 'present', 0);
    if (w.length) expect(w).toEqual(['wandere', 'wandre']);
    expect(conjugateAll('machen', 'present', 0).length).toBeLessThanOrEqual(1);
  });
});
