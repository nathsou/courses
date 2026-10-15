/**
 * A toy template compiler and runtime in the style of Solid, Vue Vapor and Svelte 5: no virtual DOM.
 *
 * The compiler reads an HTML-like template with `{holes}` and writes JavaScript that
 *   1. builds the static structure once, by cloning a prepared `<template>` (`template(html)`);
 *   2. walks to each node that has a hole (`firstChild.nextSibling…`);
 *   3. wraps each hole in its own effect, so a change to one signal rewrites exactly the one text node, attribute or
 *      list that read it.
 *
 *   <p class={cls()}>Count: {count()}</p>
 *
 * becomes (roughly)
 *
 *   const _el$1 = _tmpl$1();                      // clone
 *   insert(_el$1, () => count(), null);           // one effect for the text
 *   effect(() => setAttribute(_el$1, "class", cls()));   // one effect for the attribute
 *
 * The output is modelled on what Solid's compiler writes, simplified (no event delegation, no hydration). The runtime
 * runs on MiniDom and on any `Engine` from signals.ts.
 */
import { MiniDocument, MElement, MNode, MText, VOID_TAGS, escapeAttr, escapeText } from './dom';
import { reconcile, type Anchor } from './keyed';
import { defaultEngine, type Engine } from './signals';

// ───────────────────────── parsing ─────────────────────────

type Attr = { name: string; kind: 'static' | 'dynamic' | 'event'; value: string };
type TNode = TElement | { type: 'text'; text: string } | { type: 'hole'; expr: string };
interface TElement {
  type: 'element';
  tag: string;
  attrs: Attr[];
  children: TNode[];
}

export class TemplateError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(`${message} (at character ${position})`);
    this.name = 'TemplateError';
  }
}

/** Read a balanced `{ … }` starting at `i` (which must point at `{`). Respects strings and nested braces. */
function readBraces(src: string, i: number): { expr: string; end: number } {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    const c = src[j]!;
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      j++;
      while (j < src.length && src[j] !== quote) j += src[j] === '\\' ? 2 : 1;
    } else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { expr: src.slice(i + 1, j).trim(), end: j + 1 };
    }
    j++;
  }
  throw new TemplateError('Unclosed { in template', i);
}

function parse(src: string): TElement {
  let i = 0;
  const root: TElement = { type: 'element', tag: '#root', attrs: [], children: [] };
  const stack: TElement[] = [root];
  const top = () => stack[stack.length - 1]!;
  const pushText = (text: string) => {
    if (text) top().children.push({ type: 'text', text });
  };
  while (i < src.length) {
    const c = src[i]!;
    if (c === '{') {
      const { expr, end } = readBraces(src, i);
      if (!expr) throw new TemplateError('Empty {} hole', i);
      top().children.push({ type: 'hole', expr });
      i = end;
    } else if (c === '<' && src[i + 1] === '/') {
      const close = src.indexOf('>', i);
      if (close < 0) throw new TemplateError('Unclosed </', i);
      const tag = src.slice(i + 2, close).trim().toLowerCase();
      if (stack.length < 2 || top().tag !== tag) throw new TemplateError(`Unexpected </${tag}>`, i);
      stack.pop();
      i = close + 1;
    } else if (c === '<' && /[a-zA-Z]/.test(src[i + 1] ?? '')) {
      const m = /^<([a-zA-Z][\w-]*)/.exec(src.slice(i))!;
      const el: TElement = { type: 'element', tag: m[1]!.toLowerCase(), attrs: [], children: [] };
      i += m[0].length;
      let selfClose = false;
      for (;;) {
        while (/\s/.test(src[i] ?? '')) i++;
        if (i >= src.length) throw new TemplateError(`Unclosed <${el.tag}`, i);
        if (src[i] === '>') {
          i++;
          break;
        }
        if (src[i] === '/' && src[i + 1] === '>') {
          selfClose = true;
          i += 2;
          break;
        }
        const a = /^[^\s=>/]+/.exec(src.slice(i));
        if (!a) throw new TemplateError('Bad attribute', i);
        const name = a[0];
        i += name.length;
        let value = '';
        let kind: Attr['kind'] = 'static';
        if (src[i] === '=') {
          i++;
          if (src[i] === '{') {
            const { expr, end } = readBraces(src, i);
            value = expr;
            kind = name.startsWith('on') ? 'event' : 'dynamic';
            i = end;
          } else if (src[i] === '"' || src[i] === "'") {
            const q = src[i]!;
            const end = src.indexOf(q, i + 1);
            if (end < 0) throw new TemplateError('Unclosed attribute value', i);
            value = src.slice(i + 1, end);
            i = end + 1;
          } else {
            const v = /^[^\s>]+/.exec(src.slice(i));
            value = v ? v[0] : '';
            i += value.length;
          }
        }
        el.attrs.push({ name, kind, value });
      }
      top().children.push(el);
      if (!selfClose && !VOID_TAGS.has(el.tag)) stack.push(el);
    } else {
      let j = i;
      while (j < src.length && src[j] !== '{' && !(src[j] === '<' && (src[j + 1] === '/' || /[a-zA-Z]/.test(src[j + 1] ?? '')))) j++;
      if (j === i) j = i + 1;
      pushText(src.slice(i, j));
      i = j;
    }
  }
  if (stack.length > 1) throw new TemplateError(`<${top().tag}> is never closed`, src.length);
  const elements = root.children.filter((n) => n.type === 'element' || n.type === 'hole' || (n.type === 'text' && n.text.trim()));
  if (elements.length !== 1 || elements[0]!.type !== 'element') throw new TemplateError('A template must have exactly one root element', 0);
  return elements[0] as TElement;
}

