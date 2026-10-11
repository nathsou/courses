import { describe, expect, it } from 'vitest';
import { join, text, variants, CAN_LEAD, mainOrder } from './connectors';
import { CLAUSE_PAIRS, CONNECTORS } from '../data/connector-lab';

const pair = (id: string) => CLAUSE_PAIRS.find((p) => p.id === id)!;
const s = (id: string, c: Parameters<typeof join>[1], lead = false) => text(join(pair(id), c, { lead }));

describe('joining clauses', () => {
  it('position 0: nothing changes', () => {
    expect(s('tired', 'und')).toBe('Ich bin müde und ich gehe ins Bett.');
    expect(s('tired', 'denn')).toBe('Ich gehe ins Bett, denn ich bin müde.');
    expect(s('rain', 'aber')).toBe('Es regnet, aber wir gehen spazieren.');
    expect(s('evening', 'oder')).toBe('Wir gehen ins Kino oder wir essen eine Pizza.');
  });
  it('verb to the end, separable verbs joined', () => {
    expect(s('tired', 'weil')).toBe('Ich gehe ins Bett, weil ich müde bin.');
    expect(s('rain', 'obwohl')).toBe('Wir gehen spazieren, obwohl es regnet.');
    expect(s('time', 'wenn')).toBe('Ich komme mit, wenn ich Zeit habe.');
    expect(s('berlin', 'wenn')).toBe('Ich rufe dich an, wenn ich in Berlin ankomme.');
    expect(s('great', 'dass')).toBe('Ich finde es toll, dass du mitkommst.');
    expect(s('slow', 'damit')).toBe('Ich spreche langsam, damit du mich verstehst.');
    expect(s('food', 'obwohl')).toBe('Das Essen war sehr gut, obwohl es nicht teuer war.');
  });
  it('subordinate clause first: verb, comma, verb', () => {
    expect(s('tired', 'weil', true)).toBe('Weil ich müde bin, gehe ich ins Bett.');
    expect(s('time', 'wenn', true)).toBe('Wenn ich Zeit habe, komme ich mit.');
    expect(s('berlin', 'wenn', true)).toBe('Wenn ich in Berlin ankomme, rufe ich dich an.');
    expect(s('slow', 'damit', true)).toBe('Damit du mich verstehst, spreche ich langsam.');
    // dass cannot lead here: the order stays
    expect(s('great', 'dass', true)).toBe('Ich finde es toll, dass du mitkommst.');
  });
  it('adverbs: the verb straight after', () => {
    expect(s('tired', 'deshalb')).toBe('Ich bin müde, deshalb gehe ich ins Bett.');
    expect(s('rain', 'trotzdem')).toBe('Es regnet, trotzdem gehen wir spazieren.');
    expect(s('berlin', 'dann')).toBe('Ich komme in Berlin an, dann rufe ich dich an.');
    expect(s('food', 'außerdem')).toBe('Das Essen war sehr gut, außerdem war es nicht teuer.');
  });
  it('the clauses on their own match their parts', () => {
    for (const p of CLAUSE_PAIRS)
      for (const c of [p.x, p.y]) {
        const own = mainOrder(c).map((t) => t.t).join(' ');
        expect(own.charAt(0).toUpperCase() + own.slice(1) + '.').toBe(c.de);
      }
  });
  it('every connector appears, and every combination reads well', () => {
    const used = new Set(CLAUSE_PAIRS.flatMap((p) => p.connectors.map((c) => c.c)));
    for (const c of CONNECTORS) expect(used.has(c.c), c.c).toBe(true);
    for (const p of CLAUSE_PAIRS)
      for (const pc of p.connectors)
        for (const lead of CAN_LEAD.has(pc.c) ? [false, true] : [false]) {
          const t = s(p.id, pc.c, lead);
          expect(t).toMatch(/^[A-ZÄÖÜ][^,]*(,? [^,]+)?\.$/);
          expect(t).not.toMatch(/\s{2}|undefined/);
          expect(pc.en).toMatch(/\.$/);
        }
  });
  it('quiz variants are distinct wrong orders', () => {
    const v = variants(pair('tired'), 'weil');
    expect(v.right).toBe('Ich gehe ins Bett, weil ich müde bin.');
    expect(v.wrong).toEqual(['Ich gehe ins Bett, weil ich bin müde.', 'Ich gehe ins Bett, weil bin ich müde.']);
    expect(variants(pair('rain'), 'aber').wrong).toContain('Es regnet, aber gehen wir spazieren.');
  });
});
