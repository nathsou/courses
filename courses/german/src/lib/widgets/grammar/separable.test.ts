import { describe, expect, it } from 'vitest';
import { pieces } from './separable';
import { SEP_VERBS, STRUCTURES } from '../data/separable-verbs';

const show = (ps: ReturnType<typeof pieces>) => ps.map((p) => (p.k === 'text' ? p.t : `[${p.k}:${p.t}]`)).join('');

describe('separable verb highlighting', () => {
  const an = SEP_VERBS.find((v) => v.id === 'anrufen')!;
  it('marks the pieces', () => {
    expect(show(pieces(an.sentences.present.de, an, 'present'))).toBe('Ich [stem:rufe] dich heute Abend [prefix:an].');
    expect(show(pieces(an.sentences.imperative.de, an, 'imperative'))).toBe('[stem:Ruf] mich bitte morgen [prefix:an]!');
    expect(show(pieces(an.sentences.modal.de, an, 'modal'))).toBe('Ich [aux:muss] heute noch meine Mutter [prefix:an][stem:rufen].');
    expect(show(pieces(an.sentences.perfect.de, an, 'perfect'))).toBe('Ich [aux:habe] dich gestern [prefix:an][infix:ge][stem:rufen].');
    expect(show(pieces(an.sentences.subordinate.de, an, 'subordinate'))).toBe('Oma freut sich, wenn du sie [prefix:an][stem:rufst].');
    expect(show(pieces(an.sentences.zu.de, an, 'zu'))).toBe('Vergiss nicht, deine Oma [prefix:an][infix:zu][stem:rufen]!');
  });

  for (const v of SEP_VERBS)
    for (const s of STRUCTURES) {
      const sent = v.sentences[s.id];
      it(`${v.verb} · ${s.id}: ${sent.de}`, () => {
        const ps = pieces(sent.de, v, s.id);
        // The text is unchanged.
        expect(ps.map((p) => p.t).join('')).toBe(sent.de);
        // The prefix appears exactly once and the stem at least once.
        expect(ps.filter((p) => p.k === 'prefix')).toHaveLength(1);
        expect(ps.filter((p) => p.k === 'stem')).toHaveLength(1);
        const iPrefix = ps.findIndex((p) => p.k === 'prefix');
        const iStem = ps.findIndex((p) => p.k === 'stem');
        const words = sent.de.split(/[^\p{L}]+/u).filter(Boolean);
        const lastWord = words[words.length - 1]!.toLowerCase();
        switch (s.id) {
          case 'present':
          case 'question':
          case 'imperative':
            // Split: stem before the prefix, the prefix the last word of its clause.
            expect(iStem).toBeLessThan(iPrefix);
            expect(ps[iPrefix]!.t.toLowerCase()).toBe(v.prefix);
            expect(sent.de.match(new RegExp(`\\b${v.prefix}\\b[^\\p{L}]*$`, 'iu')) || /, es ist/.test(sent.de)).toBeTruthy();
            break;
          case 'modal':
            expect(ps.some((p) => p.k === 'aux')).toBe(true);
            expect(lastWord).toBe(v.verb);
            break;
          case 'perfect':
            expect(ps.some((p) => p.k === 'aux' && (v.aux === 'sein' ? /^(bin|bist|ist|sind|seid)$/ : /^(habe|hast|hat|haben|habt)$/).test(p.t.toLowerCase()))).toBe(true);
            expect(lastWord).toBe(v.pp);
            break;
          case 'subordinate':
            expect(lastWord.startsWith(v.prefix)).toBe(true);
            expect(sent.de).toMatch(/, (weil|wenn|dass) /);
            break;
          case 'zu':
            expect(lastWord).toBe(`${v.prefix}zu${v.verb.slice(v.prefix.length)}`);
            break;
        }
        expect(sent.en).toMatch(/[.!?)]$/);
      });
    }
});
