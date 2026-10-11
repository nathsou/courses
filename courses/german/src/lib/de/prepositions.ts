/**
 * Quiz helpers for the two-way prepositions: gapping the marked article(s) of a sentence and
 * reading the right answer back out.
 */
import { PREPOSITIONS, type Prep } from '$lib/widgets/data/prepositions';
import { shuffle } from '$lib/exercises/shuffle';

export type Case = 'wo' | 'wohin';

/** The marked spans, joined as the quiz options are: "dem … dem". */
export function answerOf(de: string): string {
  return [...de.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).join(' … ');
}

/** The sentence with each marked span as a gap: "Die Katze sitzt auf ___ Tisch." */
export function gapped(de: string): string {
  return de.replace(/\{[^{}]*\}/g, '___');
}

/** The sentence with the chosen answer filled in and marked. */
export function filled(de: string, answer: string): string {
  const parts = answer.split(' … ');
  let i = 0;
  return de.replace(/\{[^{}]*\}/g, () => `{${parts[i++] ?? ''}}`);
}

export interface PrepQuestion {
  prep: Prep;
  kase: Case;
}

/** A round: each preposition once, wo or wohin (or both, alternating) as the mode allows. */
export function prepRound(mode: 'wo' | 'wohin' | 'both', count: number, seed: number): PrepQuestion[] {
  const out: PrepQuestion[] = [];
  const preps = shuffle(PREPOSITIONS.map((p) => p.prep), seed);
  const cases = mode === 'both' ? shuffle(['wo', 'wohin', 'wo', 'wohin', 'wo', 'wohin', 'wo', 'wohin', 'wo', 'wohin'] as Case[], seed + 1) : [];
  for (let i = 0; out.length < count; i++) {
    out.push({ prep: preps[i % preps.length]!, kase: mode === 'both' ? cases[i % cases.length]! : mode });
  }
  return out;
}
