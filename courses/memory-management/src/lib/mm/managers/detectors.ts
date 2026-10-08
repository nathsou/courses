/**
 * Memory-error detectors for chapter 16's sanitiser goggles. Each is manual memory management (as in C: the VM's
 * own checks are off) with a detector bolted on, a deliberately small model of a family of real tools:
 *
 *   - guard pages, in the style of Electric Fence: every block ends against an inaccessible page, and freed
 *     memory is made inaccessible and never reused;
 *   - redzones, shadow memory and a quarantine, in the style of AddressSanitizer: one shadow byte per 8 bytes of
 *     heap says whether those bytes may be touched, blocks are surrounded by poisoned redzones, and freed blocks
 *     wait in a FIFO quarantine before they are reused; a leak check runs at exit;
 *   - a hardened free list, in the style of the checks in glibc's tcache: freeing a block that is already on a
 *     free list is refused, and nothing else is checked.
 *
 * A detector stops the program by throwing a RuntimeError whose message mimics the tool's report.
 */
import { segregated, sizeClasses } from '../heap/allocators';
import type { Allocator } from '../heap/api';
import { RuntimeError, Vm } from '../mote/vm';
import type { Pos } from '../mote/syntax';
import { ManualManager } from './managers';

const hex = (n: number) => `0x${n.toString(16)}`;

export interface DetectorReport {
  kind: string;
  message: string;
  line: number;
}

export abstract class Detector extends ManualManager {
  /** Shadow or page checks performed: the detector's run-time cost. */
  checks = 0;
  report?: DetectorReport;
  /** Leak reports at exit (only the detectors that check). */
  leaks: string[] = [];
  abstract readonly blurb: string;
  /** What the detector costs in memory, in words. */
  abstract readonly memory: string;
  constructor() {
    super(sizeClasses);
  }
  protected stop(kind: string, message: string, pos: Pos): never {
    this.report = { kind, message, line: pos.line };
    throw new RuntimeError(message, pos);
  }
  /** Called by the goggles after a run that finished normally. */
  atExitCheck(_vm: Vm): void {}
}

/** No detector at all: C as it comes. */
export class NoDetector extends Detector {
  readonly id = 'none';
  readonly label = 'No detector';
  readonly blurb = 'Plain malloc and free.';
  readonly memory = 'Nothing extra.';
}

/** Guard pages: each block is placed so that it ends where an inaccessible page begins. */
export class GuardPages extends Detector {
  readonly id = 'guard';
  readonly label = 'Guard pages';
  readonly blurb = 'Every block ends against an inaccessible page; freed blocks become inaccessible and are never reused.';
  readonly memory = 'At least a page and a guard page (8 KiB) per block, and freed memory is never reused.';
  static readonly PAGE = 4096;
  private protectedPages = new Set<number>();
  private freedPages = new Set<number>();
  private blocks = new Map<number, number>(); // block → bytes
  attach(vm: Vm): void {
    super.attach(vm);
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    const bytes = words * 8;
    const pages = Math.ceil(bytes / GuardPages.PAGE);
    const region = this.vm.heap.sbrk((pages + 1) * GuardPages.PAGE);
    if (region < 0) return 0;
    const guard = region + pages * GuardPages.PAGE;
    this.protectedPages.add(guard / GuardPages.PAGE);
    const obj = guard - bytes;
    this.blocks.set(obj, bytes);
    return obj;
  }
  free(obj: number, pos: Pos): void {
    const bytes = this.blocks.get(obj);
    const page = Math.floor(obj / GuardPages.PAGE);
    if (this.freedPages.has(page) && bytes === undefined) this.stop('double-free', `guard-page allocator: free(${hex(obj)}): that memory is already free`, pos);
    if (bytes === undefined) this.stop('invalid-free', `guard-page allocator: free(${hex(obj)}): not an address malloc returned`, pos);
    this.stats.frees++;
    this.vm.freed(obj, 'free()');
    this.blocks.delete(obj);
    for (let p = page; p * GuardPages.PAGE < obj + bytes!; p++) {
      this.protectedPages.add(p);
      this.freedPages.add(p);
    }
  }
  access(_obj: number, addr: number, write: boolean, pos: Pos): void {
    this.checks++;
    const page = Math.floor(addr / GuardPages.PAGE);
    if (this.protectedPages.has(page)) {
      const what = this.freedPages.has(page) ? 'freed memory' : 'the guard page after a block';
      this.stop(this.freedPages.has(page) ? 'use-after-free' : 'overflow', `segmentation fault: ${write ? 'write to' : 'read of'} ${hex(addr)}, in ${what} (the page is inaccessible)`, pos);
    }
  }
}

const RED = -1;
const FREED = -2;

