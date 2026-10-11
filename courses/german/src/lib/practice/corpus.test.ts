import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCorpus, dialogueLines, dictable } from './corpus';

describe('corpus', () => {
  it('reads dialogue lines with their English', () => {
    const md = '```dialogue\ntitle: Hi\nJonas: Hast du Geschwister? | Do you have siblings?\nAylin: Ja. | Yes.\n```';
    expect(dialogueLines(md)).toEqual([
      { de: 'Hast du Geschwister?', en: 'Do you have siblings?' },
      { de: 'Ja.', en: 'Yes.' },
    ]);
  });
  it('builds a corpus from the lessons', () => {
    const src = readFileSync(join(__dirname, '../../../content/lessons/04-familie.md'), 'utf8');
    const c = buildCorpus({ '/content/lessons/04-familie.md': src });
    expect(c.length).toBeGreaterThan(3);
    expect(c[0]!.level).toBe('A1');
    expect(c.filter(dictable).length).toBeGreaterThan(0);
  });
});
