import { describe, expect, it } from 'vitest';
import { answerOf, gapped, filled, prepRound } from './prepositions';
import { PREPOSITIONS } from '$lib/widgets/data/prepositions';

describe('two-way prepositions', () => {
  it('covers all nine', () => {
    expect(PREPOSITIONS.map((p) => p.prep)).toEqual(['in', 'an', 'auf', 'über', 'unter', 'vor', 'hinter', 'neben', 'zwischen']);
  });
  it('uses dative for wo and accusative for wohin', () => {
    const DAT = /^(dem|der|am|im)$/;
    const ACC = /^(den|die|das|ans|ins)$/;
    for (const p of PREPOSITIONS) {
      for (const a of answerOf(p.wo.de).split(' … ')) expect(a, p.wo.de).toMatch(DAT);
      for (const a of answerOf(p.wohin.de).split(' … ')) expect(a, p.wohin.de).toMatch(ACC);
    }
  });
  it('lists the right answer first among distinct options', () => {
    for (const p of PREPOSITIONS)
      for (const s of [p.wo, p.wohin]) {
        expect(s.options[0]).toBe(answerOf(s.de));
        expect(new Set(s.options).size).toBe(s.options.length);
      }
  });
  it('gaps and fills sentences', () => {
    const s = 'Die Katze liegt zwischen {dem} Sofa und {dem} Tisch.';
    expect(answerOf(s)).toBe('dem … dem');
    expect(gapped(s)).toBe('Die Katze liegt zwischen ___ Sofa und ___ Tisch.');
    expect(filled(s, 'das … den')).toBe('Die Katze liegt zwischen {das} Sofa und {den} Tisch.');
    expect(gapped('Die Katze sitzt {am} Tisch.')).toBe('Die Katze sitzt ___ Tisch.');
  });
  it('builds rounds for each mode', () => {
    expect(prepRound('wo', 8, 1).every((q) => q.kase === 'wo')).toBe(true);
    expect(prepRound('wohin', 8, 1).every((q) => q.kase === 'wohin')).toBe(true);
    const both = prepRound('both', 8, 2);
    expect(both).toHaveLength(8);
    expect(new Set(both.map((q) => q.prep)).size).toBe(8);
    expect(both.some((q) => q.kase === 'wo') && both.some((q) => q.kase === 'wohin')).toBe(true);
  });
});
