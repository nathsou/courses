/**
 * A small virtual DOM with function components and hooks, running on MiniDom.
 *
 * It follows React's model closely enough to teach it (an element is an immutable description; a mounted *instance*
 * remembers the DOM it made; a re-render calls the component again and diffs the new description against the old),
 * and leaves out what is not the point: no fragments (a component returns one element, a string or nothing), no
 * context, no Suspense, no concurrent mode (that is scheduler.ts).
 *
 *   const App = () => { const [n, setN] = useState(0); return h('button', { onClick: () => setN(n + 1) }, 'Clicked ', n); };
 *   const root = createRoot(doc, doc.body);
 *   root.render(h(App));
 *
 * Every component render, bail-out and effect is recorded in `renderer.trace`, so figures can show *who rendered*.
 */
import { MiniDocument, MElement, MNode, MText, MComment, type Listener } from './dom';
import { reconcile, type Anchor, type Key, type Strategy } from './keyed';

// ───────────────────────── elements ─────────────────────────

export const TEXT = Symbol.for('rx.text');
export const EMPTY = Symbol.for('rx.empty');

export type Props = Record<string, any>;
export type Child = VNode | string | number | boolean | null | undefined | Child[];
export type Component<P = any> = ((props: P) => Child) & { displayName?: string; memoized?: boolean; compare?: (a: P, b: P) => boolean };

/** An immutable description of a piece of UI. */
export interface VNode {
  readonly type: string | Component | typeof TEXT | typeof EMPTY;
  readonly props: Props;
  readonly key: Key | null;
  readonly children: readonly VNode[];
  readonly text?: string;
}

const textVNode = (text: string): VNode => ({ type: TEXT, props: {}, key: null, children: [], text });
const EMPTY_VNODE: VNode = { type: EMPTY, props: {}, key: null, children: [] };

/** Strings and numbers become text; null, undefined and booleans keep their place as an empty slot; arrays flatten. */
function normalise(child: Child, out: VNode[]): void {
  if (Array.isArray(child)) for (const c of child) normalise(c, out);
  else if (child === null || child === undefined || typeof child === 'boolean') out.push(EMPTY_VNODE);
  else if (typeof child === 'string' || typeof child === 'number') out.push(textVNode(String(child)));
  else out.push(child);
}

export function h(type: string | Component, props?: Props | null, ...children: Child[]): VNode {
  const { key = null, ...rest } = props ?? {};
  const flat: VNode[] = [];
  for (const c of children) normalise(c, flat);
  if (typeof type === 'function') return { type, props: { ...rest, children: flat }, key };
  return { type, props: rest, key, children: flat };
}

/** Wrap a component so that it re-renders only when its props change (shallowly, by default). */
export function memo<P extends Props>(fn: Component<P>, compare: (a: P, b: P) => boolean = shallowEqual): Component<P> {
  const wrapper = ((props: P) => fn(props)) as Component<P>;
  wrapper.displayName = nameOf(fn);
  wrapper.memoized = true;
  wrapper.compare = compare;
  return wrapper;
}

