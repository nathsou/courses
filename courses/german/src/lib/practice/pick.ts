/** Random choices for the practice games, with an injectable random source for tests. */
import { LEVELS, type Level } from '$lib/de/lexicon';

export type Rand = () => number;

export function pickOne<T>(xs: readonly T[], rand: Rand = Math.random): T {
  return xs[Math.floor(rand() * xs.length)]!;
}

/** Levels up to and including `max`. */
export function upTo(max: Level): Level[] {
  return LEVELS.slice(0, LEVELS.indexOf(max) + 1);
}

/** n distinct items (or all of them if there are fewer). */
export function sample<T>(xs: readonly T[], n: number, rand: Rand = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}
