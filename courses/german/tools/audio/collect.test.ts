/**
 * Writes static/audio/texts.json (the list of clips to generate) when run with WRITE=1:
 *   npm run audio:texts
 * Otherwise just checks that collection works and matches the player's keys.
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { collect, clipKey } from './collect';

const root = join(__dirname, '../..');

describe('audio texts', async () => {
  const texts = await collect(root);
  it('normalises keys like the player', () => {
    expect(clipKey(' {Guten  Tag!} ')).toBe('Guten Tag!');
  });
  it('covers taught words with their article', () => {
    expect([...texts.keys()].some((k) => /^(der|die|das) /.test(k))).toBe(true);
  });
  it('writes the clip list', () => {
    if (!process.env.WRITE) return;
    const list = [...texts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([text, tier]) => ({ text, tier }));
    mkdirSync(join(root, 'static/audio'), { recursive: true });
    writeFileSync(join(root, 'static/audio/texts.json'), JSON.stringify(list, null, 0).replace(/\},\{/g, '},\n{') + '\n');
    const by = (t: string) => list.filter((x) => x.tier === t).length;
    console.log(`${list.length} clips: ${by('words')} words, ${by('lessons')} lesson texts, ${by('extras')} extras`);
  });
});
