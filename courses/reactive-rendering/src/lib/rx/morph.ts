/**
 * DOM morphing, after idiomorph, morphdom and Turbo's page refreshes: take the HTML the server just sent and make the
 * existing DOM look like it, changing as little as possible.
 *
 * The old DOM and the new HTML are two trees. Matching nodes (same tag, and the same `id` when there is one) are
 * *kept*: their attributes and children are updated in place, so a focused input, its typed text, its selection, a
 * scroll position and a playing video all survive. Only genuinely new nodes are inserted and genuinely vanished ones
 * removed. `id`s are what let a node be recognised after it moved.
 *
 * This is the "no client-side component state" end of the spectrum: no virtual DOM, no signals, no components in the
 * browser. The server renders the page; the browser reconciles the result.
 */
import { MiniDocument, MElement, MNode, MText, MComment, parseHTML } from './dom';

export interface MorphOptions {
  /** Do not overwrite the value of the focused control (the default): the user is typing in it. */
  ignoreActiveValue?: boolean;
}

export function morph(parent: MElement, html: string, opts: MorphOptions = {}): void {
  const doc = parent.doc;
  const frag = doc.createFragment();
  for (const n of parseHTML(doc, html)) {
    n.parent = frag;
    frag.children.push(n);
  }
  new Morpher(doc, opts.ignoreActiveValue ?? true).children(parent, frag);
}

const idOf = (n: MNode): string | null => (n instanceof MElement ? (n.attrs.get('id') ?? null) : null);

class Morpher {
  constructor(
    private doc: MiniDocument,
    private ignoreActiveValue: boolean,
  ) {}

  /** Ids present anywhere below (and on) a node. */
  private idSet(n: MNode, out = new Set<string>()): Set<string> {
    const id = idOf(n);
    if (id) out.add(id);
    if (n instanceof MElement) for (const c of n.children) this.idSet(c, out);
    return out;
  }

  private sameKind(a: MNode, b: MNode): boolean {
    if (a.nodeType !== b.nodeType) return false;
    return !(a instanceof MElement && b instanceof MElement && a.tag !== b.tag);
  }

  /** A node may be reused in place when it is the same kind, and it does not carry an id that belongs to another node. */
  private softMatch(old: MNode, next: MNode): boolean {
    if (!this.sameKind(old, next)) return false;
    const a = idOf(old);
    const b = idOf(next);
    return a === b || a === null || b === null ? a === b || (a === null && b === null) : false;
  }

  /** How far ahead of the cursor to look for a node that can stand in (idiomorph bounds its search too). */
  private static readonly LOOKAHEAD = 8;

  children(oldParent: MElement, newParent: MElement): void {
    const newIds = this.idSet(newParent);
    const newKids = [...newParent.children];
    // Index the old children that carry an id once, instead of scanning for each new child.
    const oldById = new Map<string, MNode>();
    for (const c of oldParent.children) {
      const id = idOf(c);
      if (id) oldById.set(id, c);
    }
    let cursor: MNode | null = oldParent.firstChild;
    for (const next of newKids) {
      // 1. A node with an id is matched by id, wherever it is among the remaining old children.
      const id = idOf(next);
      if (id) {
        const found = oldById.get(id);
        if (found && found.parent === oldParent && this.sameKind(found, next)) {
          if (found === cursor) cursor = found.nextSibling;
          else oldParent.insertBefore(found, cursor);
          this.node(found, next);
          continue;
        }
        // An id no old node has: this is a new node, and nothing already there can stand in for it.
        oldParent.insertBefore(next, cursor);
        continue;
      }
      // 2. The old node at the cursor, if it can stand in.
      if (cursor && this.softMatch(cursor, next)) {
        const here = cursor;
        cursor = cursor.nextSibling;
        this.node(here, next);
        continue;
      }
      // 3. Look a little ahead for a node that can stand in, discarding what is skipped unless it will be needed later.
      let ahead: MNode | null = null;
      let scanned = 0;
      for (let c = cursor; c && scanned < Morpher.LOOKAHEAD; c = c.nextSibling, scanned++) {
        if (this.softMatch(c, next)) {
          ahead = c;
          break;
        }
      }
      if (ahead) {
        for (let c = cursor; c && c !== ahead; ) {
          const nextC: MNode | null = c.nextSibling;
          const keep = c instanceof MElement && [...this.idSet(c)].some((i) => newIds.has(i));
          if (!keep) oldParent.removeChild(c);
          c = nextC;
        }
        cursor = ahead.nextSibling;
        this.node(ahead, next);
        continue;
      }
      // 4. Nothing matches: bring in the new node (moving it out of the temporary parent).
      oldParent.insertBefore(next, cursor);
    }
    // Whatever is left of the old children is gone from the new page.
    while (cursor) {
      const nextC: MNode | null = cursor.nextSibling;
      oldParent.removeChild(cursor);
      cursor = nextC;
    }
  }

  private node(old: MNode, next: MNode): void {
    if (old instanceof MText && next instanceof MText) {
      if (old.data !== next.data) old.data = next.data;
    } else if (old instanceof MComment && next instanceof MComment) {
      old.data = next.data;
    } else if (old instanceof MElement && next instanceof MElement) {
      this.attributes(old, next);
      this.children(old, next);
    }
  }

  private attributes(old: MElement, next: MElement): void {
    for (const [name, value] of next.attrs) if (old.attrs.get(name) !== value) old.setAttribute(name, value);
    for (const name of [...old.attrs.keys()]) if (!next.attrs.has(name)) old.removeAttribute(name);
    if (old.tag === 'input' || old.tag === 'textarea' || old.tag === 'select') {
      const active = this.doc.activeElement === old;
      if (!(active && this.ignoreActiveValue)) {
        const want = next.attrs.get('value');
        if (want !== undefined && old.value !== want) old.value = want;
      }
      if (next.attrs.has('checked') !== old.checked && !(this.doc.activeElement === old && this.ignoreActiveValue)) old.checked = next.attrs.has('checked');
    }
  }
}
