import { describe, expect, it } from 'vitest';
import { analyse, infinitiveStem, needsE, participleRule } from './participle';
import { PERFECT_VERBS } from '../data/perfect-builder';
import { verbTable } from '$lib/de/verbs';

const pieces = (inf: string, pp: string) => {
  const a = analyse(inf, pp);
  return [a.prefix, a.ge ? 'ge' : '', a.stem, a.ending].filter(Boolean).join('·');
};

describe('participle analysis', () => {
  it('regular, strong and mixed', () => {
    expect(pieces('machen', 'gemacht')).toBe('ge·mach·t');
    expect(pieces('arbeiten', 'gearbeitet')).toBe('ge·arbeit·et');
    expect(pieces('reisen', 'gereist')).toBe('ge·reis·t');
    expect(pieces('sprechen', 'gesprochen')).toBe('ge·sproch·en');
    expect(pieces('bringen', 'gebracht')).toBe('ge·brach·t');
    expect(pieces('tun', 'getan')).toBe('ge·ta·n');
    expect(analyse('bringen', 'gebracht').type).toBe('mixed');
    expect(analyse('sprechen', 'gesprochen').changed).toBe(true);
    expect(analyse('fahren', 'gefahren').changed).toBe(false);
    expect(analyse('machen', 'gemacht').type).toBe('weak');
  });
  it('no ge- after inseparable prefixes and in -ieren verbs', () => {
    expect(pieces('besuchen', 'besucht')).toBe('besuch·t');
    expect(pieces('verstehen', 'verstanden')).toBe('verstand·en');
    expect(analyse('verstehen', 'verstanden').insepPrefix).toBe('ver');
    expect(analyse('gehören', 'gehört').noGe).toBe('insep');
    expect(analyse('studieren', 'studiert').noGe).toBe('ieren');
    // ge- verbs that are not prefixed
    expect(pieces('gehen', 'gegangen')).toBe('ge·gang·en');
    expect(pieces('geben', 'gegeben')).toBe('ge·geb·en');
  });
  it('separable verbs', () => {
    expect(pieces('anrufen', 'angerufen')).toBe('an·ge·ruf·en');
    expect(pieces('einkaufen', 'eingekauft')).toBe('ein·ge·kauf·t');
    expect(pieces('mitbringen', 'mitgebracht')).toBe('mit·ge·brach·t');
    expect(pieces('zurückkommen', 'zurückgekommen')).toBe('zurück·ge·komm·en');
    expect(pieces('vorbereiten', 'vorbereitet')).toBe('vor·bereit·et');
    expect(analyse('umziehen', 'umgezogen').prefix).toBe('um');
  });
  it('helpers', () => {
    expect(infinitiveStem('wandern')).toBe('wander');
    expect(infinitiveStem('tun')).toBe('tu');
    expect(infinitiveStem('sein')).toBe('sei');
    expect(needsE('arbeit')).toBe(true);
    expect(needsE('öffn')).toBe(true);
    expect(needsE('lern')).toBe(false);
    expect(needsE('wohn')).toBe(false);
  });
  it('explains every curated verb', () => {
    for (const v of PERFECT_VERBS) {
      const r = participleRule(v.verb, v.pp);
      expect(r.length).toBeGreaterThan(20);
      expect(r).not.toMatch(/undefined/);
    }
    expect(participleRule('essen', 'gegessen')).toMatch(/extra g/);
    expect(participleRule('studieren', 'studiert')).toMatch(/-ieren/);
    expect(participleRule('verkaufen', 'verkauft')).toMatch(/ver-/);
    expect(participleRule('anrufen', 'angerufen')).toMatch(/an·ge·rufen/);
    expect(participleRule('denken', 'gedacht')).toMatch(/denk-.*dach-/);
  });
});

describe('curated perfect verbs', () => {
  it('model sentences use the auxiliary and end with the participle', () => {
    const HABEN = /\b(habe|hast|hat|haben|habt)\b/;
    const SEIN = /\b(bin|bist|ist|sind|seid)\b/;
    for (const v of PERFECT_VERBS) {
      expect(v.de).toMatch(v.aux === 'sein' ? SEIN : HABEN);
      const words = v.de.replace(/[.!?]$/, '').split(' ');
      expect(words[words.length - 1]).toBe(v.pp);
      expect(v.en).toMatch(/[.?!]$/);
      if (v.aux === 'sein') expect(v.kind).toBeTruthy();
    }
    expect(new Set(PERFECT_VERBS.map((v) => v.verb)).size).toBe(PERFECT_VERBS.length);
  });
  it('agree with the course verb tables where they exist', () => {
    for (const v of PERFECT_VERBS) {
      const t = verbTable(v.verb);
      if (!t) continue;
      expect(t.pp, v.verb).toBe(v.pp);
      if (v.verb !== 'bekommen') expect(t.aux.includes(v.aux === 'sein' ? 's' : 'h'), v.verb).toBe(true);
    }
  });
});
