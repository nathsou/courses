/**
 * Checking a typed answer: a number (with an optional tolerance, ignoring spaces, commas and a trailing
 * unit) or a word (case and spacing ignored, any of several accepted forms).
 */
export interface AnswerSpec {
  id: string;
  title?: string;
  prompt?: string;
  /** The expected answer: a number, a string, or a list of accepted strings. */
  answer: number | string | (number | string)[];
  /** Absolute tolerance for numbers. */
  tolerance?: number;
  /** Shown after the input (e.g. "turns"). */
  unit?: string;
  placeholder?: string;
  /** Rendered after a checked answer: why it is so. */
  why?: string;
  hints?: string[];
  solution?: string;
  /** Feedback for particular wrong answers: value → message. */
  feedback?: Record<string, string>;
}

export function parseNumber(s: string): number | null {
  const t = s.trim().replace(/[\s,_  ]/g, '').replace(/−/g, '-').replace(/[a-z%°]+$/i, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) {
    const frac = /^([-+]?\d+)\/(\d+)$/.exec(t);
    if (frac) return Number(frac[1]) / Number(frac[2]);
    return null;
  }
  return Number(t);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[’']/g, "'");

export type Verdict = { ok: true } | { ok: false; message?: string };

export function checkAnswer(spec: Pick<AnswerSpec, 'answer' | 'tolerance' | 'feedback'>, input: string): Verdict {
  const accepted = Array.isArray(spec.answer) ? spec.answer : [spec.answer];
  const n = parseNumber(input);
  for (const a of accepted) {
    if (typeof a === 'number') {
      if (n !== null && Math.abs(n - a) <= (spec.tolerance ?? 1e-9 * Math.max(1, Math.abs(a)))) return { ok: true };
    } else if (norm(a) === norm(input)) return { ok: true };
    else {
      const an = parseNumber(a);
      if (an !== null && n !== null && Math.abs(n - an) <= (spec.tolerance ?? 1e-9)) return { ok: true };
    }
  }
  const fb = spec.feedback?.[input.trim()] ?? (n !== null ? spec.feedback?.[String(n)] : undefined);
  return { ok: false, message: fb };
}
