/**
 * How a character is built: its parts, which one carries the meaning and which the sound, and a
 * one-line origin. Generated from Make Me a Hanzi (scripts/build-components.ts).
 */
import COMPONENTS from '$content/data/components.json';
import { PART_NAMES } from '$content/data/characters';
import { lookup, charReading } from './lexicon';

type Kind = 'ideographic' | 'pictographic' | 'pictophonetic';
type Raw = { chars: Record<string, { k?: string; h?: string; p: [string, string][] }>; parts: Record<string, [string, string]> };
const DATA = COMPONENTS as unknown as Raw;

export interface Part {
  ch: string;
  /** 'meaning' and 'sound' for sound-and-meaning characters, otherwise null. */
  role: 'meaning' | 'sound' | null;
  py: string;
  gloss: string;
}

export interface Build {
  ch: string;
  kind: Kind | null;
  /** The origin in a sentence, for pictures and ideas. */
  hint: string | null;
  parts: Part[];
}

const firstSense = (g: string) => g.split(/[;,]/)[0]!.trim();

/** A part's pinyin and a short meaning: the course's own name, then the dictionary's. */
export function part(ch: string, role: Part['role'] = null): Part {
  const raw = DATA.parts[ch];
  const word = lookup(ch);
  const py = word?.p || raw?.[0] || charReading(ch) || '';
  const gloss = PART_NAMES[ch] ?? (raw?.[1] || (word ? firstSense(word.g) : ''));
  return { ch, role, py, gloss };
}

export function build(ch: string): Build | null {
  const raw = DATA.chars[ch];
  if (!raw) return null;
  const role = (r: string): Part['role'] => (r === 'm' ? 'meaning' : r === 's' ? 'sound' : null);
  return { ch, kind: (raw.k as Kind) ?? null, hint: raw.h ?? null, parts: raw.p.map(([c, r]) => part(c, role(r))) };
}

/** One line for a character: "饣 food (meaning) + 反 fǎn (sound)", or its origin. */
export function describe(b: Build): string {
  const parts = b.parts.map((p) => (p.role === 'sound' ? `${p.ch} ${p.py} (sound)` : `${p.ch} ${p.gloss}${p.role === 'meaning' ? ' (meaning)' : ''}`.trim()));
  if (b.kind === 'pictophonetic' && parts.length) return parts.join(' + ');
  if (b.hint) return b.hint;
  return parts.join(' + ');
}
