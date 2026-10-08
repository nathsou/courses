/**
 * Page replacement on a reference string: which page to evict when a new one must come in and every frame is
 * full. FIFO, LRU, Clock (second chance, using the accessed bit), Random, and Bélády's OPT, which evicts the page
 * used furthest in the future and is optimal but needs to know the future.
 */
import { rng } from '../util/random';

export type Policy = 'fifo' | 'lru' | 'clock' | 'opt' | 'random';
export const POLICY_NAMES: Record<Policy, string> = { fifo: 'FIFO', lru: 'LRU', clock: 'Clock', opt: 'OPT (Bélády)', random: 'Random' };

export interface ReplaceStep {
  page: number;
  hit: boolean;
  /** Frame contents after the step (null = empty). */
  frames: (number | null)[];
  evicted?: number;
  /** Clock: the hand's position and the accessed bits after the step. */
  hand?: number;
  ref?: boolean[];
}

export function simulate(refs: readonly number[], nFrames: number, policy: Policy, seed = 1): ReplaceStep[] {
  const frames: (number | null)[] = Array(nFrames).fill(null);
  const loadedAt: number[] = Array(nFrames).fill(0);
  const usedAt: number[] = Array(nFrames).fill(0);
  const ref: boolean[] = Array(nFrames).fill(false);
  let hand = 0;
  const r = rng(seed);
  const out: ReplaceStep[] = [];
  refs.forEach((page, t) => {
    const at = frames.indexOf(page);
    if (at >= 0) {
      usedAt[at] = t;
      ref[at] = true;
      out.push({ page, hit: true, frames: [...frames], hand, ref: [...ref] });
      return;
    }
    let victim = frames.indexOf(null);
    let evicted: number | undefined;
    if (victim < 0) {
      switch (policy) {
        case 'fifo':
          victim = loadedAt.indexOf(Math.min(...loadedAt));
          break;
        case 'lru':
          victim = usedAt.indexOf(Math.min(...usedAt));
          break;
        case 'random':
          victim = Math.floor(r() * nFrames);
          break;
        case 'clock':
          while (ref[hand]) {
            ref[hand] = false;
            hand = (hand + 1) % nFrames;
          }
          victim = hand;
          hand = (hand + 1) % nFrames;
          break;
        case 'opt': {
          let far = -1;
          victim = 0;
          for (let i = 0; i < nFrames; i++) {
            const next = refs.indexOf(frames[i]!, t + 1);
            const d = next < 0 ? Infinity : next;
            if (d > far) {
              far = d;
              victim = i;
            }
          }
          break;
        }
      }
      evicted = frames[victim]!;
    } else if (policy === 'clock') hand = (victim + 1) % nFrames;
    frames[victim] = page;
    loadedAt[victim] = t;
    usedAt[victim] = t;
    ref[victim] = true;
    out.push({ page, hit: false, frames: [...frames], evicted, hand, ref: [...ref] });
  });
  return out;
}

export function faults(steps: ReplaceStep[]): number {
  return steps.filter((s) => !s.hit).length;
}

/** The classic string for Bélády's anomaly: FIFO faults 9 times with 3 frames and 10 times with 4. */
export const BELADY_STRING = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

/** A reference string with locality: a working set that drifts over phases. */
export function phasedString(length: number, seed = 1, pages = 12, set = 4): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let base = 0;
  for (let i = 0; i < length; i++) {
    if (i % 20 === 19) base = (base + 1 + Math.floor(r() * 3)) % pages;
    out.push(r() < 0.9 ? (base + Math.floor(r() * set)) % pages : Math.floor(r() * pages));
  }
  return out;
}

/** Denning's working set W(t, τ): the distinct pages referenced in the last τ references. */
export function workingSetSizes(refs: readonly number[], tau: number): number[] {
  return refs.map((_, t) => new Set(refs.slice(Math.max(0, t - tau + 1), t + 1)).size);
}