/** JSX-style whitespace: lines are trimmed at the inside edges, and lines that end up empty disappear. */
function cleanText(text: string): string {
  const lines = text.split(/\r?\n/);
  if (lines.length === 1) return text;
  return lines
    .map((l, i) => {
      let t = l;
      if (i > 0) t = t.replace(/^\s+/, '');
      if (i < lines.length - 1) t = t.replace(/\s+$/, '');
      return t;
    })
    .filter(Boolean)
    .join(' ');
}

// ───────────────────────── code generation ─────────────────────────

export interface Compiled {
  /** The generated JavaScript module body. */
  code: string;
  /** The static HTML that will be cloned. */
  html: string;
  /** How many holes (effects) the template has. */
  holes: number;
  /** The names the component function takes from its argument. */
  name: string;
}

interface Layout {
  /** DOM children the template's HTML will have, as the nodes (or markers) they come from. */
  kids: ({ kind: 'el'; el: TElement } | { kind: 'text'; text: string } | { kind: 'marker'; hole: Extract<TNode, { type: 'hole' }> })[];
}

function layoutOf(el: TElement): Layout {
  const kids: Layout['kids'] = [];
  const nodes = el.children;
  nodes.forEach((n, idx) => {
    if (n.type === 'element') kids.push({ kind: 'el', el: n });
    else if (n.type === 'text') {
      const t = cleanText(n.text);
      if (!t) return;
      const last = kids[kids.length - 1];
      if (last?.kind === 'text') last.text += t;
      else kids.push({ kind: 'text', text: t });
    } else {
      // A hole needs a marker to insert before, unless nothing static follows it.
      const followed = nodes.slice(idx + 1).some((m) => m.type === 'element' || (m.type === 'text' && cleanText(m.text)));
      if (followed) kids.push({ kind: 'marker', hole: n });
    }
  });
  return { kids };
}

function htmlOf(el: TElement): string {
  const attrs = el.attrs
    .filter((a) => a.kind === 'static')
    .map((a) => (a.value === '' ? ` ${a.name}` : ` ${a.name}="${escapeAttr(a.value)}"`))
    .join('');
  if (VOID_TAGS.has(el.tag)) return `<${el.tag}${attrs}>`;
  const inner = layoutOf(el)
    .kids.map((k) => (k.kind === 'el' ? htmlOf(k.el) : k.kind === 'text' ? escapeText(k.text) : '<!>'))
    .join('');
  return `<${el.tag}${attrs}>${inner}</${el.tag}>`;
}

const q = (s: string) => JSON.stringify(s);

