/**
 * The toy kernel: a hosted kernel written in TypeScript that owns the simulated machine. It manages physical
 * frames with a buddy allocator, gives each process an address space (a page-table root, an ASID and a list of
 * virtual memory areas), and handles page faults: demand-zero pages, file-backed pages, and copy-on-write after
 * fork. System calls: brk, mmap, munmap, mprotect, fork, exit.
 *
 * Page-table entries use one of the two RSW bits (bit 8) to remember "copy-on-write", as real kernels do.
 */
import { Machine } from '../machine/machine';
import { PAGE_SIZE } from '../machine/phys';
import { PageTableBuilder, PTE, has, type Access } from '../machine/sv39';
import type { CostModel } from '../machine/cost';
import { BuddyAllocator } from './buddy';

/** RSW bit 8: this page is shared copy-on-write. */
export const COW = 256;

export type Perm = 'r' | 'rw' | 'rx' | 'rwx';
export type VmaKind = 'text' | 'data' | 'bss' | 'heap' | 'mmap' | 'stack' | 'guard' | 'file';

export interface Vma {
  start: number;
  end: number;
  perm: Perm | '';
  kind: VmaKind;
  name: string;
  /** For file-backed areas: the byte at offset i of the file. */
  file?: (offset: number) => number;
  /** Private mapping: writes are not shared (copy-on-write for files). */
  private?: boolean;
}

export type KernelEvent =
  | { kind: 'fault'; pid: number; va: number; access: Access; resolution: 'demand-zero' | 'file' | 'cow-copy' | 'cow-reuse' | 'segv' | 'ad'; frame?: number; from?: number }
  | { kind: 'fork'; parent: number; child: number; shared: number }
  | { kind: 'syscall'; pid: number; name: string; detail: string }
  | { kind: 'frame'; op: 'alloc' | 'free'; frame: number };

export class Segfault extends Error {
  constructor(
    readonly pid: number,
    readonly va: number,
    readonly access: Access,
    reason: string,
  ) {
    super(`process ${pid}: segmentation fault at 0x${va.toString(16)} (${reason})`);
  }
}

const permFlags = (p: Perm | ''): number => (p.includes('r') ? PTE.R : 0) | (p.includes('w') ? PTE.W : 0) | (p.includes('x') ? PTE.X : 0);
const pageOf = (va: number) => Math.floor(va / PAGE_SIZE) * PAGE_SIZE;

export class Process {
  vmas: Vma[] = [];
  pt: PageTableBuilder;
  brkStart = 0;
  brk = 0;
  /** Next address for mmap without a hint (grows downwards from below the stack, as on Linux). */
  mmapTop = 0x3f_0000_0000;
  alive = true;

  constructor(
    readonly kernel: Kernel,
    readonly pid: number,
    readonly asid: number,
    readonly root: number,
  ) {
    this.pt = new PageTableBuilder(kernel.machine.phys, root, () => kernel.allocFrame(true));
  }

  findVma(va: number): Vma | undefined {
    return this.vmas.find((v) => va >= v.start && va < v.end);
  }

  addVma(v: Vma): Vma {
    if (this.vmas.some((o) => v.start < o.end && o.start < v.end)) throw new Error(`overlapping mappings at 0x${v.start.toString(16)}`);
    this.vmas.push(v);
    this.vmas.sort((a, b) => a.start - b.start);
    return v;
  }

  /** Resident pages: valid level-0 mappings. */
  resident(): { va: number; frame: number; flags: number }[] {
    return [...this.pt.mappings()].map((m) => ({ va: m.va, frame: m.pte.ppn, flags: m.pte.flags }));
  }
}

export class Kernel {
  readonly machine: Machine;
  readonly frames: BuddyAllocator;
  /** How many page-table entries (across processes) map each frame. */
  readonly refs = new Map<number, number>();
  processes: Process[] = [];
  events: KernelEvent[] = [];
  current?: Process;
  private nextPid = 1;

  constructor(frames = 1024, cost?: CostModel) {
    this.machine = new Machine(frames, cost);
    this.frames = new BuddyAllocator(frames);
    // Frame 0 stays reserved so that a zero PPN never names a real page by accident.
    this.frames.alloc(0);
    this.machine.onFault = (va, access, reason) => this.handleFault(va, access, reason);
  }

  allocFrame(zero = true): number {
    const f = this.frames.alloc(0);
    if (f < 0) throw new Error('out of memory: no free frames');
    if (zero) {
      this.machine.phys.zeroFrame(f);
      this.machine.charge('copy', this.machine.cost.pageCopy);
    }
    this.events.push({ kind: 'frame', op: 'alloc', frame: f });
    return f;
  }

