/**
 * The placement result: the level the learner starts at and the lessons whose points they
 * missed, which the course map highlights as "brush up". Stored in this browser only.
 */
import { browser } from '$app/environment';
import { readJSON, writeJSON } from './storage';
import type { Level } from '$lib/de/lexicon';

export interface PlacementResult {
  at: number;
  /** Right answers out of eight per level attempted. */
  scores: Partial<Record<Level, number>>;
  /** Lessons with a question answered wrongly (or "I don't know"). */
  missed: string[];
}

const KEY = 'german:placement';

class Placement {
  data: PlacementResult | null = $state(null);
  private loaded = false;

  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    this.data = readJSON<PlacementResult | null>(KEY, null);
  }

  save(r: PlacementResult): void {
    this.data = r;
    writeJSON(KEY, r);
  }
}

export const placement = new Placement();

export { startLevel } from './start';
