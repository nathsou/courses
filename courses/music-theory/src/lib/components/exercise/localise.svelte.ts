/**
 * Svelte action: fills the note-name and term placeholders that the compiler leaves in exercise prompts
 * (<span data-note="C4">, <span data-chord="Am">, <span data-word="crotchet" data-both>) with the reader's chosen names.
 */
import { noteName, pitchName } from '$lib/music/names';
import { parsePitch } from '$lib/music/pitch';
import { chordSymbol, parseChordSymbol } from '$lib/music/chord';
import { settings } from '$lib/state/settings.svelte';

export function localiseIn(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-note]')) {
    const n = el.dataset.note ?? '';
    try {
      const p = parsePitch(n);
      el.textContent = /\d$/.test(n) ? pitchName(p, settings.nameOptions) : noteName(p, settings.nameOptions);
    } catch {
      /* leave the author's text */
    }
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-chord]')) {
    try {
      el.textContent = chordSymbol(parseChordSymbol(el.dataset.chord ?? ''), settings.nameOptions);
    } catch {
      /* leave the author's text */
    }
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-word]')) el.textContent = settings.term(el.dataset.word ?? '', el.hasAttribute('data-both'));
}

export function localise(node: HTMLElement) {
  $effect(() => {
    void settings.noteNames;
    void settings.terms;
    void settings.accentedRe;
    localiseIn(node.closest('section') ?? node);
  });
}