  private release(frame: number): void {
    const n = (this.refs.get(frame) ?? 1) - 1;
    if (n > 0) this.refs.set(frame, n);
    else {
      this.refs.delete(frame);
      this.frames.free_(frame);
      this.events.push({ kind: 'frame', op: 'free', frame });
    }
  }

  spawn(): Process {
    const root = this.allocFrame(true);
    const pid = this.nextPid++;
    const p = new Process(this, pid, pid, root);
    this.processes.push(p);
    if (!this.current) this.switchTo(p);
    return p;
  }

  switchTo(p: Process): void {
    this.current = p;
    this.machine.satp = { rootPpn: p.root, asid: p.asid };
  }

  /** A conventional layout: text, data, bss, heap (via brk), and a stack with a guard page below it. */
  standardLayout(p: Process, opts: { text?: number; data?: number; stack?: number } = {}): void {
    const text = opts.text ?? 2,
      data = opts.data ?? 1,
      stack = opts.stack ?? 8;
    const base = 0x1_0000;
    p.addVma({ start: base, end: base + text * PAGE_SIZE, perm: 'rx', kind: 'text', name: '.text', file: (o) => (o * 37 + 0x13) & 0xff });
    p.addVma({ start: base + text * PAGE_SIZE, end: base + (text + data) * PAGE_SIZE, perm: 'rw', kind: 'data', name: '.data', file: (o) => (o * 11) & 0xff, private: true });
    p.addVma({ start: base + (text + data) * PAGE_SIZE, end: base + (text + data + 1) * PAGE_SIZE, perm: 'rw', kind: 'bss', name: '.bss' });
    p.brkStart = p.brk = base + (text + data + 2) * PAGE_SIZE;
    p.addVma({ start: p.brkStart, end: p.brkStart, perm: 'rw', kind: 'heap', name: '[heap]' });
    const top = 0x3f_ffff_f000;
    p.addVma({ start: top - stack * PAGE_SIZE, end: top, perm: 'rw', kind: 'stack', name: '[stack]' });
    p.addVma({ start: top - (stack + 1) * PAGE_SIZE, end: top - stack * PAGE_SIZE, perm: '', kind: 'guard', name: '[guard]' });
    p.mmapTop = top - (stack + 16) * PAGE_SIZE;
  }

  /** The page-fault handler. Returns true when it fixed the fault (the machine retries the access). */
  handleFault(va: number, access: Access, reason: string): boolean {
    const p = this.current!;
    const vma = p.findVma(va);
    const segv = (why: string) => {
      this.events.push({ kind: 'fault', pid: p.pid, va, access, resolution: 'segv' });
      throw new Segfault(p.pid, va, access, why);
    };
    if (!vma || vma.kind === 'guard') return segv(vma ? 'guard page' : 'no mapping');
    if (access === 'w' && !vma.perm.includes('w')) return segv('write to a read-only mapping');
    if (access === 'x' && !vma.perm.includes('x')) return segv('execute from a non-executable mapping');
    if (access === 'r' && !vma.perm.includes('r')) return segv('read from an unreadable mapping');
    const page = pageOf(va);
    const pte = p.pt.get(page);
    const flags = permFlags(vma.perm) | PTE.U;
    if (!pte || !has(pte.flags, 'V')) {
      // First touch: demand paging.
      const frame = this.allocFrame(!vma.file);
      if (vma.file) {
        const off = page - vma.start;
        for (let i = 0; i < PAGE_SIZE; i++) this.machine.phys.bytes[frame * PAGE_SIZE + i] = vma.file(off + i);
        this.machine.charge('copy', this.machine.cost.pageCopy);
      }
      this.refs.set(frame, 1);
      p.pt.map(page, frame, flags | PTE.A | (access === 'w' ? PTE.D : 0));
      this.events.push({ kind: 'fault', pid: p.pid, va, access, resolution: vma.file ? 'file' : 'demand-zero', frame });
      return true;
    }
    if (access === 'w' && pte.flags & COW) {
      const shared = this.refs.get(pte.ppn) ?? 1;
      if (shared === 1) {
        // The last sharer: take the page over without copying.
        p.pt.set(page, pte.ppn, (pte.flags & ~COW) | PTE.W | PTE.D | PTE.A);
        this.events.push({ kind: 'fault', pid: p.pid, va, access, resolution: 'cow-reuse', frame: pte.ppn });
      } else {
        const frame = this.allocFrame(false);
        this.machine.phys.copyFrame(pte.ppn, frame);
        this.machine.charge('copy', this.machine.cost.pageCopy);
        this.refs.set(frame, 1);
        this.release(pte.ppn);
        p.pt.set(page, frame, (pte.flags & ~COW) | PTE.W | PTE.D | PTE.A | PTE.V);
        this.events.push({ kind: 'fault', pid: p.pid, va, access, resolution: 'cow-copy', frame, from: pte.ppn });
      }
      this.machine.tlb.flush({ va: page, asid: p.asid });
      return true;
    }
    if (reason.includes('Svade') || reason.includes('A = 0') || reason.includes('D = 0')) {
      p.pt.set(page, pte.ppn, pte.flags | PTE.A | (access === 'w' ? PTE.D : 0));
      this.events.push({ kind: 'fault', pid: p.pid, va, access, resolution: 'ad' });
      return true;
    }
    return segv(reason);
  }

