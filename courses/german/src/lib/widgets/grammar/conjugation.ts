/**
 * Conjugator logic: the regular pattern a verb would follow, so that the forms in the verb
 * tables that differ from it (vowel changes, irregular stems) can be highlighted. Pure.
 */
import type { VerbTable } from '$lib/de/verbs';
import { analyse, infinitiveStem, needsE } from './participle';

export interface Regular {
  pres: string[];
  pret: string[];
  k2: string[];
  k1: string[];
  /** Imperative du: either form is regular (mach / mache). */
  impDu: string[];
  impIhr: string;
  pp: string;
}

/** The separable prefix shown in a table ("rufe an" → "an"). */
export function separablePrefix(t: VerbTable): string {
  const parts = t.pres[0]!.split(' ');
  return parts.length > 1 ? parts[parts.length - 1]! : '';
}

/** Regular (weak) forms of an infinitive, without its separable prefix. */
export function regularForms(inf: string, prefix = '', pp?: string): Regular {
  const base = inf.slice(prefix.length);
  const stem = infinitiveStem(base);
  const elr = /e[lr]n$/.test(base);
  const e = !elr && needsE(stem);
  const sib = /(s|ß|x|z)$/.test(stem);
  const t = stem + (e ? 'et' : 't');
  const ich = elr && base.endsWith('eln') ? `${stem.slice(0, -2)}le` : `${stem}e`;
  const sep = (xs: string[]) => (prefix ? xs.map((x) => `${x} ${prefix}`) : xs);
  const pres = sep([ich, stem + (e ? 'est' : sib ? 't' : 'st'), t, base, t, base]);
  const pret = sep([`${t}e`, `${t}est`, `${t}e`, `${t}en`, `${t}et`, `${t}en`]);
  const k1 = sep([`${stem}e`, `${stem}est`, `${stem}e`, `${stem}en`, `${stem}et`, `${stem}en`]);
  const ge = pp ? analyse(inf, pp, prefix).ge : true;
  return {
    pres,
    pret,
    k2: pret,
    k1,
    impDu: sep([stem, `${stem}e`]),
    impIhr: pres[4]!,
    pp: `${prefix}${ge ? 'ge' : ''}${t}`,
  };
}

/** Split an irregular form around what differs from the regular one: f|ä|hrst. */
export function diff(actual: string, regular: string): [string, string, string] {
  if (actual === regular) return [actual, '', ''];
  let a = 0;
  while (a < actual.length && a < regular.length && actual[a] === regular[a]) a++;
  let b = 0;
  while (b < actual.length - a && b < regular.length - a && actual[actual.length - 1 - b] === regular[regular.length - 1 - b]) b++;
  // Only an ending missing (soll for *solle): nothing inside the word to mark.
  if (a + b >= actual.length) return [actual, '', ''];
  return [actual.slice(0, a), actual.slice(a, actual.length - b), actual.slice(actual.length - b)];
}

/**
 * Wiktionary sometimes gives a du-imperative without its -e where it is needed (arbeit, find,
 * wart): stems in -d/-t and the like take -e. A vowel change (tritt, lies) is left alone.
 */
export function fixImperative(inf: string, form: string, prefix = ''): string {
  if (!form) return form;
  const [first, ...rest] = form.split(' ');
  const stem = infinitiveStem(inf.slice(prefix.length));
  if (first === stem && needsE(stem)) return [`${first}e`, ...rest].join(' ');
  return form;
}

export interface Cell {
  form: string;
  /** Before, highlighted, after. */
  parts: [string, string, string];
  irregular: boolean;
}

export function cell(actual: string, regular: string | string[]): Cell {
  const regs = Array.isArray(regular) ? regular : [regular];
  if (!actual) return { form: '', parts: ['', '', ''], irregular: false };
  if (regs.includes(actual)) return { form: actual, parts: [actual, '', ''], irregular: false };
  const best = regs.map((r) => diff(actual, r)).sort((x, y) => x[1].length - y[1].length)[0]!;
  return { form: actual, parts: best, irregular: true };
}
