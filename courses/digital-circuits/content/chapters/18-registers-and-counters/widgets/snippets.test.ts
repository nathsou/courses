import { describe, it } from 'vitest';
import { checkSnippet } from '$lib/weft/snippets-check';
import { SNIPPETS } from './snippets';

describe('the playground programs of Chapter 18', () => {
  for (const [id, s] of Object.entries(SNIPPETS)) it(id, () => checkSnippet(id, s));
});
