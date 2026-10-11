/**
 * Internal consistency of the B1–B2 grammar widgets' data: every marked span has its role, every
 * table agrees with its sentences, and the forms that can be checked mechanically are checked.
 */
import { describe, expect, it } from 'vitest';
import { spanCount, spans, unmark, wellFormed } from '../kit/marks';
import { REL_NOUNS, REL_ROLES, REL_SENTENCES, REL_TABLE, REL_OPTIONS, REL_QUIZ } from './relative-pronouns';
import { PASSIVE_PRESETS, PASSIVE_TARGETS, STEP_NOTES } from './passive-machine';
import { K_SCENARIOS, K_QUIZ } from './konjunktiv-lab';
import { DAWO_VERBS, DAWO_PREPS, DAWO_QUIZ } from './da-wo-compounds';
import { REPORTS, K1_VERBS } from './reported-speech';
import { PARTICLES, PARTICLE_BASES } from './particle-lab';
import { ATTR_PRESETS, ATTR_QUIZ } from './attribute-unfolder';
import { NOM_PAIRS, FVGS } from './nominal-style';
import { C_FIRST, C_LAST, COMPOUNDS, C_QUIZ, LONG_STEPS } from './compound-builder';

/** Every string anywhere inside a value. */
function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

const ALL = [REL_SENTENCES, REL_ROLES, REL_QUIZ, PASSIVE_PRESETS, PASSIVE_TARGETS, K_SCENARIOS, K_QUIZ, DAWO_VERBS, DAWO_QUIZ, REPORTS, PARTICLE_BASES, ATTR_PRESETS, ATTR_QUIZ, NOM_PAIRS, FVGS, COMPOUNDS, C_QUIZ, LONG_STEPS];
const gap = (s: string) => (s.match(/_{3,}/g) ?? []).length;
const vowel = (p: string) => /^[aeiouäöü]/.test(p);

