/**
 * German number words, 0 to 999 999 999, written as Duden writes them: one word below a million
 * (vierundzwanzig, zweitausenddreihundert), separate words for Millionen (zwei Millionen
 * dreihunderttausend).
 *
 * `numberParts` gives the pieces in spoken order, so a widget can colour them: units before tens
 * (vier·und·zwanzig), then the multipliers hundert, tausend, Million.
 */

export type PartKind = 'digit' | 'ten' | 'und' | 'hundred' | 'thousand' | 'million';

export interface NumberPart {
  text: string;
  kind: PartKind;
  /** The value this piece stands for (vier → 4, zwanzig → 20, hundert → 100), for annotations. */
  value: number;
}

export interface NumberOptions {
  /** Say "einhundert", "eintausend" (default) or just "hundert", "tausend" at the start. Both are correct. */
  ein?: boolean;
}

const UNITS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

export const MAX_NUMBER = 999_999_999;

/** 1 is "eins" on its own and at the end (hunderteins), "ein" inside a word (einundzwanzig, einhundert). */
function unit(n: number, final: boolean): string {
  return n === 1 && !final ? 'ein' : UNITS[n]!;
}

/** 1–99. `final` is true when nothing follows in the same word. */
function below100(n: number, final: boolean): NumberPart[] {
  if (n < 10) return [{ text: unit(n, final), kind: 'digit', value: n }];
  if (n < 20) return [{ text: TEENS[n - 10]!, kind: 'digit', value: n }];
  const t = Math.floor(n / 10);
  const u = n % 10;
  const ten: NumberPart = { text: TENS[t]!, kind: 'ten', value: t * 10 };
  if (!u) return [ten];
  return [{ text: unit(u, false), kind: 'digit', value: u }, { text: 'und', kind: 'und', value: 0 }, ten];
}

/** 1–999. */
function below1000(n: number, final: boolean, ein: boolean): NumberPart[] {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const out: NumberPart[] = [];
  if (h) {
    if (h > 1 || ein) out.push({ text: unit(h, false), kind: 'digit', value: h });
    out.push({ text: 'hundert', kind: 'hundred', value: 100 });
  }
  if (rest) out.push(...below100(rest, final));
  return out;
}

/** 1–999 999, one word. `final` is false when a word like "Millionen" follows (einhunderteine Million). */
function below1e6(n: number, ein: boolean, final = true): NumberPart[] {
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  const out: NumberPart[] = [];
  if (th) {
    if (th > 1 || ein) out.push(...below1000(th, false, ein));
    out.push({ text: 'tausend', kind: 'thousand', value: 1000 });
  }
  // Only a leading hundert may drop its ein: tausendeinhundert, not tausendhundert.
  if (rest) out.push(...below1000(rest, final, ein || th > 0));
  return out;
}

/**
 * The parts of a number word in order. Words are joined without a space, except around
 * Million/Millionen, which are separate words: a part with kind "million" and the parts after it
 * start new words (see `numberWord`).
 */
export function numberParts(n: number, opts: NumberOptions = {}): NumberPart[] {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NUMBER) throw new RangeError(`No German number word for ${n}`);
  const ein = opts.ein ?? true;
  if (n === 0) return [{ text: 'null', kind: 'digit', value: 0 }];
  const m = Math.floor(n / 1e6);
  const rest = n % 1e6;
  const out: NumberPart[] = [];
  if (m) {
    const parts = below1e6(m, ein, false);
    // Before the feminine noun Million a final "ein" agrees and the noun stays singular:
    // eine Million, einhunderteine Million (but einundzwanzig Millionen).
    const last = parts[parts.length - 1]!;
    const singular = last.text === 'ein';
    if (singular) last.text = 'eine';
    out.push(...parts, { text: singular ? 'Million' : 'Millionen', kind: 'million', value: 1e6 });
  }
  if (rest) out.push(...below1e6(rest, ein || m > 0));
  return out;
}

/** Group parts into written words: everything below a million is one word. */
export function numberWords(n: number, opts: NumberOptions = {}): NumberPart[][] {
  const words: NumberPart[][] = [];
  let cur: NumberPart[] = [];
  for (const p of numberParts(n, opts)) {
    if (p.kind === 'million') {
      if (cur.length) words.push(cur);
      words.push([p]);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length) words.push(cur);
  return words;
}

/** The number in words: 24 → "vierundzwanzig", 2 000 001 → "zwei Millionen eins". */
export function numberWord(n: number, opts: NumberOptions = {}): string {
  return numberWords(n, opts)
    .map((w) => w.map((p) => p.text).join(''))
    .join(' ');
}

/** Digits grouped the German way: 1234567 → "1.234.567" (four-digit numbers too: 1.000). */
export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Read a typed number: "1.000", "1 000", "1000" all give 1000; anything else NaN. */
export function parseDigits(s: string): number {
  const t = s.replace(/[\s.,'’ ]/g, '');
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

/**
 * A random number for a listening drill, up to `max`. Spreads the sizes out so that a drill up
 * to a million is not all six-digit numbers, and favours the tricky teens and -und- numbers.
 */
export function drillNumber(max: number, r: () => number): number {
  const pick = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const bands: [number, number][] = [
    [13, 19],
    [21, 99],
    [21, 99],
    [101, 999],
    [1001, 9999],
    [10_001, 99_999],
    [100_001, 999_999],
  ];
  const usable = bands.filter(([lo]) => lo <= max);
  const [lo, hi] = usable[Math.floor(r() * usable.length)]!;
  return pick(lo, Math.min(hi, max));
}
