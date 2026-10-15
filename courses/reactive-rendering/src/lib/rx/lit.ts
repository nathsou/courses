/**
 * lit-html's idea in miniature: templates without a compiler and without a virtual DOM.
 *
 *   const view = (n) => html`<p class=${n > 5 ? 'big' : ''}>Count: ${n}</p><button @click=${inc}>+1</button>`;
 *   render(view(0), container);   // first call: parse once, clone, find the holes ("parts"), fill them
 *   render(view(1), container);   // later calls: same template → just hand the new values to the parts
 *
 * A tagged template literal gives the library two arrays: the *static strings* (the same array object every time the
 * same line of code runs) and the *dynamic values*. The strings are turned into an HTML `<template>` exactly once and
 * cached by identity; every update only compares each hole's new value with its old one. There is no tree to diff:
 * the template's shape cannot change, only its holes.
 */
import { MiniDocument, MElement, MNode, MComment, MText } from './dom';
import { reconcile, type Anchor } from './keyed';

export interface TemplateResult {
  readonly strings: TemplateStringsArray | readonly string[];
  readonly values: readonly unknown[];
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => ({ strings, values });

/** A keyed list: items with the same key keep their DOM across renders. */
export interface RepeatResult {
  readonly repeat: true;
  readonly items: readonly unknown[];
  readonly keyFn: (item: any, i: number) => string | number;
  readonly template: (item: any, i: number) => TemplateResult;
}
export const repeat = <T>(items: readonly T[], keyFn: (item: T, i: number) => string | number, template: (item: T, i: number) => TemplateResult): RepeatResult => ({ repeat: true, items, keyFn, template });

const isTemplateResult = (v: unknown): v is TemplateResult => typeof v === 'object' && v !== null && 'strings' in v && 'values' in v;
const isRepeat = (v: unknown): v is RepeatResult => typeof v === 'object' && v !== null && (v as RepeatResult).repeat === true;

type PartSpec =
  | { kind: 'child'; index: number; path: number[] }
  | { kind: 'attr' | 'prop' | 'bool' | 'event'; index: number; name: string; path: number[] };

interface PreparedTemplate {
  proto: MElement; // a fragment holding the cloneable content
  parts: PartSpec[];
}

const MARK = 'lit$';

/** Turn the strings into HTML with a marker where each value goes, and find where the markers ended up. */
function prepare(doc: MiniDocument, strings: readonly string[]): PreparedTemplate {
  let src = '';
  // Track whether each hole is inside a tag (an attribute) or between tags (a child).
  let inTag = false;
  const holes: { index: number; inTag: boolean }[] = [];
  strings.forEach((s, i) => {
    src += s;
    for (let k = 0; k < s.length; k++) {
      if (s[k] === '<' && /[a-zA-Z]/.test(s[k + 1] ?? '')) inTag = true;
      else if (s[k] === '>') inTag = false;
    }
    if (i < strings.length - 1) {
      holes.push({ index: i, inTag });
      src += inTag ? `${MARK}${i}$` : `<!--${MARK}${i}$-->`;
    }
  });
  const frag = doc.fragmentFromHTML(src);
  const parts: PartSpec[] = [];
  const walk = (el: MElement, path: number[]) => {
    el.children.forEach((child, idx) => {
      const p = [...path, idx];
      if (child instanceof MComment && child.data.startsWith(MARK)) {
        parts.push({ kind: 'child', index: Number(child.data.slice(MARK.length, -1)), path: p });
        child.data = ''; // the marker stays in the DOM as an empty comment, as in the real library
      } else if (child instanceof MElement) {
        for (const [name, value] of [...child.attrs]) {
          const m = new RegExp(`^${MARK.replace('$', '\\$')}(\\d+)\\$$`).exec(value);
          if (!m) continue;
          const index = Number(m[1]);
          child.attrs.delete(name);
          const first = name[0];
          if (first === '@') parts.push({ kind: 'event', index, name: name.slice(1), path: p });
          else if (first === '.') parts.push({ kind: 'prop', index, name: name.slice(1), path: p });
          else if (first === '?') parts.push({ kind: 'bool', index, name: name.slice(1), path: p });
          else parts.push({ kind: 'attr', index, name, path: p });
        }
        walk(child, p);
      }
    });
  };
  walk(frag, []);
  return { proto: frag, parts };
}

function nodeAt(root: MElement, path: number[]): MNode {
  let n: MNode = root;
  for (const i of path) n = (n as MElement).children[i]!;
  return n;
}

// ───────────────────────── parts ─────────────────────────

interface Part {
  setValue(v: unknown): void;
}

class AttributePart implements Part {
  private last: unknown = Symbol('unset');
  constructor(
    private el: MElement,
    private name: string,
    private kind: 'attr' | 'prop' | 'bool',
  ) {}
  setValue(v: unknown): void {
    if (Object.is(v, this.last)) return; // the whole point: unchanged value, no work
    this.last = v;
    if (this.kind === 'prop') this.el.setProp(this.name, v);
    else if (this.kind === 'bool') {
      if (v && !this.el.hasAttribute(this.name)) this.el.setAttribute(this.name, '');
      else if (!v && this.el.hasAttribute(this.name)) this.el.removeAttribute(this.name);
    } else if (v === null || v === undefined || v === false) {
      if (this.el.hasAttribute(this.name)) this.el.removeAttribute(this.name);
    } else this.el.setAttribute(this.name, String(v));
  }
}

class EventPart implements Part {
  private handler: ((e: any) => void) | null = null;
  private bound = false;
  constructor(
    private el: MElement,
    private type: string,
  ) {}
  setValue(v: unknown): void {
    this.handler = typeof v === 'function' ? (v as (e: any) => void) : null;
    if (!this.bound) {
      this.bound = true;
      this.el.addEventListener(this.type, (e) => this.handler?.(e));
    }
  }
}

class TemplateInstance {
  readonly parts: Part[] = [];
  readonly fragment: MElement;
  readonly nodes: MNode[];
  constructor(
    readonly doc: MiniDocument,
    readonly prepared: PreparedTemplate,
    readonly strings: readonly string[],
  ) {
    this.fragment = doc.clone(prepared.proto);
    const byIndex = new Map<number, Part>();
    for (const spec of prepared.parts) {
      const node = nodeAt(this.fragment, spec.path);
      if (spec.kind === 'child') byIndex.set(spec.index, new ChildPart(doc, node as MComment));
      else if (spec.kind === 'event') byIndex.set(spec.index, new EventPart(node as MElement, spec.name));
      else byIndex.set(spec.index, new AttributePart(node as MElement, spec.name, spec.kind));
    }
    for (let i = 0; i < strings.length - 1; i++) this.parts.push(byIndex.get(i)!);
    this.nodes = [...this.fragment.children];
  }
  update(values: readonly unknown[]): void {
    values.forEach((v, i) => this.parts[i]!.setValue(v));
  }
}

/** A hole between nodes. It owns the nodes between its start marker (the comment) and the next sibling it was given. */
class ChildPart implements Part {
  private text: MText | null = null;
  private instance: TemplateInstance | null = null;
  private current: MNode[] = [];
  private keyed = new Map<string | number, { instance: TemplateInstance; strings: readonly string[] }>();
  private items: { part: ChildPart; marker: MComment }[] = [];
  private last: unknown = Symbol('unset');
  constructor(
    private doc: MiniDocument,
    readonly marker: MComment,
  ) {}

