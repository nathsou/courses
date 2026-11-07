/** Long decks referred to by name from chapters (`deckFrom` in a cards exercise, `::named-deck{name=…}`). */
import { NOTE_G, NOTE_G_PRINTED } from './noteg';

export const DECKS: Record<string, string> = {
  'note-g': NOTE_G,
  'note-g-printed': NOTE_G_PRINTED,
};
