/** How much of each level's vocabulary the learner has in their deck, and how much is learned. */
import { State } from 'ts-fsrs';
import { taught, LEVELS, type Level } from '$lib/de/lexicon';
import type { DeckData } from './deck';

export interface LevelStat {
  level: Level;
  total: number;
  inDeck: number;
  known: number;
}

export function levelStats(deck: DeckData, levels: Level[] = LEVELS): LevelStat[] {
  const status = new Map<string, 'deck' | 'known'>();
  for (const c of Object.values(deck.cards)) {
    if (c.kind !== 'read') continue;
    status.set(c.word, c.card.state === State.Review ? 'known' : 'deck');
  }
  return levels.map((level) => {
    const ws = taught(level).map(([k]) => k);
    return {
      level,
      total: ws.length,
      inDeck: ws.filter((w) => status.has(w)).length,
      known: ws.filter((w) => status.get(w) === 'known').length,
    };
  });
}
