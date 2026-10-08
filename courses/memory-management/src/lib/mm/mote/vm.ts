/**
 * The Mote virtual machine. Frames (return marker, saved frame pointer, locals and the operand stack) live in a
 * simulated stack that grows downwards; objects live in a simulated heap owned by a memory manager; globals live
 * in a small data segment. Everything a collector needs to see is in simulated memory.
 *
 * Object layout (words):  [ header | aux | field 0 | field 1 | … ]      arrays: [ header | aux | length | elements… ]
 *   header = type id × 16 + flags (mark, forwarded, grey, old)          aux = reference count, or forwarding address
 *
 * The VM also runs the **oracle** (PLAN §8): it records when each object is born, last used, becomes unreachable
 * and is freed, so the lifetime chart can compare every memory manager with the truth.
 */
import { compile, fnAddress, fnFromAddress, retAddress, type Compiled, type FnInfo, type Instr, type TypeInfo } from './compile';
import { MoteError, type Pos } from './syntax';
import { WordMemory } from '../heap/words';
import { HeapError } from '../heap/api';
import { rng } from '../util/random';

export const HDR = 0;
export const AUX = 8;
export const FIELDS = 16;
export const FLAG = { MARK: 1, FORWARDED: 2, GREY: 4, OLD: 8 } as const;

export const STACK_TOP = 0x7fff_f000;
export const DATA_BASE = 0x2_0000;
export const HEAP_BASE = 0x10_0000;

export interface Frame {
  fn: FnInfo;
  pc: number;
  /** Address of the frame's lowest word (the return marker). */
  fp: number;
  /** Operand-stack depth. */
  depth: number;
  /** Ownership setting: slots whose value has been moved out. */
  moved?: Set<number>;
}

export interface ObjRecord {
  id: number;
  type: number;
  addr: number;
  words: number;
  born: number;
  bornPos: Pos;
  lastUse: number;
  uses: number;
  /** First time the oracle found it unreachable. */
  unreachable?: number;
  freed?: number;
  freedBy?: string;
  /** Times the program said `free` for it under a setting that ignores free (ghost ticks). */
  ghostFree?: number;
  moves: number;
}

export type VmEvent =
  | { t: number; kind: 'alloc'; id: number; addr: number }
  | { t: number; kind: 'free'; id: number; addr: number; by: string }
  | { t: number; kind: 'move'; id: number; from: number; to: number }
  | { t: number; kind: 'uaf'; addr: number; was: number; now?: number; pos: Pos; write: boolean }
  | { t: number; kind: 'double-free'; addr: number; was: number; pos: Pos }
  | { t: number; kind: 'invalid-free'; addr: number; pos: Pos }
  | { t: number; kind: 'overflow'; addr: number; arr: number; index: number; length: number; pos: Pos; write: boolean }
  | { t: number; kind: 'gc'; label: string; freed: number; pause: number; live: number }
  | { t: number; kind: 'note'; text: string };

/** A memory manager: how objects are allocated and freed (PLAN §8). */
export interface Manager {
  readonly id: string;
  readonly label: string;
  /** Does `free(p)` do anything? (Only the manual setting.) */
  readonly manual?: boolean;
  /** Ownership semantics: moves, borrows and drops at the end of scopes. */
  readonly ownership?: boolean;
  /** Bounds and use-after-free are unchecked, as in C. */
  readonly unchecked?: boolean;
  attach(vm: Vm): void;
  /** Allocate `words` words for an object of type `type`; may collect. Returns the object's address (header). */
  alloc(type: number, words: number): number;
  free?(obj: number, pos: Pos): void;
  /** Called once a new object's header and fields are initialised. */
  onBorn?(obj: number): void;
  /** Write barrier: a pointer slot changed from `old` to `value`. `holder` is the object holding a field (0 for roots). */
  onStore?(slot: number, old: number, value: number, holder: number, weak: boolean): void;
  /** A pointer was discarded from the operand stack (for reference counting's temporaries). */
  onDiscard?(value: number): void;
  /** A frame is about to be popped (reference counting releases its locals). */
  onFrameExit?(frame: Frame): void;
  /** Start of a statement / a safepoint: incremental work, deferred frees. */
  onStatement?(): void;
  onSafepoint?(): void;
  collect?(reason: string): void;
  atExit?(): void;
  /** A load or store of the word at `addr`, reached through a pointer to `obj` (detectors check it; may throw). */
  access?(obj: number, addr: number, write: boolean, pos: Pos): void;
  /** Words of heap in use and capacity, for the dashboard. */
  usage?(): { used: number; capacity: number };
}

