/**
 * The course's sound: one AudioContext, created on the first user gesture (browsers refuse to start
 * audio before one), the piano, a click for metronomes and timing exercises, and a scheduler for
 * playing sequences of notes on the audio clock.
 */
import { base } from '$app/paths';
import { Piano, type Voice } from './piano';

export interface ScheduledNote {
  midi: number;
  /** Start, in seconds from the beginning of the sequence. */
  time: number;
  /** Length in seconds. */
  duration: number;
  velocity?: number;
}

class AudioEngine {
  ctx: AudioContext | undefined;
  piano: Piano | undefined;
  private master: GainNode | undefined;
  /** True once the context is running (after a gesture). */
  ready = $state(false);
  /** Muted by the reader (the course still listens to MIDI input). */
  muted = $state(false);
  /** Notes currently sounding from a played sequence, for highlighting. */
  sounding: Set<number> = $state(new Set());
  private sequenceTimers: number[] = [];
  private sequenceVoices: Voice[] = [];

  /** Create or resume the context. Call from a click, key or MIDI handler. */
  start(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.piano = new Piano(this.ctx, `${base}/piano`);
      this.piano.output.connect(this.master);
      void this.piano.preload(36, 96);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().then(() => (this.ready = true));
    else this.ready = true;
    return this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  /** Play a note now (from the reader's keyboard); returns a handle to release it. */
  noteOn(m: number, velocity = 80): Voice {
    this.start();
    return this.piano!.play(m, velocity);
  }

  /** A metronome click at audio time `when`; accented on the first beat of a bar. */
  click(when?: number, accent = false): void {
    const ctx = this.start();
    const t = when ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.06);
  }

  /**
   * Play a sequence on the piano, starting shortly after now. Returns the audio time of the start and
   * a promise that resolves when the last note ends (or the sequence is stopped).
   */
  playSequence(notes: ScheduledNote[], onNote?: (n: ScheduledNote, on: boolean) => void): { start: number; done: Promise<void> } {
    this.stopSequence();
    const ctx = this.start();
    const start = ctx.currentTime + 0.12;
    const end = Math.max(0, ...notes.map((n) => n.time + n.duration));
    for (const n of notes) {
      this.sequenceVoices.push(this.piano!.play(n.midi, n.velocity ?? 80, start + n.time, n.duration));
      const delayOn = (start + n.time - ctx.currentTime) * 1000;
      const delayOff = (start + n.time + n.duration - ctx.currentTime) * 1000;
      this.sequenceTimers.push(
        window.setTimeout(() => {
          this.sounding = new Set(this.sounding).add(n.midi);
          onNote?.(n, true);
        }, delayOn),
        window.setTimeout(() => {
          const s = new Set(this.sounding);
          s.delete(n.midi);
          this.sounding = s;
          onNote?.(n, false);
        }, delayOff),
      );
    }
    const done = new Promise<void>((resolve) => {
      this.sequenceTimers.push(window.setTimeout(resolve, (start + end - ctx.currentTime) * 1000 + 50));
      this.resolveDone = resolve;
    });
    return { start, done };
  }

  private resolveDone: (() => void) | undefined;

  stopSequence(): void {
    for (const t of this.sequenceTimers) clearTimeout(t);
    for (const v of this.sequenceVoices) v.stop();
    this.sequenceTimers = [];
    this.sequenceVoices = [];
    this.sounding = new Set();
    this.resolveDone?.();
    this.resolveDone = undefined;
  }
}

export const audio = new AudioEngine();
