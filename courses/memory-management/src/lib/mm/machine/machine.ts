/**
 * The simulated machine: physical memory, an Sv39 MMU with a TLB, a cache hierarchy and a cycle counter.
 * Every load and store from a program goes through `translate`, which consults the TLB, walks the page tables
 * on a miss, and traps to the kernel's fault handler on a page fault (retrying if the handler fixes it).
 */
import { PhysicalMemory, PAGE_SIZE } from './phys';
import { walk, type Access, type AdPolicy, FAULT_CAUSE, FAULT_NAME } from './sv39';
import { Tlb } from './tlb';
import { Hierarchy } from './cache';
import { TEACHING_MACHINE, type CostModel } from './cost';

export class PageFault extends Error {
  constructor(
    readonly va: number,
    readonly access: Access,
    readonly reason: string,
  ) {
    super(`${FAULT_NAME[FAULT_CAUSE[access]]} at 0x${va.toString(16)}: ${reason}`);
  }
  get cause(): number {
    return FAULT_CAUSE[this.access];
  }
}

export interface MachineStats {
  cycles: number;
  loads: number;
  stores: number;
  walks: number;
  faults: number;
  /** Cycles by cause, for the cost meter. */
  by: Record<'cache' | 'dram' | 'walk' | 'fault' | 'syscall' | 'copy', number>;
}

export type MachineEvent =
  | { kind: 'tlb-hit' | 'tlb-miss'; va: number }
  | { kind: 'walk'; va: number; pa: number | undefined; steps: number }
  | { kind: 'fault'; va: number; access: Access; reason: string }
  | { kind: 'access'; va: number; pa: number; access: Access; level: number };

/** The kernel's side of a trap: return true if the fault was fixed (the access is retried). */
export type FaultHandler = (va: number, access: Access, reason: string) => boolean;

export const freshStats = (): MachineStats => ({ cycles: 0, loads: 0, stores: 0, walks: 0, faults: 0, by: { cache: 0, dram: 0, walk: 0, fault: 0, syscall: 0, copy: 0 } });

export class Machine {
  readonly phys: PhysicalMemory;
  readonly tlb: Tlb;
  readonly caches: Hierarchy;
  stats: MachineStats = freshStats();
  /** The current address space: root page-table frame and ASID (the satp register). */
  satp = { rootPpn: 0, asid: 0 };
  user = true;
  ad: AdPolicy = 'svadu';
  /** When false, addresses are physical (no translation), as before paging is switched on. */
  paging = true;
  onFault?: FaultHandler;
  /** Optional event log for figures (bounded). */
  log?: MachineEvent[];
  logLimit = 5000;

  constructor(
    frames: number,
    readonly cost: CostModel = TEACHING_MACHINE,
  ) {
    this.phys = new PhysicalMemory(frames);
    this.tlb = new Tlb(cost.tlbEntries);
    this.caches = new Hierarchy(cost.caches, cost.dram);
  }

  private emit(e: MachineEvent): void {
    if (this.log && this.log.length < this.logLimit) this.log.push(e);
  }

  /** Charge the cache hierarchy for touching `pa`. */
  touch(pa: number): number {
    const r = this.caches.access(pa);
    this.stats.cycles += r.cycles;
    if (r.level === this.caches.caches.length) this.stats.by.dram += r.cycles;
    else this.stats.by.cache += r.cycles;
    return r.level;
  }

  translate(va: number, access: Access): number {
    if (!this.paging) return va;
    for (let attempt = 0; attempt < 4; attempt++) {
      const hit = this.tlb.lookup(va, this.satp.asid);
      if (hit) {
        const f = hit.leaf.flags;
        const ok = (access === 'r' && f & 2) || (access === 'w' && f & 4 && f & 128) || (access === 'x' && f & 8);
        if (ok) {
          this.emit({ kind: 'tlb-hit', va });
          return Tlb.translate(hit, va);
        }
        // Permission or dirty-bit change needed: drop the entry and walk.
        this.tlb.flush({ va, asid: this.satp.asid });
      } else this.emit({ kind: 'tlb-miss', va });
      this.stats.walks++;
      const r = walk(this.phys, this.satp.rootPpn, va, { access, user: this.user, ad: this.ad });
      for (const s of r.steps) {
        this.touch(s.pteAddr);
        this.stats.cycles += this.cost.walkStep;
        this.stats.by.walk += this.cost.walkStep;
      }
      this.emit({ kind: 'walk', va, pa: r.pa, steps: r.steps.length });
      if (r.ok) {
        this.tlb.insert(va, this.satp.asid, r.level!, { ...r.leaf!, flags: this.phys.load64(r.steps.at(-1)!.pteAddr) % 1024 });
        return r.pa!;
      }
      this.stats.faults++;
      this.stats.cycles += this.cost.fault;
      this.stats.by.fault += this.cost.fault;
      this.emit({ kind: 'fault', va, access, reason: r.fault!.reason });
      if (!this.onFault || !this.onFault(va, access, r.fault!.reason)) throw new PageFault(va, access, r.fault!.reason);
    }
    throw new PageFault(va, access, 'the fault handler did not fix the fault');
  }

  private access(va: number, access: Access, n: number): number {
    const pa = this.translate(va, access);
    // An access that crosses a page boundary would need two translations; the course's code keeps accesses aligned.
    if (this.paging && Math.floor(va / PAGE_SIZE) !== Math.floor((va + n - 1) / PAGE_SIZE)) throw new PageFault(va, access, 'misaligned access across a page boundary');
    const level = this.touch(pa);
    this.emit({ kind: 'access', va, pa, access, level });
    if (access === 'w') this.stats.stores++;
    else this.stats.loads++;
    return pa;
  }

  load8(va: number): number {
    return this.phys.load8(this.access(va, 'r', 1));
  }
  load32(va: number): number {
    return this.phys.load32(this.access(va, 'r', 4));
  }
  load64(va: number): number {
    return this.phys.load64(this.access(va, 'r', 8));
  }
  store8(va: number, v: number): void {
    this.phys.store8(this.access(va, 'w', 1), v);
  }
  store32(va: number, v: number): void {
    this.phys.store32(this.access(va, 'w', 4), v);
  }
  store64(va: number, v: number): void {
    this.phys.store64(this.access(va, 'w', 8), v);
  }

  charge(kind: 'syscall' | 'copy' | 'fault', cycles: number): void {
    this.stats.cycles += cycles;
    this.stats.by[kind] += cycles;
  }

  resetStats(): void {
    this.stats = freshStats();
    this.tlb.stats = { hits: 0, misses: 0, flushes: 0 };
    for (const c of this.caches.caches) c.stats = { hits: 0, misses: 0 };
  }
}