export interface VmOptions {
  heapBytes?: number;
  stackBytes?: number;
  seed?: number;
  /** Run the reachability oracle (default true). */
  oracle?: boolean;
  /** Check reachability every `sample` statements (default: adaptive). */
  sample?: number;
  maxSteps?: number;
  /** Record a snapshot hook after each step (figures). */
  onStep?: (vm: Vm) => void;
}

export class RuntimeError extends MoteError {
  constructor(message: string, pos: Pos) {
    super(message, pos, 'runtime');
  }
}

export class Vm {
  readonly c: Compiled;
  readonly heap: WordMemory;
  readonly stack: WordMemory;
  readonly data: WordMemory;
  frames: Frame[] = [];
  time = 0;
  statements = 0;
  output: string[] = [];
  status: 'ready' | 'running' | 'done' | 'error' = 'ready';
  error?: MoteError;
  objects = new Map<number, ObjRecord>();
  /** Live object id by address. */
  byAddr = new Map<number, number>();
  /** Freed object id by address (until the memory is reused): how use-after-free is recognised. */
  freedAt = new Map<number, number>();
  /** The last object freed at each address (kept after reuse, to name the victim of a type confusion). */
  lastFreedAt = new Map<number, number>();
  events: VmEvent[] = [];
  /** Weak slots and their targets (cleared when the target dies). */
  weakSlots = new Map<number, number>();
  private nextId = 1;
  private random: () => number;
  private sample: number;
  private sinceSample = 0;
  private stackLimit: number;

  constructor(
    src: string | Compiled,
    readonly manager: Manager,
    readonly opts: VmOptions = {},
  ) {
    this.c = typeof src === 'string' ? compile(src) : src;
    this.heap = new WordMemory(HEAP_BASE, opts.heapBytes ?? 1 << 20, 'the heap');
    const stackBytes = opts.stackBytes ?? 64 * 1024;
    this.stack = new WordMemory(STACK_TOP - stackBytes, stackBytes, 'the stack');
    this.stack.brk = this.stack.end;
    this.stackLimit = this.stack.base;
    this.data = new WordMemory(DATA_BASE, Math.max(16, this.c.globals.length * 8 + 16), 'the data segment');
    this.data.brk = this.data.end;
    this.random = rng(opts.seed ?? 42);
    this.sample = opts.sample ?? 1;
    manager.attach(this);
    this.pushFrame(this.c.fns[this.c.init]!, []);
  }

  // ── Types and objects ──

  typeOf(obj: number): TypeInfo {
    const t = this.c.types[Math.floor(this.heap.peek(obj + HDR) / 16)];
    if (t) return t;
    // A header overwritten by an overflow (unchecked settings): the oracle still knows what the object was.
    const r = this.record(obj);
    if (r) return this.c.types[r.type]!;
    if (!t) throw new HeapError(`0x${obj.toString(16)} does not hold an object header (type ${Math.floor(this.heap.peek(obj + HDR) / 16)})`);
    return t;
  }
  /** Size of an object in words, from its header (and length, for arrays). */
  wordsOf(obj: number): number {
    const t = this.typeOf(obj);
    return t.kind === 'array' ? 3 + this.heap.peek(obj + FIELDS) : 2 + t.fields.length;
  }
  static words(t: TypeInfo, len = 0): number {
    return t.kind === 'array' ? 3 + len : 2 + t.fields.length;
  }
  /** Addresses of the object's pointer slots (weak ones only if asked). */
  pointerSlots(obj: number, includeWeak = false): number[] {
    const t = this.typeOf(obj);
    if (t.kind === 'array') {
      if (!t.elemPtr) return [];
      const n = this.heap.peek(obj + FIELDS);
      return Array.from({ length: n }, (_, i) => obj + FIELDS + 8 + i * 8);
    }
    const out: number[] = [];
    t.fields.forEach((f, i) => {
      if (f.ptr && (includeWeak || !f.weak)) out.push(obj + FIELDS + i * 8);
    });
    return out;
  }
  weakSlotsOf(obj: number): number[] {
    const t = this.typeOf(obj);
    if (t.kind === 'array') return [];
    return t.fields.flatMap((f, i) => (f.ptr && f.weak ? [obj + FIELDS + i * 8] : []));
  }
  flags(obj: number): number {
    return this.heap.peek(obj + HDR) % 16;
  }
  setFlags(obj: number, f: number): void {
    const h = this.heap.peek(obj + HDR);
    this.heap.poke(obj + HDR, h - (h % 16) + f);
  }
  /** Write a fresh header (called by managers after allocating). */
  initObject(obj: number, type: number, words: number, len = 0): void {
    this.heap.store64(obj + HDR, type * 16);
    this.heap.store64(obj + AUX, 0);
    for (let i = 2; i < words; i++) this.heap.store64(obj + i * 8, 0);
    if (this.c.types[type]!.kind === 'array') this.heap.store64(obj + FIELDS, len);
  }
  isObject(addr: number): boolean {
    return this.byAddr.has(addr);
  }
  record(addr: number): ObjRecord | undefined {
    const id = this.byAddr.get(addr);
    return id === undefined ? undefined : this.objects.get(id);
  }