export function shallowEqual(a: Props, b: Props): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => k in b && (k === 'children' ? sameChildren(a[k], b[k]) : Object.is(a[k], b[k])));
}
/** Children are compared element by element: two renders that pass the very same elements are equal. */
function sameChildren(a: readonly VNode[], b: readonly VNode[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const nameOf = (c: Component) => c.displayName || c.name || 'Anonymous';


/** The attributes an element with these props should have in the DOM (and in server-rendered HTML). */
export function expectedAttrs(props: Props): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of Object.keys(props)) {
    const value = props[name];
    if (name === 'children' || name === 'ref' || (name.length > 2 && name.startsWith('on') && name[2] === name[2]!.toUpperCase())) continue;
    if (value === undefined || value === null || value === false) continue;
    const attr = name === 'className' ? 'class' : name;
    if (name === 'style' && typeof value === 'object') {
      out.set('style', Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`).join('; '));
    } else out.set(attr, value === true ? '' : String(value));
  }
  return out;
}

export interface Mismatch {
  kind: 'tag' | 'text' | 'attribute' | 'extra' | 'missing';
  /** Where in the tree, e.g. `div > ul > li[1]`. */
  path: string;
  expected?: string;
  found?: string;
}

export interface HydrationReport {
  mismatches: Mismatch[];
  /** DOM nodes taken over from the server HTML. */
  claimed: number;
  /** DOM nodes the client had to create because the server HTML did not have them. */
  created: number;
}

// ───────────────────────── instances ─────────────────────────

interface Inst {
  vnode: VNode;
  dom: MNode | null;
  kids: Inst[];
  parent: Inst | null;
  hooks?: Hook[];
  hookCount?: number;
  dirty?: boolean;
  unmounted?: boolean;
  renderCount?: number;
  id: number;
}

export interface TraceEvent {
  kind: 'render' | 'skip' | 'effect' | 'cleanup' | 'mount' | 'unmount';
  name: string;
  /** For `skip`: why ('memo' = props equal, 'same element' = the identical element object came back). */
  why?: string;
}

const isComponent = (v: VNode): v is VNode & { type: Component } => typeof v.type === 'function';

// ───────────────────────── hooks ─────────────────────────

type Hook =
  | { kind: 'state'; value: unknown; setter: (v: unknown) => void }
  | { kind: 'reducer'; value: unknown; dispatch: (a: unknown) => void }
  | { kind: 'ref'; ref: { current: unknown } }
  | { kind: 'memo'; value: unknown; deps: unknown[] | undefined; fresh: boolean }
  | { kind: 'effect'; deps: unknown[] | undefined; cleanup?: (() => void) | void; pending?: () => void | (() => void); layout: boolean; ran: boolean };

interface HookContext {
  inst: Inst;
  renderer: Renderer;
  i: number;
  /** Server rendering: state returns its initial value and effects never run. */
  ssr?: boolean;
}
let current: HookContext | null = null;

export class HooksOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HooksOrderError';
  }
}

function nextHook<K extends Hook['kind']>(kind: K, make: () => Extract<Hook, { kind: K }>): Extract<Hook, { kind: K }> {
  const c = current;
  if (!c) throw new Error(`use${kind[0]!.toUpperCase()}${kind.slice(1)} can only be called while a component is rendering`);
  const hooks = (c.inst.hooks ??= []);
  const i = c.i++;
  const existing = hooks[i];
  if (existing) {
    if (existing.kind !== kind) {
      throw new HooksOrderError(`Hooks were called in a different order: slot ${i} held a ${existing.kind} hook last render and is now asked for a ${kind} hook. Hooks must be called in the same order on every render.`);
    }
    return existing as Extract<Hook, { kind: K }>;
  }
  if (c.inst.hookCount !== undefined && i >= c.inst.hookCount) {
    throw new HooksOrderError('Rendered more hooks than during the previous render.');
  }
  const created = make();
  hooks[i] = created;
  return created;
}

const depsChanged = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  a === undefined || b === undefined || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));

export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
  const c = current;
  const hook = nextHook('state', () => {
    const h: Extract<Hook, { kind: 'state' }> = {
      kind: 'state',
      value: typeof initial === 'function' ? (initial as () => T)() : initial,
      setter: (next) => {
        const prev = h.value as T;
        const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : (next as T);
        if (Object.is(value, prev)) return;
        h.value = value;
        c!.renderer.schedule(c!.inst);
      },
    };
    return h;
  });
  return [hook.value as T, hook.setter as (next: T | ((prev: T) => T)) => void];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void] {
  const c = current;
  const hook = nextHook('reducer', () => {
    const h: Extract<Hook, { kind: 'reducer' }> = {
      kind: 'reducer',
      value: initial,
      dispatch: (action) => {
        const value = reducer(h.value as S, action as A);
        if (Object.is(value, h.value)) return;
        h.value = value;
        c!.renderer.schedule(c!.inst);
      },
    };
    return h;
  });
  return [hook.value as S, hook.dispatch as (action: A) => void];
}

export function useRef<T>(initial: T): { current: T } {
  return nextHook('ref', () => ({ kind: 'ref', ref: { current: initial } })).ref as { current: T };
}

export function useMemo<T>(compute: () => T, deps?: unknown[]): T {
  const h = nextHook('memo', () => ({ kind: 'memo', value: undefined, deps: undefined, fresh: true }));
  if (h.fresh || deps === undefined || depsChanged(h.deps, deps)) {
    h.value = compute();
    h.deps = deps;
    h.fresh = false;
  }
  return h.value as T;
}

export function useCallback<F extends (...args: any[]) => any>(fn: F, deps?: unknown[]): F {
  return useMemo(() => fn, deps);
}

function effectHook(kind: 'passive' | 'layout', run: () => void | (() => void), deps?: unknown[]): void {
  const c = current!;
  const hook = nextHook('effect', () => ({ kind: 'effect', deps: undefined, layout: kind === 'layout', ran: false }));
  if (c.ssr) return;
  if (!hook.ran || deps === undefined || depsChanged(hook.deps, deps)) {
    hook.ran = true;
    hook.deps = deps;
    hook.pending = run;
    c.renderer.queueEffect(c.inst, hook);
  }
}

/** Runs after the browser has painted (here: after the commit, when effects are flushed). */
export function useEffect(run: () => void | (() => void), deps?: unknown[]): void {
  effectHook('passive', run, deps);
}
/** Runs synchronously during the commit, before the browser can paint. */
export function useLayoutEffect(run: () => void | (() => void), deps?: unknown[]): void {
  effectHook('layout', run, deps);
}

// ───────────────────────── the renderer ─────────────────────────

export interface RendererOptions {
  /** How lists of children are matched. `index` ignores keys. Default `lis`. */
  strategy?: Strategy;
  /** Flush state updates in a microtask (the browser default). Tests and stepping figures set this to false. */
  autoFlush?: boolean;
  /** Called for every trace event as it happens. */
  onTrace?: (e: TraceEvent) => void;
}

export interface ComponentCount {
  renders: number;
  skips: number;
}

export class Renderer {
  readonly trace: TraceEvent[] = [];
  readonly counts = new Map<string, ComponentCount>();
  strategy: Strategy;
  autoFlush: boolean;
  /** Number of host elements whose props were compared (the "diffing work"). */
  propsCompared = 0;
  private dirty = new Set<Inst>();
  private flushQueued = false;
  private effects: { inst: Inst; hook: Extract<Hook, { kind: 'effect' }> }[] = [];
  private roots = new Map<MElement, Inst>();
  private nextId = 1;
  private onTrace?: (e: TraceEvent) => void;

  constructor(
    readonly doc: MiniDocument,
    opts: RendererOptions = {},
  ) {
    this.strategy = opts.strategy ?? 'lis';
    this.autoFlush = opts.autoFlush ?? true;
    this.onTrace = opts.onTrace;
  }

  // ───── public ─────

  render(tree: Child, container: MElement): void {
    const flat: VNode[] = [];
    normalise(tree, flat);
    const vnode = flat[0] ?? EMPTY_VNODE;
    const root = this.roots.get(container);
    if (!root) this.roots.set(container, this.mountInst(vnode, null, container, null));
    else {
      const next = this.patchInst(root, vnode);
      this.roots.set(container, next);
    }
    this.flushEffects();
  }

  unmount(container: MElement): void {
    const root = this.roots.get(container);
    if (!root) return;
    this.unmountInst(root, true);
    this.roots.delete(container);
    this.flushEffects();
  }

  /** Run pending state updates (batched), then effects. Returns the number of component renders it caused. */
  flush(): number {
    this.flushQueued = false;
    const before = this.totalRenders();
    let guard = 0;
    while (this.dirty.size) {
      if (guard++ > 100) throw new Error('Too many re-renders: a component keeps updating its own state while rendering or in an effect.');
      const batch = [...this.dirty].sort((a, b) => depth(a) - depth(b));
      this.dirty.clear();
      for (const inst of batch) {
        if (!inst.dirty || inst.unmounted) continue;
        this.rerender(inst);
      }
      this.flushEffects();
    }
    this.flushEffects();
    return this.totalRenders() - before;
  }

  totalRenders(): number {
    let n = 0;
    for (const c of this.counts.values()) n += c.renders;
    return n;
  }

  resetCounts(): void {
    this.counts.clear();
    this.trace.length = 0;
    this.propsCompared = 0;
  }

  /** @internal */
  schedule(inst: Inst): void {
    if (inst.unmounted) return;
    inst.dirty = true;
    this.dirty.add(inst);
    if (this.autoFlush && !this.flushQueued) {
      this.flushQueued = true;
      queueMicrotask(() => {
        if (this.flushQueued) this.flush();
      });
    }
  }

  /** @internal */
  queueEffect(inst: Inst, hook: Extract<Hook, { kind: 'effect' }>): void {
    this.effects.push({ inst, hook });
  }

  // ───── tracing ─────

  private note(e: TraceEvent): void {
    this.trace.push(e);
    if (this.trace.length > 2000) this.trace.shift();
    const c = this.counts.get(e.name) ?? { renders: 0, skips: 0 };
    if (e.kind === 'render') c.renders++;
    if (e.kind === 'skip') c.skips++;
    this.counts.set(e.name, c);
    this.onTrace?.(e);
  }

  // ───── hydration ─────

  /**
   * Take over server-rendered HTML in `container`: walk the tree and the DOM together, claim each node instead of
   * creating it, attach the event handlers and run the effects. Anything that differs is reported and repaired.
   */
  hydrate(tree: Child, container: MElement): HydrationReport {
    const flat: VNode[] = [];
    normalise(tree, flat);
    const vnode = flat[0] ?? EMPTY_VNODE;
    const report: HydrationReport = { mismatches: [], claimed: 0, created: 0 };
    const cursor = { node: container.firstChild as MNode | null };
    const inst = this.hydrateInst(vnode, null, container, cursor, report, '');
    this.skipSeparators(cursor);
    while (cursor.node) {
      const extra = cursor.node;
      report.mismatches.push({ kind: 'extra', path: 'root', found: describeNode(extra) });
      cursor.node = extra.nextSibling;
      container.removeChild(extra);
    }
    this.roots.set(container, inst);
    this.flushEffects();
    return report;
  }

  /** Server HTML separates adjacent text with `<!-- -->`; skip those markers. */
  private skipSeparators(cursor: { node: MNode | null }): void {
    while (cursor.node instanceof MComment) cursor.node = cursor.node.nextSibling;
  }

  private hydrateInst(vnode: VNode, parent: Inst | null, parentDom: MElement, cursor: { node: MNode | null }, report: HydrationReport, path: string): Inst {
    const inst: Inst = { vnode, dom: null, kids: [], parent, id: this.nextId++ };
    if (vnode.type === EMPTY) {
      inst.dom = this.doc.createTextNode('');
      parentDom.insertBefore(inst.dom, cursor.node);
      return inst;
    }
    this.skipSeparators(cursor);
    const found = cursor.node;
    if (vnode.type === TEXT) {
      if (found instanceof MText) {
        if (found.data !== vnode.text) {
          report.mismatches.push({ kind: 'text', path, expected: JSON.stringify(vnode.text), found: JSON.stringify(found.data) });
          found.data = vnode.text!;
        }
        inst.dom = found;
        cursor.node = found.nextSibling;
        report.claimed++;
      } else {
        report.mismatches.push({ kind: 'missing', path, expected: JSON.stringify(vnode.text), found: found ? describeNode(found) : 'nothing' });
        inst.dom = this.doc.createTextNode(vnode.text!);
        parentDom.insertBefore(inst.dom, found);
        report.created++;
      }
      return inst;
    }
    if (isComponent(vnode)) {
      inst.hooks = [];
      inst.renderCount = 0;
      const out = this.renderComponent(inst);
      const kid = this.hydrateInst(out, inst, parentDom, cursor, report, path);
      inst.kids = [kid];
      inst.dom = kid.dom;
      this.note({ kind: 'mount', name: nameOf(vnode.type) });
      return inst;
    }
    const tag = vnode.type as string;
    const here = `${path ? path + ' > ' : ''}${tag}`;
    let el: MElement;
    if (found instanceof MElement && found.tag === tag) {
      el = found;
      cursor.node = found.nextSibling;
      report.claimed++;
      const want = expectedAttrs(vnode.props);
      for (const [name, value] of want) {
        if (el.getAttribute(name) !== value) report.mismatches.push({ kind: 'attribute', path: here, expected: `${name}="${value}"`, found: el.hasAttribute(name) ? `${name}="${el.getAttribute(name)}"` : 'no such attribute' });
      }
      for (const name of el.attrs.keys()) if (!want.has(name)) report.mismatches.push({ kind: 'attribute', path: here, expected: `no ${name}`, found: `${name}="${el.getAttribute(name)}"` });
      // Writes only what differs; attaches the event handlers (the one thing the server HTML cannot carry).
      this.patchProps(el, {}, vnode.props);
      for (const name of [...el.attrs.keys()]) if (!want.has(name)) el.removeAttribute(name);
      inst.dom = el;
      const childCursor = { node: el.firstChild as MNode | null };
      vnode.children.forEach((child, i) => inst.kids.push(this.hydrateInst(child, inst, el, childCursor, report, `${here}[${i}]`)));
      this.skipSeparators(childCursor);
      while (childCursor.node) {
        const extra = childCursor.node;
        report.mismatches.push({ kind: 'extra', path: here, found: describeNode(extra) });
        childCursor.node = extra.nextSibling;
        el.removeChild(extra);
      }
    } else {
      report.mismatches.push({ kind: 'tag', path: here, expected: `<${tag}>`, found: found ? describeNode(found) : 'nothing' });
      // Give up on the server markup for this subtree: build it on the client.
      const fresh = this.mountInst(vnode, parent, parentDom, found);
      report.created += countDom(fresh.dom!);
      if (found) {
        cursor.node = found.nextSibling;
        parentDom.removeChild(found);
      }
      return fresh;
    }
    const ref = vnode.props.ref;
    if (ref) this.setRef(ref, el);
    return inst;
  }

  // ───── mounting ─────

  private mountInst(vnode: VNode, parent: Inst | null, parentDom: MElement, anchor: MNode | null): Inst {
    const inst: Inst = { vnode, dom: null, kids: [], parent, id: this.nextId++ };
    if (vnode.type === TEXT) {
      inst.dom = this.doc.createTextNode(vnode.text!);
      parentDom.insertBefore(inst.dom, anchor);
    } else if (vnode.type === EMPTY) {
      inst.dom = this.doc.createTextNode('');
      parentDom.insertBefore(inst.dom, anchor);
    } else if (isComponent(vnode)) {
      inst.hooks = [];
      inst.renderCount = 0;
      const out = this.renderComponent(inst);
      const kid = this.mountInst(out, inst, parentDom, anchor);
      inst.kids = [kid];
      inst.dom = kid.dom;
      this.note({ kind: 'mount', name: nameOf(vnode.type) });
    } else {
      const el = this.doc.createElement(vnode.type as string);
      inst.dom = el;
      this.patchProps(el, {}, vnode.props);
      for (const child of vnode.children) inst.kids.push(this.mountInst(child, inst, el, null));
      // The subtree is complete before it is attached: one live insertion for the whole thing.
      parentDom.insertBefore(el, anchor);
      const ref = vnode.props.ref;
      if (ref) this.setRef(ref, el);
    }
    return inst;
  }

  private renderComponent(inst: Inst): VNode {
    const vnode = inst.vnode as VNode & { type: Component };
    const ctx: HookContext = { inst, renderer: this, i: 0 };
    const outer = current;
    current = ctx;
    let out: Child;
    try {
      out = vnode.type(vnode.props);
    } finally {
      current = outer;
    }
    if (inst.hookCount !== undefined && ctx.i !== inst.hookCount) {
      throw new HooksOrderError('Rendered fewer hooks than expected. This may be caused by an accidental early return statement.');
    }
    inst.hookCount = ctx.i;
    inst.dirty = false;
    inst.renderCount = (inst.renderCount ?? 0) + 1;
    this.note({ kind: 'render', name: nameOf(vnode.type) });
    const flat: VNode[] = [];
    normalise(out, flat);
    if (flat.length > 1) throw new Error(`${nameOf(vnode.type)} returned ${flat.length} nodes; this mini renderer has no fragments, so wrap them in one element.`);
    return flat[0] ?? EMPTY_VNODE;
  }

  // ───── patching ─────

  private sameType(a: VNode, b: VNode): boolean {
    return a.type === b.type;
  }

  /** Update `inst` to show `next`. Returns the instance now showing it (a new one if the type changed). */
  private patchInst(inst: Inst, next: VNode): Inst {
    const prev = inst.vnode;
    if (!this.sameType(prev, next)) {
      const oldDom = inst.dom!;
      const parentDom = oldDom.parent as MElement;
      const fresh = this.mountInst(next, inst.parent, parentDom, oldDom);
      this.unmountInst(inst, true);
      return fresh;
    }
    if (prev === next && !inst.dirty) {
      if (isComponent(next)) this.note({ kind: 'skip', name: nameOf(next.type), why: 'same element' });
      return inst;
    }
    if (next.type === TEXT) {
      if (prev.text !== next.text) (inst.dom as import('./dom').MText).data = next.text!;
      inst.vnode = next;
      return inst;
    }
    if (next.type === EMPTY) {
      inst.vnode = next;
      return inst;
    }
    if (isComponent(next)) {
      if (next.type.memoized && !inst.dirty && next.type.compare!(prev.props, next.props)) {
        inst.vnode = next;
        this.note({ kind: 'skip', name: nameOf(next.type), why: 'memo' });
        return inst;
      }
      inst.vnode = next;
      this.rerender(inst);
      return inst;
    }
    const el = inst.dom as MElement;
    this.patchProps(el, prev.props, next.props);
    inst.vnode = next;
    this.patchChildren(inst, next.children, el);
    return inst;
  }

  /** Re-render a component instance (from its own state change or from a parent's new props). */
  private rerender(inst: Inst): void {
    const out = this.renderComponent(inst);
    const old = inst.kids[0]!;
    const kid = this.patchInst(old, out);
    inst.kids = [kid];
    kid.parent = inst;
    inst.dom = kid.dom;
    // Ancestors that are components render this one directly: they share its root DOM node.
    for (let p = inst.parent; p && isComponent(p.vnode); p = p.parent) p.dom = kid.dom;
  }

  private patchChildren(parent: Inst, next: readonly VNode[], el: MElement): void {
    const prev = parent.kids;
    const hasKeys = next.some((v) => v.key !== null) || prev.some((k) => k.vnode.key !== null);
    const strategy: Strategy = hasKeys ? this.strategy : 'index';
    const slot = (v: VNode, i: number) => (v.key !== null ? `k:${v.key}` : `i:${i}`);
    const oldKeys = prev.map((k, i) => slot(k.vnode, i));
    const newKeys = next.map((v, i) => slot(v, i));
    const steps = reconcile(oldKeys, newKeys, strategy);
    const placed: (Inst | undefined)[] = new Array(next.length);
    const resolve = (a: Anchor): MNode | null => {
      if (a === 'end') return null;
      if (a === 'start') return el.firstChild;
      if ('before' in a) return placed[a.before]!.dom;
      return placed[a.after]!.dom!.nextSibling;
    };
    for (const st of steps) {
      if (st.op === 'remove') {
        this.unmountInst(prev[st.from]!, true);
      } else if (st.op === 'insert') {
        placed[st.to] = this.mountInst(next[st.to]!, parent, el, resolve(st.anchor));
      } else {
        const old = prev[st.from]!;
        if (st.op === 'move') {
          // Move first (the DOM node stays the same), then update in place.
          const anchor = resolve(st.anchor);
          if (this.sameType(old.vnode, next[st.to]!)) {
            el.insertBefore(old.dom!, anchor);
            placed[st.to] = this.patchInst(old, next[st.to]!);
          } else {
            placed[st.to] = this.mountInst(next[st.to]!, parent, el, anchor);
            this.unmountInst(old, true);
          }
        } else {
          placed[st.to] = this.patchInst(old, next[st.to]!);
        }
      }
    }
    parent.kids = placed as Inst[];
    for (const k of parent.kids) k.parent = parent;
  }

  private patchProps(el: MElement, prev: Props, next: Props): void {
    this.propsCompared++;
    for (const name of Object.keys(prev)) {
      if (!(name in next)) this.setProp(el, name, prev[name], undefined);
    }
    for (const name of Object.keys(next)) {
      if (prev[name] !== next[name] || name === 'value' || name === 'checked') this.setProp(el, name, prev[name], next[name]);
    }
  }

  private setProp(el: MElement, name: string, prev: unknown, value: unknown): void {
    if (name === 'children' || name === 'ref') return;
    if (name.length > 2 && name.startsWith('on') && name[2] === name[2]!.toUpperCase()) {
      const type = name.slice(2).toLowerCase();
      const table = ((el as any).__handlers ??= {}) as Record<string, Listener | undefined>;
      if (!(type in table)) el.addEventListener(type, ((e) => table[type]?.(e)) as Listener);
      table[type] = typeof value === 'function' ? (value as Listener) : undefined;
      return;
    }
    if (name === 'value' || name === 'checked') {
      // Controlled form props: only write when the DOM disagrees (typing changes the DOM, not the attribute).
      if (name === 'value' ? el.value !== String(value ?? '') : el.checked !== Boolean(value)) el.setProp(name, name === 'value' ? String(value ?? '') : Boolean(value));
      return;
    }
    const attr = name === 'className' ? 'class' : name;
    if (name === 'style' && value && typeof value === 'object') value = Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`).join('; ');
    if (value === undefined || value === null || value === false) {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    } else if (value === true) {
      if (el.getAttribute(attr) !== '') el.setAttribute(attr, '');
    } else if (el.getAttribute(attr) !== String(value)) el.setAttribute(attr, String(value));
    void prev;
  }

  private setRef(ref: unknown, el: MElement | null): void {
    if (typeof ref === 'function') (ref as (e: MElement | null) => void)(el);
    else if (ref && typeof ref === 'object') (ref as { current: MElement | null }).current = el;
  }

  // ───── unmounting ─────

  private unmountInst(inst: Inst, removeDom: boolean): void {
    if (inst.unmounted) return;
    inst.unmounted = true;
    this.dirty.delete(inst);
    if (isComponent(inst.vnode)) {
      for (const h of inst.hooks ?? []) {
        if (h.kind === 'effect' && typeof h.cleanup === 'function') {
          this.note({ kind: 'cleanup', name: nameOf(inst.vnode.type) });
          h.cleanup();
          h.cleanup = undefined;
        }
      }
      this.note({ kind: 'unmount', name: nameOf(inst.vnode.type) });
    } else if (typeof inst.vnode.type === 'string' && inst.vnode.props.ref) {
      this.setRef(inst.vnode.props.ref, null);
    }
    for (const k of inst.kids) this.unmountInst(k, false);
    if (removeDom && inst.dom?.parent) inst.dom.parent.removeChild(inst.dom);
  }

  // ───── effects ─────

  private flushEffects(): void {
    let guard = 0;
    while (this.effects.length) {
      if (guard++ > 100) throw new Error('Effects keep scheduling more effects.');
      const batch = this.effects.splice(0);
      const live = batch.filter((e) => !e.inst.unmounted && e.hook.pending);
      // Cleanups of every changed effect first, then the new effects, as React does.
      for (const { inst, hook } of live) {
        if (typeof hook.cleanup === 'function') {
          this.note({ kind: 'cleanup', name: nameOf((inst.vnode as VNode & { type: Component }).type) });
          hook.cleanup();
        }
        hook.cleanup = undefined;
      }
      for (const { inst, hook } of live) {
        const run = hook.pending!;
        hook.pending = undefined;
        this.note({ kind: 'effect', name: nameOf((inst.vnode as VNode & { type: Component }).type) });
        hook.cleanup = run();
      }
    }
    if (this.dirty.size && this.autoFlush && !this.flushQueued) {
      this.flushQueued = true;
      queueMicrotask(() => {
        if (this.flushQueued) this.flush();
      });
    }
  }
}

function describeNode(n: MNode): string {
  return n instanceof MText ? `text ${JSON.stringify(n.data)}` : n instanceof MElement ? `<${n.tag}>` : '<!-- -->';
}

function countDom(n: MNode): number {
  return n instanceof MElement ? 1 + n.children.reduce((a, c) => a + countDom(c), 0) : 1;
}

function depth(inst: Inst): number {
  let d = 0;
  for (let p = inst.parent; p; p = p.parent) d++;
  return d;
}

// ───────────────────────── conveniences ─────────────────────────

export interface Root {
  render(tree: Child): void;
  unmount(): void;
  flush(): number;
  readonly renderer: Renderer;
  readonly container: MElement;
}

export function createRoot(doc: MiniDocument, container: MElement, opts: RendererOptions = {}): Root {
  const renderer = new Renderer(doc, opts);
  return {
    renderer,
    container,
    render: (tree) => renderer.render(tree, container),
    unmount: () => renderer.unmount(container),
    flush: () => renderer.flush(),
  };
}

/** For server rendering: call a component with a fresh server hook context and return its single output. */
export function callComponent(vnode: VNode & { type: Component }): VNode {
  const doc = new MiniDocument();
  const renderer = new Renderer(doc, { autoFlush: false });
  const inst: Inst = { vnode, dom: null, kids: [], parent: null, hooks: [], id: 0 };
  const outer = current;
  current = { inst, renderer, i: 0, ssr: true };
  try {
    const out = vnode.type(vnode.props);
    const flat: VNode[] = [];
    normalise(out, flat);
    return flat[0] ?? EMPTY_VNODE;
  } finally {
    current = outer;
  }
}
