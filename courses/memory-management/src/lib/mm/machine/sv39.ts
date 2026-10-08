/**
 * RISC-V Sv39 address translation, following the privileged specification's page-walk algorithm
 * ("Virtual Address Translation Process"). Page tables are real 64-bit entries in simulated physical memory.
 *
 *   virtual address (39 bits, sign-extended to 64):  | VPN[2] 9 | VPN[1] 9 | VPN[0] 9 | offset 12 |
 *   page-table entry (64 bits):                      | reserved 10 | PPN 44 | RSW 2 | D A G U X W R V |
 *
 * Not modelled: machine mode, PMP, the hypervisor extension, Svnapot, Svpbmt, MXR (appendix B).
 */
import { PAGE_SIZE, type PhysicalMemory } from './phys';

export const LEVELS = 3;
export const PTE_SIZE = 8;
export const VA_BITS = 39;

export const PTE = { V: 1, R: 2, W: 4, X: 8, U: 16, G: 32, A: 64, D: 128 } as const;
export type PteFlag = keyof typeof PTE;
export const FLAG_NAMES: PteFlag[] = ['V', 'R', 'W', 'X', 'U', 'G', 'A', 'D'];

export type Access = 'r' | 'w' | 'x';
/** Exception causes for page faults (mcause/scause values). */
export const FAULT_CAUSE: Record<Access, number> = { x: 12, r: 13, w: 15 };
export const FAULT_NAME: Record<number, string> = { 12: 'instruction page fault', 13: 'load page fault', 15: 'store/AMO page fault' };

/** Size of the region a leaf maps at each level: 4 KiB, 2 MiB (megapage), 1 GiB (gigapage). */
export const LEVEL_SIZE = [PAGE_SIZE, PAGE_SIZE * 512, PAGE_SIZE * 512 * 512];
export const LEVEL_NAME = ['4 KiB page', '2 MiB megapage', '1 GiB gigapage'];

export interface VaParts {
  vpn: [number, number, number];
  offset: number;
  /** Bits 63–39 must all equal bit 38. Addresses here are numbers below 2^39 or negative-looking high halves. */
  canonical: boolean;
}

/** Split a virtual address (a number in [0, 2^39), the lower half) into its fields. */
export function splitVa(va: number): VaParts {
  const canonical = Number.isSafeInteger(va) && va >= 0 && va < 2 ** (VA_BITS - 1);
  const page = Math.floor(va / PAGE_SIZE);
  return {
    vpn: [page % 512, Math.floor(page / 512) % 512, Math.floor(page / 512 / 512) % 512],
    offset: va % PAGE_SIZE,
    canonical,
  };
}

export function joinVa(vpn: [number, number, number], offset: number): number {
  return ((vpn[2] * 512 + vpn[1]) * 512 + vpn[0]) * PAGE_SIZE + offset;
}

export interface PteValue {
  ppn: number;
  flags: number;
}

export function encodePte(ppn: number, flags: number): number {
  return ppn * 1024 + (flags & 0x3ff);
}

export function decodePte(raw: number): PteValue {
  return { ppn: Math.floor(raw / 1024), flags: raw % 1024 };
}

export function has(flags: number, f: PteFlag): boolean {
  return (flags & PTE[f]) !== 0;
}

export function flagString(flags: number): string {
  return 'DAGUXWRV'
    .split('')
    .map((c, i) => (flags & (1 << (7 - i)) ? c : '-'))
    .join('');
}

/** A leaf has R or X set; V without R, W or X points to the next level. */
export function isLeaf(flags: number): boolean {
  return has(flags, 'R') || has(flags, 'X');
}

export type AdPolicy = 'svadu' | 'svade';

export interface WalkOptions {
  access: Access;
  /** Privilege: user (U-mode) or supervisor (S-mode). */
  user: boolean;
  /** sstatus.SUM: supervisor may access user pages (never execute them). */
  sum?: boolean;
  /** Hardware updates A and D (Svadu, the default) or raises a page fault so software can (Svade). */
  ad?: AdPolicy;
  /** If false, the walk does not write A/D bits back (used by figures that only look). */
  update?: boolean;
}

