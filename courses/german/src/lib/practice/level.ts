import type { Level } from '$lib/de/lexicon';
import type { StartPoint } from '$lib/state/settings.svelte';

/** The default level for practice: where the learner started (beginners and A1 returners: A1). */
export function defaultLevel(start: StartPoint | null): Level {
  return start === 'b2' ? 'B2' : start === 'b1' ? 'B1' : start === 'a2' ? 'A2' : 'A1';
}