  private get parent(): MElement {
    return this.marker.parent as MElement;
  }

  setValue(v: unknown): void {
    if (Object.is(v, this.last) && !isTemplateResult(v) && !isRepeat(v) && !Array.isArray(v)) return;
    this.last = v;
    if (isTemplateResult(v)) this.setTemplate(v);
    else if (isRepeat(v)) this.setRepeat(v);
    else if (Array.isArray(v)) this.setArray(v);
    else if (v instanceof MNode) this.replace([v]);
    else this.setText(v === null || v === undefined || v === false ? '' : String(v));
  }

  private setText(s: string): void {
    this.instance = null;
    if (this.text && this.current.length === 1 && this.current[0] === this.text) {
      if (this.text.data !== s) this.text.data = s;
      return;
    }
    this.text = this.doc.createTextNode(s);
    this.replace([this.text]);
  }

  private setTemplate(r: TemplateResult): void {
    this.text = null;
    const strings = r.strings as readonly string[];
    if (this.instance && this.instance.strings === strings) {
      this.instance.update(r.values);
      return;
    }
    const inst = makeInstance(this.doc, strings);
    inst.update(r.values);
    this.instance = inst;
    this.replace(inst.nodes);
  }

  /** The default for arrays: one child part per index, so a reorder rewrites in place (like an unkeyed virtual DOM). */
  private setArray(values: unknown[]): void {
    this.text = null;
    this.instance = null;
    while (this.items.length < values.length) {
      const marker = this.doc.createComment('');
      this.parent.insertBefore(marker, this.endAnchor());
      this.items.push({ part: new ChildPart(this.doc, marker), marker });
    }
    while (this.items.length > values.length) {
      const item = this.items.pop()!;
      item.part.clear();
      this.parent.removeChild(item.marker);
    }
    values.forEach((val, i) => this.items[i]!.part.setValue(val));
    this.current = [];
  }

