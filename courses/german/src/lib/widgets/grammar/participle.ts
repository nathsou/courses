/**
 * How a past participle is made: separable prefix, ge-, stem, ending. Works from the
 * infinitive and the participle (from the verb tables), so it explains any verb. Pure.
 */

export const SEPARABLE_PREFIXES = ['zurück', 'zusammen', 'weiter', 'vorbei', 'heraus', 'herein', 'fern', 'fest', 'nach', 'teil', 'statt', 'weg', 'los', 'mit', 'aus', 'auf', 'ein', 'bei', 'her', 'hin', 'vor', 'zu', 'ab', 'an', 'um'];
export const INSEPARABLE_PREFIXES = ['miss', 'emp', 'ent', 'zer', 'ver', 'be', 'er', 'ge'];

export type PPType = 'weak' | 'strong' | 'mixed';

export interface Participle {
  /** Separable prefix (an in an·ge·rufen), or "". */
  prefix: string;
  /** Whether ge- is added. */
  ge: boolean;
  stem: string;
  ending: string;
  type: PPType;
  /** Why there is no ge-. */
  noGe?: 'insep' | 'ieren';
  insepPrefix?: string;
  /** The infinitive's stem (without prefix), to show a vowel change. */
  infStem: string;
  changed: boolean;
}

/** Stems that need an extra e before -t: arbeit·et, öffn·et, rechn·et. */
export const needsE = (stem: string) => /[dt]$/.test(stem) || /[^aeiouäöülrhmn][mn]$/.test(stem);

/** The stem of an infinitive: machen → mach, wandern → wander, tun → tu. */
export const infinitiveStem = (inf: string) => (/e[lr]n$/.test(inf) ? inf.slice(0, -1) : inf.endsWith('en') ? inf.slice(0, -2) : inf.endsWith('n') ? inf.slice(0, -1) : inf);

export function analyse(inf: string, pp: string, sep?: string): Participle {
  const prefix =
    sep ??
    SEPARABLE_PREFIXES.find((p) => inf.startsWith(p) && inf.length > p.length + 3 && (pp.startsWith(`${p}ge`) || (pp.startsWith(p) && INSEPARABLE_PREFIXES.some((q) => inf.slice(p.length).startsWith(q))))) ??
    '';
  const base = inf.slice(prefix.length);
  const rest = pp.slice(prefix.length);
  const ge = rest.startsWith('ge') && !(base.startsWith('ge') && !rest.startsWith('geg'));
  const core = ge ? rest.slice(2) : rest;
  const infStem = infinitiveStem(base);
  let ending: string;
  if (core.endsWith('en')) ending = 'en';
  else if (core.endsWith('n')) ending = 'n';
  else if (core.endsWith('et') && needsE(core.slice(0, -2))) ending = 'et';
  else ending = 't';
  const stem = core.slice(0, core.length - ending.length);
  const strong = ending === 'en' || ending === 'n';
  const type: PPType = strong ? 'strong' : stem === infStem ? 'weak' : 'mixed';
  const out: Participle = { prefix, ge, stem, ending, type, infStem, changed: stem !== infStem };
  if (!ge) {
    if (base.endsWith('ieren')) out.noGe = 'ieren';
    else {
      out.noGe = 'insep';
      out.insepPrefix = INSEPARABLE_PREFIXES.find((p) => base.startsWith(p));
    }
  }
  return out;
}

/** One sentence on how the participle is made, with German in {braces}. */
export function participleRule(inf: string, pp: string, a: Participle = analyse(inf, pp)): string {
  const parts: string[] = [];
  if (a.noGe === 'ieren') parts.push(`No ge-: verbs in -ieren never take it, so it is just the stem + -t: {${pp}}.`);
  else if (a.noGe === 'insep') parts.push(`No ge-: {${inf}} starts with the unstressed prefix ${a.insepPrefix ?? ''}-, and such verbs never add ge-.`);
  if (a.prefix) parts.push(`Separable verb: ge- goes between the prefix and the stem, in one word: {${a.prefix}·${a.ge ? 'ge·' : ''}${a.stem}${a.ending}}.`);
  if (a.type === 'weak') parts.push(a.ending === 'et' ? `Regular: ${a.ge ? 'ge- + ' : ''}stem + -et (the extra e makes {${a.stem}} + t sayable).` : `Regular: ${a.ge ? 'ge- + ' : ''}stem + -t.`);
  else if (a.type === 'mixed') parts.push(`Mixed verb: the regular -t ending, but the stem changes: {${a.infStem}-} → {${a.stem}-}.`);
  else if (a.stem === `g${a.infStem}`) parts.push(`Irregular: an extra g slips in, {ge·g·${a.infStem}en}.`);
  else if (a.changed) parts.push(`Irregular (strong) verb: -${a.ending} instead of -t, and the vowel changes: {${a.infStem}-} → {${a.stem}-}. These have to be learnt.`);
  else parts.push(`Irregular (strong) verb: ${a.ge ? 'ge- + ' : ''}stem + -${a.ending}, and here the stem stays the same.`);
  return parts.join(' ');
}
