/** Shapes shared by the markdown compiler (build time) and the site (run time). */
import type { Component } from 'svelte';

/** What a compiled .md file exports. */
export interface ContentModule {
  default: Component;
  metadata: ChapterMetadata;
  toc: TocEntry[];
  references: Reference[];
  glossary: Record<string, GlossaryEntry>;
}

export interface ChapterMetadata {
  /** URL slug, e.g. "text-as-data". */
  slug: string;
  title: string;
  /** Short subtitle shown under the title and on cards. */
  summary: string;
  /** Chapter number ("1") or appendix letter ("A"). */
  number: string;
  kind: 'chapter' | 'appendix';
  /** Estimated reading + lab time. */
  duration?: string;
  /** Slugs of chapters/appendices assumed. */
  prerequisites?: string[];
  /** Skills the chapter adds to the practice room (shown as chips). */
  skills?: string[];
}

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface Reference {
  key: string;
  authors: string;
  year: number | string;
  title: string;
  venue?: string;
  url?: string;
  note?: string;
}

export interface GlossaryEntry {
  term: string;
  /** HTML definition. */
  definition: string;
  /** Slug of the chapter that introduces it. */
  chapter?: string;
}

export interface QuizOption {
  text: string;
  correct?: boolean;
  why?: string;
}

export interface QuizData {
  question: string;
  options: QuizOption[];
}