export interface WalkStep {
  level: number;
  /** Physical address of the table this step reads. */
  table: number;
  index: number;
  pteAddr: number;
  pte: PteValue;
  raw: number;
  /** What the step concluded. */
  note: string;
}

export interface WalkResult {
  ok: boolean;
  pa?: number;
  steps: WalkStep[];
  /** Level of the leaf (0 = 4 KiB page). */
  level?: number;
  leaf?: PteValue;
  fault?: { cause: number; name: string; reason: string };
}

function fault(access: Access, steps: WalkStep[], reason: string): WalkResult {
  const cause = FAULT_CAUSE[access];
  return { ok: false, steps, fault: { cause, name: FAULT_NAME[cause]!, reason } };
}

/**
 * Walk the page tables rooted at `rootPpn` for `va`. Returns the physical address or a page fault, with every
 * step for figures. Implements the specification's algorithm, including superpages, permission checks and the
 * A/D update.
 */
export function walk(mem: PhysicalMemory, rootPpn: number, va: number, opts: WalkOptions): WalkResult {
  const steps: WalkStep[] = [];
  const parts = splitVa(va);
  if (!parts.canonical) return fault(opts.access, steps, 'the address is not canonical: bits 63–39 must copy bit 38');
  let a = rootPpn * PAGE_SIZE;
  for (let i = LEVELS - 1; i >= 0; i--) {
    const pteAddr = a + parts.vpn[i]! * PTE_SIZE;
    const raw = mem.load64(pteAddr);
    const pte = decodePte(raw);
    const step: WalkStep = { level: i, table: a, index: parts.vpn[i]!, pteAddr, pte, raw, note: '' };
    steps.push(step);
    if (!has(pte.flags, 'V')) {
      step.note = 'V = 0: not mapped';
      return fault(opts.access, steps, `level-${i} entry ${parts.vpn[i]} is not valid`);
    }
    if (!has(pte.flags, 'R') && has(pte.flags, 'W')) {
      step.note = 'W without R is reserved';
      return fault(opts.access, steps, 'reserved permission combination (W without R)');
    }
    if (!isLeaf(pte.flags)) {
      step.note = `pointer to the level-${i - 1} table`;
      if (i === 0) return fault(opts.access, steps, 'a level-0 entry must be a leaf');
      a = pte.ppn * PAGE_SIZE;
      continue;
    }
    // A leaf.
    step.note = `leaf: a ${LEVEL_NAME[i]}`;
    const f = pte.flags;
    if (opts.user && !has(f, 'U')) return fault(opts.access, steps, 'user code touched a supervisor page (U = 0)');
    if (!opts.user && has(f, 'U') && (opts.access === 'x' || !opts.sum)) return fault(opts.access, steps, opts.access === 'x' ? 'the supervisor may never execute a user page' : 'the supervisor touched a user page with SUM = 0');
    if (opts.access === 'r' && !has(f, 'R')) return fault(opts.access, steps, 'read from a page without R');
    if (opts.access === 'w' && !has(f, 'W')) return fault(opts.access, steps, 'write to a page without W');
    if (opts.access === 'x' && !has(f, 'X')) return fault(opts.access, steps, 'execute from a page without X');
    if (i > 0 && pte.ppn % 512 ** i !== 0) return fault(opts.access, steps, `misaligned superpage: the low ${9 * i} bits of the PPN must be zero`);
    const needA = !has(f, 'A');
    const needD = opts.access === 'w' && !has(f, 'D');
    if (needA || needD) {
      if ((opts.ad ?? 'svadu') === 'svade') return fault(opts.access, steps, needA ? 'A = 0 and the hardware does not set it (Svade): the kernel must' : 'D = 0 on a write (Svade): the kernel must set it');
      if (opts.update !== false) {
        const nf = f | PTE.A | (opts.access === 'w' ? PTE.D : 0);
        mem.store64(pteAddr, encodePte(pte.ppn, nf));
        step.note += needD ? ' · sets A and D' : ' · sets A';
      }
    }
    const lowPages = Math.floor(va / PAGE_SIZE) % 512 ** i;
    const pa = (pte.ppn + lowPages) * PAGE_SIZE + parts.offset;
    return { ok: true, pa, steps, level: i, leaf: pte };
  }
  return fault(opts.access, steps, 'unreachable');
}