  // ── Notifications from managers (keep the oracle in step) ──

  /** A manager freed `obj` (by any means). */
  freed(obj: number, by: string): void {
    const id = this.byAddr.get(obj);
    if (id === undefined) return;
    const r = this.objects.get(id)!;
    r.freed = this.time;
    r.freedBy = by;
    this.byAddr.delete(obj);
    this.freedAt.set(obj, id);
    this.lastFreedAt.set(obj, id);
    this.events.push({ t: this.time, kind: 'free', id, addr: obj, by });
    for (const [slot, target] of this.weakSlots) {
      if (target === obj) {
        this.weakSlots.delete(slot);
        this.pokeAny(slot, 0);
      }
    }
  }
  /** A moving collector moved `from` to `to`. */
  moved(from: number, to: number): void {
    const id = this.byAddr.get(from);
    if (id === undefined) return;
    this.byAddr.delete(from);
    this.byAddr.set(to, id);
    const r = this.objects.get(id)!;
    r.addr = to;
    r.moves++;
    this.events.push({ t: this.time, kind: 'move', id, from, to });
  }
  /** After a moving collection: rebuild the weak-slot bookkeeping from the live objects' weak fields. */
  rebuildWeak(): void {
    this.weakSlots = new Map();
    for (const o of this.byAddr.keys()) {
      for (const s of this.weakSlotsOf(o)) {
        const v = this.heap.peek(s);
        if (v) this.weakSlots.set(s, v);
      }
    }
  }
  note(text: string): void {
    this.events.push({ t: this.time, kind: 'note', text });
  }
  gcEvent(label: string, freed: number, pause: number): void {
    this.events.push({ t: this.time, kind: 'gc', label, freed, pause, live: this.byAddr.size });
  }

  // ── Roots ──

  /** Every precise root slot: pointer locals and operand-stack entries of every frame (per its stack map), and pointer globals. */
  rootSlots(): number[] {
    const out: number[] = [];
    this.frames.forEach((f, k) => {
      f.fn.locals.forEach((l, i) => {
        if (l.ptr) out.push(this.slotAddr(f, i));
      });
      // The top frame is at the instruction being executed; callers are at their call instruction.
      const pc = k === this.frames.length - 1 ? f.pc : f.pc - 1;
      const map = f.fn.maps.get(pc);
      if (map) for (const d of map.stack) out.push(this.opAddr(f, d));
      else for (let d = 0; d < f.depth; d++) out.push(this.opAddr(f, d)); // between safepoints: treat every entry as a candidate
    });
    this.c.globals.forEach((g, i) => {
      if (g.ptr) out.push(DATA_BASE + i * 8);
    });
    return out;
  }

  /** Every word of the stacks and globals in use (what a conservative collector scans). */
  conservativeSlots(): number[] {
    const out: number[] = [];
    for (const f of this.frames) {
      const n = 2 + f.fn.locals.length + f.depth;
      for (let i = 2; i < n; i++) out.push(f.fp + i * 8);
    }
    for (let i = 0; i < this.c.globals.length; i++) out.push(DATA_BASE + i * 8);
    return out;
  }

  /** Read/write any slot (stack, data or heap). */
  peekAny(addr: number): number {
    if (addr >= this.stack.base && addr < this.stack.end) return this.stack.peek(addr);
    if (addr >= DATA_BASE && addr < this.data.end) return this.data.peek(addr);
    return this.heap.peek(addr);
  }
  pokeAny(addr: number, v: number): void {
    if (addr >= this.stack.base && addr < this.stack.end) this.stack.poke(addr, v);
    else if (addr >= DATA_BASE && addr < this.data.end) this.data.poke(addr, v);
    else if (this.heap.contains(addr)) this.heap.poke(addr, v);
  }