/** Redzones, shadow memory and a quarantine. */
export class Redzones extends Detector {
  readonly id = 'redzones';
  readonly label = 'Redzones + quarantine';
  readonly blurb = 'One shadow byte per 8 bytes; poisoned redzones around every block; freed blocks quarantined before reuse; a leak check at exit.';
  readonly memory = '32 bytes of redzone per block, one shadow byte per 8 bytes of heap, and the quarantine (2 KiB here).';
  static readonly RZ = 16;
  static readonly QUARANTINE = 2048;
  private inner!: Allocator;
  /** Shadow memory: one entry per 8-byte granule, 0 when addressable (absent), RED or FREED otherwise. */
  shadow = new Map<number, number>();
  private blocks = new Map<number, { raw: number; bytes: number }>();
  private quarantine: number[] = [];
  private quarantined = 0;
  attach(vm: Vm): void {
    super.attach(vm);
    this.inner = segregated(10)(vm.heap);
  }
  private poison(from: number, bytes: number, code: number): void {
    for (let a = from; a < from + bytes; a += 8) {
      if (code === 0) this.shadow.delete(a / 8);
      else this.shadow.set(a / 8, code);
    }
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    const bytes = words * 8;
    const raw = this.inner.malloc(bytes + 2 * Redzones.RZ);
    if (!raw) return 0;
    const obj = raw + Redzones.RZ;
    this.poison(raw, Redzones.RZ, RED);
    this.poison(obj, bytes, 0);
    this.poison(obj + bytes, Redzones.RZ, RED);
    this.blocks.set(obj, { raw, bytes });
    return obj;
  }
  free(obj: number, pos: Pos): void {
    const shadow = this.shadow.get(obj / 8);
    if (shadow === FREED) this.stop('double-free', `AddressSanitizer-style report: attempting double-free on ${hex(obj)}`, pos);
    const b = this.blocks.get(obj);
    if (!b) this.stop('invalid-free', `AddressSanitizer-style report: attempting free on address which was not malloc()-ed: ${hex(obj)}`, pos);
    this.stats.frees++;
    this.vm.freed(obj, 'free()');
    this.blocks.delete(obj);
    this.poison(obj, b!.bytes, FREED);
    this.quarantine.push(obj);
    this.quarantined += b!.bytes + 2 * Redzones.RZ;
    this.qInfo.set(obj, b!);
    while (this.quarantined > Redzones.QUARANTINE && this.quarantine.length > 1) {
      const old = this.quarantine.shift()!;
      const ob = this.qInfo.get(old)!;
      this.qInfo.delete(old);
      this.quarantined -= ob.bytes + 2 * Redzones.RZ;
      this.inner.free(ob.raw);
    }
  }
  private qInfo = new Map<number, { raw: number; bytes: number }>();
  access(_obj: number, addr: number, write: boolean, pos: Pos): void {
    this.checks++;
    const s = this.shadow.get(Math.floor(addr / 8));
    if (s === RED) this.stop('overflow', `AddressSanitizer-style report: heap-buffer-overflow: ${write ? 'WRITE' : 'READ'} of size 8 at ${hex(addr)}, in a redzone`, pos);
    if (s === FREED) this.stop('use-after-free', `AddressSanitizer-style report: heap-use-after-free: ${write ? 'WRITE' : 'READ'} of size 8 at ${hex(addr)}`, pos);
  }
  atExitCheck(vm: Vm): void {
    for (const r of vm.objects.values()) {
      if (r.freed === undefined) this.leaks.push(`${r.words * 8} bytes in 1 object allocated at line ${r.bornPos.line}`);
    }
  }
  /** Bytes of shadow memory, redzones and quarantine. */
  overhead(): number {
    return Math.ceil((this.vm.heap.peakBrk - this.vm.heap.base) / 8);
  }
}

/** A hardened free list: freeing a block already on a free list is refused. */
export class HardenedFreeList extends Detector {
  readonly id = 'hardened';
  readonly label = 'Hardened free list';
  readonly blurb = 'Before freeing a block, check whether it is already on a free list. Nothing else is checked.';
  readonly memory = 'Nothing extra.';
  private free_ = new Set<number>();
  alloc(type: number, words: number): number {
    const p = super.alloc(type, words);
    this.free_.delete(p);
    return p;
  }
  free(obj: number, pos: Pos): void {
    if (this.free_.has(obj)) this.stop('double-free', `free(): double free detected (${hex(obj)} is already on the free list)`, pos);
    this.free_.add(obj);
    super.free(obj, pos);
  }
}

export const DETECTORS = [
  () => new NoDetector(),
  () => new GuardPages(),
  () => new Redzones(),
  () => new HardenedFreeList(),
];

export interface GoggleResult {
  detector: string;
  /** The detector stopped the program (or, for leaks, reported one at exit) with the right kind of report. */
  caught: boolean;
  report?: DetectorReport;
  leaks: string[];
  output: string[];
  /** Peak heap, in bytes, including everything the detector added. */
  heapBytes: number;
  checks: number;
  status: string;
}

/** Run a zoo program under one detector. */
export function runUnder(src: string, make: () => Detector, error: string): GoggleResult {
  const d = make();
  const vm = new Vm(src, d, { heapBytes: 1 << 22 });
  try {
    vm.run();
  } catch {
    /* the VM records errors in its status */
  }
  if (vm.status === 'done') d.atExitCheck(vm);
  const caught = error === 'leak' ? d.leaks.length > 0 : d.report?.kind === error;
  return { detector: d.id, caught, report: d.report, leaks: d.leaks, output: vm.output, heapBytes: vm.heap.peakBrk - vm.heap.base, checks: d.checks, status: vm.status };
}
