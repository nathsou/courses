/**
 * Derived views of a finished Mote run for the lifetime chart (PLAN §3, through-line 1).
 */
import type { ObjRecord, Vm } from '$lib/mm/mote/vm';

export interface Bar {
  id: number;
  type: string;
  line: number;
  born: number;
  lastUse: number;
  unreachable?: number;
  freed?: number;
  freedBy?: string;
  ghost?: number;
  /** Freed before its last use. */
  unsafe: boolean;
  /** Never freed and unreachable at exit. */
  leak: boolean;
  bytes: number;
}

export function bars(vm: Vm): Bar[] {
  return [...vm.objects.values()].map((o: ObjRecord) => ({
    id: o.id,
    type: vm.c.types[o.type]?.name ?? '?',
    line: o.bornPos.line,
    born: o.born,
    lastUse: o.lastUse,
    unreachable: o.unreachable,
    freed: o.freed,
    freedBy: o.freedBy,
    ghost: o.ghostFree,
    unsafe: o.freed !== undefined && o.lastUse > o.freed,
    leak: o.freed === undefined && vm.status === 'done' && o.unreachable !== undefined,
    bytes: o.words * 8,
  }));
}

/** Pick at most `n` bars, evenly through the run (always keeping unsafe ones). */
export function sample(all: Bar[], n: number): Bar[] {
  if (all.length <= n) return all;
  const keep = all.filter((b) => b.unsafe);
  const rest = all.filter((b) => !b.unsafe);
  const step = rest.length / Math.max(1, n - keep.length);
  const out = [...keep];
  for (let i = 0; out.length < n && i < rest.length; i += step) out.push(rest[Math.floor(i)]!);
  return out.sort((a, b) => a.born - b.born);
}

export interface Curves {
  t: number[];
  /** Bytes the manager still holds (allocated and not freed). */
  held: number[];
  /** Bytes in objects that will be used again (the liveness oracle). */
  live: number[];
  /** Bytes in reachable objects (the reachability oracle). */
  reachable: number[];
}

/** Bytes over time, at `points` sample times. */
export function curves(all: Bar[], end: number, points = 160): Curves {
  const t: number[] = [];
  const held: number[] = [];
  const live: number[] = [];
  const reachable: number[] = [];
  for (let k = 0; k <= points; k++) {
    const x = (end * k) / points;
    let h = 0,
      l = 0,
      r = 0;
    for (const b of all) {
      if (b.born > x) continue;
      if ((b.freed ?? Infinity) > x) h += b.bytes;
      if (b.lastUse >= x) l += b.bytes;
      if (Math.min(b.unreachable ?? Infinity, b.freed ?? Infinity) > x) r += b.bytes;
    }
    t.push(x);
    held.push(h);
    live.push(l);
    reachable.push(r);
  }
  return { t, held, live, reachable };
}

/** Average drag (freed − last use) over freed objects, and total for never-freed ones up to `end`. */
export function drag(all: Bar[], end: number): number {
  if (!all.length) return 0;
  return all.reduce((n, b) => n + Math.max(0, (b.freed ?? end) - b.lastUse), 0) / all.length;
}
