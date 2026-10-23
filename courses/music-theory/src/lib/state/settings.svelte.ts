/**
 * Reader settings, kept in this browser's localStorage. On the first visit, note names and terms come
 * from the browser's languages (src/lib/settings/locale.ts); once the reader changes one, it is kept.
 */
import { browser } from '$app/environment';
import type { NameOptions, NoteNameSystem } from '$lib/music/names';
import { defaultsForLocale, term as translate, type TermSet } from '$lib/settings/locale';

const KEY = 'music-theory:settings';

interface Stored {
  noteNames: NoteNameSystem;
  accentedRe: boolean;
  terms: TermSet;
  /** True once the reader has chosen names or terms themselves. */
  chosen: boolean;
  /** Play the computer keyboard (A W S E D …) as a piano. */
  qwerty: boolean;
  /** Also sound MIDI input through the course piano (off: the reader's instrument makes its own sound). */
  echoMidi: boolean;
  /** Measured round trip from the course's sound to a key press arriving, in ms (from the tap-along). */
  latencyMs: number;
  /** Chosen MIDI input id, or null for every connected input. */
  midiInput: string | null;
  /** Write note names under the notes of every score. */
  scoreNames: boolean;
  /** Show a piano keyboard under every score, lighting the notes as they play or are pointed at. */
  scoreKeys: boolean;
}

class Settings {
  noteNames: NoteNameSystem = $state('letters');
  accentedRe = $state(false);
  terms: TermSet = $state('american');
  chosen = $state(false);
  qwerty = $state(true);
  echoMidi = $state(false);
  latencyMs = $state(0);
  midiInput: string | null = $state(null);
  scoreNames = $state(false);
  scoreKeys = $state(false);
  /** Language tag the defaults came from (shown once under the header). */
  derivedFrom: string | undefined = $state(undefined);
  loaded = $state(false);

  load(): void {
    if (this.loaded || !browser) return;
    let stored: Partial<Stored> = {};
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Stored>;
    } catch {
      /* storage unavailable or corrupt: use defaults */
    }
    const d = defaultsForLocale(navigator.languages ?? [navigator.language]);
    if (stored.chosen) {
      this.noteNames = stored.noteNames ?? d.noteNames;
      this.accentedRe = stored.accentedRe ?? d.accentedRe;
      this.terms = stored.terms ?? d.terms;
      this.chosen = true;
    } else {
      this.noteNames = d.noteNames;
      this.accentedRe = d.accentedRe;
      this.terms = d.terms;
      this.derivedFrom = d.from;
    }
    this.qwerty = stored.qwerty ?? true;
    this.echoMidi = stored.echoMidi ?? false;
    this.latencyMs = stored.latencyMs ?? 0;
    this.midiInput = stored.midiInput ?? null;
    this.scoreNames = stored.scoreNames ?? false;
    this.scoreKeys = stored.scoreKeys ?? false;
    this.loaded = true;
  }

  save(): void {
    if (!browser) return;
    const s: Stored = {
      noteNames: this.noteNames,
      accentedRe: this.accentedRe,
      terms: this.terms,
      chosen: this.chosen,
      qwerty: this.qwerty,
      echoMidi: this.echoMidi,
      latencyMs: this.latencyMs,
      midiInput: this.midiInput,
      scoreNames: this.scoreNames,
      scoreKeys: this.scoreKeys,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* not remembered */
    }
  }

  setNames(system: NoteNameSystem): void {
    this.noteNames = system;
    this.chosen = true;
    this.save();
  }

  setTerms(set: TermSet): void {
    this.terms = set;
    this.chosen = true;
    this.save();
  }

  /** Options for $lib/music/names. */
  get nameOptions(): NameOptions {
    return { system: this.noteNames, accentedRe: this.accentedRe };
  }

  term(word: string, both = false): string {
    return translate(word, this.terms, both);
  }
}

export const settings = new Settings();