export function compileTemplate(source: string, opts: { name?: string; scope?: string[]; index?: number } = {}): Compiled {
  const root = parse(source);
  const name = opts.name ?? 'Component';
  const idx = opts.index ?? 1;
  const html = htmlOf(root);
  const vars: string[] = [];
  const lines: string[] = [];
  let n = 0;
  let holes = 0;
  const fresh = () => `_el$${++n}`;
  /** Emit variables for every node on the path to `target`, returning the variable that names it. */
  const walk = (el: TElement, v: string): void => {
    const lay = layoutOf(el);
    // Variables for children that need one.
    const childVars: (string | null)[] = lay.kids.map(() => null);
    const need = (k: Layout['kids'][number]): boolean => {
      if (k.kind === 'marker') return true;
      if (k.kind === 'el') return hasDynamics(k.el);
      return false;
    };
    // The parent of a text hole is `v` itself; markers and dynamic children are reached by sibling walks.
    let prevVar: string | null = null;
    lay.kids.forEach((k, ci) => {
      if (!need(k)) return;
      const cv = fresh();
      const from = prevVar ? `${prevVar}${'.nextSibling'.repeat(ci - prevIndex(childVars, ci))}` : ci === 0 ? `${v}.firstChild` : `${v}.firstChild${'.nextSibling'.repeat(ci)}`;
      vars.push(`${cv} = ${from}`);
      childVars[ci] = cv;
      prevVar = cv;
    });
    // Holes of this element.
    const children = el.children;
    children.forEach((node, hi) => {
      if (node.type !== 'hole') return;
      holes++;
      const markerKid = lay.kids.findIndex((k) => k.kind === 'marker' && k.hole === node);
      const marker = markerKid >= 0 ? childVars[markerKid]! : 'null';
      lines.push(`insert(${v}, () => ${node.expr}, ${marker});`);
      void hi;
    });
    // Recurse into element children.
    lay.kids.forEach((k, ci) => {
      if (k.kind === 'el' && childVars[ci]) walk(k.el, childVars[ci]!);
    });
    attrLines(el, v);
  };
  const prevIndex = (childVars: (string | null)[], ci: number): number => {
    for (let k = ci - 1; k >= 0; k--) if (childVars[k]) return k;
    return -1;
  };
  const attrLines = (el: TElement, v: string) => {
    for (const a of el.attrs) {
      if (a.kind === 'dynamic') {
        holes++;
        lines.push(`effect(() => setAttribute(${v}, ${q(a.name)}, ${a.value}));`);
      } else if (a.kind === 'event') {
        lines.push(`listen(${v}, ${q(a.name.slice(2).toLowerCase())}, ${a.value});`);
      }
    }
  };
  function hasDynamics(el: TElement): boolean {
    return el.attrs.some((a) => a.kind !== 'static') || el.children.some((c) => c.type === 'hole' || (c.type === 'element' && hasDynamics(c)));
  }

  const rootVar = fresh();
  walk(root, rootVar);
  const param = opts.scope?.length ? `{ ${opts.scope.join(', ')} }` : '';
  const code = [
    `const _tmpl$${idx} = template(${q(html)});`,
    ``,
    `function ${name}(${param}) {`,
    `  const ${rootVar} = _tmpl$${idx}()${vars.length ? ',' : ';'}`,
    ...vars.map((v, k) => `    ${v}${k === vars.length - 1 ? ';' : ','}`),
    ...lines.map((l) => `  ${l}`),
    `  return ${rootVar};`,
    `}`,
  ].join('\n');
  return { code, html, holes, name };
}

// ───────────────────────── runtime ─────────────────────────

export interface TemplateRuntime {
  template(html: string): () => MElement;
  insert(parent: MElement, accessor: () => unknown, marker: MNode | null): void;
  setAttribute(el: MElement, name: string, value: unknown): void;
  listen(el: MElement, type: string, handler: (e: any) => void): void;
  effect: Engine['effect'];
  /** Map a reactive list to DOM nodes, creating each row once per item and reusing it when the item moves. */
  mapArray<T>(list: () => readonly T[], map: (item: T, index: () => number) => MNode): () => MNode[];
}

