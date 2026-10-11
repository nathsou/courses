import { describe, expect, it } from 'vitest';
import { addWords, cardId, counts, dueQueue, emptyDeck, grade, Rating, revive } from './deck';

const t0 = new Date('2026-01-01T09:00:00Z');
const later = (min: number) => new Date(t0.getTime() + min * 60000);

describe('deck', () => {
  it('adds each word once as a reading card', () => {
    const d = emptyDeck();
    expect(addWords(d, ['der Tisch', 'gehen'], t0)).toBe(2);
    expect(addWords(d, ['der Tisch'], t0)).toBe(0);
    expect(Object.keys(d.cards)).toEqual([cardId('der Tisch', 'read'), cardId('gehen', 'read')]);
  });
  it('limits new cards per day', () => {
    const d = emptyDeck();
    addWords(d, ['eins', 'zwei', 'drei', 'vier'], t0);
    expect(dueQueue(d, t0, 3, 'day1')).toHaveLength(3);
    grade(d, d.cards[cardId('eins', 'read')]!, Rating.Good, t0, 'day1');
    expect(counts(d, t0, 3, 'day1').fresh).toBe(2);
  });
  it('unlocks listening and speaking cards once reading graduates', () => {
    const d = emptyDeck();
    addWords(d, ['gut'], t0);
    let now = t0;
    for (let i = 0; i < 6 && !d.cards[cardId('gut', 'hear')]; i++) {
      grade(d, d.cards[cardId('gut', 'read')]!, Rating.Good, now, 'day');
      now = new Date(d.cards[cardId('gut', 'read')]!.card.due);
    }
    expect(d.cards[cardId('gut', 'hear')]).toBeDefined();
    expect(d.cards[cardId('gut', 'say')]).toBeDefined();
  });
  it('survives a JSON round trip', () => {
    const d = emptyDeck();
    addWords(d, ['gut'], t0);
    grade(d, d.cards[cardId('gut', 'read')]!, Rating.Again, t0, 'day');
    const back = revive(JSON.parse(JSON.stringify(d)));
    expect(back.cards[cardId('gut', 'read')]!.card.due).toBeInstanceOf(Date);
    expect(dueQueue(back, later(30), 0, 'day')).toHaveLength(1);
  });
});
