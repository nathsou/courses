/**
 * MiniDom: a small, deterministic stand-in for the browser's DOM.
 *
 * Every renderer in this course (a naive `innerHTML` rebuild, a virtual DOM, signal-driven templates, Svelte-style
 * fragments, a morpher) runs on this one document, so that they can be compared fairly and, above all, *watched*:
 * the document records every mutation in an operation log, and the course's "mutation lens" turns that log into
 * flashes and counters. The API mirrors the real one (`createElement`, `insertBefore`, `setAttribute`,
 * `addEventListener`, `cloneNode`, `innerHTML`…) closely enough that code written against it reads like browser code.
 *
 * What it models: element and text nodes, attributes, the `value`/`checked` properties of form controls (which, as in
 * a browser, live apart from the attributes), event listeners with bubbling, focus, and cloning. What it does not:
 * layout, CSS, namespaces, comments (except as opaque markers) or the parsing quirks of real HTML.
 */

/** One recorded mutation. `live` is true when the node was attached to the document at the time. */
export type Op =
  | { kind: 'create'; id: number; tag: string; live: false }
  | { kind: 'clone'; id: number; nodes: number; live: false }
  | { kind: 'insert'; id: number; parent: number; before: number | null; live: boolean }
  | { kind: 'remove'; id: number; parent: number; live: boolean }
  | { kind: 'attr'; id: number; name: string; value: string | null; live: boolean }
  | { kind: 'prop'; id: number; name: string; value: unknown; live: boolean }
  | { kind: 'text'; id: number; value: string; live: boolean }
  | { kind: 'listen'; id: number; type: string; live: boolean }
  | { kind: 'unlisten'; id: number; type: string; live: boolean }
  | { kind: 'html'; id: number; nodes: number; live: boolean };

export type OpKind = Op['kind'];

export const VOID_TAGS = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);

/** Counts of operations, with the live ones (those that reach a node on the page) separated out. */
export interface OpStats {
  /** Every operation. */
  total: number;
  /** Operations on nodes attached to the document: the ones a browser would have to style, lay out and paint. */
  live: number;
  created: number;
  inserted: number;
  removed: number;
  attrs: number;
  props: number;
  texts: number;
  listeners: number;
  /** Nodes created by `innerHTML` and `cloneNode` (counted separately from `created`). */
  parsed: number;
}

export type Listener = (event: MEvent) => void;

export class MEvent {
  defaultPrevented = false;
  propagationStopped = false;
  target: MElement;
  currentTarget: MElement | null = null;
  constructor(
    public type: string,
    target: MElement,
    public detail: Record<string, unknown> = {},
    public bubbles = true,
  ) {
    this.target = target;
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
  stopPropagation(): void {
    this.propagationStopped = true;
  }
}

export abstract class MNode {
  parent: MElement | null = null;
  /** Logical time of the last mutation of this node (for the lens). */
  touched = 0;
  abstract readonly nodeType: 1 | 3 | 8;
  constructor(
    readonly doc: MiniDocument,
    readonly id: number,
  ) {}

  get parentNode(): MElement | null {
    return this.parent;
  }
  get isConnected(): boolean {
    let n: MNode | null = this;
    while (n) {
      if (n === this.doc.root) return true;
      n = n.parent;
    }
    return false;
  }
  get nextSibling(): MNode | null {
    const p = this.parent;
    if (!p) return null;
    return p.children[p.children.indexOf(this) + 1] ?? null;
  }
  get previousSibling(): MNode | null {
    const p = this.parent;
    if (!p) return null;
    return p.children[p.children.indexOf(this) - 1] ?? null;
  }
  remove(): void {
    this.parent?.removeChild(this);
  }
  abstract cloneNode(deep?: boolean): MNode;
}

export class MText extends MNode {
  readonly nodeType = 3;
  private _data: string;
  constructor(doc: MiniDocument, id: number, data: string) {
    super(doc, id);
    this._data = data;
  }
  get data(): string {
    return this._data;
  }
  set data(v: string) {
    v = String(v);
    this.doc.record({ kind: 'text', id: this.id, value: v, live: this.isConnected }, this);
    this._data = v;
  }
  get nodeValue(): string {
    return this._data;
  }
  set nodeValue(v: string) {
    this.data = v;
  }
  get textContent(): string {
    return this._data;
  }
  set textContent(v: string) {
    this.data = v;
  }
  cloneNode(): MText {
    return this.doc.createTextNode(this._data, true);
  }
}

/** A comment node: used as an anchor/marker by templates and control flow. Not rendered. */
export class MComment extends MNode {
  readonly nodeType = 8;
  constructor(
    doc: MiniDocument,
    id: number,
    public data: string,
  ) {
    super(doc, id);
  }
  get textContent(): string {
    return '';
  }
  cloneNode(): MComment {
    return this.doc.createComment(this.data, true);
  }
}

export class MElement extends MNode {
  readonly nodeType = 1;
  readonly children: MNode[] = [];
  readonly attrs = new Map<string, string>();
  /** Properties that live apart from attributes: `value`, `checked`, `selectionStart`… */
  readonly props: Record<string, unknown> = {};
  readonly listeners = new Map<string, Set<Listener>>();
  constructor(
    doc: MiniDocument,
    id: number,
    readonly tag: string,
  ) {
    super(doc, id);
  }