export function createTemplateRuntime(doc: MiniDocument, engine: Engine = defaultEngine): TemplateRuntime {
  const effect = engine.effect.bind(engine);
  const cache = new Map<string, MElement>();
  const rt: TemplateRuntime = {
    effect,
    template(html) {
      return () => {
        let proto = cache.get(html);
        if (!proto) {
          proto = doc.fragmentFromHTML(html).firstChild as MElement;
          proto.parent = null;
          cache.set(html, proto);
        }
        return doc.clone(proto);
      };
    },
    setAttribute(el, name, value) {
      // An empty class list removes the attribute, as setting className = '' effectively does.
      if (value === null || value === undefined || value === false || (name === 'class' && value === '')) {
        if (el.hasAttribute(name)) el.removeAttribute(name);
      } else {
        const v = value === true ? '' : String(value);
        if (el.getAttribute(name) !== v) el.setAttribute(name, v);
      }
    },
    listen(el, type, handler) {
      el.addEventListener(type, handler);
    },
    insert(parent, accessor, marker) {
      let current: MNode[] = [];
      let textNode: MText | null = null;
      effect(() => {
        const value = accessor();
        const parentNode = marker ? ((marker.parent as MElement | null) ?? parent) : parent;
        if (Array.isArray(value) && value.every((v) => v instanceof MNode)) {
          textNode = null;
          current = reconcileNodes(parentNode, current, value as MNode[], marker);
        } else if (value instanceof MNode) {
          textNode = null;
          current = reconcileNodes(parentNode, current, [value], marker);
        } else {
          const text = value === null || value === undefined || value === false ? '' : String(value);
          if (textNode && current.length === 1 && current[0] === textNode) {
            if (textNode.data !== text) textNode.data = text;
          } else {
            const t = doc.createTextNode(text);
            current = reconcileNodes(parentNode, current, [t], marker);
            textNode = t;
          }
        }
      });
    },
    mapArray(list, map) {
      interface Row {
        node: MNode;
        dispose: () => void;
        index: ReturnType<Engine['signal']>;
      }
      const rows = new Map<unknown, Row>();
      return () => {
        const items = list();
        const next = new Map<unknown, Row>();
        const out: MNode[] = [];
        items.forEach((item, i) => {
          let row = rows.get(item);
          if (!row) {
            const index = engine.signal(i);
            let node!: MNode;
            const dispose = engine.createRoot((d) => {
              node = engine.untracked(() => map(item, () => index.get() as number));
              return d;
            });
            row = { node, dispose, index };
          } else (row.index as any).set(i);
          next.set(item, row);
          out.push(row.node);
        });
        for (const [item, row] of rows) if (!next.has(item)) row.dispose();
        rows.clear();
        for (const [k, v] of next) rows.set(k, v);
        return out;
      };
    },
  };
  return rt;
}

/** Make the children between the start of `parent` and `marker` equal `next`, moving as little as possible. */
function reconcileNodes(parent: MElement, old: MNode[], next: MNode[], marker: MNode | null): MNode[] {
  const oldIds = old.map((n) => n.id);
  const newIds = next.map((n) => n.id);
  const steps = reconcile(oldIds, newIds, 'lis');
  const placed: (MNode | undefined)[] = [];
  const resolve = (a: Anchor): MNode | null => {
    if (a === 'end') return marker;
    if (a === 'start') return old.length ? old[0]! : marker;
    if ('before' in a) return placed[a.before]!;
    return placed[a.after]!.nextSibling;
  };
  for (const st of steps) {
    if (st.op === 'remove') parent.removeChild(old[st.from]!);
    else if (st.op === 'patch') placed[st.to] = next[st.to]!;
    else if (st.op === 'move') {
      parent.insertBefore(next[st.to]!, resolve(st.anchor));
      placed[st.to] = next[st.to]!;
    } else {
      parent.insertBefore(next[st.to]!, resolve(st.anchor));
      placed[st.to] = next[st.to]!;
    }
  }
  return next;
}

// ───────────────────────── compile and run ─────────────────────────

/** Evaluate compiled code against a runtime; returns the component function. */
export function instantiate<P = Record<string, unknown>>(compiled: Compiled | string, rt: TemplateRuntime): (props: P) => MElement {
  const code = typeof compiled === 'string' ? compiled : compiled.code;
  const name = typeof compiled === 'string' ? /function (\w+)/.exec(compiled)![1]! : compiled.name;
  const fn = new Function('template', 'insert', 'effect', 'setAttribute', 'listen', `${code}\nreturn ${name};`);
  return fn(rt.template, rt.insert, rt.effect, rt.setAttribute, rt.listen) as (props: P) => MElement;
}

/** Compile and instantiate in one step. */
export function compileAndLoad<P = Record<string, unknown>>(source: string, rt: TemplateRuntime, opts: { name?: string; scope?: string[] } = {}): { component: (props: P) => MElement; compiled: Compiled } {
  const compiled = compileTemplate(source, opts);
  return { component: instantiate<P>(compiled, rt), compiled };
}
