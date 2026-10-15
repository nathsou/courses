/**
 * Signals: three ways to propagate a change through a graph of values, behind one interface.
 *
 *   const a = engine.signal(1);
 *   const double = engine.computed(() => a.get() * 2);
 *   engine.effect(() => console.log(double.get()));
 *   a.set(2); // logs 4
 *
 * - `eager`: the observer pattern. A change notifies subscribers immediately and they recompute at once. Simple, and
 *   wrong: a node that depends on one source through two paths is recomputed against a half-updated graph (a *glitch*).
 * - `topological`: changes are processed in order of each node's *height* (its distance from the sources), so every
 *   node runs after everything it depends on. Glitch-free, but it recomputes nodes nobody reads.
 * - `colour`: Reactively's three-colour algorithm (the ancestor of the cores of Solid 2, Preact Signals and Angular
 *   signals, which differ in details). A change marks direct dependents DIRTY and everything downstream CHECK; nothing
 *   is recomputed until something reads it, and a CHECK node first asks its sources whether they really changed.
 *
 * All three record a trace of what they did (when `engine.tracing` is on) so that figures can replay a propagation.
 * Only `colour` has ownership (roots, cleanups and automatic disposal of nested effects): it is the one the rest of
 * the course builds on, exported at the bottom as `signal`, `computed`, `effect`, `batch`, `untracked`, `createRoot`
 * and `onCleanup`.
 */

export type Strategy = 'eager' | 'topological' | 'colour';
export type NodeKind = 'signal' | 'computed' | 'effect';
export type NodeState = 'clean' | 'check' | 'dirty';

export interface TraceEvent {
  type:
    | 'set' // a signal was written
    | 'mark' // a node was marked dirty or check
    | 'run' // a computed was recomputed or an effect ran
    | 'skip' // a node that was marked check turned out to be up to date
    | 'cutoff' // a node recomputed to the same value: propagation stops here
    | 'queue'; // an effect was queued
  node: number;
  detail?: string;
}

export interface GraphNode {
  id: number;
  label: string;
  kind: NodeKind;
  state: NodeState;
  value: unknown;
  runs: number;
  /** Ids of the nodes this one read the last time it ran. */
  sources: number[];
}

export interface Options<T> {
  label?: string;
  equals?: (a: T, b: T) => boolean;
}

export interface Signal<T> {
  readonly id: number;
  get(): T;
  peek(): T;
  set(value: T): void;
  update(fn: (prev: T) => T): void;
}

export interface Computed<T> {
  readonly id: number;
  get(): T;
  peek(): T;
}

export interface Engine {
  readonly strategy: Strategy;
  signal<T>(initial: T, opts?: Options<T>): Signal<T>;
  computed<T>(fn: () => T, opts?: Options<T>): Computed<T>;
  /** Runs `fn` now and whenever what it read changes. `fn` may return a cleanup. Returns a disposer. */
  effect(fn: () => void | (() => void), opts?: { label?: string }): () => void;
  batch<T>(fn: () => T): T;
  untracked<T>(fn: () => T): T;
  /** Run `fn` as the owner of everything created inside it; returns its result and a function that disposes it all. */
  createRoot<T>(fn: (dispose: () => void) => T): T;
  /** Register a cleanup with the running effect or root. */
  onCleanup(fn: () => void): void;
  tracing: boolean;
  readonly trace: TraceEvent[];
  /** A snapshot of the graph, for drawing. */
  graph(): GraphNode[];
}

const same = <T>(a: T, b: T) => Object.is(a, b);
let nextId = 1;

abstract class Base implements Engine {
  abstract readonly strategy: Strategy;
  tracing = false;
  readonly trace: TraceEvent[] = [];
  protected all: BaseNode[] = [];
  private counters = { signal: 0, computed: 0, effect: 0 };

  abstract signal<T>(initial: T, opts?: Options<T>): Signal<T>;
  abstract computed<T>(fn: () => T, opts?: Options<T>): Computed<T>;
  abstract effect(fn: () => void | (() => void), opts?: { label?: string }): () => void;
  abstract batch<T>(fn: () => T): T;
  abstract untracked<T>(fn: () => T): T;

  createRoot<T>(fn: (dispose: () => void) => T): T {
    return fn(() => {});
  }
  onCleanup(): void {}

