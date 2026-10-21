/**
 * The reader's instrument: Web MIDI input, the computer keyboard and the on-screen keyboard all feed
 * one stream of note events. Exercises and widgets subscribe to it; `held` is the set of keys down now.
 *
 * Event times are performance.now() milliseconds. Web MIDI stamps each message with the time it
 * arrived (MIDIMessageEvent.timeStamp, on the same clock), so a busy page does not delay it.
 */
import { browser } from '$app/environment';
import { audio } from '$lib/audio/engine.svelte';
import type { Voice } from '$lib/audio/piano';
import { settings } from '$lib/state/settings.svelte';
import { decodeMidi, KEY_LAYOUT } from './messages';

export { decodeMidi, KEY_LAYOUT };

export type NoteSource = 'midi' | 'screen' | 'keys';

export interface NoteEvent {
  midi: number;
  velocity: number;
  on: boolean;
  time: number;
  source: NoteSource;
}

export type MidiStatus = 'unsupported' | 'off' | 'asking' | 'denied' | 'no-device' | 'ready';

class Instrument {
  status: MidiStatus = $state(browser && 'requestMIDIAccess' in navigator ? 'off' : 'unsupported');
  inputs: { id: string; name: string }[] = $state([]);
  held: Set<number> = $state(new Set());
  sustain = $state(false);
  /** Base C of the computer keyboard's lower row (MIDI). */
  keysBase = $state(60);
  /** Last note event from any source, for status displays. */
  last: NoteEvent | undefined = $state(undefined);

  private listeners = new Set<(e: NoteEvent) => void>();
  private voices = new Map<number, Voice>();
  private sustained = new Set<number>();
  private access: MIDIAccess | undefined;

  subscribe(fn: (e: NoteEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Press or release a key. Sound comes from the course piano unless the note came from MIDI and echo is off. */
  note(midi: number, on: boolean, source: NoteSource, velocity = 80, time = performance.now()): void {
    if (on === this.held.has(midi) && on) return;
    const held = new Set(this.held);
    if (on) held.add(midi);
    else held.delete(midi);
    this.held = held;
    const sound = source !== 'midi' || settings.echoMidi;
    if (on) {
      if (sound) {
        this.voices.get(midi)?.stop();
        this.voices.set(midi, audio.noteOn(midi, velocity));
      } else audio.start();
      this.sustained.delete(midi);
    } else if (this.sustain) {
      this.sustained.add(midi);
    } else {
      this.voices.get(midi)?.stop();
      this.voices.delete(midi);
    }
    const e: NoteEvent = { midi, velocity, on, time, source };
    this.last = e;
    for (const fn of this.listeners) fn(e);
  }

  setSustain(down: boolean): void {
    this.sustain = down;
    if (!down) {
      for (const m of this.sustained) {
        this.voices.get(m)?.stop();
        this.voices.delete(m);
      }
      this.sustained.clear();
    }
  }

  /** Release everything (e.g. when the window loses focus while a key is down). */
  releaseAll(): void {
    for (const m of [...this.held]) this.note(m, false, 'keys');
    this.setSustain(false);
  }

  /** Ask the browser for MIDI access (shows its permission prompt in some browsers). */
  async connect(): Promise<void> {
    if (this.status === 'unsupported' || this.access) return;
    this.status = 'asking';
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      this.status = 'denied';
      return;
    }
    this.access.onstatechange = () => this.refresh();
    this.refresh();
  }

  /** Re-read the device list and (re)attach listeners to the chosen input, or to all of them. */
  refresh(): void {
    if (!this.access) return;
    const inputs = [...this.access.inputs.values()].filter((i) => i.state === 'connected');
    this.inputs = inputs.map((i) => ({ id: i.id, name: i.name ?? 'MIDI input' }));
    for (const input of this.access.inputs.values()) input.onmidimessage = null;
    const chosen = settings.midiInput && inputs.some((i) => i.id === settings.midiInput) ? inputs.filter((i) => i.id === settings.midiInput) : inputs;
    for (const input of chosen) input.onmidimessage = (e) => this.onMessage(e);
    this.status = inputs.length ? 'ready' : 'no-device';
  }

  selectInput(id: string | null): void {
    settings.midiInput = id;
    settings.save();
    this.refresh();
  }

  private onMessage(e: MIDIMessageEvent): void {
    if (!e.data) return;
    const msg = decodeMidi(e.data);
    if (!msg) return;
    if (msg.kind === 'sustain') this.setSustain(msg.down);
    else this.note(msg.note, msg.on, 'midi', msg.velocity || 64, e.timeStamp);
  }

  /** Install the computer-keyboard piano on the window. Returns a cleanup function. */
  mountKeys(): () => void {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (!settings.qwerty || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (e.code === 'KeyZ') {
        this.keysBase = Math.max(24, this.keysBase - 12);
        return;
      }
      if (e.code === 'KeyX') {
        this.keysBase = Math.min(96, this.keysBase + 12);
        return;
      }
      const offset = KEY_LAYOUT[e.code];
      if (offset === undefined) return;
      e.preventDefault();
      this.note(this.keysBase + offset, true, 'keys', 80, e.timeStamp);
    };
    const up = (e: KeyboardEvent) => {
      const offset = KEY_LAYOUT[e.code];
      if (offset === undefined) return;
      const m = this.keysBase + offset;
      if (this.held.has(m)) this.note(m, false, 'keys', 0, e.timeStamp);
    };
    const blur = () => this.releaseAll();
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', blur);
    return () => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
      removeEventListener('blur', blur);
    };
  }
}

export const instrument = new Instrument();