  get tagName(): string {
    return this.tag.toUpperCase();
  }
  get firstChild(): MNode | null {
    return this.children[0] ?? null;
  }
  get lastChild(): MNode | null {
    return this.children[this.children.length - 1] ?? null;
  }
  get childNodes(): readonly MNode[] {
    return this.children;
  }
  get className(): string {
    return this.attrs.get('class') ?? '';
  }
  set className(v: string) {
    this.setAttribute('class', v);
  }

  // ───────── tree ─────────

  appendChild<T extends MNode>(node: T): T {
    return this.insertBefore(node, null);
  }

  /** Inserts `node` (moving it if it is already in a tree) before `ref`. A fragment inserts its children. */
  insertBefore<T extends MNode>(node: T, ref: MNode | null): T {
    if (node instanceof MElement && node.tag === '#fragment') {
      for (const child of [...node.children]) this.insertBefore(child, ref);
      return node;
    }
    if (ref && ref.parent !== this) throw new Error('insertBefore: the reference node is not a child of this node');
    let cursor: MNode | null = this;
    while (cursor) {
      if (cursor === node) throw new Error('insertBefore: cannot insert a node into itself or its descendant');
      cursor = cursor.parent;
    }
    if (node.parent) node.parent.detach(node);
    const live = this.isConnected;
    const at = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(at, 0, node);
    node.parent = this;
    this.doc.record({ kind: 'insert', id: node.id, parent: this.id, before: ref ? ref.id : null, live }, node);
    this.touched = this.doc.clock;
    return node;
  }

  removeChild<T extends MNode>(node: T): T {
    if (node.parent !== this) throw new Error('removeChild: the node is not a child of this node');
    const live = this.isConnected;
    this.detach(node);
    this.doc.record({ kind: 'remove', id: node.id, parent: this.id, live }, node);
    this.touched = this.doc.clock;
    return node;
  }

  /** Replaces `old` with `node`: a remove and an insert, as in a browser. */
  replaceChild(node: MNode, old: MNode): MNode {
    this.insertBefore(node, old);
    this.removeChild(old);
    return old;
  }

  private detach(node: MNode): void {
    const i = this.children.indexOf(node);
    if (i >= 0) this.children.splice(i, 1);
    node.parent = null;
  }

  /** Remove every child, as `textContent = ''` or `replaceChildren()` does (one operation per child here). */
  replaceChildren(...nodes: MNode[]): void {
    for (const c of [...this.children]) this.removeChild(c);
    for (const n of nodes) this.appendChild(n);
  }

  // ───────── attributes and properties ─────────

