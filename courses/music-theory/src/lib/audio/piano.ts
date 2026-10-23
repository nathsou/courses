/**
 * The course piano: Salamander Grand Piano samples (static/piano/, CC BY 3.0) recorded every minor third
 * at two velocity layers. A note plays the nearest sample, resampled by at most a semitone and a half.
 * Samples load on first use; until they arrive, a short synthesised tone stands in so that nothing the
 * reader plays is silent.
 */
import { frequency } from '$lib/music/pitch';

const SAMPLED: number[] = [];
for (let m = 21; m <= 108; m += 3) SAMPLED.push(m);
const LAYERS = [6, 12] as const;
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const fileName = (m: number, layer: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}v${layer}.mp3`;

/** Nearest sampled note to a MIDI note. */
export function nearestSample(m: number): number {
  const clamped = Math.min(108, Math.max(21, m));
  return SAMPLED.reduce((best, s) => (Math.abs(s - clamped) < Math.abs(best - clamped) ? s : best), SAMPLED[0]!);
}

export interface Voice {
  /** Release the note (with the damper's short fade) at `when` (audio-context time; default now). */
  stop(when?: number): void;
}

export class Piano {
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | undefined>>();
  readonly output: GainNode;

  constructor(
    private ctx: AudioContext,
    private baseUrl: string,
  ) {
    this.output = ctx.createGain();
    this.output.gain.value = 0.8;
  }

  private load(m: number, layer: number): Promise<AudioBuffer | undefined> {
    const name = fileName(m, layer);
    let p = this.loading.get(name);
    if (!p) {
      p = fetch(`${this.baseUrl}/${name}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((b) => this.ctx.decodeAudioData(b))
        .then((buf) => {
          this.buffers.set(name, buf);
          return buf;
        })
        .catch(() => undefined);
      this.loading.set(name, p);
    }
    return p;
  }

  /** Fetch the samples for a range of notes ahead of time (both layers). */
  preload(lo = 21, hi = 108): Promise<unknown> {
    const wanted = new Set<number>();
    for (let m = lo; m <= hi; m++) wanted.add(nearestSample(m));
    return Promise.all([...wanted].flatMap((s) => LAYERS.map((l) => this.load(s, l))));
  }

  /** Start a note now or at `when`; velocity 1–127. */
  play(m: number, velocity = 80, when = this.ctx.currentTime, duration?: number): Voice {
    const sample = nearestSample(m);
    const layer = velocity < 72 ? LAYERS[0] : LAYERS[1];
    const buf = this.buffers.get(fileName(sample, layer)) ?? this.buffers.get(fileName(sample, layer === 6 ? 12 : 6));
    const gain = this.ctx.createGain();
    // Within a layer, loudness follows velocity on a gentle curve.
    const level = 0.25 + 0.75 * (velocity / 127) ** 1.5;
    gain.gain.setValueAtTime(level, when);
    gain.connect(this.output);
    let source: AudioScheduledSourceNode;
    if (buf) {
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      s.playbackRate.value = 2 ** ((m - sample) / 12);
      s.connect(gain);
      source = s;
    } else {
      // Fallback while the samples load (or if they cannot): a soft decaying tone.
      void this.load(sample, layer);
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = frequency(m);
      gain.gain.setValueAtTime(level * 0.35, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 1.5);
      o.connect(gain);
      source = o;
    }
    source.start(when);
    const stop = (at = this.ctx.currentTime) => {
      const t = Math.max(at, when);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.08);
      source.stop(t + 0.6);
    };
    if (duration !== undefined) stop(when + duration);
    else if (!buf) source.stop(when + 1.6);
    return { stop };
  }
}
