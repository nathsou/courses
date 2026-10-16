/**
 * Compiler hints for a virtual DOM, after Vue 3: what a template compiler can tell the diff so that it skips the
 * parts of the tree that can never change.
 *
 * A normal diff compares two vnode trees node by node. Vue's compiler knows, for each template, which nodes are
 * static and which are dynamic, and says so in three ways:
 *
 *   hoisting      A static subtree is created once, outside the render function, so a re-render returns the *same
 *                 object* and the diff skips it with one identity check.
 *   patch flags   A dynamic node carries a bit set saying what can change (only its text, only its class...), so the
 *                 diff compares those fields and not every property.
 *   block tree    A block remembers its dynamic descendants in a flat list, so the diff walks that list and never
 *                 visits the static nodes between them.
 *
 * `patch` counts what it did, so a figure can show the saving. The vnode model is deliberately small.
 */

export const FLAG_TEXT = 1;
export const FLAG_CLASS = 2;
export const FLAG_PROPS = 4;
/** Everything may change: compare all properties. */
export const FLAG_FULL = 8;

export interface HNode {
  tag: string;
  props: Record<string, string>;
  /** Text content of a leaf. */
  text?: string;
  children: HNode[];
  /** What can change. 0 means "static": the compiler promises nothing about this node changes. */
  flags: number;
  /** For a block: its dynamic descendants, flattened. */
  dynamic?: HNode[];
}

export interface PatchStats {
  /** Vnodes the diff looked at. */
  visited: number;
  /** Individual property or text comparisons. */
  comparisons: number;
  /** Real DOM writes. */
  writes: number;
}

export const newStats = (): PatchStats => ({ visited: 0, comparisons: 0, writes: 0 });

export function node(tag: string, props: Record<string, string> = {}, children: (HNode | string)[] = [], flags = FLAG_FULL): HNode {
  const kids: HNode[] = [];
  let text: string | undefined;
  for (const c of children) {
    if (typeof c === 'string') text = (text ?? '') + c;
    else kids.push(c);
  }
  return { tag, props, children: kids, text, flags };
}

/** Collect the dynamic descendants (nodes with flags) of a tree, in order, without descending into other blocks. */
export function collectDynamic(root: HNode): HNode[] {
  const out: HNode[] = [];
  const walk = (n: HNode) => {
    for (const c of n.children) {
      if (c.flags) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

export interface PatchOptions {
  /** Honour hoisting, patch flags and the block tree. When false, behave like a plain virtual DOM. */
  hints: boolean;
}

/** Diff `next` against `prev`, counting the work. The DOM is represented by `prev`, which is updated in place. */
export function patch(prev: HNode, next: HNode, stats: PatchStats, { hints }: PatchOptions): void {
  if (hints && prev === next) return; // a hoisted static subtree: one identity check
  stats.visited++;
  if (prev.tag !== next.tag) throw new Error('This model does not replace nodes.');
  if (hints && next.flags === 0) {
    // Static: the compiler promised this node's own fields never change (it may still hold dynamic descendants).
  } else if (hints && !(next.flags & FLAG_FULL)) {
    // Targeted: only the fields the flags name.
    if (next.flags & FLAG_TEXT) compareText(prev, next, stats);
    if (next.flags & FLAG_CLASS) compareProp(prev, next, 'class', stats);
    if (next.flags & FLAG_PROPS) compareProps(prev, next, stats);
  } else {
    compareProps(prev, next, stats);
    compareText(prev, next, stats);
  }
  if (hints && next.dynamic && prev.dynamic) {
    // A block: walk the flat list of dynamic descendants and skip everything else.
    next.dynamic.forEach((n, i) => patch(prev.dynamic![i]!, n, stats, { hints }));
    return;
  }
  next.children.forEach((c, i) => patch(prev.children[i]!, c, stats, { hints }));
}

function compareText(prev: HNode, next: HNode, stats: PatchStats): void {
  stats.comparisons++;
  if (prev.text !== next.text) {
    prev.text = next.text;
    stats.writes++;
  }
}
function compareProp(prev: HNode, next: HNode, key: string, stats: PatchStats): void {
  stats.comparisons++;
  if (prev.props[key] !== next.props[key]) {
    if (next.props[key] === undefined) delete prev.props[key];
    else prev.props[key] = next.props[key]!;
    stats.writes++;
  }
}
function compareProps(prev: HNode, next: HNode, stats: PatchStats): void {
  const keys = new Set([...Object.keys(prev.props), ...Object.keys(next.props)]);
  for (const k of keys) compareProp(prev, next, k, stats);
}

// ───────────────────────── a sample template ─────────────────────────

export interface CardState {
  title: string;
  count: number;
  hot: boolean;
}

/**
 * The template
 *
 *   <section class="card">
 *     <h2>{{ title }}</h2>
 *     <p class="feature">…</p> × staticRows        <!-- static -->
 *     <p :class="{ hot }">Count: {{ count }}</p>
 *     <footer>© Example</footer>                   <!-- static -->
 *   </section>
 *
 * as a render function, with or without what the compiler adds. Hoisted subtrees are created once per page, as Vue's
 * compiler writes them at module level; without hints every vnode is created again on each render.
 */
export function makeCard(staticRows: number): (state: CardState, hints: boolean) => HNode {
  const hoisted = Array.from({ length: staticRows }, (_, i) => node('p', { class: 'feature' }, [`Feature ${i + 1}: always the same.`], 0));
  const hoistedFooter = node('footer', {}, ['© Example'], 0);
  return (state, hints) => {
    const rows = hints ? hoisted : Array.from({ length: staticRows }, (_, i) => node('p', { class: 'feature' }, [`Feature ${i + 1}: always the same.`]));
    const footer = hints ? hoistedFooter : node('footer', {}, ['© Example']);
    const title = node('h2', {}, [state.title], hints ? FLAG_TEXT : FLAG_FULL);
    const counter = node('p', state.hot ? { class: 'hot' } : {}, [`Count: ${state.count}`], hints ? FLAG_TEXT | FLAG_CLASS : FLAG_FULL);
    const root = node('section', { class: 'card' }, [title, ...rows, counter, footer], 0);
    if (hints) root.dynamic = collectDynamic(root);
    return root;
  };
}

/** Total vnodes in a tree. */
export function size(n: HNode): number {
  return 1 + n.children.reduce((s, c) => s + size(c), 0);
}