  /** Objects reachable from the precise roots (the reachability oracle; ignores weak fields). */
  reachable(): Set<number> {
    const seen = new Set<number>();
    const work: number[] = [];
    for (const s of this.rootSlots()) {
      const v = this.peekAny(s);
      if (this.byAddr.has(v) && !seen.has(v)) {
        seen.add(v);
        work.push(v);
      }
    }
    while (work.length) {
      const o = work.pop()!;
      for (const s of this.pointerSlots(o)) {
        const v = this.heap.peek(s);
        if (this.byAddr.has(v) && !seen.has(v)) {
          seen.add(v);
          work.push(v);
        }
      }
    }
    return seen;
  }

  // ── Frames ──

  slotAddr(f: Frame, i: number): number {
    return f.fp + 16 + i * 8;
  }
  opAddr(f: Frame, d: number): number {
    return f.fp + 16 + (f.fn.locals.length + d) * 8;
  }
  get top(): Frame {
    return this.frames[this.frames.length - 1]!;
  }
  frameWords(fn: FnInfo): number {
    return 2 + fn.locals.length + fn.maxStack;
  }

  private pushFrame(fn: FnInfo, args: number[]): void {
    const callerFp = this.frames.length ? this.top.fp : STACK_TOP;
    const fp = callerFp - this.frameWords(fn) * 8;
    if (fp < this.stackLimit) throw new RuntimeError(`stack overflow: ${this.frames.length} frames deep, the next frame would cross the guard page at 0x${(this.stackLimit - 4096).toString(16)}`, fn.pos);
    const caller = this.frames.length ? this.top : undefined;
    this.stack.store64(fp, caller ? retAddress(caller.fn.id, caller.pc) : 0);
    this.stack.store64(fp + 8, callerFp);
    for (let i = 0; i < fn.locals.length + fn.maxStack; i++) this.stack.poke(fp + 16 + i * 8, 0);
    const f: Frame = { fn, pc: 0, fp, depth: 0, ...(this.manager.ownership ? { moved: new Set<number>() } : {}) };
    this.frames.push(f);
    args.forEach((a, i) => {
      this.stack.store64(this.slotAddr(f, i), a);
      if (fn.locals[i]!.ptr) this.manager.onStore?.(this.slotAddr(f, i), 0, a, 0, false);
    });
  }

  push(v: number): void {
    const f = this.top;
    this.stack.store64(this.opAddr(f, f.depth++), v);
  }
  pop(): number {
    const f = this.top;
    return this.stack.load64(this.opAddr(f, --f.depth));
  }
  peekOp(d = 0): number {
    const f = this.top;
    return this.stack.peek(this.opAddr(f, f.depth - 1 - d));
  }

  // ── Oracle ──

  private use(obj: number, pos: Pos, write: boolean, expected?: number): void {
    const id = this.byAddr.get(obj);
    if (id !== undefined) {
      const r = this.objects.get(id)!;
      if (expected !== undefined && r.type !== expected && this.lastFreedAt.has(obj)) {
        // The pointer's static type says one thing, the memory holds another: a dangling pointer into reused memory.
        const was = this.lastFreedAt.get(obj)!;
        this.events.push({ t: this.time, kind: 'uaf', addr: obj, was, now: id, pos, write });
        const old = this.objects.get(was);
        if (old) old.lastUse = Math.max(old.lastUse, this.time);
        if (!this.manager.unchecked) throw new RuntimeError(`use after free: this ${this.c.types[expected]!.name} pointer now points at a ${this.c.types[r.type]!.name} that reused its memory`, pos);
        return;
      }
      r.lastUse = this.time;
      r.uses++;
      return;
    }
    const was = this.freedAt.get(obj);
    if (was !== undefined) {
      this.events.push({ t: this.time, kind: 'uaf', addr: obj, was, pos, write });
      const r = this.objects.get(was);
      if (r) r.lastUse = Math.max(r.lastUse, this.time);
      if (!this.manager.unchecked) throw new RuntimeError(`use after free: object #${was} at 0x${obj.toString(16)} was freed at step ${r?.freed}`, pos);
      return;
    }
    // A pointer into the middle of reused memory: find which object (if any) now holds this address.
    for (const [a, i] of this.byAddr) {
      const r = this.objects.get(i)!;
      if (obj > a && obj < a + r.words * 8) {
        this.events.push({ t: this.time, kind: 'uaf', addr: obj, was: -1, now: i, pos, write });
        return;
      }
    }
  }

