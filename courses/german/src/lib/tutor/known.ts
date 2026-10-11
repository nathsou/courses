/** What the learner knows, for keeping the AI partner's German at the right level. */
import { annotate, entryFor, LEVELS, type Level } from '$lib/de/lexicon';
import type { StartPoint } from '$lib/state/settings.svelte';

export function levelLabel(start: StartPoint | null): string {
  switch (start) {
    case 'b2':
      return 'B2: an independent speaker refining accuracy and style';
    case 'b1':
      return 'B1: can handle everyday situations, working towards B2';
    case 'a2':
      return 'A2: knows the basics and the perfect tense, working towards B1';
    case 'a1':
      return 'A1: a returner who knows some basics, working through A1';
    default:
      return 'complete beginner, a few weeks in';
  }
}

/** The highest level whose words the learner can be expected to know. */
export function maxLevel(start: StartPoint | null): Level {
  return start === 'b2' ? 'B2' : start === 'b1' ? 'B1' : start === 'a2' ? 'A2' : 'A1';
}

/**
 * Content words in `text` that the learner has not met: taught above their level, or not taught
 * at all, and not in their deck.
 */
export function unfamiliar(text: string, known: Set<string>, start: StartPoint | null): string[] {
  const max = LEVELS.indexOf(maxLevel(start));
  const out = new Set<string>();
  for (const t of annotate(text)) {
    const e = entryFor(t);
    if (!e) continue;
    const [key, entry] = e;
    if (known.has(key) || entry.p === 'x') continue;
    if (entry.l && LEVELS.indexOf(entry.l) <= max) continue;
    out.add(key);
  }
  return [...out];
}
