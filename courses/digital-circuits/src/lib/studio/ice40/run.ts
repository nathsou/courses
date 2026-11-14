/**
 * A design through synth's whole iCE40 flow, for a board: elaboration, synthesis, packing, placement,
 * routing, timing and the bitstream, with the placer's and router's traces when asked for.
 */
import type { RunResult, SourceFile, Synth } from '$lib/synth/api';
import { run } from '$lib/synth/api';
import { BOARDS, type Board } from './boards';

/** Where a design goes: a board, or a bare part and package whose pins the placer chooses. */
export type Target = Board | { id?: undefined; name: string; part: string; package: string; pcf: string; clockHz?: number; leds?: number };

export interface Implementation extends RunResult {
  target: Target;
}

export function targetOf(t: Board['id'] | Target | undefined): Target {
  if (t === undefined) return BOARDS['go-board'];
  return typeof t === 'string' ? BOARDS[t] : t;
}

export async function implement(
  synth: Synth,
  files: SourceFile[],
  opts: { target?: Board['id'] | Target; board?: Board['id']; top?: string; trace?: boolean; effort?: number; seed?: number; freq?: number } = {},
): Promise<Implementation> {
  const target = targetOf(opts.target ?? opts.board);
  const r = await run(synth, {
    files,
    top: opts.top,
    part: target.part,
    package: target.package,
    pins: target.pcf,
    clock_hz: target.clockHz,
    effort: opts.effort,
    seed: opts.seed,
    freq: opts.freq,
    ...(opts.trace ? { trace: true } : {}),
  } as Parameters<typeof run>[1]);
  return { ...r, target };
}
