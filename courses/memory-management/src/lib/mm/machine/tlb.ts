/**
 * A translation lookaside buffer: a small, fully associative cache of recent translations, tagged with an
 * address-space identifier (ASID) so that switching processes need not flush it. Entries for global pages
 * (G = 1) match every ASID. Replacement is least recently used.
 */
import { PAGE_SIZE } from './phys';
import { LEVEL_SIZE, PTE, type PteValue } from './sv39';

export interface TlbEntry {
  /** Virtual page number at the entry's granularity (va / size of its level). */
  tag: number;
  level: number;
  asid: number;
  global: boolean;
  leaf: PteValue;
  lastUse: number;
}

export interface TlbStats {
  hits: number;
  misses: number;
  flushes: number;
}

export class Tlb {
  entries: TlbEntry[] = [];
  stats: TlbStats = { hits: 0, misses: 0, flushes: 0 };
  private clock = 0;

  constructor(public capacity = 16) {}

  lookup(va: number, asid: number): TlbEntry | undefined {
    this.clock++;
    for (const e of this.entries) {
      if ((e.global || e.asid === asid) && Math.floor(va / LEVEL_SIZE[e.level]!) === e.tag) {
        e.lastUse = this.clock;
        this.stats.hits++;
        return e;
      }
    }
    this.stats.misses++;
    return undefined;
  }

  /** Physical address for `va` from a hit entry. */
  static translate(e: TlbEntry, va: number): number {
    const size = LEVEL_SIZE[e.level]!;
    return e.leaf.ppn * PAGE_SIZE + (va % size);
  }

  insert(va: number, asid: number, level: number, leaf: PteValue): TlbEntry {
    const e: TlbEntry = { tag: Math.floor(va / LEVEL_SIZE[level]!), level, asid, global: (leaf.flags & PTE.G) !== 0, leaf, lastUse: ++this.clock };
    if (this.entries.length >= this.capacity) {
      let victim = 0;
      for (let i = 1; i < this.entries.length; i++) if (this.entries[i]!.lastUse < this.entries[victim]!.lastUse) victim = i;
      this.entries.splice(victim, 1);
    }
    this.entries.push(e);
    return e;
  }

  /** sfence.vma semantics: everything; one ASID (keeping global entries); or one address (in one ASID). */
  flush(opts: { asid?: number; va?: number } = {}): void {
    this.stats.flushes++;
    this.entries = this.entries.filter((e) => {
      if (opts.va !== undefined && Math.floor(opts.va / LEVEL_SIZE[e.level]!) !== e.tag) return true;
      if (opts.asid !== undefined && (e.global || e.asid !== opts.asid)) return true;
      return false;
    });
  }

  /** Bytes of memory the TLB can map without a miss, given its entries' page sizes. */
  reach(): number {
    return this.entries.reduce((n, e) => n + LEVEL_SIZE[e.level]!, 0);
  }
}
