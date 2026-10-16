/**
 * The mutation lens: turns a MiniDocument's operation log into something a figure can show.
 *
 * `snapshot` copies a DOM tree into plain objects (so Svelte can re-render it when the document changes).
 * `Lens` watches a document, decides where one "action" ends and the next begins (a quiet period, or an explicit
 * `begin()`), and exposes what the last action did: the operations, their counts, and which nodes they touched.
 */
import { MComment, MElement, MText, statsOf, type MiniDocument, type MNode, type Op, type OpStats } from '$lib/rx/dom';

export interface Snap {
  id: number;
  kind: 'el' | 'text' | 'comment';
  tag: string;
  attrs: [string, string][];
  text: string;
  touched: number;
  ref: MNode;
  children: Snap[];
  value: string;
  checked: boolean;
}

export function snapshot(node: MNode, limit = { n: 600 }): Snap {
  limit.n--;
  if (node instanceof MText) return { id: node.id, kind: 'text', tag: '#text', attrs: [], text: node.data, touched: node.touched, ref: node, children: [], value: '', checked: false };
  if (node instanceof MComment) return { id: node.id, kind: 'comment', tag: '#comment', attrs: [], text: node.data, touched: node.touched, ref: node, children: [], value: '', checked: false };
  const el = node as MElement;
  return {
    id: el.id,
    kind: 'el',
    tag: el.tag,
    attrs: [...el.attrs],
    text: '',
    touched: el.touched,
    ref: el,
    children: limit.n > 0 ? el.children.map((c) => snapshot(c, limit)) : [],
    value: el.value,
    checked: el.checked,
  };
}

/** A short label for a node in the log: `li#n2`, `p`, `"text"`. */
export function describe(node: MNode | undefined): string {
  if (!node) return 'a removed node';
  if (node instanceof MText) return `"${node.data.length > 14 ? node.data.slice(0, 13) + '…' : node.data}"`;
  if (node instanceof MComment) return '<!-- -->';
  const el = node as MElement;
  const id = el.attrs.get('id');
  return `${el.tag}${id ? '#' + id : ''}`;
}

export class Lens {
  /** Bumped whenever the document changes (after coalescing); components read it to re-render. */
  version = $state(0);
  /** Operations since the start of the current action. */
  ops = $state<Op[]>([]);
  stats = $state<OpStats>(statsOf([]));
  /** Nodes touched at or after this logical time belong to the current action. */
  epochClock = $state(0);
  private epochOps = 0;
  private lastChange = 0;
  private scheduled = false;
  private off: (() => void) | undefined;

  constructor(
    readonly doc: MiniDocument,
    /** Idle time after which the next operation starts a new action. */
    private quietMs = 350,
  ) {
    this.epochOps = doc.ops.length;
    this.epochClock = doc.clock;
    this.off = doc.subscribe(() => this.onOp());
  }

  /** Mark the start of an action: the counters and flashes now describe what follows. */
  begin(): void {
    this.epochOps = this.doc.ops.length;
    this.epochClock = this.doc.clock;
    this.lastChange = now();
    this.refresh();
  }

  /** Run `fn` as one action. */
  act<T>(fn: () => T): T {
    this.begin();
    const out = fn();
    this.refresh();
    return out;
  }

  private onOp(): void {
    const t = now();
    if (t - this.lastChange > this.quietMs) {
      // A new action started by something we did not wrap (a click or keystroke in the preview).
      this.epochOps = this.doc.ops.length - 1;
      this.epochClock = this.doc.clock - 1;
    }
    this.lastChange = t;
    if (!this.scheduled) {
      this.scheduled = true;
      const run = () => {
        this.scheduled = false;
        this.refresh();
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else queueMicrotask(run);
    }
  }

  refresh(): void {
    this.ops = this.doc.opsSince(this.epochOps);
    this.stats = statsOf(this.ops);
    this.version++;
  }

  /** Ids of nodes that were created or inserted during the current action. */
  get added(): Set<number> {
    const ids = new Set<number>();
    for (const op of this.ops) if (op.kind === 'insert' || op.kind === 'clone') ids.add(op.id);
    return ids;
  }

  destroy(): void {
    this.off?.();
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
