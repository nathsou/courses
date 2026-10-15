/**
 * Resumability, as Qwik does it, in miniature.
 *
 * Hydration re-runs the components in the browser to rebuild what the server already knew. Resumability instead
 * *serialises* what the page needs to continue: the state, and, for every event handler, a reference to where its
 * code lives (a QRL: `chunk#symbol`). The browser runs no application code at load. One tiny global listener (the
 * *loader*) waits for events; when one arrives it fetches the one function that handles it, restores only the state it
 * touches, runs it, and updates the DOM nodes that were registered as depending on the changed signal. No component
 * is re-rendered.
 *
 * Our app model: a view built with `h()` whose text can be bound to a signal (`bind('count')`) and whose events name a
 * symbol (`qrl('increment')`). The server writes the HTML, the state and the list of events to listen for. Real Qwik
 * writes text subscriptions as comment markers and optimiser-extracted closures; the mechanism is the same.
 */
import { MElement, MiniDocument, escapeAttr, escapeText, VOID_TAGS, type MEvent } from './dom';
import { EMPTY, TEXT, h, type Child, type VNode } from './vdom';

export interface Qrl {
  readonly qrl: string;
}
export interface Bind {
  readonly bind: string;
}
export const qrl = (symbol: string): Qrl => ({ qrl: symbol });
export const bind = (signal: string): Bind => ({ bind: signal });
const isQrl = (v: unknown): v is Qrl => typeof v === 'object' && v !== null && 'qrl' in v;
const isBind = (v: unknown): v is Bind => typeof v === 'object' && v !== null && 'bind' in v;

export interface SymbolDef {
  /** The file the optimiser put the function in. */
  chunk: string;
  /** Size of that file, for the network log. */
  bytes: number;
  run(ctx: SymbolContext, event: MEvent): void;
}
export interface SymbolContext {
  get(signal: string): unknown;
  set(signal: string, value: unknown): void;
}

export interface ResumableApp {
  signals: Record<string, unknown>;
  view(): VNode;
  symbols: Record<string, SymbolDef>;
}

export { h };

/** Everything the server sends. */
export interface ServerOutput {
  html: string;
  /** The events the loader must listen for. */
  events: string[];
  /** The serialised state: what resumes the app. */
  stateJson: string;
  sizes: { html: number; state: number; loader: number; total: number };
}

/** The loader is a few hundred bytes of JavaScript; this is its size in the model. */
export const LOADER_BYTES = 740;

export function renderResumable(app: ResumableApp): ServerOutput {
  const events = new Set<string>();
  let nextId = 0;
  const render = (v: VNode | Bind | string): string => {
    if (typeof v === 'string') return escapeText(v);
    if (isBind(v)) return `<span q:bind="${v.bind}">${escapeText(String(app.signals[v.bind]))}</span>`;
    if (v.type === TEXT) return escapeText(v.text!);
    if (v.type === EMPTY) return '';
    const tag = v.type as string;
    let attrs = '';
    let needsId = false;
    for (const [name, value] of Object.entries(v.props)) {
      if (name === 'children') continue;
      if (name.startsWith('on:') && isQrl(value)) {
        const sym = app.symbols[value.qrl];
        if (!sym) throw new Error(`No symbol named "${value.qrl}"`);
        events.add(name.slice(3));
        attrs += ` ${name}="${sym.chunk}#${value.qrl}"`;
        needsId = true;
      } else if (value !== false && value != null) attrs += value === true ? ` ${name}` : ` ${name}="${escapeAttr(String(value))}"`;
    }
    if (needsId) attrs += ` q:id="${nextId++}"`;
    if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
    // `bind('x')` passes through h() unchanged, so a child can be a Bind as well as a VNode.
    return `<${tag}${attrs}>${v.children.map((c) => render(c as VNode | Bind)).join('')}</${tag}>`;
  };
  const html = render(app.view());
  const stateJson = JSON.stringify({ signals: app.signals });
  const eventList = [...events];
  return {
    html,
    events: eventList,
    stateJson,
    sizes: { html: html.length, state: stateJson.length, loader: LOADER_BYTES, total: html.length + stateJson.length + LOADER_BYTES },
  };
}

// ───────────────────────── the browser ─────────────────────────

export interface Fetched {
  chunk: string;
  bytes: number;
}

export interface Resumed {
  /** Chunks fetched so far, in order. */
  fetched: Fetched[];
  /** Application code executed at load: none, by design. */
  readonly jsRunAtLoad: number;
  /** Bytes of JavaScript downloaded and run so far (the loader plus every fetched chunk). */
  readonly jsBytes: number;
  /** Resolves when every pending event has been handled. */
  idle(): Promise<void>;
  /** Parsed lazily, on the first event. */
  readonly stateParsed: boolean;
}

/**
 * The loader: install one listener per event type on `container`, and resume lazily. `symbols` stands in for the
 * network: looking up a chunk there is the "fetch".
 */
export function resume(container: MElement, stateJson: string, events: readonly string[], symbols: Record<string, SymbolDef>): Resumed {
  const fetched: Fetched[] = [];
  let state: { signals: Record<string, unknown> } | null = null;
  const loaded = new Set<string>();
  let pending: Promise<void> = Promise.resolve();

  const ctx: SymbolContext = {
    get: (name) => state!.signals[name],
    set(name, value) {
      state!.signals[name] = value;
      // The subscribers of this signal: every element bound to it. Only these nodes are touched.
      for (const el of container.querySelectorAll(`[q:bind=${name}]`)) el.textContent = String(value);
    },
  };

  const handle = (e: MEvent) => {
    let el: MElement | null = e.target;
    while (el && !el.hasAttribute(`on:${e.type}`)) el = el.parent;
    if (!el) return;
    const [chunk, symbol] = el.getAttribute(`on:${e.type}`)!.split('#') as [string, string];
    pending = pending.then(async () => {
      state ??= JSON.parse(stateJson); // first event: parse the state, once
      const def = symbols[symbol];
      if (!def) throw new Error(`Chunk ${chunk} has no symbol ${symbol}`);
      if (!loaded.has(chunk)) {
        loaded.add(chunk);
        fetched.push({ chunk, bytes: def.bytes });
      }
      await Promise.resolve(); // the network
      def.run(ctx, e);
    });
  };
  for (const type of events) container.addEventListener(type, handle);

  return {
    fetched,
    jsRunAtLoad: 0,
    get jsBytes() {
      return LOADER_BYTES + fetched.reduce((a, f) => a + f.bytes, 0);
    },
    get stateParsed() {
      return state !== null;
    },
    idle: () => pending,
  };
}

/** Build a document from the server's output, as the browser would, without running any application code. */
export function load(doc: MiniDocument, out: ServerOutput): MElement {
  doc.body.innerHTML = out.html;
  doc.clearLog();
  return doc.body;
}

export type { Child };