describe('all widget strings', () => {
  it('have balanced braces', () => {
    for (const s of strings(ALL)) expect(wellFormed(s), s).toBe(true);
  });
  it('use typographic quotation marks', () => {
    for (const s of strings(ALL)) expect(s, s).not.toMatch(/"/);
  });
});

describe('relative pronouns', () => {
  it('has one sentence for every noun and role', () => {
    for (const n of REL_NOUNS) for (const r of REL_ROLES) expect(REL_SENTENCES.filter((s) => s.noun === n.id && s.role === r.id), `${n.id} ${r.id}`).toHaveLength(1);
  });
  it('uses the pronoun the table gives, after the noun, with the verb at the end', () => {
    for (const s of REL_SENTENCES) {
      const role = REL_ROLES.find((r) => r.id === s.role)!;
      const noun = REL_NOUNS.find((n) => n.id === s.noun)!;
      const [pron, verb] = spans(s.de);
      expect(spanCount(s.de), s.de).toBe(2);
      expect(pron!.split(' ').at(-1), s.de).toBe(REL_TABLE[role.kind][s.noun]);
      expect(unmark(s.de), s.de).toContain(`${noun.de}, `);
      expect(s.de.endsWith(`{${verb}}.`), s.de).toBe(true);
    }
  });
  it('has quiz answers among the options, one gap each', () => {
    for (const q of REL_QUIZ) {
      expect(REL_OPTIONS).toContain(q.answer);
      expect(gap(q.de), q.de).toBe(1);
    }
  });
});

describe('passive machine', () => {
  it('gives every span a kind and every preset every target', () => {
    for (const p of PASSIVE_PRESETS) {
      expect(spanCount(p.active.de), p.active.de).toBe(p.active.kind.length);
      for (const t of PASSIVE_TARGETS) {
        const r = p.results[t.id];
        expect(r, `${p.id} ${t.id}`).toBeDefined();
        if ('none' in r) continue;
        expect(spanCount(r.de), r.de).toBe(r.kind.length);
        if (r.active) expect(spanCount(r.active.de), r.active.de).toBe(r.active.kind.length);
        for (const k of r.kind) expect(STEP_NOTES[k]).toBeDefined();
        expect(unmark(r.de)).toMatch(/\.$/);
      }
    }
  });
  it('puts worden in every perfect and pluperfect passive, and werden after a modal', () => {
    for (const p of PASSIVE_PRESETS) {
      for (const t of ['perf', 'plusq'] as const) {
        const r = p.results[t];
        if (!('none' in r) && !r.kind.includes('modal')) expect(spans(r.de), r.de).toContain('worden');
      }
      const m = p.results.modal;
      if (!('none' in m)) expect(spans(m.de), m.de).toContain('werden');
    }
  });
});

describe('Konjunktiv lab', () => {
  it('gives every verb span a kind', () => {
    for (const s of K_SCENARIOS)
      for (const [slot, f] of Object.entries(s.forms)) {
        if ('none' in f) continue;
        expect(spanCount(f.de), `${s.id} ${slot}`).toBe(f.kind.length);
      }
  });
  it('uses no würde in the unreal past', () => {
    for (const s of K_SCENARIOS) for (const slot of ['past', 'invertedPast', 'wishPast', 'wishAltPast'] as const) {
      const f = s.forms[slot];
      if (!('none' in f)) expect(f.de, f.de).not.toMatch(/würde/);
    }
  });
  it('has one gap per quiz item', () => {
    for (const q of K_QUIZ) expect(gap(q.de), q.de).toBe(1);
  });
});

describe('da- and wo-compounds', () => {
  it('adds the linking r before a vowel only', () => {
    for (const p of [...DAWO_PREPS, ...DAWO_VERBS]) {
      const r = vowel(p.prep) ? 'r' : '';
      expect(p.da).toBe(`da${r}${p.prep}`);
      expect(p.wo).toBe(`wo${r}${p.prep}`);
    }
  });
  it('uses the compounds for things and the preposition for people', () => {
    for (const v of DAWO_VERBS) {
      expect(spans(v.thing.ask)[0]!.toLowerCase()).toBe(v.wo);
      expect(spans(v.thing.reply)[0]).toBe(v.da);
      expect(spans(v.thing.stmt)[0]!.startsWith(v.prep) || (v.prep === 'an' && spans(v.thing.stmt)[0]!.startsWith('am '))).toBe(true);
      if (!('none' in v.person)) {
        expect(spans(v.person.ask)[0]!.toLowerCase()).toBe(`${v.prep} ${v.kind === 'acc' ? 'wen' : 'wem'}`);
        expect(spans(v.person.reply)[0]!.startsWith(`${v.prep} `)).toBe(true);
      }
      if (!('none' in v.clause)) expect(spans(v.clause.de)[0]).toBe(v.da);
    }
  });
  it('has one gap per quiz item', () => {
    for (const q of DAWO_QUIZ) expect(gap(q.de), q.de).toBe(1);
  });
});

describe('reported speech', () => {
  it('maps every span to a change, and every change to a span', () => {
    for (const r of REPORTS) {
      expect(spanCount(r.direct), r.direct).toBe(r.dm.length);
      expect(spanCount(r.indirect), r.indirect).toBe(r.im.length);
      for (const i of [...r.dm, ...r.im]) expect(i).toBeLessThan(r.changes.length);
      r.changes.forEach((_, i) => expect(r.im.includes(i) || r.dm.includes(i), `${r.id} change ${i}`).toBe(true));
    }
  });
  it('replaces Konjunktiv I exactly where it equals the indicative', () => {
    for (const v of K1_VERBS)
      for (const row of v.rows) {
        if (row.k1 === row.ind) expect(row.use, row.k1).not.toBe(row.k1);
        else expect(row.use, row.k1).toBe(row.k1);
      }
  });
});

describe('particle lab', () => {
  it('covers every particle for every sentence, with the particle marked', () => {
    const words: Record<string, string[]> = { eben: ['eben', 'halt'], bloss: ['bloß', 'nur'] };
    for (const b of PARTICLE_BASES)
      for (const p of PARTICLES) {
        const e = b.with[p.id];
        expect(e, `${b.id} ${p.id}`).toBeDefined();
        if ('none' in e) {
          if (e.de) expect(spanCount(e.de)).toBe(1);
          continue;
        }
        expect(spanCount(e.de), e.de).toBe(1);
        expect(spans(e.de)[0]!.split(' ').some((w) => (words[p.id] ?? [p.id]).includes(w)), e.de).toBe(true);
        if (e.alt) expect(spanCount(e.alt), e.alt).toBe(1);
      }
  });
});

describe('attribute unfolder', () => {
  it('links the same pieces in both forms', () => {
    for (const a of ATTR_PRESETS) {
      expect(spanCount(a.attr), a.id).toBe(a.am.length);
      expect(spanCount(a.unfold), a.id).toBe(a.um.length);
      const at = spans(a.attr);
      const ut = spans(a.unfold);
      a.kind.forEach((k, g) => {
        expect(a.um, `${a.id} group ${g}`).toContain(g);
        if (k === 'rel') expect(a.am).not.toContain(g);
        else expect(a.am, `${a.id} group ${g}`).toContain(g);
        if (k === 'art' || k === 'noun' || k === 'mid') expect(at[a.am.indexOf(g)], `${a.id} ${k}`).toBe(ut[a.um.indexOf(g)]);
      });
      const art = at[a.am.indexOf(a.kind.indexOf('art'))];
      expect(ut[a.um.indexOf(a.kind.indexOf('rel'))], a.id).toBe(art);
    }
  });
  it('lists the right answer first in the quiz', () => {
    for (const q of ATTR_QUIZ) expect(q.options[0]).toBe(q.answer);
  });
});

describe('nominal style', () => {
  it('maps spans to groups and explains every group', () => {
    for (const p of NOM_PAIRS) {
      expect(spanCount(p.verbal), p.id).toBe(p.vm.length);
      expect(spanCount(p.nominal), p.id).toBe(p.nm.length);
      expect(p.steps.length).toBe(p.kind.length);
      p.kind.forEach((_, g) => expect(p.vm, `${p.id} group ${g}`).toContain(g));
      for (const g of [...p.vm, ...p.nm]) expect(g).toBeLessThan(p.kind.length);
    }
  });
  it('has distinct Funktionsverbgefüge and verbs', () => {
    expect(new Set(FVGS.map((f) => f.fvg)).size).toBe(FVGS.length);
    expect(new Set(FVGS.map((f) => f.verb)).size).toBe(FVGS.length);
  });
});

describe('compound builder', () => {
  const article = (de: string) => de.split(' ')[0];
  it('spells each compound from its parts and takes the gender of the last part', () => {
    for (const c of COMPOUNDS) {
      const first = C_FIRST.find((p) => p.id === c.first);
      const last = C_LAST.find((p) => p.id === c.last);
      expect(first, c.de).toBeDefined();
      expect(last, c.de).toBeDefined();
      expect(c.de).toBe(`${article(last!.de)} ${c.first}${c.link}${c.last.toLowerCase()}`);
    }
  });
  it('builds the quiz words from their parts', () => {
    for (const q of C_QUIZ) {
      expect(q.parts.join('').toLowerCase()).toBe(q.word.toLowerCase());
      expect(q.head.split(' ')[1]!.toLowerCase()).toBe(q.parts.at(-1));
      expect(article(q.head)).toBe(q.answer);
      expect(q.de).toBe(`${q.answer} ${q.word}`);
    }
  });
  it('grows the long word one part at a time and ends masculine', () => {
    for (let i = 1; i < LONG_STEPS.length; i++) {
      const prev = unmark(LONG_STEPS[i - 1]!.de).split(' ')[1]!.toLowerCase();
      expect(unmark(LONG_STEPS[i]!.de).toLowerCase()).toContain(prev);
    }
    expect(unmark(LONG_STEPS.at(-1)!.de)).toBe('der Donaudampfschifffahrtsgesellschaftskapitän');
  });
});