  private checkReachability(): void {
    if (this.opts.oracle === false) return;
    if (++this.sinceSample < this.sample) return;
    this.sinceSample = 0;
    const live = this.byAddr.size;
    this.sample = this.opts.sample ?? Math.max(1, Math.floor(live / 400));
    const reach = this.reachable();
    for (const [addr, id] of this.byAddr) {
      if (reach.has(addr)) continue;
      const r = this.objects.get(id)!;
      if (r.unreachable === undefined) r.unreachable = this.time;
    }
  }

  // ── Execution ──

  private fail(msg: string, pos: Pos): never {
    throw new RuntimeError(msg, pos);
  }

  private ptrCheck(obj: number, pos: Pos, what: string): void {
    if (obj === 0) this.fail(`null pointer dereference (${what} of null)`, pos);
    if (!this.heap.contains(obj)) this.fail(`segmentation fault: 0x${obj.toString(16)} is not in the heap`, pos);
  }

  /** Run one instruction. Returns false when the program has finished. */
  step(): boolean {
    if (this.status === 'done' || this.status === 'error') return false;
    this.status = 'running';
    try {
      this.exec();
    } catch (e) {
      this.status = 'error';
      this.error = e instanceof MoteError ? e : new RuntimeError(e instanceof Error ? e.message : String(e), this.frames.length ? (this.top.fn.code[this.top.pc] ?? this.top.fn.code[this.top.pc - 1])?.pos ?? { line: 0, col: 0 } : { line: 0, col: 0 });
      return false;
    }
    this.opts.onStep?.(this);
    return this.status === 'running';
  }

  run(maxSteps = this.opts.maxSteps ?? 2_000_000): this {
    let n = 0;
    while (this.step()) {
      if (++n >= maxSteps) {
        this.status = 'error';
        this.error = new RuntimeError(`stopped after ${maxSteps} steps (an infinite loop?)`, this.top.fn.code[this.top.pc]?.pos ?? { line: 0, col: 0 });
        break;
      }
    }
    return this;
  }

  /** Run until the next statement starts (for stepping figures). */
  stepStatement(): boolean {
    let first = true;
    while (this.status !== 'done' && this.status !== 'error') {
      const f = this.top;
      const ins = f.fn.code[f.pc];
      if (!first && ins?.stmt && this.frames.length) return true;
      first = false;
      if (!this.step()) return false;
    }
    return false;
  }

  currentPos(): Pos | undefined {
    if (!this.frames.length) return undefined;
    return this.top.fn.code[this.top.pc]?.pos;
  }

