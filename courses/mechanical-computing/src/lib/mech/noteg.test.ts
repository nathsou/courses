import { expect, test } from 'vitest';
import { formatFixed, noteGTable, parseDeck, run } from './analytical';
import { NOTE_G, NOTE_G_PRINTED } from './noteg';

test('the corrected Note G deck computes B7 = −1/30', () => {
  const r = run(NOTE_G);
  expect(r.deck.errors).toEqual([]);
  const v = Number(formatFixed(r.store.get(24)!, 20).replace('−', '-'));
  expect(v).toBeCloseTo(-1 / 30, 15);
  expect(r.printed).toHaveLength(1);
});

test('as printed (operation 4 reversed) it does not', () => {
  const r = run(NOTE_G_PRINTED);
  const v = Number(formatFixed(r.store.get(24)!, 20).replace('−', '-'));
  expect(Math.abs(v - -1 / 30)).toBeGreaterThan(0.1);
  expect(v).toBeCloseTo(9 / 14 - (4 / 6 - 14 / 30 + 28 / 3 / 42), 10); // ½·(9/7) − (B1·A1 + B3·A3 + B5·A5)
});

test('the table has Lovelace’s 25 operations, with 13–23 written twice', () => {
  expect(noteGTable(parseDeck(NOTE_G))).toHaveLength(36);
});
