/**
 * WebGL contexts are scarce (browsers keep about 16 per page and drop the oldest). Views ask the pool for a
 * slot when they come near the viewport and give it back when they leave; at most MAX are live at once, and
 * when a new view needs one the least recently used view is evicted (it re-creates its context, from cached
 * meshes, when it is next seen).
 */
import { stats } from './stats.ts';

export const MAX_LIVE = 4;

export interface PoolClient {
  /** Drop the context now. */
  evict(): void;
}

const live: { client: PoolClient; used: number }[] = [];

export function acquire(client: PoolClient): void {
  const found = live.find((l) => l.client === client);
  if (found) {
    found.used = performance.now();
    return;
  }
  while (live.length >= MAX_LIVE) {
    live.sort((a, b) => a.used - b.used);
    const victim = live.shift()!;
    victim.client.evict();
  }
  live.push({ client, used: performance.now() });
  stats.liveContexts = live.length;
  stats.maxLiveContexts = Math.max(stats.maxLiveContexts, live.length);
}

export function touch(client: PoolClient): void {
  const found = live.find((l) => l.client === client);
  if (found) found.used = performance.now();
}

export function release(client: PoolClient): void {
  const i = live.findIndex((l) => l.client === client);
  if (i >= 0) live.splice(i, 1);
  stats.liveContexts = live.length;
}
