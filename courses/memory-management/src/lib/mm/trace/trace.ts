/**
 * Allocation traces: sequences of malloc, free and realloc requests, identified by block ids. Every allocator
 * in the course replays the same traces, so comparisons are fair (PLAN §9). Generators are seeded.
 */
import { rng, randInt, pick } from '../util/random';

export type Op = { op: 'a'; id: number; size: number } | { op: 'f'; id: number } | { op: 'r'; id: number; size: number };

export interface AllocTrace {
  id: string;
  name: string;
  description: string;
  /** Where the trace comes from, and what was simplified. */
  provenance: string;
  ops: Op[];
}

/** Text form, one op per line: "a 3 24", "f 3", "r 3 48". */
export function parseTrace(text: string): Op[] {
  const ops: Op[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [k, a, b] = line.split(/\s+/);
    if (k === 'a' || k === 'r') ops.push({ op: k, id: Number(a), size: Number(b) });
    else if (k === 'f') ops.push({ op: 'f', id: Number(a) });
    else throw new Error(`bad trace line: ${line}`);
  }
  return ops;
}

export function formatTrace(ops: Op[]): string {
  return ops.map((o) => (o.op === 'f' ? `f ${o.id}` : `${o.op} ${o.id} ${o.size}`)).join('\n');
}

/** Peak bytes requested and live at once (the denominator-free half of utilisation). */
export function peakLive(ops: Op[]): number {
  const live = new Map<number, number>();
  let cur = 0;
  let peak = 0;
  for (const o of ops) {
    if (o.op === 'f') {
      cur -= live.get(o.id) ?? 0;
      live.delete(o.id);
    } else {
      cur += o.size - (live.get(o.id) ?? 0);
      live.set(o.id, o.size);
      peak = Math.max(peak, cur);
    }
  }
  return peak;
}

// ── Generators ───────────────────────────────────────────────────────────────────────────────────────────

/** Uniform random sizes and random frees: the kind of trace early studies used, and which misleads (Ch. 11). */
export function randomTrace(n: number, seed = 1, maxSize = 256): Op[] {
  const r = rng(seed);
  const ops: Op[] = [];
  const live: number[] = [];
  let id = 0;
  for (let i = 0; i < n; i++) {
    if (live.length && r() < 0.48) ops.push({ op: 'f', id: live.splice(Math.floor(r() * live.length), 1)[0]! });
    else {
      ops.push({ op: 'a', id, size: randInt(r, 1, maxSize) });
      live.push(id++);
    }
  }
  for (const l of live) ops.push({ op: 'f', id: l });
  return ops;
}

/** Ramps and plateaus: a program builds a structure, uses it, tears it down, and does it again with other sizes. */
export function phasesTrace(rounds = 6, seed = 2): Op[] {
  const r = rng(seed);
  const ops: Op[] = [];
  let id = 0;
  for (let k = 0; k < rounds; k++) {
    const sizes = [pick(r, [16, 24, 32, 48]), pick(r, [64, 96, 128]), pick(r, [200, 320, 500])];
    const batch: number[] = [];
    for (let i = 0; i < 120; i++) {
      ops.push({ op: 'a', id, size: pick(r, sizes) });
      batch.push(id++);
    }
    // Free most of it in creation order, keeping a few long-lived survivors.
    for (const b of batch) if (r() < 0.9) ops.push({ op: 'f', id: b });
  }
  return ops;
}

/** Many small short-lived objects and a few long-lived ones, as in a compiler pass building and dropping trees. */
export function compilerTrace(n = 3000, seed = 3): Op[] {
  const r = rng(seed);
  const ops: Op[] = [];
  const temps: number[] = [];
  let id = 0;
  for (let i = 0; i < n; i++) {
    if (r() < 0.06) ops.push({ op: 'a', id: id++, size: randInt(r, 100, 2000) }); // symbol tables, kept
    const t = id++;
    ops.push({ op: 'a', id: t, size: pick(r, [24, 24, 32, 32, 40, 48, 64]) });
    temps.push(t);
    if (temps.length > 40 && r() < 0.95) ops.push({ op: 'f', id: temps.splice(Math.floor(r() * 8), 1)[0]! });
  }
  for (const t of temps) ops.push({ op: 'f', id: t });
  return ops;
}

