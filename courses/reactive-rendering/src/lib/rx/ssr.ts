/**
 * Server rendering for the virtual DOM: turn a tree of elements and components into an HTML string.
 *
 * Components run exactly as they do in the browser, except that `useState` returns its initial value and effects
 * never run (the server has no "after the page is shown"). The output follows React's conventions: adjacent text
 * nodes are separated by `<!-- -->`, so that the browser's parser (which merges adjacent text) gives the client the same
 * text nodes it would have created.
 */
import { VOID_TAGS, escapeAttr, escapeText } from './dom';
import { EMPTY, TEXT, callComponent, expectedAttrs, h, type Child, type Component, type VNode } from './vdom';

export function renderToString(tree: Child): string {
  const flat: VNode[] = [];
  const collect = (c: Child) => {
    if (Array.isArray(c)) c.forEach(collect);
    else if (c === null || c === undefined || typeof c === 'boolean') flat.push({ type: EMPTY, props: {}, key: null, children: [] });
    else if (typeof c === 'string' || typeof c === 'number') flat.push({ type: TEXT, props: {}, key: null, children: [], text: String(c) });
    else flat.push(c);
  };
  collect(tree);
  return renderList(flat);
}

function resolve(v: VNode): VNode {
  while (typeof v.type === 'function') v = callComponent(v as VNode & { type: Component });
  return v;
}

function renderList(nodes: readonly VNode[]): string {
  let out = '';
  let prevWasText = false;
  for (const raw of nodes) {
    const v = resolve(raw);
    if (v.type === EMPTY) continue;
    if (v.type === TEXT) {
      if (prevWasText) out += '<!-- -->';
      out += escapeText(v.text!);
      prevWasText = true;
      continue;
    }
    prevWasText = false;
    const tag = v.type as string;
    const attrs = [...expectedAttrs(v.props)].map(([k, val]) => ` ${k}="${escapeAttr(val)}"`).join('');
    out += VOID_TAGS.has(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${renderList(v.children)}</${tag}>`;
  }
  return out;
}

export { h };