  // ── System calls ──

  sbrk(p: Process, delta: number): number {
    this.machine.charge('syscall', this.machine.cost.syscall);
    const old = p.brk;
    const heap = p.vmas.find((v) => v.kind === 'heap')!;
    const next = old + delta;
    if (next < p.brkStart) return -1;
    const nextEnd = Math.ceil(next / PAGE_SIZE) * PAGE_SIZE;
    if (p.vmas.some((v) => v !== heap && v.start < nextEnd && heap.start < v.end && v.start >= heap.start)) return -1;
    if (nextEnd < heap.end) this.unmapRange(p, nextEnd, heap.end);
    heap.end = nextEnd;
    p.brk = next;
    this.events.push({ kind: 'syscall', pid: p.pid, name: 'brk', detail: `0x${next.toString(16)}` });
    return old;
  }

  mmap(p: Process, bytes: number, perm: Perm = 'rw', name = '[anon]', file?: (o: number) => number): number {
    this.machine.charge('syscall', this.machine.cost.syscall);
    const len = Math.ceil(bytes / PAGE_SIZE) * PAGE_SIZE;
    const start = p.mmapTop - len;
    p.mmapTop = start - PAGE_SIZE; // leave a gap between mappings
    p.addVma({ start, end: start + len, perm, kind: file ? 'file' : 'mmap', name, file });
    this.events.push({ kind: 'syscall', pid: p.pid, name: 'mmap', detail: `${len} bytes at 0x${start.toString(16)}` });
    return start;
  }

  munmap(p: Process, start: number, bytes: number): void {
    this.machine.charge('syscall', this.machine.cost.syscall);
    const end = start + Math.ceil(bytes / PAGE_SIZE) * PAGE_SIZE;
    this.unmapRange(p, start, end);
    const out: Vma[] = [];
    for (const v of p.vmas) {
      if (v.end <= start || v.start >= end || v.kind === 'heap') out.push(v);
      else {
        if (v.start < start) out.push({ ...v, end: start });
        if (v.end > end) out.push({ ...v, start: end });
      }
    }
    p.vmas = out;
    this.events.push({ kind: 'syscall', pid: p.pid, name: 'munmap', detail: `0x${start.toString(16)}` });
  }

  private unmapRange(p: Process, start: number, end: number): void {
    for (let va = start; va < end; va += PAGE_SIZE) {
      const pte = p.pt.get(va);
      if (pte && has(pte.flags, 'V')) {
        p.pt.unmap(va);
        this.release(pte.ppn);
      }
    }
    this.machine.tlb.flush({ asid: p.asid });
  }

  /** fork: the child gets a copy of the address space; writable pages become shared copy-on-write in both. */
  fork(parent: Process): Process {
    this.machine.charge('syscall', this.machine.cost.syscall);
    const child = this.spawn();
    child.vmas = parent.vmas.map((v) => ({ ...v }));
    child.brkStart = parent.brkStart;
    child.brk = parent.brk;
    child.mmapTop = parent.mmapTop;
    let shared = 0;
    for (const m of [...parent.pt.mappings()]) {
      let flags = m.pte.flags;
      if (has(flags, 'W') || flags & COW) {
        flags = (flags & ~PTE.W) | COW;
        parent.pt.set(m.va, m.pte.ppn, flags);
      }
      child.pt.map(m.va, m.pte.ppn, flags);
      this.refs.set(m.pte.ppn, (this.refs.get(m.pte.ppn) ?? 1) + 1);
      shared++;
    }
    this.machine.tlb.flush({ asid: parent.asid });
    this.events.push({ kind: 'fork', parent: parent.pid, child: child.pid, shared });
    return child;
  }

  exit(p: Process): void {
    for (const m of [...p.pt.mappings()]) this.release(m.pte.ppn);
    p.alive = false;
    p.vmas = [];
    this.processes = this.processes.filter((x) => x !== p);
    this.machine.tlb.flush({ asid: p.asid });
    this.events.push({ kind: 'syscall', pid: p.pid, name: 'exit', detail: '' });
  }

  /** Run `fn` with `p` as the current process (switching satp). */
  as<T>(p: Process, fn: () => T): T {
    const prev = this.current;
    this.switchTo(p);
    try {
      return fn();
    } finally {
      if (prev) this.switchTo(prev);
    }
  }
}
