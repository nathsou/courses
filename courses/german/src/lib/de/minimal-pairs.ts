/**
 * Listening quizzes on minimal pairs (Mutter / Mütter): which of the two did you hear?
 */
import { shuffle, rng } from '$lib/exercises/shuffle';

export interface PairQuestion<T> {
  a: T;
  b: T;
  /** Which one is spoken. */
  answer: 'a' | 'b';
}

/**
 * `count` questions from the pairs: every pair once before any repeats, in a shuffled order,
 * the spoken word chosen at random, and the two buttons in random order (so the answer is not
 * always on the left).
 */
export function pairQuiz<T>(pairs: { a: T; b: T }[], count: number, seed: number): PairQuestion<T>[] {
  if (!pairs.length) return [];
  const r = rng(seed);
  const out: PairQuestion<T>[] = [];
  let round = 0;
  while (out.length < count) {
    for (const p of shuffle(pairs, seed + round++)) {
      if (out.length >= count) break;
      const flip = r() < 0.5;
      out.push({ a: flip ? p.b : p.a, b: flip ? p.a : p.b, answer: r() < 0.5 ? 'a' : 'b' });
    }
  }
  return out;
}
