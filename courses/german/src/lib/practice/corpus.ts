/**
 * Sentences for dictation and translation drills: every dialogue line in the lessons (German
 * with its English), tagged with the lesson and level it comes from.
 */
import { LESSONS, type Level } from '$content/outline';

export interface Sentence {
  de: string;
  en: string;
  slug: string;
  level: Level;
}

/** Parse ```dialogue blocks out of lesson Markdown. */
export function dialogueLines(markdown: string): { de: string; en: string }[] {
  const out: { de: string; en: string }[] = [];
  for (const block of markdown.matchAll(/```dialogue\n([\s\S]*?)```/g)) {
    for (const raw of block[1]!.split('\n')) {
      const m = /^([^:]+):\s*(.+?)\s+\|\s+(.+)$/.exec(raw.trim());
      if (!m || m[1] === 'title') continue;
      out.push({ de: m[2]!.trim(), en: m[3]!.trim() });
    }
  }
  return out;
}

export function buildCorpus(sources: Record<string, string>): Sentence[] {
  const out: Sentence[] = [];
  for (const l of LESSONS) {
    const src = sources[`/content/lessons/${l.slug}.md`];
    if (!src) continue;
    for (const s of dialogueLines(src)) out.push({ ...s, slug: l.slug, level: l.part.level });
  }
  return out;
}

/** Short, self-contained sentences make the best dictations: 3 to 12 words, one sentence. */
export function dictable(s: Sentence): boolean {
  const words = s.de.split(/\s+/).length;
  return words >= 3 && words <= 12 && !/[…]/.test(s.de) && (s.de.match(/[.!?]/g)?.length ?? 0) <= 1;
}
