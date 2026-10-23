/** Checking for the `analyse` exercise: Roman numerals typed under a score. Pure. */

/**
 * Normalise a typed numeral so that common ways of writing it compare equal:
 * "viio" / "vii0" → "vii°", "viiø7" / "vii/o7" → "viiø7", "V6/5" → "V65", "bVII" → "♭VII", spaces dropped.
 * Case is kept: "ii" and "II" are different chords.
 */
export function normaliseNumeral(s: string): string {
  let t = s.trim().replace(/\s+/g, '');
  t = t.replace(/^b(?=[IViv])/, '♭').replace(/^#(?=[IViv])/, '♯');
  t = t.replace(/\/o|ø|h(?=7)/g, 'ø').replace(/(?<=[IViv])(o|0|º)/g, '°');
  t = t.replace(/6\/5/g, '65').replace(/4\/3/g, '43').replace(/4\/2/g, '42').replace(/6\/4/g, '64').replace(/^(.*[IViv°ø+])2$/, '$142');
  return t;
}

/** Whether an answer matches one of the accepted numerals ("V|V7"). */
export function numeralMatches(answer: string, accepted: string): boolean {
  const a = normaliseNumeral(answer);
  return accepted.split('|').some((x) => normaliseNumeral(x) === a);
}