  private exec(): void {
    const f = this.top;
    const ins: Instr | undefined = f.fn.code[f.pc];
    if (!ins) this.fail('fell off the end of a function', f.fn.end);
    const { op, a, b, pos } = ins!;
    this.time++;
    if (ins!.stmt) {
      this.statements++;
      this.manager.onStatement?.();
      this.checkReachability();
    }
    f.pc++;
    const own = this.manager.ownership;
    switch (op) {
      case 'CONST':
        this.push(a);
        break;
      case 'STR':
        this.push(a);
        break;
      case 'LOAD':
      case 'MOVE': {
        if (own && f.moved?.has(a)) this.fail(`use of moved value ${f.fn.locals[a]!.name}: it was moved out earlier, so it no longer owns anything`, pos);
        const addr = this.slotAddr(f, a);
        const v = this.stack.load64(addr);
        this.push(v);
        if (op === 'MOVE' && own && v !== 0) {
          this.stack.store64(addr, 0);
          f.moved!.add(a);
        }
        break;
      }
      case 'STORE': {
        const v = this.pop();
        const addr = this.slotAddr(f, a);
        const l = f.fn.locals[a]!;
        const old = this.stack.load64(addr);
        this.stack.store64(addr, v);
        if (l.ptr) {
          this.manager.onStore?.(addr, old, v, 0, false);
          if (own) {
            f.moved?.delete(a);
            if (!l.borrow && old && old !== v) this.drop(old, pos);
          }
        }
        break;
      }
      case 'DROP': {
        // A pointer local goes out of scope: ownership drops what it owns; reference counting releases it.
        const addr = this.slotAddr(f, a);
        const v = this.stack.load64(addr);
        const l = f.fn.locals[a]!;
        if (v) {
          this.stack.store64(addr, 0);
          this.manager.onStore?.(addr, v, 0, 0, false);
          if (own && !l.borrow && !f.moved?.has(a)) this.drop(v, pos);
        }
        f.moved?.delete(a);
        break;
      }
      case 'GLOAD':
      case 'GMOVE': {
        const addr = DATA_BASE + a * 8;
        const v = this.data.load64(addr);
        this.push(v);
        if (op === 'GMOVE' && own && v) this.data.store64(addr, 0);
        break;
      }
      case 'GSTORE': {
        const v = this.pop();
        const addr = DATA_BASE + a * 8;
        const old = this.data.load64(addr);
        this.data.store64(addr, v);
        if (this.c.globals[a]!.ptr) {
          this.manager.onStore?.(addr, old, v, 0, false);
          if (own && old && old !== v) this.drop(old, pos);
        }
        break;
      }
      case 'NEW': {
        f.pc--; // the collector sees this instruction's stack map while it allocates
        const t = this.c.types[a]!;
        const words = Vm.words(t);
        const obj = this.manager.alloc(a, words);
        f.pc++;
        if (!obj) this.fail(`out of memory: could not allocate a ${t.name} (${words * 8} bytes)`, pos);
        this.initObject(obj, a, words);
        this.born(obj, a, words, pos);
        this.manager.onBorn?.(obj);
        for (let i = b - 1; i >= 0; i--) {
          const v = this.pop();
          const slot = obj + FIELDS + i * 8;
          this.heap.store64(slot, v);
          const fi = t.fields[i]!;
          if (fi.ptr && v) {
            this.manager.onStore?.(slot, 0, v, obj, fi.weak);
            if (fi.weak) this.weakSlots.set(slot, v);
          }
        }
        this.push(obj);
        break;
      }
      case 'NEWARR': {
        const len = this.peekOp();
        if (len < 0) this.fail(`negative array length ${len}`, pos);
        f.pc--;
        const t = this.c.types[a]!;
        const words = Vm.words(t, len);
        const obj = this.manager.alloc(a, words);
        f.pc++;
        this.pop();
        if (!obj) this.fail(`out of memory: could not allocate ${t.name} of ${len} (${words * 8} bytes)`, pos);
        this.initObject(obj, a, words, len);
        this.born(obj, a, words, pos);
        this.manager.onBorn?.(obj);
        this.push(obj);
        break;
      }
      case 'GETF': {
        const obj = this.pop();
        this.ptrCheck(obj, pos, 'field read');
        this.use(obj, pos, false, ins!.ty);
        const slot = obj + FIELDS + a * 8;
        this.manager.access?.(obj, slot, false, pos);
        const v = this.heap.load64(slot);
        if (b && own && v) this.heap.store64(slot, 0);
        this.push(v);
        break;
      }
      case 'SETF': {
        const v = this.pop();
        const obj = this.pop();
        this.ptrCheck(obj, pos, 'field write');
        this.use(obj, pos, true, ins!.ty);
        const slot = obj + FIELDS + a * 8;
        this.manager.access?.(obj, slot, true, pos);
        const old = this.heap.load64(slot);
        this.heap.store64(slot, v);
        const t = this.byAddr.has(obj) ? this.typeOf(obj) : undefined;
        const fi = t?.kind === 'struct' ? t.fields[a] : undefined;
        if (fi?.ptr) {
          this.manager.onStore?.(slot, old, v, obj, fi.weak);
          if (fi.weak) {
            if (v) this.weakSlots.set(slot, v);
            else this.weakSlots.delete(slot);
          } else if (own && old && old !== v) this.drop(old, pos);
        }
        break;
      }
      case 'GETI':
      case 'SETI': {
        const v = op === 'SETI' ? this.pop() : 0;
        const i = this.pop();
        const arr = this.pop();
        this.ptrCheck(arr, pos, op === 'GETI' ? 'index' : 'indexed write');
        this.use(arr, pos, op === 'SETI', ins!.ty);
        this.manager.access?.(arr, arr + FIELDS, false, pos);
        const len = this.heap.load64(arr + FIELDS);
        const slot = arr + FIELDS + 8 + i * 8;
        if (i < 0 || i >= len) {
          this.events.push({ t: this.time, kind: 'overflow', addr: slot, arr, index: i, length: len, pos, write: op === 'SETI' });
          if (!this.manager.unchecked) this.fail(`index ${i} is out of bounds for an array of length ${len}`, pos);
        }
        this.manager.access?.(arr, slot, op === 'SETI', pos);
        if (op === 'GETI') {
          const x = this.heap.load64(slot);
          if (a && own && x) this.heap.store64(slot, 0);
          this.push(x);
        } else {
          const old = this.heap.contains(slot) ? this.heap.load64(slot) : 0;
          this.heap.store64(slot, v);
          const t = this.byAddr.has(arr) ? this.typeOf(arr) : undefined;
          if (t?.elemPtr && i >= 0 && i < len) {
            this.manager.onStore?.(slot, old, v, arr, false);
            if (own && old && old !== v) this.drop(old, pos);
          }
        }
        break;
      }
      case 'LEN': {
        const arr = this.pop();
        this.ptrCheck(arr, pos, 'length');
        this.use(arr, pos, false);
        this.manager.access?.(arr, arr + FIELDS, false, pos);
        this.push(this.heap.load64(arr + FIELDS));
        break;
      }
      case 'FN':
        this.push(fnAddress(a));
        break;
      case 'CALL':
      case 'CALLV': {
        const n = op === 'CALL' ? b : a;
        const args: number[] = [];
        for (let i = 0; i < n; i++) args.unshift(this.pop());
        let callee: FnInfo;
        if (op === 'CALL') callee = this.c.fns[a]!;
        else {
          const target = this.pop();
          const id = fnFromAddress(target);
          const fn = id > 0 ? this.c.fns[id] : undefined;
          if (!fn) this.fail(`call through a corrupted function pointer: 0x${target.toString(16)} is not the address of any function`, pos);
          if (fn!.params.length !== n) this.note(`type confusion: called ${fn!.name}, which expects ${fn!.params.length} argument(s), with ${n}`);
          callee = fn!;
          while (args.length < callee.params.length) args.push(0);
          args.length = callee.params.length;
        }
        this.pushFrame(callee, args);
        this.manager.onSafepoint?.();
        break;
      }
      case 'RET':
      case 'RETV': {
        const v = op === 'RET' ? this.pop() : 0;
        this.leaveFrame(pos);
        if (this.frames.length === 0) {
          this.finishInit();
          break;
        }
        if (op === 'RET') this.push(v);
        break;
      }
      case 'JMP': {
        if (a < f.pc) {
          f.pc--; // the collector sees the back edge's stack map
          this.manager.onSafepoint?.();
        }
        f.pc = a;
        break;
      }
      case 'JZ':
        if (!this.pop()) f.pc = a;
        break;
      case 'JNZ':
        if (this.pop()) f.pc = a;
        break;
      case 'POP': {
        const v = this.pop();
        if (v && this.byAddr.has(v)) this.manager.onDiscard?.(v);
        break;
      }
      case 'DUP':
        this.push(this.peekOp());
        break;
      case 'NEG':
        this.push(-this.pop());
        break;
      case 'NOT':
        this.push(this.pop() ? 0 : 1);
        break;
      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV':
      case 'MOD':
      case 'EQ':
      case 'NE':
      case 'LT':
      case 'LE':
      case 'GT':
      case 'GE': {
        const r = this.pop();
        const l = this.pop();
        let x = 0;
        switch (op) {
          case 'ADD': x = l + r; break;
          case 'SUB': x = l - r; break;
          case 'MUL': x = l * r; break;
          case 'DIV': if (r === 0) this.fail('division by zero', pos); x = Math.trunc(l / r); break;
          case 'MOD': if (r === 0) this.fail('division by zero', pos); x = l % r; break;
          case 'EQ': x = +(l === r); break;
          case 'NE': x = +(l !== r); break;
          case 'LT': x = +(l < r); break;
          case 'LE': x = +(l <= r); break;
          case 'GT': x = +(l > r); break;
          case 'GE': x = +(l >= r); break;
        }
        if (!Number.isSafeInteger(x)) this.fail('integer overflow', pos);
        this.push(x);
        break;
      }
      case 'PRINT': {
        const kinds = ins!.kinds ?? '';
        const vals: number[] = [];
        for (let i = 0; i < a; i++) vals.unshift(this.pop());
        this.output.push(vals.map((v, i) => {
          const k = kinds[i];
          if (k === 's') return this.c.strings[v] ?? '';
          if (k === 'b') return v ? 'true' : 'false';
          if (k === 'p') return v ? `0x${v.toString(16)}` : 'null';
          if (k === 'f') return fnFromAddress(v) > 0 ? this.c.fns[fnFromAddress(v)]!.name : `0x${v.toString(16)}`;
          return String(v);
        }).join(' '));
        if (this.output.length > 2000) this.output.splice(0, this.output.length - 2000);
        break;
      }
      case 'FREE': {
        const p = this.pop();
        if (p === 0) break;
        if (!this.manager.manual) {
          const r = this.record(p);
          if (r) r.ghostFree = this.time;
          break;
        }
        if (!this.byAddr.has(p)) {
          if (this.freedAt.has(p)) {
            this.events.push({ t: this.time, kind: 'double-free', addr: p, was: this.freedAt.get(p)!, pos });
            if (!this.manager.unchecked) this.fail(`double free of object #${this.freedAt.get(p)} at 0x${p.toString(16)}`, pos);
          } else {
            this.events.push({ t: this.time, kind: 'invalid-free', addr: p, pos });
            if (!this.manager.unchecked) this.fail(`free of 0x${p.toString(16)}, which malloc never returned`, pos);
          }
        }
        this.manager.free!(p, pos);
        break;
      }
      case 'GC':
        f.pc--;
        this.manager.collect?.('gc()');
        f.pc++;
        break;
      case 'ASSERT':
        if (!this.pop()) this.fail('assertion failed', pos);
        break;
      case 'RAND': {
        const n = this.pop();
        this.push(n > 0 ? Math.floor(this.random() * n) : 0);
        break;
      }
    }
  }

