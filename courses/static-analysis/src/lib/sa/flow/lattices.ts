/**
 * Small finite partial orders for the lattice lab (chapter 13): elements, the covering relation (Hasse diagram
 * edges), and least upper bounds / greatest lower bounds computed from the order.
 */
export interface FiniteOrder {
  name: string;
  description: string;
  elements: string[];
  /** [lower, upper] pairs: `upper` covers `lower`. */
  covers: [string, string][];
}

function subsets(base: string[]): FiniteOrder {
  const all: string[][] = [[]];
  for (const x of base) for (const s of [...all]) all.push([...s, x]);
  const name = (s: string[]) => `{${s.join(',')}}`;
  const covers: [string, string][] = [];
  for (const s of all) for (const x of base) if (!s.includes(x)) covers.push([name(s), name(base.filter((y) => s.includes(y) || y === x))]);
  return {
    name: 'Subsets',
    description: 'Sets of variables, ordered by inclusion. Join is union, meet is intersection. Liveness and reaching definitions use lattices like this one.',
    elements: all.sort((a, b) => a.length - b.length).map(name),
    covers,
  };
}

export const ORDERS: Record<string, FiniteOrder> = {
  powerset: subsets(['a', 'b', 'c']),
  flat: {
    name: 'Constants',
    description: 'The flat lattice of constant propagation, for one variable: ⊥ (no value yet), each constant, ⊤ (not a constant). Any two different constants join to ⊤.',
    elements: ['⊥', '-1', '0', '1', '2', '⊤'],
    covers: [['⊥', '-1'], ['⊥', '0'], ['⊥', '1'], ['⊥', '2'], ['-1', '⊤'], ['0', '⊤'], ['1', '⊤'], ['2', '⊤']],
  },
  sign: {
    name: 'Signs',
    description: 'Signs of a number: negative, zero, positive, and their unions. More precise than ⊤, cheaper than intervals.',
    elements: ['⊥', '−', '0', '+', '≤0', '≠0', '≥0', '⊤'],
    covers: [['⊥', '−'], ['⊥', '0'], ['⊥', '+'], ['−', '≤0'], ['0', '≤0'], ['−', '≠0'], ['+', '≠0'], ['0', '≥0'], ['+', '≥0'], ['≤0', '⊤'], ['≠0', '⊤'], ['≥0', '⊤']],
  },
  notlattice: {
    name: 'Not a lattice',
    description: 'A partial order in which a and b have two upper bounds, c and d, and neither is below the other: a ⊔ b does not exist.',
    elements: ['⊥', 'a', 'b', 'c', 'd', '⊤'],
    covers: [['⊥', 'a'], ['⊥', 'b'], ['a', 'c'], ['b', 'c'], ['a', 'd'], ['b', 'd'], ['c', '⊤'], ['d', '⊤']],
  },
};

export class OrderOps {
  readonly leq: Map<string, Set<string>>;
  readonly rank: Map<string, number>;
  constructor(readonly order: FiniteOrder) {
    // leq.get(x) = every y with x ≤ y (reflexive, transitive closure of the covers).
    this.leq = new Map(order.elements.map((e) => [e, new Set([e])]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const [lo, hi] of order.covers) {
        const up = this.leq.get(lo)!;
        for (const z of this.leq.get(hi)!) if (!up.has(z)) (up.add(z), (changed = true));
      }
    }
    // Rank: length of the longest chain from a minimal element.
    this.rank = new Map();
    const rankOf = (e: string): number => {
      if (this.rank.has(e)) return this.rank.get(e)!;
      const below = order.covers.filter(([, hi]) => hi === e).map(([lo]) => lo);
      const r = below.length ? Math.max(...below.map(rankOf)) + 1 : 0;
      this.rank.set(e, r);
      return r;
    };
    order.elements.forEach(rankOf);
  }
  le(a: string, b: string) {
    return this.leq.get(a)!.has(b);
  }
  /** The least upper bound, or undefined if there is none. */
  join(a: string, b: string): string | undefined {
    const ub = this.order.elements.filter((x) => this.le(a, x) && this.le(b, x));
    return ub.find((x) => ub.every((y) => this.le(x, y)));
  }
  meet(a: string, b: string): string | undefined {
    const lb = this.order.elements.filter((x) => this.le(x, a) && this.le(x, b));
    return lb.find((x) => lb.every((y) => this.le(y, x)));
  }
  upperBounds(a: string, b: string) {
    return this.order.elements.filter((x) => this.le(a, x) && this.le(b, x));
  }
  height() {
    return Math.max(...this.rank.values());
  }
}