  setAttribute(name: string, value: string | number | boolean): void {
    const v = String(value);
    this.doc.record({ kind: 'attr', id: this.id, name, value: v, live: this.isConnected }, this);
    this.attrs.set(name, v);
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  removeAttribute(name: string): void {
    this.doc.record({ kind: 'attr', id: this.id, name, value: null, live: this.isConnected }, this);
    this.attrs.delete(name);
  }

  /** The `value` property of a form control. Typing changes it without touching the `value` attribute. */
  get value(): string {
    const v = this.props.value;
    return v === undefined ? (this.attrs.get('value') ?? '') : String(v);
  }
  set value(v: string) {
    this.setProp('value', String(v));
  }
  get checked(): boolean {
    return this.props.checked === undefined ? this.attrs.has('checked') : Boolean(this.props.checked);
  }
  set checked(v: boolean) {
    this.setProp('checked', Boolean(v));
  }
  setProp(name: string, value: unknown): void {
    if (Object.is(this.props[name], value)) return;
    this.doc.record({ kind: 'prop', id: this.id, name, value, live: this.isConnected }, this);
    this.props[name] = value;
  }

  /** What a person typing would do: change a control's value without the page's code writing to it. Not logged. */
  userInput(value: string): void {
    this.props.value = value;
    this.fire('input', { value });
  }

  // ───────── text and HTML ─────────

  get textContent(): string {
    return this.children.map((c) => c.textContent).join('');
  }
  /** Setting `textContent` replaces all children with one text node (one write when there was only a text child). */
  set textContent(v: string) {
    v = String(v);
    const only = this.children.length === 1 ? this.children[0] : undefined;
    if (only instanceof MText) {
      only.data = v;
      return;
    }
    for (const c of [...this.children]) this.removeChild(c);
    if (v !== '') this.appendChild(this.doc.createTextNode(v));
  }

  get innerHTML(): string {
    return this.children.map((c) => toHTML(c)).join('');
  }
  /** Parses `html` and replaces the children: every old node is dropped and every new one built (one `html` op). */
  set innerHTML(html: string) {
    const nodes = parseHTML(this.doc, html);
    for (const c of [...this.children]) this.detach(c);
    let count = 0;
    const live = this.isConnected;
    for (const n of nodes) {
      count += countNodes(n);
      this.children.push(n);
      n.parent = this;
    }
    this.doc.record({ kind: 'html', id: this.id, nodes: count, live }, this);
    this.touched = this.doc.clock;
    // The new nodes were created by the parser: stamp them so the lens shows them as touched.
    for (const n of nodes) stamp(n, this.doc.clock);
  }
  get outerHTML(): string {
    return toHTML(this);
  }

  // ───────── events ─────────

  addEventListener(type: string, fn: Listener): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    if (set.has(fn)) return;
    set.add(fn);
    this.doc.record({ kind: 'listen', id: this.id, type, live: this.isConnected }, this);
  }
  removeEventListener(type: string, fn: Listener): void {
    const set = this.listeners.get(type);
    if (!set?.delete(fn)) return;
    this.doc.record({ kind: 'unlisten', id: this.id, type, live: this.isConnected }, this);
  }
  /** Dispatch an event at this node; it bubbles to the root unless stopped. Returns the event. */
  fire(type: string, detail: Record<string, unknown> = {}, bubbles = true): MEvent {
    const ev = new MEvent(type, this, detail, bubbles);
    let n: MElement | null = this;
    while (n) {
      ev.currentTarget = n;
      for (const fn of [...(n.listeners.get(type) ?? [])]) fn(ev);
      if (ev.propagationStopped || !ev.bubbles) break;
      n = n.parent;
    }
    return ev;
  }
  /** A click, as a person would make it. */
  click(): MEvent {
    return this.fire('click');
  }
  focus(): void {
    this.doc.activeElement = this;
  }
  blur(): void {
    if (this.doc.activeElement === this) this.doc.activeElement = null;
  }

  // ───────── queries ─────────

  querySelector(sel: string): MElement | null {
    return this.querySelectorAll(sel)[0] ?? null;
  }
  /** Supports `tag`, `.class`, `#id`, `[attr]`, `[attr=value]` and compounds of them (no combinators). */
  querySelectorAll(sel: string): MElement[] {
    const out: MElement[] = [];
    const test = compileSelector(sel);
    const walk = (n: MNode) => {
      if (n instanceof MElement) {
        for (const c of n.children) {
          if (c instanceof MElement) {
            if (test(c)) out.push(c);
            walk(c);
          }
        }
      }
    };
    walk(this);
    return out;
  }
  getElementById(id: string): MElement | null {
    return this.querySelector(`#${id}`);
  }

