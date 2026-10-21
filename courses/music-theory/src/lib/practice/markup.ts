/** Renders the small markup in practice prompts (:n[C4], :c[Am], :t[crotchet], **bold**) with the reader's settings. */
import { chordSymbol, parseChordSymbol } from '$lib/music/chord';
import { noteName, pitchName, type NameOptions } from '$lib/music/names';
import { parsePitch } from '$lib/music/pitch';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function markup(text: string, names: NameOptions, term: (w: string) => string): string {
  return esc(text)
    .replace(/:n\[([^\]]+)\]/g, (_, n: string) => {
      try {
        const p = parsePitch(n);
        return `<span class="nm">${/\d$/.test(n) ? pitchName(p, names) : noteName(p, names)}</span>`;
      } catch {
        return n;
      }
    })
    .replace(/:c\[([^\]]+)\]/g, (_, c: string) => {
      try {
        return `<strong>${chordSymbol(parseChordSymbol(c), names)}</strong>`;
      } catch {
        return c;
      }
    })
    .replace(/:t\[([^\]]+)\]/g, (_, w: string) => term(w))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
