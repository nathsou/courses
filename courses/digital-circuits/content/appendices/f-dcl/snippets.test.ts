import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkSnippet } from '$lib/weft/snippets-check';
import { SNIPPETS } from './widgets/snippets';

const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');

describe('the playground programs of Appendix F', () => {
  for (const [id, s] of Object.entries(SNIPPETS)) {
    it(`${id} is on the page and passes its tests`, async () => {
      expect(md).toContain(s.code);
      expect(md).toContain(`::snippet-playground{id="${id}"`);
      await checkSnippet(id, s);
    });
  }
});
