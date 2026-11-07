import { createContext } from 'svelte';
import type { GlossaryEntry, Reference } from '$lib/content/types';

/** Per-page documentation compiled from the chapter's Markdown, provided by <PageDocs>. */
export interface PageDocs {
  references: Reference[];
  glossary: Record<string, GlossaryEntry>;
}

export const [getPageDocs, setPageDocs] = createContext<PageDocs>();

/** Like getPageDocs but tolerates components rendered outside a chapter. */
export function tryPageDocs(): PageDocs {
  try {
    return getPageDocs();
  } catch {
    return { references: [], glossary: {} };
  }
}
