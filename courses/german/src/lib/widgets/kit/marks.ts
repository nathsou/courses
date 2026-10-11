/**
 * Highlight markup for widget German: `Das ist der Mann, {den} ich kenne.` Braces mark the
 * spans a widget colours, in order (span 0, 1, …). The audio player and the clip collector both
 * strip braces, so a marked sentence and its plain form share one recording.
 */

export interface Seg {
  t: string;
  /** Span index, or -1 for unmarked text. */
  i: number;
}

export function segments(text: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  for (const part of text.split(/(\{[^{}]*\})/)) {
    if (!part) continue;
    if (part.startsWith('{') && part.endsWith('}')) out.push({ t: part.slice(1, -1), i: i++ });
    else out.push({ t: part, i: -1 });
  }
  return out;
}

/** The text without markup. */
export const unmark = (s: string) => s.replace(/[{}]/g, '');

/** How many marked spans a text has. */
export const spanCount = (s: string) => (s.match(/\{[^{}]*\}/g) ?? []).length;

/** The marked spans' texts, in order. */
export const spans = (s: string) => [...s.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]!);

/** Whether braces are balanced and never nested. */
export function wellFormed(s: string): boolean {
  let open = false;
  for (const ch of s) {
    if (ch === '{') {
      if (open) return false;
      open = true;
    } else if (ch === '}') {
      if (!open) return false;
      open = false;
    }
  }
  return !open;
}

export type Tone = 'accent' | 'jade' | 'gold' | 'blue' | 'red' | 'green' | 'purple' | 'mute';
