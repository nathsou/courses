/**
 * synth in the pages: one Web Worker per lane, so a long run never delays the editor's checks and testbench
 * sessions (which live inside a worker) stay with the lane that started them.
 *
 * - `check`: analysis and formatting while typing; only the newest request per key is answered.
 * - `run`: the iCE40 flow.
 * - `sim`: testbench sessions.
 */
import { base } from '$app/paths';
import type { Synth } from './api';
import type { SynthProgress } from './wasm';

export type Lane = 'check' | 'run' | 'sim';

interface Pending {
  resolve(v: unknown): void;
  reject(e: Error): void;
  progress?: (p: SynthProgress) => void;
}

interface LaneState {
  worker: Worker;
  pending: Map<number, Pending>;
}

const lanes = new Map<Lane, LaneState>();
let nextId = 1;

/** Where the module is served from. */
export function synthUrl(): string {
  return new URL(`${base}/synth/synth_playground.wasm`, location.href).href;
}

function lane(name: Lane): LaneState {
  let l = lanes.get(name);
  if (l) return l;
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, Pending>();
  worker.onmessage = (e: MessageEvent<{ id: number; ok?: boolean; out?: unknown; error?: string; progress?: SynthProgress }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    if (e.data.progress) {
      p.progress?.(e.data.progress);
      return;
    }
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data.out);
    else p.reject(new Error(e.data.error ?? 'synth failed'));
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(`synth worker: ${e.message || 'failed to start'}`));
    pending.clear();
    lanes.delete(name);
  };
  worker.postMessage({ init: synthUrl() });
  l = { worker, pending };
  lanes.set(name, l);
  return l;
}

/** Sends one request on a lane. */
export function request<T = unknown>(name: Lane, method: string, body: unknown, progress?: (p: SynthProgress) => void): Promise<T> {
  const l = lane(name);
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    l.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, progress });
    // Requests are JSON for synth anyway; going through JSON here also unwraps reactive state proxies,
    // which a worker cannot receive.
    l.worker.postMessage({ id, method, body: JSON.parse(JSON.stringify(body ?? {})) });
  });
}

/** A `Synth` on one lane. */
export function synthOn(name: Lane, progress?: (p: SynthProgress) => void): Synth {
  return { call: (method, body) => request(name, method, body, progress) };
}

const newest = new Map<string, number>();

/**
 * Analysis for the editor: resolves to undefined when a newer request with the same key superseded this
 * one before it was answered.
 */
export async function latest<T>(key: string, method: string, body: unknown): Promise<T | undefined> {
  const id = nextId;
  newest.set(key, id);
  const out = await request<T>('check', method, body);
  return newest.get(key) === id ? out : undefined;
}
