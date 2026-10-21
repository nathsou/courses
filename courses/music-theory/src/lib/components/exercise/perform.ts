/**
 * Checking for the `perform` exercise: the reader plays a score (or taps its rhythm). Pure functions, tested
 * in perform.test.ts; PerformExercise.svelte handles the clock, the clicks and the display.
 */
import { midi } from '$lib/music/pitch';
import { ticks } from '$lib/music/rhythm';
import { parseScore, secondsPerTick, voiceCount, voiceEvents, type Score } from '$lib/notation/parse';

/** One moment where something new must be played. */
export interface Onset {
  /** Seconds from the first downbeat (the upbeat, if any, starts at a negative time). */
  time: number;
  /** MIDI notes that start here. */
  pitches: number[];
  /** Score events that start here (for highlighting). */
  ids: number[];
}

/** Onsets of a score: every note start except notes tied over from the previous note. */
export function onsetsOf(score: Score, tempo?: number): Onset[] {
  const spt = tempo ? (secondsPerTick(score) * score.tempo) / tempo : secondsPerTick(score);
  const byTick = new Map<number, Onset>();
  for (const staff of score.staves) {
    for (let v = 0; v < voiceCount(staff); v++) {
      const evs = voiceEvents(staff, v);
      evs.forEach((ev, i) => {
        if (ev.kind !== 'note') return;
        const prev = evs[i - 1];
        const fresh = ev.pitches.map(midi).filter((m) => !(prev?.tie && prev.pitches.some((q) => midi(q) === m)));
        if (!fresh.length) return;
        const o = byTick.get(ev.start) ?? { time: ev.start * spt, pitches: [], ids: [] };
        o.pitches.push(...fresh.filter((m) => !o.pitches.includes(m)));
        o.ids.push(ev.id);
        byTick.set(ev.start, o);
      });
    }
  }
  return [...byTick.entries()].sort((a, b) => a[0] - b[0]).map(([, o]) => ({ ...o, pitches: o.pitches.sort((a, b) => a - b) }));
}

export interface Press {
  midi: number;
  /** Seconds from the first downbeat, after latency correction. */
  time: number;
}

export type OnsetVerdict = 'ok' | 'early' | 'late' | 'wrong' | 'missed';

export interface TimedResult {
  verdicts: { verdict: OnsetVerdict; offsetMs?: number }[];
  /** Presses that matched no onset. */
  extra: Press[];
  passed: boolean;
}

/**
 * Match presses to onsets in time. Each onset takes the presses within `windowMs` of it (a chord's notes
 * arrive a few milliseconds apart). An onset is `ok` if its first press is within `toleranceMs` and, when
 * pitches count, the presses are exactly its notes.
 */
export function judgeTimed(onsets: Onset[], presses: Press[], opts: { toleranceMs: number; pitches: boolean; windowMs?: number }): TimedResult {
  const windowMs = opts.windowMs ?? Math.max(opts.toleranceMs * 2, 180);
  const used = new Set<number>();
  const verdicts = onsets.map((o) => {
    const near = presses
      .map((p, i) => ({ p, i, d: (p.time - o.time) * 1000 }))
      .filter((x) => !used.has(x.i) && Math.abs(x.d) <= windowMs)
      .sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
    if (!near.length) return { verdict: 'missed' as const };
    let take = near;
    if (!opts.pitches) take = [near[0]!];
    else {
      // The chord is the presses that land close to the nearest one.
      const t0 = near[0]!.p.time;
      take = near.filter((x) => Math.abs(x.p.time - t0) * 1000 <= 90);
    }
    for (const x of take) used.add(x.i);
    const first = Math.min(...take.map((x) => x.d));
    const offsetMs = Math.round(take.length === 1 ? take[0]!.d : first);
    if (opts.pitches) {
      const got = [...new Set(take.map((x) => x.p.midi))].sort((a, b) => a - b);
      if (got.length !== o.pitches.length || got.some((m, i) => m !== o.pitches[i])) return { verdict: 'wrong' as const, offsetMs };
    }
    if (offsetMs < -opts.toleranceMs) return { verdict: 'early' as const, offsetMs };
    if (offsetMs > opts.toleranceMs) return { verdict: 'late' as const, offsetMs };
    return { verdict: 'ok' as const, offsetMs };
  });
  const extra = presses.filter((_, i) => !used.has(i));
  return { verdicts, extra, passed: verdicts.every((v) => v.verdict === 'ok') && extra.length === 0 };
}

/** Untimed: does a chord (the keys held together) match the onset? */
export function matchesOnset(held: number[], o: Onset): boolean {
  const got = [...new Set(held)].sort((a, b) => a - b);
  return got.length === o.pitches.length && got.every((m, i) => m === o.pitches[i]);
}

export function parseForPerform(src: string): Score {
  return parseScore(src);
}

/** Length of the piece in seconds from the first downbeat (for when to stop listening). */
export function endTime(score: Score, tempo?: number): number {
  const spt = tempo ? (secondsPerTick(score) * score.tempo) / tempo : secondsPerTick(score);
  return (score.length - score.partial) * spt;
}

export { ticks };