/**
 * A helper that builds page tables: allocates table frames on demand through `allocFrame` and installs leaves.
 * Used by the kernel and by figures that need a hand-made address space.
 */
export class PageTableBuilder {
  constructor(
    readonly mem: PhysicalMemory,
    readonly rootPpn: number,
    readonly allocFrame: () => number,
  ) {}

  /** Map the page containing `va` to frame `ppn` with `flags` (V is added), as a leaf at `level`. */
  map(va: number, ppn: number, flags: number, level = 0): void {
    const parts = splitVa(va);
    let a = this.rootPpn * PAGE_SIZE;
    for (let i = LEVELS - 1; i > level; i--) {
      const addr = a + parts.vpn[i]! * PTE_SIZE;
      let pte = decodePte(this.mem.load64(addr));
      if (!has(pte.flags, 'V')) {
        const t = this.allocFrame();
        this.mem.zeroFrame(t);
        this.mem.store64(addr, encodePte(t, PTE.V));
        pte = { ppn: t, flags: PTE.V };
      } else if (isLeaf(pte.flags)) throw new Error(`map: ${va.toString(16)} is inside an existing superpage`);
      a = pte.ppn * PAGE_SIZE;
    }
    this.mem.store64(a + parts.vpn[level]! * PTE_SIZE, encodePte(ppn, flags | PTE.V));
  }

  /** The address of the level-0 PTE for `va`, or undefined if an upper level is missing. */
  leafAddr(va: number): number | undefined {
    const parts = splitVa(va);
    let a = this.rootPpn * PAGE_SIZE;
    for (let i = LEVELS - 1; i > 0; i--) {
      const pte = decodePte(this.mem.load64(a + parts.vpn[i]! * PTE_SIZE));
      if (!has(pte.flags, 'V') || isLeaf(pte.flags)) return undefined;
      a = pte.ppn * PAGE_SIZE;
    }
    return a + parts.vpn[0]! * PTE_SIZE;
  }

  /** Read the level-0 entry for `va` (undefined if unmapped above). */
  get(va: number): PteValue | undefined {
    const at = this.leafAddr(va);
    return at === undefined ? undefined : decodePte(this.mem.load64(at));
  }

  set(va: number, ppn: number, flags: number): void {
    const at = this.leafAddr(va);
    if (at === undefined) return this.map(va, ppn, flags);
    this.mem.store64(at, encodePte(ppn, flags));
  }

  unmap(va: number): void {
    const at = this.leafAddr(va);
    if (at !== undefined) this.mem.store64(at, 0);
  }

  /** Every valid level-0 mapping, in address order (for figures and fork). */
  *mappings(): Generator<{ va: number; pte: PteValue; pteAddr: number }> {
    const walkTable = function* (this: PageTableBuilder, ppn: number, level: number, base: number): Generator<{ va: number; pte: PteValue; pteAddr: number }> {
      for (let i = 0; i < 512; i++) {
        const addr = ppn * PAGE_SIZE + i * PTE_SIZE;
        const raw = this.mem.load64(addr);
        if (!raw) continue;
        const pte = decodePte(raw);
        if (!has(pte.flags, 'V')) continue;
        const va = base + i * LEVEL_SIZE[level]!;
        if (isLeaf(pte.flags)) yield { va, pte, pteAddr: addr };
        else if (level > 0) yield* walkTable.call(this, pte.ppn, level - 1, va);
      }
    };
    yield* walkTable.call(this, this.rootPpn, LEVELS - 1, 0);
  }
}