  cloneNode(deep = false): MElement {
    const copy = this.doc.createElement(this.tag, true);
    for (const [k, v] of this.attrs) copy.attrs.set(k, v);
    Object.assign(copy.props, this.props);
    if (deep) {
      for (const c of this.children) {
        const cc = c.cloneNode(true);
        cc.parent = copy;
        copy.children.push(cc);
      }
    }
    return copy;
  }
}

function stamp(n: MNode, t: number): void {
  n.touched = t;
  if (n instanceof MElement) for (const c of n.children) stamp(c, t);
}

export function countNodes(n: MNode): number {
  return n instanceof MElement ? 1 + n.children.reduce((a, c) => a + countNodes(c), 0) : 1;
}

function compileSelector(sel: string): (e: MElement) => boolean {
  const parts: ((e: MElement) => boolean)[] = [];
  const re = /(^[a-zA-Z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w:-]+)(?:=("[^"]*"|'[^']*'|[^\]]*))?\]/g;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(sel.trim()))) {
    consumed += m[0].length;
    const [, tag, cls, id, name, raw] = m;
    if (tag) parts.push((e) => e.tag === tag.toLowerCase());
    else if (cls) parts.push((e) => e.className.split(/\s+/).includes(cls));
    else if (id) parts.push((e) => e.attrs.get('id') === id);
    else if (name) {
      const want = raw?.replace(/^["']|["']$/g, '');
      parts.push((e) => (want === undefined ? e.attrs.has(name) : e.attrs.get(name) === want));
    }
  }
  if (consumed !== sel.trim().length) throw new Error(`MiniDom supports only simple selectors, not "${sel}"`);
  return (e) => parts.every((p) => p(e));
}

// ───────── the document ─────────

export class MiniDocument {
  private nextId = 1;
  /** Logical clock: advances on every recorded operation. */
  clock = 0;
  readonly ops: Op[] = [];
  readonly root: MElement;
  activeElement: MElement | null = null;
  private subscribers = new Set<() => void>();

  constructor() {
    this.root = new MElement(this, this.nextId++, 'body');
  }

  /** Register a callback fired (synchronously) after every operation. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  record(op: Op, node?: MNode): void {
    this.ops.push(op);
    this.clock++;
    if (node) node.touched = this.clock;
    for (const s of this.subscribers) s();
  }

  /** `fresh` marks nodes made by cloning or parsing, which are counted by their own operation. */
  createElement(tag: string, fresh = false): MElement {
    const el = new MElement(this, this.nextId++, tag.toLowerCase());
    if (!fresh) this.record({ kind: 'create', id: el.id, tag: el.tag, live: false }, el);
    else el.touched = this.clock;
    return el;
  }
  createTextNode(data: string, fresh = false): MText {
    const t = new MText(this, this.nextId++, String(data));
    if (!fresh) this.record({ kind: 'create', id: t.id, tag: '#text', live: false }, t);
    else t.touched = this.clock;
    return t;
  }
  createComment(data = '', fresh = false): MComment {
    const c = new MComment(this, this.nextId++, data);
    if (!fresh) this.record({ kind: 'create', id: c.id, tag: '#comment', live: false }, c);
    return c;
  }
  createFragment(): MElement {
    return new MElement(this, this.nextId++, '#fragment');
  }

  /** Deep-clone with one recorded operation (as `cloneNode(true)` of a template is far cheaper than N `createElement`s). */
  clone<T extends MNode>(node: T): T {
    const copy = node.cloneNode(true) as T;
    this.record({ kind: 'clone', id: copy.id, nodes: countNodes(copy), live: false }, copy);
    stamp(copy, this.clock);
    return copy;
  }

  /** A fragment parsed from HTML. Counted as one `html` operation. */
  fragmentFromHTML(html: string): MElement {
    const frag = this.createFragment();
    const nodes = parseHTML(this, html);
    let count = 0;
    for (const n of nodes) {
      count += countNodes(n);
      frag.children.push(n);
      n.parent = frag;
    }
    this.record({ kind: 'html', id: frag.id, nodes: count, live: false });
    return frag;
  }

  /** The mark for `statsSince`: remember it before an action, then ask what the action did. */
  mark(): number {
    return this.ops.length;
  }
  opsSince(mark: number): Op[] {
    return this.ops.slice(mark);
  }
  statsSince(mark = 0): OpStats {
    return statsOf(this.ops.slice(mark));
  }
  /** Ids of nodes touched by operations since `mark`. */
  touchedSince(mark: number): Set<number> {
    const ids = new Set<number>();
    for (const op of this.ops.slice(mark)) ids.add(op.id);
    return ids;
  }
  /** Clear the log (the nodes stay). */
  clearLog(): void {
    this.ops.length = 0;
  }

  get body(): MElement {
    return this.root;
  }
}

export function statsOf(ops: readonly Op[]): OpStats {
  const s: OpStats = { total: 0, live: 0, created: 0, inserted: 0, removed: 0, attrs: 0, props: 0, texts: 0, listeners: 0, parsed: 0 };
  for (const op of ops) {
    s.total++;
    if (op.live) s.live++;
    switch (op.kind) {
      case 'create':
        s.created++;
        break;
      case 'clone':
      case 'html':
        s.parsed += op.nodes;
        break;
      case 'insert':
        s.inserted++;
        break;
      case 'remove':
        s.removed++;
        break;
      case 'attr':
        s.attrs++;
        break;
      case 'prop':
        s.props++;
        break;
      case 'text':
        s.texts++;
        break;
      case 'listen':
      case 'unlisten':
        s.listeners++;
        break;
    }
  }
  return s;
}

/** A one-line summary of stats for logs and captions. */
export function describeStats(s: OpStats): string {
  const parts: string[] = [];
  if (s.created) parts.push(`${s.created} created`);
  if (s.parsed) parts.push(`${s.parsed} parsed`);
  if (s.inserted) parts.push(`${s.inserted} inserted`);
  if (s.removed) parts.push(`${s.removed} removed`);
  if (s.attrs) parts.push(`${s.attrs} attribute writes`);
  if (s.props) parts.push(`${s.props} property writes`);
  if (s.texts) parts.push(`${s.texts} text writes`);
  if (s.listeners) parts.push(`${s.listeners} listener changes`);
  return parts.length ? parts.join(', ') : 'nothing';
}

// ───────── serialisation and parsing ─────────

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const ESC_ATTR: Record<string, string> = { '&': '&amp;', '"': '&quot;' };
export const escapeText = (s: string): string => s.replace(/[&<>]/g, (c) => ESC[c]!);
export const escapeAttr = (s: string): string => s.replace(/[&"]/g, (c) => ESC_ATTR[c]!);

export function toHTML(node: MNode): string {
  if (node instanceof MText) return escapeText(node.data);
  if (node instanceof MComment) return `<!--${node.data}-->`;
  const el = node as MElement;
  if (el.tag === '#fragment') return el.children.map(toHTML).join('');
  const attrs = [...el.attrs].map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join('');
  if (VOID_TAGS.has(el.tag)) return `<${el.tag}${attrs}>`;
  return `<${el.tag}${attrs}>${el.children.map(toHTML).join('')}</${el.tag}>`;
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/**
 * Parse an HTML fragment into nodes (not attached to anything, not logged as individual creations).
 * Handles nested elements, quoted/unquoted/boolean attributes, void tags, comments and entities.
 */
export function parseHTML(doc: MiniDocument, html: string): MNode[] {
  html = html.replace(/<!>/g, '<!---->'); // the empty comment marker used by templates
  const root = doc.createFragment();
  const stack: MElement[] = [root];
  const top = () => stack[stack.length - 1]!;
  const push = (n: MNode) => {
    n.parent = top();
    top().children.push(n);
  };
  const re = /<!--([\s\S]*?)-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+|<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) {
      push(doc.createComment(m[1], true));
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i]!.tag === tag) {
          stack.length = i;
          break;
        }
      }
    } else if (m[3]) {
      const el = doc.createElement(m[3], true);
      const attrRe = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let a: RegExpExecArray | null;
      while ((a = attrRe.exec(m[4] ?? ''))) el.attrs.set(a[1]!, decode(a[2] ?? a[3] ?? a[4] ?? ''));
      push(el);
      if (!VOID_TAGS.has(el.tag) && !m[5]) stack.push(el);
    } else if (m[6] !== undefined) {
      push(doc.createTextNode(decode(m[6]), true));
    }
  }
  const nodes = [...root.children];
  for (const n of nodes) n.parent = null;
  return nodes;
}

/** A pretty, indented outline of a tree, for tests and captions. */
export function outline(node: MNode, indent = ''): string {
  if (node instanceof MText) return `${indent}"${node.data}"`;
  if (node instanceof MComment) return `${indent}<!--${node.data}-->`;
  const el = node as MElement;
  const attrs = [...el.attrs].map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join(' ');
  const head = `${indent}<${el.tag}${attrs ? ' ' + attrs : ''}>`;
  return [head, ...el.children.map((c) => outline(c, indent + '  '))].join('\n');
}

export function createDocument(): MiniDocument {
  return new MiniDocument();
}
