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

/**
 * Every accepted form: the table's, plus the variant German allows for verbs in -ern and -eln in
 * the ich-form (ich wandere / wandre, ich sammle / sammele), with the commoner one first.
 */
export function conjugateAll(key: string, tense: Tense, person: number): string[] {
  const form = conjugate(key, tense, person);
  if (!form) return [];
  const m = /(e[rl])n$/.exec(key);
  if (!m || person !== 0 || (tense !== 'present' && tense !== 'konj1')) return [form];
  const [word, ...rest] = form.split(' ');
  const l = m[1]![1]!; // r or l
  const full = new RegExp(`e${l}e$`);
  const short = new RegExp(`${l}e$`);
  const stem = full.test(word!) ? word!.replace(full, '') : short.test(word!) ? word!.replace(short, '') : null;
  if (stem === null) return [form];
  const forms = [`${stem}e${l}e`, `${stem}${l}e`];
  if (l === 'l') forms.reverse();
  return forms.map((w) => [w, ...rest].join(' '));
}
