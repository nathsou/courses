/**
 * Marking typed German. Punctuation and spacing never matter. Capital letters and umlauts do,
 * but a slip there is "almost": accepted, with the correct spelling shown. Endings are never
 * forgiven, because in German they are usually the point (schönen ≠ schöner).
 */

export type Verdict = 'right' | 'almost' | 'wrong';

export interface Marked {
  verdict: Verdict;
  /** The accepted answer closest to what was typed. */
  answer: string;
  note?: string;
}

/** Spacing, quotes and punctuation out; braces (inline markup) out. */
export function normalise(s: string): string {
  return s
    .replace(/[{}]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/[„“”"«»‚‘]/g, '')
    .replace(/[.!?,;:¿¡…–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ä → ae and friends, for answers typed on keyboards without umlauts. */
export function transliterate(s: string): string {
  return s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss');
}

export function mark(typed: string, accepted: string | string[], opts: { lenient?: boolean } = {}): Marked {
  const answers = (Array.isArray(accepted) ? accepted : [accepted]).map(String);
  const t = normalise(typed);
  const first = answers[0] ?? '';
  if (!t) return { verdict: 'wrong', answer: first };
  for (const a of answers) if (normalise(a) === t) return { verdict: 'right', answer: a };
  for (const a of answers) {
    const n = normalise(a);
    if (n.toLowerCase() === t.toLowerCase()) {
      return { verdict: 'almost', answer: a, note: capitalNote(t, n) };
    }
  }
  for (const a of answers) {
    const n = normalise(a);
    const tt = transliterate(t);
    const nn = transliterate(n);
    if (nn === tt || nn.toLowerCase() === tt.toLowerCase()) {
      if (opts.lenient && nn === tt) return { verdict: 'right', answer: a };
      return { verdict: 'almost', answer: a, note: /ß/.test(n) && !/ß/.test(t) ? 'Spelt with ß.' : 'Spelt with an umlaut.' };
    }
  }
  return { verdict: 'wrong', answer: first };
}

function capitalNote(typed: string, answer: string): string {
  const tw = typed.split(' ');
  const aw = answer.split(' ');
  const nounMissed = aw.some((w, i) => /^\p{Lu}/u.test(w) && i > 0 && tw[i] && /^\p{Ll}/u.test(tw[i]!));
  return nounMissed ? 'Capital letter: German nouns always start with one.' : 'Watch the capital letters.';
}

/** Split a gapped text into plain parts and gaps: "Ich [bin/war] müde" → ["Ich ", {gap}, " müde"]. */
export interface Gap {
  answers: string[];
  hint?: string;
}
export function parseCloze(text: string): (string | Gap)[] {
  const out: (string | Gap)[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\](?:\(([^)]*)\))?/g)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ answers: m[1]!.split('/').map((s) => s.trim()), ...(m[2] ? { hint: m[2] } : {}) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The text with every gap filled by its first answer. */
export function fillCloze(text: string): string {
  return parseCloze(text)
    .map((p) => (typeof p === 'string' ? p : p.answers[0]!))
    .join('');
}