/** Request-scoped allocation: each request allocates a burst of buffers and frees them all when it finishes. */
export function serverTrace(requests = 60, seed = 4): Op[] {
  const r = rng(seed);
  const ops: Op[] = [];
  let id = 0;
  const open: number[][] = [];
  for (let q = 0; q < requests; q++) {
    const mine: number[] = [];
    for (let i = randInt(r, 8, 30); i > 0; i--) {
      ops.push({ op: 'a', id, size: pick(r, [64, 128, 256, 1024, 4000]) });
      mine.push(id++);
    }
    open.push(mine);
    if (open.length > 4) for (const b of open.shift()!) ops.push({ op: 'f', id: b });
  }
  for (const m of open) for (const b of m) ops.push({ op: 'f', id: b });
  return ops;
}

/** Growing buffers with realloc, as when reading a file of unknown length. */
export function reallocTrace(n = 200, seed = 5): Op[] {
  const r = rng(seed);
  const ops: Op[] = [];
  let id = 0;
  for (let k = 0; k < 6; k++) {
    const buf = id++;
    let size = 16;
    ops.push({ op: 'a', id: buf, size });
    for (let i = 0; i < n / 6; i++) {
      const tmp = id++;
      ops.push({ op: 'a', id: tmp, size: randInt(r, 8, 40) });
      size += randInt(r, 4, 60);
      ops.push({ op: 'r', id: buf, size });
      ops.push({ op: 'f', id: tmp });
    }
    ops.push({ op: 'f', id: buf });
  }
  return ops;
}

/**
 * An adversary in the spirit of Robson's bound: allocate many small blocks, free every other one, then ask
 * for blocks slightly too large to fit in any hole. Total free memory is ample; no hole is big enough.
 */
export function adversaryTrace(n = 64): Op[] {
  const ops: Op[] = [];
  let id = 0;
  for (let round = 0; round < 3; round++) {
    const size = 32 * 2 ** round;
    const ids: number[] = [];
    for (let i = 0; i < n; i++) {
      ops.push({ op: 'a', id, size: size - 16 });
      ids.push(id++);
    }
    for (let i = 0; i < ids.length; i += 2) ops.push({ op: 'f', id: ids[i]! });
  }
  return ops;
}

/** Binary trees, after Boehm's GCBench: build and drop complete trees of nodes. */
export function treesTrace(depth = 8, rounds = 4): Op[] {
  const ops: Op[] = [];
  let id = 0;
  const build = (d: number): number[] => {
    const me = id++;
    ops.push({ op: 'a', id: me, size: 24 });
    return d === 0 ? [me] : [me, ...build(d - 1), ...build(d - 1)];
  };
  const longLived = build(depth);
  for (let k = 0; k < rounds; k++) for (const n of build(depth - 2)) ops.push({ op: 'f', id: n });
  for (const n of longLived) ops.push({ op: 'f', id: n });
  return ops;
}

export const TRACE_BANK: AllocTrace[] = [
  { id: 'phases', name: 'Phases', description: 'Build a structure, tear most of it down, repeat with other sizes.', provenance: 'Generated (seed 2).', ops: phasesTrace() },
  { id: 'compiler', name: 'Compiler pass', description: 'Many small temporaries, a few long-lived tables.', provenance: 'Generated (seed 3), in the shape of an AST pass.', ops: compilerTrace() },
  { id: 'server', name: 'Request server', description: 'Bursts of buffers freed when each request ends.', provenance: 'Generated (seed 4).', ops: serverTrace() },
  { id: 'realloc', name: 'Growing buffers', description: 'Buffers grown with realloc while small temporaries come and go.', provenance: 'Generated (seed 5).', ops: reallocTrace() },
  { id: 'trees', name: 'Binary trees', description: 'Complete binary trees built and dropped, after Boehm’s GCBench.', provenance: 'Generated.', ops: treesTrace() },
  { id: 'random', name: 'Random', description: 'Uniform random sizes and frees: the trace that misleads.', provenance: 'Generated (seed 1).', ops: randomTrace(2000) },
  { id: 'adversary', name: 'Adversary', description: 'Holes everywhere and none big enough.', provenance: 'Generated, after Robson’s worst case.', ops: adversaryTrace() },
];
