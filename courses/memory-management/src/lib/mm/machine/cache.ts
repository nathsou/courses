/**
 * A set-associative cache with least-recently-used replacement, physically indexed and tagged. It tracks only
 * which lines are present (the data lives in physical memory), which is all a cost model needs.
 */
export interface CacheConfig {
  name: string;
  size: number;
  ways: number;
  line: number;
  /** Cycles for a hit at this level. */
  latency: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

export class Cache {
  readonly sets: number;
  /** tags[set * ways + way], -1 when empty. */
  readonly tags: Float64Array;
  readonly stamp: Float64Array;
  stats: CacheStats = { hits: 0, misses: 0 };
  private clock = 0;

  constructor(readonly cfg: CacheConfig) {
    this.sets = cfg.size / cfg.line / cfg.ways;
    if (!Number.isInteger(this.sets) || this.sets < 1) throw new Error(`cache ${cfg.name}: size must be a multiple of line × ways`);
    this.tags = new Float64Array(this.sets * cfg.ways).fill(-1);
    this.stamp = new Float64Array(this.sets * cfg.ways);
  }

  /** Look up the line holding `pa`; on a miss, install it (evicting the LRU way). Returns whether it hit. */
  access(pa: number): boolean {
    const lineNo = Math.floor(pa / this.cfg.line);
    const set = lineNo % this.sets;
    const base = set * this.cfg.ways;
    this.clock++;
    let victim = base;
    for (let w = 0; w < this.cfg.ways; w++) {
      const i = base + w;
      if (this.tags[i] === lineNo) {
        this.stamp[i] = this.clock;
        this.stats.hits++;
        return true;
      }
      if (this.stamp[i]! < this.stamp[victim]!) victim = i;
    }
    this.tags[victim] = lineNo;
    this.stamp[victim] = this.clock;
    this.stats.misses++;
    return false;
  }

  /** Set index and tag of an address (for figures). */
  locate(pa: number): { set: number; tag: number; offset: number } {
    const lineNo = Math.floor(pa / this.cfg.line);
    return { set: lineNo % this.sets, tag: Math.floor(lineNo / this.sets), offset: pa % this.cfg.line };
  }

  /** The lines currently in a set (for figures). */
  setContents(set: number): number[] {
    return Array.from(this.tags.subarray(set * this.cfg.ways, (set + 1) * this.cfg.ways));
  }

  flush(): void {
    this.tags.fill(-1);
    this.stamp.fill(0);
  }
}

/** Caches in order, then DRAM. `access` returns the level that hit (caches.length = DRAM) and the cycles. */
export class Hierarchy {
  readonly caches: Cache[];
  constructor(
    configs: CacheConfig[],
    readonly dramLatency: number,
  ) {
    this.caches = configs.map((c) => new Cache(c));
  }

  access(pa: number): { level: number; cycles: number } {
    for (let i = 0; i < this.caches.length; i++) {
      if (this.caches[i]!.access(pa)) {
        // Fill the levels above (inclusive hierarchy).
        return { level: i, cycles: this.caches[i]!.cfg.latency };
      }
    }
    return { level: this.caches.length, cycles: this.dramLatency };
  }

  flush(): void {
    for (const c of this.caches) c.flush();
  }
}
