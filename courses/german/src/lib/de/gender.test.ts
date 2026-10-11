import { describe, expect, it } from 'vitest';
import { ruleFor } from './gender';

describe('gender rules', () => {
  it('finds the most specific ending', () => {
    expect(ruleFor('Zeitung')?.gender).toBe('f');
    expect(ruleFor('Mädchen')?.gender).toBe('n');
    expect(ruleFor('Lehrerin')?.ending).toBe('-in');
    expect(ruleFor('Frühling')?.gender).toBe('m');
    expect(ruleFor('Geschenk')?.ending).toBe('Ge-');
    expect(ruleFor('Tisch')).toBeUndefined();
  });
});
