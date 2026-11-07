/**
 * Term indexing with discrimination trees: find the rules whose left-hand side might match a term
 * without trying them all. A left-hand side is stored as its pre-order list of symbols, with `*`
 * for each variable; retrieval walks the tree along the term, also following `*` branches (which
 * skip a whole subterm).
 */
import type { Term } from './term';

interface DNode<V> {
  children: Map<string, DNode<V>>;
  values: V[];
}

const symKey = (t: Term) => (t.type === 'var' ? '*' : `${t.name}/${t.args.length}`);

/** The pre-order symbol sequence of a pattern, with `*` for variables. */
export function preorder(t: Term, out: string[] = []): string[] {
  out.push(symKey(t));
  if (t.type === 'fn') for (const a of t.args) preorder(a, out);
  return out;
}

export class DiscriminationTree<V> {
  private root: DNode<V> = { children: new Map(), values: [] };
  count = 0;

  insert(pattern: Term, value: V): void {
    let n = this.root;
    for (const k of preorder(pattern)) {
      let c = n.children.get(k);
      if (!c) n.children.set(k, (c = { children: new Map(), values: [] }));
      n = c;
    }
    n.values.push(value);
    this.count++;
  }

  /** Values whose pattern may match `t` (a superset of the real matches for non-linear patterns). */
  retrieve(t: Term, stats?: { visited: number }): V[] {
    const out: V[] = [];
    // A stack of remaining subterms to read, as in a pre-order walk.
    const go = (n: DNode<V>, todo: Term[]) => {
      if (stats) stats.visited++;
      if (todo.length === 0) {
        out.push(...n.values);
        return;
      }
      const [head, ...rest] = todo as [Term, ...Term[]];
      const star = n.children.get('*');
      if (star) go(star, rest);
      if (head.type === 'fn') {
        const c = n.children.get(symKey(head));
        if (c) go(c, [...head.args, ...rest]);
      }
    };
    go(this.root, [t]);
    return out;
  }

  /** The tree as nested entries, for drawing. */
  shape(): { label: string; values: V[]; children: ReturnType<DiscriminationTree<V>['shape']>[] } {
    const walk = (label: string, n: DNode<V>): ReturnType<DiscriminationTree<V>['shape']> => ({
      label,
      values: n.values,
      children: [...n.children].map(([k, c]) => walk(k, c)),
    });
    return walk('root', this.root);
  }
}