  protected note(type: TraceEvent['type'], node: BaseNode, detail?: string): void {
    if (this.tracing) this.trace.push({ type, node: node.id, detail });
  }
  protected label(kind: NodeKind, given?: string): string {
    return given ?? `${kind === 'signal' ? 's' : kind === 'computed' ? 'c' : 'e'}${++this.counters[kind]}`;
  }
  graph(): GraphNode[] {
    return this.all
      .filter((n) => !n.dead && n.kind !== 'root')
      .map((n) => ({ id: n.id, label: n.label, kind: n.kind as NodeKind, state: n.stateName(), value: n.kind === 'effect' ? undefined : n.value, runs: n.runs, sources: n.sourceIds() }));
  }
}

abstract class BaseNode {
  id = nextId++;
  value: unknown;
  runs = 0;
  dead = false;
  abstract kind: NodeKind | 'root';
  abstract label: string;
  abstract stateName(): NodeState;
  abstract sourceIds(): number[];
}

// ══════════════════════════════════════════════════════════════════════════
// 1. Eager: the observer pattern
// ══════════════════════════════════════════════════════════════════════════

class ENode extends BaseNode {
  subs = new Set<ENode>();
  deps = new Set<ENode>();
  cleanup?: () => void;
  constructor(
    public kind: NodeKind,
    public label: string,
    public fn: (() => unknown) | null,
    public equals: (a: any, b: any) => boolean,
    value?: unknown,
  ) {
    super();
    this.value = value;
  }
  stateName(): NodeState {
    return 'clean';
  }
  sourceIds(): number[] {
    return [...this.deps].map((d) => d.id);
  }
}

export class EagerEngine extends Base {
  readonly strategy = 'eager' as const;
  private current: ENode | null = null;
  private batchDepth = 0;
  private pending = new Set<ENode>();

  private track(node: ENode): void {
    if (this.current && this.current !== node) {
      node.subs.add(this.current);
      this.current.deps.add(node);
    }
  }

  /** Run a node's function, re-collecting its dependencies. */
  private run(node: ENode): void {
    if (node.dead) return;
    for (const d of node.deps) d.subs.delete(node);
    node.deps.clear();
    if (node.kind === 'effect' && typeof node.cleanup === 'function') node.cleanup();
    const outer = this.current;
    this.current = node;
    node.runs++;
    this.note('run', node);
    try {
      const out = node.fn!();
      if (node.kind === 'effect') node.cleanup = typeof out === 'function' ? (out as () => void) : undefined;
      else if (!node.equals(node.value, out)) {
        node.value = out;
        this.notify(node);
      } else this.note('cutoff', node);
    } finally {
      this.current = outer;
    }
  }

  private notify(node: ENode): void {
    for (const sub of [...node.subs]) {
      if (this.batchDepth > 0) this.pending.add(sub);
      else this.run(sub);
    }
  }

  signal<T>(initial: T, opts: Options<T> = {}): Signal<T> {
    const node = new ENode('signal', this.label('signal', opts.label), null, opts.equals ?? same, initial);
    this.all.push(node);
    const handle: Signal<T> = {
      id: node.id,
      get: () => (this.track(node), node.value as T),
      peek: () => node.value as T,
      set: (v) => {
        if (node.equals(node.value, v)) return;
        node.value = v;
        this.note('set', node);
        this.notify(node);
      },
      update: (fn) => handle.set(fn(node.value as T)),
    };
    return handle;
  }

  /** In this engine a computed is eager: it runs when created and again, at once, whenever a source changes. */
  computed<T>(fn: () => T, opts: Options<T> = {}): Computed<T> {
    const node = new ENode('computed', this.label('computed', opts.label), fn, opts.equals ?? same);
    this.all.push(node);
    this.run(node);
    return { id: node.id, get: () => (this.track(node), node.value as T), peek: () => node.value as T };
  }

  effect(fn: () => void | (() => void), opts: { label?: string } = {}): () => void {
    const node = new ENode('effect', this.label('effect', opts.label), fn, same);
    this.all.push(node);
    this.run(node);
    return () => {
      node.dead = true;
      for (const d of node.deps) d.subs.delete(node);
      if (typeof node.cleanup === 'function') node.cleanup();
    };
  }

  batch<T>(fn: () => T): T {
    this.batchDepth++;
    try {
      return fn();
    } finally {
      if (--this.batchDepth === 0) {
        const todo = [...this.pending];
        this.pending.clear();
        for (const n of todo) this.run(n);
      }
    }
  }

