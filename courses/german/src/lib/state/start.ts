import type { Level } from '$lib/de/lexicon';

/** The level to start at: the first level with fewer than six of its eight placement questions right. */
export function startLevel(scores: Partial<Record<Level, number>>, levels: Level[]): Level | 'done' {
  for (const l of levels) if ((scores[l] ?? 0) < 6) return l;
  return 'done';
}
