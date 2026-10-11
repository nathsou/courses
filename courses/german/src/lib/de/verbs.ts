/** Full conjugation tables of the verbs the course teaches (from Wiktionary, via build-lexicon). */
import VERBS from '$content/data/verbs.json';

export interface VerbTable {
  /** Present, preterite, Konjunktiv II and Konjunktiv I, in the order of PERSONS. */
  pres: string[];
  pret: string[];
  k2: string[];
  k1: string[];
  /** Imperative du, ihr. */
  imp: [string, string];
  pp: string;
  aux: 'h' | 's' | 'hs';
}

export const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const;
export const PRONOUNS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const;

const TABLES = VERBS as unknown as Record<string, VerbTable>;

export function verbTable(key: string): VerbTable | undefined {
  return TABLES[key] ?? TABLES[key.replace(/^sich /, '')];
}

export function allVerbs(): string[] {
  return Object.keys(TABLES);
}

export type Tense = 'present' | 'preterite' | 'perfect' | 'konj2' | 'konj1' | 'imperative';

export const TENSE_NAMES: Record<Tense, string> = {
  present: 'present (Präsens)',
  preterite: 'simple past (Präteritum)',
  perfect: 'perfect (Perfekt)',
  konj2: 'Konjunktiv II',
  konj1: 'Konjunktiv I',
  imperative: 'imperative',
};

const HABEN = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
const SEIN = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
const REFL = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];

/**
 * The form a person takes in a tense, as a learner would type it after the pronoun:
 * conjugate('anrufen', 'present', 1) → "rufst an"; ('fahren', 'perfect', 0) → "bin gefahren".
 * Reflexive verbs include their pronoun: ('sich freuen', 'present', 0) → "freue mich".
 */
export function conjugate(key: string, tense: Tense, person: number): string | undefined {
  const t = verbTable(key);
  if (!t) return undefined;
  const refl = key.startsWith('sich ') ? REFL[person]! : '';
  const withRefl = (form: string) => {
    if (!refl) return form;
    const parts = form.split(' ');
    return [parts[0], refl, ...parts.slice(1)].join(' ');
  };
  switch (tense) {
    case 'present':
      return withRefl(t.pres[person]!);
    case 'preterite':
      return withRefl(t.pret[person]!);
    case 'konj2':
      return withRefl(t.k2[person]!);
    case 'konj1':
      return withRefl(t.k1[person]!);
    case 'perfect': {
      const aux = (t.aux === 's' ? SEIN : HABEN)[person]!;
      return [aux, refl, t.pp].filter(Boolean).join(' ');
    }
    case 'imperative': {
      // person 1 = du, 4 = ihr
      const form = person === 1 ? t.imp[0] : person === 4 ? t.imp[1] : undefined;
      return form ? withRefl(form) : undefined;
    }
  }
}