  private born(obj: number, type: number, words: number, pos: Pos): void {
    const id = this.nextId++;
    // Memory that was freed and is now reused: forget the old occupant for use-after-free purposes, but remember
    // that a dangling pointer to it now reaches a different object (type confusion).
    for (let k = 0; k < words; k++) this.freedAt.delete(obj + k * 8);
    this.byAddr.set(obj, id);
    this.objects.set(id, { id, type, addr: obj, words, born: this.time, bornPos: pos, lastUse: this.time, uses: 0, moves: 0 });
    this.events.push({ t: this.time, kind: 'alloc', id, addr: obj });
  }

  private leaveFrame(pos: Pos): void {
    const f = this.top;
    this.manager.onFrameExit?.(f);
    if (this.manager.ownership) {
      f.fn.locals.forEach((l, i) => {
        if (!l.ptr || l.borrow || f.moved?.has(i)) return;
        const v = this.stack.peek(this.slotAddr(f, i));
        if (v) this.drop(v, pos);
      });
    }
    this.frames.pop();
  }

  /** Ownership: free `obj` and everything it owns (non-weak pointer fields), with a work list. */
  drop(obj: number, pos: Pos): void {
    const work = [obj];
    while (work.length) {
      const o = work.pop()!;
      if (!this.byAddr.has(o)) continue;
      for (const s of this.pointerSlots(o)) {
        const v = this.heap.peek(s);
        if (v) work.push(v);
      }
      this.manager.free!(o, pos);
    }
  }