  untracked<T>(fn: () => T): T {
    const outer = this.current;
    this.current = null;
    try {
      return fn();
    } finally {
      this.current = outer;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Topological: run nodes in order of height
// ══════════════════════════════════════════════════════════════════════════

class TNode extends BaseNode {
  subs = new Set<TNode>();
  deps = new Set<TNode>();
  height = 0;
  cleanup?: () => void;
  constructor(
    public kind: NodeKind,
    public label: string,
    public fn: (() => unknown) | null,
    public equals: (a: any, b: any) => boolean,
    value?: unknown,
  ) {
    super();
    this.value = value;
  }
  stateName(): NodeState {
    return 'clean';
  }
  sourceIds(): number[] {
    return [...this.deps].map((d) => d.id);
  }
}

export class TopologicalEngine extends Base {
  readonly strategy = 'topological' as const;
  private current: TNode | null = null;
  private batchDepth = 0;
  private queue = new Set<TNode>();
  private flushing = false;

  private track(node: TNode): void {
    if (this.current && this.current !== node) {
      node.subs.add(this.current);
      this.current.deps.add(node);
    }
  }

  private raise(node: TNode, h: number): void {
    if (node.height >= h) return;
    node.height = h;
    for (const s of node.subs) this.raise(s, h + 1);
  }

  private run(node: TNode): void {
    if (node.dead) return;
    for (const d of node.deps) d.subs.delete(node);
    node.deps.clear();
    if (node.kind === 'effect' && typeof node.cleanup === 'function') node.cleanup();
    const outer = this.current;
    this.current = node;
    node.runs++;
    this.note('run', node);
    let changed = false;
    try {
      const out = node.fn!();
      if (node.kind === 'effect') node.cleanup = typeof out === 'function' ? (out as () => void) : undefined;
      else if (!node.equals(node.value, out)) {
        node.value = out;
        changed = true;
      } else this.note('cutoff', node);
    } finally {
      this.current = outer;
    }
    let h = 0;
    for (const d of node.deps) h = Math.max(h, d.height + 1);
    this.raise(node, h);
    if (changed) for (const s of node.subs) this.enqueue(s);
  }

  private enqueue(node: TNode): void {
    if (this.queue.has(node)) return;
    this.queue.add(node);
    this.note('queue', node);
  }

  private flush(): void {
    if (this.flushing || this.batchDepth > 0) return;
    this.flushing = true;
    try {
      let guard = 0;
      while (this.queue.size) {
        if (guard++ > 1000) throw new Error('Maximum update depth exceeded: the graph never settles.');
        let next: TNode | null = null;
        for (const n of this.queue) if (!next || n.height < next.height) next = n;
        this.queue.delete(next!);
        this.run(next!);
      }
    } finally {
      this.flushing = false;
    }
  }

  signal<T>(initial: T, opts: Options<T> = {}): Signal<T> {
    const node = new TNode('signal', this.label('signal', opts.label), null, opts.equals ?? same, initial);
    this.all.push(node);
    const handle: Signal<T> = {
      id: node.id,
      get: () => (this.track(node), node.value as T),
      peek: () => node.value as T,
      set: (v) => {
        if (node.equals(node.value, v)) return;
        node.value = v;
        this.note('set', node);
        for (const s of node.subs) this.enqueue(s);
        this.flush();
      },
      update: (fn) => handle.set(fn(node.value as T)),
    };
    return handle;
  }

  computed<T>(fn: () => T, opts: Options<T> = {}): Computed<T> {
    const node = new TNode('computed', this.label('computed', opts.label), fn, opts.equals ?? same);
    this.all.push(node);
    this.run(node);
    return { id: node.id, get: () => (this.track(node), node.value as T), peek: () => node.value as T };
  }

  effect(fn: () => void | (() => void), opts: { label?: string } = {}): () => void {
    const node = new TNode('effect', this.label('effect', opts.label), fn, same);
    this.all.push(node);
    this.run(node);
    return () => {
      node.dead = true;
      this.queue.delete(node);
      for (const d of node.deps) d.subs.delete(node);
      if (typeof node.cleanup === 'function') node.cleanup();
    };
  }

  batch<T>(fn: () => T): T {
    this.batchDepth++;
    try {
      return fn();
    } finally {
      this.batchDepth--;
      this.flush();
    }
  }

  untracked<T>(fn: () => T): T {
    const outer = this.current;
    this.current = null;
    try {
      return fn();
    } finally {
      this.current = outer;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Colour: lazy, three-state, with ownership
// ══════════════════════════════════════════════════════════════════════════

const CLEAN = 0;
const CHECK = 1;
const DIRTY = 2;
type Colour = typeof CLEAN | typeof CHECK | typeof DIRTY;

class CNode extends BaseNode {
  state: Colour = CLEAN;
  sources: CNode[] = [];
  observers = new Set<CNode>();
  /** Ownership: nodes and cleanups created while this node's function ran. */
  owned: CNode[] = [];
  cleanups: (() => void)[] = [];
  owner: CNode | null = null;
  computing = false;
  constructor(
    public kind: NodeKind | 'root',
    public label: string,
    public fn: (() => unknown) | null,
    public equals: (a: any, b: any) => boolean,
    value?: unknown,
  ) {
    super();
    this.value = value;
  }
  stateName(): NodeState {
    return this.state === CLEAN ? 'clean' : this.state === CHECK ? 'check' : 'dirty';
  }
  sourceIds(): number[] {
    return this.sources.map((s) => s.id);
  }
}

export class ColourEngine extends Base {
  readonly strategy = 'colour' as const;
  private reaction: CNode | null = null;
  private gets: CNode[] | null = null;
  private owner: CNode | null = null;
  private queue: CNode[] = [];
  private batchDepth = 0;
  private flushing = false;

  private track(node: CNode): void {
    if (this.reaction && this.gets) {
      this.gets.push(node);
      // Subscribe at once, as signal libraries do: a write later in the same run must be seen by this reaction.
      node.observers.add(this.reaction);
    }
  }

  /** Mark `node` at least `state`, and everything downstream CHECK. */
  private stale(node: CNode, state: Colour): void {
    if (node.dead || node.state >= state) return;
    if (node.state === CLEAN && node.kind === 'effect') {
      this.queue.push(node);
      this.note('queue', node);
    }
    node.state = state;
    this.note('mark', node, state === DIRTY ? 'dirty' : 'check');
    for (const o of node.observers) this.stale(o, CHECK);
  }

  /** Bring `node` up to date if it is not. Reading a computed calls this; so does the effect queue. */
  private refresh(node: CNode): void {
    if (node.dead || node.kind === 'signal') return;
    if (node.computing) throw new Error(`Cycle detected: ${node.label} depends on itself.`);
    if (node.state === CHECK) {
      for (const src of node.sources) {
        this.refresh(src);
        // If a source really changed, it marked this node DIRTY.
        if ((node.state as Colour) === DIRTY) break;
      }
    }
    if (node.state === DIRTY) this.recompute(node);
    else if (node.state === CHECK) {
      this.note('skip', node);
      node.state = CLEAN;
    }
  }

  private disposeChildren(node: CNode): void {
    const owned = node.owned;
    const cleanups = node.cleanups;
    node.owned = [];
    node.cleanups = [];
    for (const child of owned) this.dispose(child);
    for (const c of cleanups.reverse()) c();
  }

  private dispose(node: CNode): void {
    if (node.dead) return;
    node.dead = true;
    this.disposeChildren(node);
    for (const s of node.sources) s.observers.delete(node);
    node.sources = [];
    node.observers.clear();
  }

  private recompute(node: CNode): void {
    if (node.computing) throw new Error(`Cycle detected: ${node.label} depends on itself.`);
    this.disposeChildren(node);
    const prevReaction = this.reaction;
    const prevGets = this.gets;
    const prevOwner = this.owner;
    this.reaction = node;
    this.gets = [];
    this.owner = node;
    node.computing = true;
    node.runs++;
    // Clean *before* running, so that a write to something it already read marks it dirty again.
    node.state = CLEAN;
    this.note('run', node);
    let changed = false;
    try {
      const out = node.fn!();
      if (node.kind === 'effect') {
        if (typeof out === 'function') node.cleanups.push(out as () => void);
      } else if (!node.equals(node.value, out)) {
        node.value = out;
        changed = true;
      }
    } finally {
      node.computing = false;
      // Re-link dependencies: drop the ones not read this time, add the new ones.
      const fresh = [...new Set(this.gets)];
      for (const s of node.sources) if (!fresh.includes(s)) s.observers.delete(node);
      for (const s of fresh) s.observers.add(node);
      node.sources = fresh;
      this.reaction = prevReaction;
      this.gets = prevGets;
      this.owner = prevOwner;
    }
    if (node.kind === 'computed') {
      if (changed) for (const o of node.observers) if (o.state === CHECK) { o.state = DIRTY; this.note('mark', o, 'dirty'); }
      if (!changed && node.runs > 1) this.note('cutoff', node);
    }
  }

  private flush(): void {
    if (this.flushing || this.batchDepth > 0) return;
    this.flushing = true;
    try {
      let guard = 0;
      while (this.queue.length) {
        if (guard++ > 1000) throw new Error('Maximum update depth exceeded: an effect keeps triggering itself.');
        const e = this.queue.shift()!;
        if (!e.dead) this.refresh(e);
      }
    } finally {
      this.flushing = false;
    }
  }

  signal<T>(initial: T, opts: Options<T> = {}): Signal<T> {
    const node = new CNode('signal', this.label('signal', opts.label), null, opts.equals ?? same, initial);
    this.all.push(node);
    const handle: Signal<T> = {
      id: node.id,
      get: () => (this.track(node), node.value as T),
      peek: () => node.value as T,
      set: (v) => {
        if (node.equals(node.value, v)) return;
        node.value = v;
        this.note('set', node);
        for (const o of node.observers) this.stale(o, DIRTY);
        this.flush();
      },
      update: (fn) => handle.set(fn(node.value as T)),
    };
    return handle;
  }

  computed<T>(fn: () => T, opts: Options<T> = {}): Computed<T> {
    const node = new CNode('computed', this.label('computed', opts.label), fn, opts.equals ?? same);
    node.state = DIRTY; // lazy: nothing runs until the first read
    node.owner = this.owner;
    this.all.push(node);
    const read = () => {
      this.track(node);
      this.refresh(node);
      return node.value as T;
    };
    return {
      id: node.id,
      get: read,
      peek: () => {
        this.refresh(node);
        return node.value as T;
      },
    };
  }

  effect(fn: () => void | (() => void), opts: { label?: string } = {}): () => void {
    const node = new CNode('effect', this.label('effect', opts.label), fn, same);
    node.state = DIRTY;
    node.owner = this.owner;
    this.owner?.owned.push(node);
    this.all.push(node);
    this.queue.push(node);
    this.note('queue', node);
    this.flush();
    return () => this.dispose(node);
  }

  batch<T>(fn: () => T): T {
    this.batchDepth++;
    try {
      return fn();
    } finally {
      this.batchDepth--;
      this.flush();
    }
  }

  untracked<T>(fn: () => T): T {
    const outerReaction = this.reaction;
    const outerGets = this.gets;
    this.reaction = null;
    this.gets = null;
    try {
      return fn();
    } finally {
      this.reaction = outerReaction;
      this.gets = outerGets;
    }
  }

  createRoot<T>(fn: (dispose: () => void) => T): T {
    const root = new CNode('root', 'root', null, same);
    root.owner = this.owner;
    const prevOwner = this.owner;
    const prevReaction = this.reaction;
    const prevGets = this.gets;
    this.owner = root;
    this.reaction = null;
    this.gets = null;
    try {
      return fn(() => this.dispose(root));
    } finally {
      this.owner = prevOwner;
      this.reaction = prevReaction;
      this.gets = prevGets;
    }
  }

  onCleanup(fn: () => void): void {
    if (!this.owner) throw new Error('onCleanup was called outside an effect or a root, so nothing would ever run it.');
    this.owner.cleanups.push(fn);
  }
}

export function createEngine(strategy: Strategy = 'colour'): Engine {
  return strategy === 'eager' ? new EagerEngine() : strategy === 'topological' ? new TopologicalEngine() : new ColourEngine();
}

export const STRATEGY_LABELS: Record<Strategy, string> = {
  eager: 'Eager push (observer pattern)',
  topological: 'Topological order (heights)',
  colour: 'Three colours (lazy, check before recompute)',
};

// ══════════════════════════════════════════════════════════════════════════
// The default engine the rest of the course uses
// ══════════════════════════════════════════════════════════════════════════

export const defaultEngine: Engine = new ColourEngine();
export const signal = defaultEngine.signal.bind(defaultEngine) as Engine['signal'];
export const computed = defaultEngine.computed.bind(defaultEngine) as Engine['computed'];
export const effect = defaultEngine.effect.bind(defaultEngine) as Engine['effect'];
export const batch = defaultEngine.batch.bind(defaultEngine) as Engine['batch'];
export const untracked = defaultEngine.untracked.bind(defaultEngine) as Engine['untracked'];
export const createRoot = defaultEngine.createRoot.bind(defaultEngine) as Engine['createRoot'];
export const onCleanup = defaultEngine.onCleanup.bind(defaultEngine) as Engine['onCleanup'];
