/**
 * Every piece of German the course can speak, keyed exactly as the player looks clips up
 * (src/lib/audio/clip.ts). Text generated on the fly (number and clock drills, conjugation
 * answers) is left to the browser's voice.
 */
import { allTexts } from '../german.ts';
import { clipKey } from '../../src/lib/audio/clip.ts';
import { allEntries, annotate, isGerman } from '$lib/de/lexicon';

export type Tier = 'words' | 'lessons' | 'extras';
export { clipKey };

const ORDER: Tier[] = ['words', 'lessons', 'extras'];

export async function collect(root: string): Promise<Map<string, Tier>> {
  const out = new Map<string, Tier>();
  const add = (text: string, tier: Tier) => {
    const k = clipKey(text);
    if (!k || !/\p{L}/u.test(k) || k.length > 600 || k.includes('___')) return;
    const prev = out.get(k);
    if (!prev || ORDER.indexOf(tier) < ORDER.indexOf(prev)) out.set(k, tier);
  };

  // 1. Word cards and the review deck speak every taught word with its article ("der Tisch").
  for (const [key, e] of allEntries()) if (e.l) add(key, 'words');

  // 2. Everything German in lessons, exams and data: whole strings, and each word (tapping a
  //    word in running text speaks it as written).
  for (const t of await allTexts(root)) {
    const german = t.whole ? isGerman(t.text) || t.tier === 'words' : true;
    if (!german) continue;
    add(t.text, t.tier === 'words' ? 'words' : t.tier);
    for (const tok of annotate(t.text)) if (tok.w) add(tok.t, 'words');
  }
  return out;
}