  private setRepeat(r: RepeatResult): void {
    this.text = null;
    this.instance = null;
    const nextKeys = r.items.map((item, i) => r.keyFn(item, i));
    const oldKeys = [...this.keyed.keys()];
    const oldNodes = oldKeys.map((k) => this.keyed.get(k)!.instance.nodes);
    const steps = reconcile(oldKeys, nextKeys, 'lis');
    const next = new Map<string | number, { instance: TemplateInstance; strings: readonly string[] }>();
    const placed: TemplateInstance[] = [];
    const first = (inst: TemplateInstance) => inst.nodes[0]!;
    const resolve = (a: Anchor): MNode | null => (a === 'end' ? this.endAnchor() : a === 'start' ? this.marker.nextSibling : 'before' in a ? first(placed[a.before]!) : (placed[a.after]!.nodes.at(-1)!.nextSibling));
    for (const st of steps) {
      if (st.op === 'remove') {
        for (const n of oldNodes[st.from]!) this.parent.removeChild(n);
      } else if (st.op === 'insert') {
        const result = r.template(r.items[st.to], st.to);
        const inst = makeInstance(this.doc, result.strings as readonly string[]);
        inst.update(result.values);
        this.parent.insertBefore(inst.fragment, resolve(st.anchor));
        placed[st.to] = inst;
        next.set(nextKeys[st.to]!, { instance: inst, strings: inst.strings });
      } else {
        const entry = this.keyed.get(oldKeys[st.from]!)!;
        const result = r.template(r.items[st.to], st.to);
        if (entry.strings !== result.strings) throw new Error('repeat: a key must always produce the same template');
        entry.instance.update(result.values);
        if (st.op === 'move') {
          const anchor = resolve(st.anchor);
          for (const n of entry.instance.nodes) this.parent.insertBefore(n, anchor);
        }
        placed[st.to] = entry.instance;
        next.set(nextKeys[st.to]!, entry);
      }
    }
    // Keep the map in list order: the next render reads its keys as the "old list".
    this.keyed = new Map(nextKeys.map((k) => [k, next.get(k)!] as const));
    this.current = [];
  }

  /** The node after this part's content: the marker of the next sibling part, or whatever follows the last node. */
  private endAnchor(): MNode | null {
    let last: MNode = this.marker;
    const tail = (p: ChildPart): MNode | null => {
      if (p.items.length) return tail(p.items[p.items.length - 1]!.part) ?? p.items[p.items.length - 1]!.marker;
      if (p.keyed.size) return [...p.keyed.values()].at(-1)!.instance.nodes.at(-1) ?? null;
      return p.current.at(-1) ?? null;
    };
    last = tail(this) ?? last;
    return last.nextSibling;
  }

  private replace(nodes: MNode[]): void {
    const parent = this.parent;
    const anchor = this.endAnchor();
    for (const n of this.current) if (!nodes.includes(n)) parent.removeChild(n);
    for (const n of nodes) {
      if (n.parent !== parent) parent.insertBefore(n, anchor);
    }
    this.current = nodes;
  }

  clear(): void {
    for (const n of this.current) n.parent?.removeChild(n);
    for (const it of this.items) {
      it.part.clear();
      it.marker.parent?.removeChild(it.marker);
    }
    for (const e of this.keyed.values()) for (const n of e.instance.nodes) n.parent?.removeChild(n);
    this.current = [];
    this.items = [];
    this.keyed.clear();
  }
}

const caches = new WeakMap<MiniDocument, WeakMap<object, PreparedTemplate>>();
function makeInstance(doc: MiniDocument, strings: readonly string[]): TemplateInstance {
  let cache = caches.get(doc);
  if (!cache) caches.set(doc, (cache = new WeakMap()));
  let prepared = cache.get(strings);
  if (!prepared) cache.set(strings, (prepared = prepare(doc, strings)));
  return new TemplateInstance(doc, prepared, strings);
}

// ───────────────────────── render ─────────────────────────

const roots = new WeakMap<MElement, ChildPart>();

/** Render a template result into `container`, updating in place if the container already holds the same template. */
export function render(result: TemplateResult, container: MElement): void {
  let part = roots.get(container);
  if (!part) {
    const marker = container.doc.createComment('');
    container.appendChild(marker);
    part = new ChildPart(container.doc, marker);
    roots.set(container, part);
  }
  part.setValue(result);
}