  private finishInit(): void {
    // $init returned: start main. main returning ends the program.
    if (!this.mainStarted) {
      this.mainStarted = true;
      this.pushFrame(this.c.fns[this.c.main]!, []);
      return;
    }
    this.status = 'done';
    this.checkReachabilityNow();
    this.manager.atExit?.();
  }
  private mainStarted = false;

  private checkReachabilityNow(): void {
    if (this.opts.oracle === false) return;
    const reach = this.reachable();
    for (const [addr, id] of this.byAddr) {
      const r = this.objects.get(id)!;
      if (!reach.has(addr) && r.unreachable === undefined) r.unreachable = this.time;
    }
  }

  /** Summary for the lifetime chart and badges. */
  summary() {
    const objs = [...this.objects.values()];
    const live = objs.filter((o) => o.freed === undefined);
    return {
      steps: this.time,
      allocated: objs.length,
      freed: objs.length - live.length,
      leaked: this.status === 'done' ? live.filter((o) => o.unreachable !== undefined).length : 0,
      stillLive: live.length,
      uaf: this.events.filter((e) => e.kind === 'uaf').length,
      doubleFree: this.events.filter((e) => e.kind === 'double-free').length,
      unsafeFrees: objs.filter((o) => o.freed !== undefined && o.lastUse > o.freed).length,
      dragSteps: objs.reduce((n, o) => n + ((o.freed ?? this.time) - o.lastUse), 0),
    };
  }
}
