import { describe, expect, it } from 'vitest';
import { cell, diff, fixImperative, regularForms, separablePrefix } from './conjugation';
import type { VerbTable } from '$lib/de/verbs';

describe('regular forms', () => {
  it('machen', () => {
    const r = regularForms('machen', '', 'gemacht');
    expect(r.pres).toEqual(['mache', 'machst', 'macht', 'machen', 'macht', 'machen']);
    expect(r.pret).toEqual(['machte', 'machtest', 'machte', 'machten', 'machtet', 'machten']);
    expect(r.k1).toEqual(['mache', 'machest', 'mache', 'machen', 'machet', 'machen']);
    expect(r.impDu).toEqual(['mach', 'mache']);
    expect(r.pp).toBe('gemacht');
  });
  it('e-insertion, s-stems, -ern verbs, prefixes', () => {
    expect(regularForms('arbeiten').pres).toEqual(['arbeite', 'arbeitest', 'arbeitet', 'arbeiten', 'arbeitet', 'arbeiten']);
    expect(regularForms('arbeiten').pret[0]).toBe('arbeitete');
    expect(regularForms('öffnen').pres[1]).toBe('öffnest');
    expect(regularForms('reisen').pres[1]).toBe('reist');
    expect(regularForms('tanzen').pres[1]).toBe('tanzt');
    expect(regularForms('wandern').pres).toEqual(['wandere', 'wanderst', 'wandert', 'wandern', 'wandert', 'wandern']);
    expect(regularForms('lächeln').pres[0]).toBe('lächle');
    expect(regularForms('einkaufen', 'ein', 'eingekauft').pres[0]).toBe('kaufe ein');
    expect(regularForms('einkaufen', 'ein', 'eingekauft').pp).toBe('eingekauft');
    expect(regularForms('besuchen', '', 'besucht').pp).toBe('besucht');
    expect(regularForms('studieren', '', 'studiert').pp).toBe('studiert');
  });
});

describe('irregularity', () => {
  it('highlights what differs', () => {
    expect(diff('fährst', 'fahrst')).toEqual(['f', 'ä', 'hrst']);
    expect(diff('fuhr', 'fahrte')).toEqual(['f', 'uhr', '']);
    expect(diff('kannte', 'kennte')).toEqual(['k', 'a', 'nnte']);
    expect(diff('gibt', 'gebt')).toEqual(['g', 'i', 'bt']);
    expect(diff('macht', 'macht')).toEqual(['macht', '', '']);
    expect(diff('soll', 'solle')).toEqual(['soll', '', '']);
    expect(cell('soll', 'solle').irregular).toBe(true);
  });
  it('marks cells', () => {
    expect(cell('mach', ['mach', 'mache']).irregular).toBe(false);
    expect(cell('mache', ['mach', 'mache']).irregular).toBe(false);
    expect(cell('sprich', ['sprech', 'spreche']).parts).toEqual(['spr', 'i', 'ch']);
    expect(cell('', 'x').irregular).toBe(false);
  });
  it('a strong verb from its table', () => {
    const fahren: VerbTable = {
      pres: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'],
      pret: ['fuhr', 'fuhrst', 'fuhr', 'fuhren', 'fuhrt', 'fuhren'],
      k2: ['führe', 'führest', 'führe', 'führen', 'führet', 'führen'],
      k1: ['fahre', 'fahrest', 'fahre', 'fahren', 'fahret', 'fahren'],
      imp: ['fahr', 'fahrt'],
      pp: 'gefahren',
      aux: 's',
    };
    const r = regularForms('fahren', separablePrefix(fahren), fahren.pp);
    expect(fahren.pres.map((f, i) => cell(f, r.pres[i]!).irregular)).toEqual([false, true, true, false, false, false]);
    expect(fahren.pret.every((f, i) => cell(f, r.pret[i]!).irregular)).toBe(true);
    expect(fahren.k1.every((f, i) => !cell(f, r.k1[i]!).irregular)).toBe(true);
    expect(cell(fahren.imp[0], r.impDu).irregular).toBe(false);
    expect(cell(fahren.pp, r.pp).irregular).toBe(true);
  });
  it('separable prefixes from tables', () => {
    const t = { pres: ['rufe an', 'rufst an', 'ruft an', 'rufen an', 'ruft an', 'rufen an'] } as VerbTable;
    expect(separablePrefix(t)).toBe('an');
  });
});

describe('imperative repair', () => {
  it('adds -e where the stem needs it', () => {
    expect(fixImperative('arbeiten', 'arbeit')).toBe('arbeite');
    expect(fixImperative('finden', 'find')).toBe('finde');
    expect(fixImperative('werden', 'werd')).toBe('werde');
    expect(fixImperative('einladen', 'lad ein', 'ein')).toBe('lade ein');
    expect(fixImperative('öffnen', 'öffne')).toBe('öffne');
  });
  it('leaves good forms alone', () => {
    expect(fixImperative('treten', 'tritt')).toBe('tritt');
    expect(fixImperative('machen', 'mach')).toBe('mach');
    expect(fixImperative('lesen', 'lies')).toBe('lies');
    expect(fixImperative('können', '')).toBe('');
  });
});
