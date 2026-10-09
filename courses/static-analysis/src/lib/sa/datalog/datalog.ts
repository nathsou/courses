/**
 * A small Datalog engine (chapter 27): facts, rules with positive atoms and `=`/`!=` comparisons, queries, and
 * bottom-up evaluation to the least fixpoint, either naively (every rule on all facts, every round) or
 * semi-naively (each round only joins with at least one fact that is new since the previous round).
 *
 * Syntax: `edge(a, b).` is a fact; `path(X, Y) :- edge(X, Z), path(Z, Y).` a rule; `?- path(a, Y).` a query.
 * Variables start with an upper-case letter or `_`; constants are lower-case identifiers, numbers or "strings".
 * Comments run from `%` or `//` to the end of the line.
 */

export type Term = { var: string } | { const: string };
export interface Atom {
  rel: string;
  args: Term[];
}
export type Literal = { atom: Atom } | { cmp: '=' | '!='; left: Term; right: Term };
export interface Rule {
  head: Atom;
  body: Literal[];
  line: number;
  text: string;
}
export interface Program {
  facts: Atom[];
  rules: Rule[];
  queries: { atom: Atom; line: number; text: string }[];
}

export class DatalogError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(`line ${line}: ${message}`);
  }
}

type Token = { kind: 'id' | 'var' | 'str' | 'num' | 'sym'; text: string; line: number };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let line = 1;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') {
      line++;
      i++;
    } else if (/\s/.test(c)) i++;
    else if (c === '%' || src.startsWith('//', i)) {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (src.startsWith(':-', i) || src.startsWith('?-', i) || src.startsWith('!=', i)) {
      out.push({ kind: 'sym', text: src.slice(i, i + 2), line });
      i += 2;
    } else if ('(),.='.includes(c)) {
      out.push({ kind: 'sym', text: c, line });
      i++;
    } else if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"' && src[j] !== '\n') j++;
      if (src[j] !== '"') throw new DatalogError('unterminated string', line);
      out.push({ kind: 'str', text: src.slice(i + 1, j), line });
      i = j + 1;
    } else if (/[0-9-]/.test(c)) {
      const m = /^-?[0-9]+/.exec(src.slice(i));
      if (!m) throw new DatalogError(`unexpected “${c}”`, line);
      out.push({ kind: 'num', text: m[0], line });
      i += m[0].length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ kind: /^[A-Z_]/.test(m[0]) ? 'var' : 'id', text: m[0], line });
      i += m[0].length;
    } else throw new DatalogError(`unexpected “${c}”`, line);
  }
  return out;
}

export function parse(src: string): Program {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const lastLine = () => tokens[i - 1]?.line ?? 1;
  const expect = (text: string) => {
    const t = tokens[i];
    if (!t || t.text !== text) throw new DatalogError(`expected “${text}”${t ? ` but found “${t.text}”` : ' at the end'}`, t?.line ?? lastLine());
    i++;
  };
  const term = (): Term => {
    const t = tokens[i++];
    if (!t) throw new DatalogError('expected a term at the end', lastLine());
    if (t.kind === 'var') return { var: t.text };
    if (t.kind === 'id' || t.kind === 'str' || t.kind === 'num') return { const: t.text };
    throw new DatalogError(`expected a term but found “${t.text}”`, t.line);
  };
  const atom = (): Atom => {
    const t = tokens[i++];
    if (!t || t.kind !== 'id') throw new DatalogError(`expected a relation name${t ? ` but found “${t.text}”` : ''}`, t?.line ?? lastLine());
    expect('(');
    const args = [term()];
    while (peek()?.text === ',') {
      i++;
      args.push(term());
    }
    expect(')');
    return { rel: t.text, args };
  };
  const literal = (): Literal => {
    const t = peek();
    if (t && (t.kind === 'var' || t.kind === 'str' || t.kind === 'num' || (t.kind === 'id' && tokens[i + 1]?.text !== '('))) {
      const left = term();
      const op = tokens[i++];
      if (!op || (op.text !== '=' && op.text !== '!=')) throw new DatalogError('expected “=” or “!=”', op?.line ?? lastLine());
      return { cmp: op.text as '=' | '!=', left, right: term() };
    }
    return { atom: atom() };
  };
  const program: Program = { facts: [], rules: [], queries: [] };
  const show = (a: Atom) => `${a.rel}(${a.args.map((x) => ('var' in x ? x.var : x.const)).join(', ')})`;
  while (i < tokens.length) {
    const start = tokens[i]!;
    if (start.text === '?-') {
      i++;
      const a = atom();
      expect('.');
      program.queries.push({ atom: a, line: start.line, text: `?- ${show(a)}.` });
      continue;
    }
    const head = atom();
    if (peek()?.text === '.') {
      i++;
      if (head.args.some((x) => 'var' in x)) throw new DatalogError(`a fact cannot contain variables: ${show(head)}`, start.line);
      program.facts.push(head);
      continue;
    }
    expect(':-');
    const body = [literal()];
    while (peek()?.text === ',') {
      i++;
      body.push(literal());
    }
    expect('.');
    // Safety: every variable of the head and of comparisons must be bound by an atom of the body.
    const bound = new Set(body.flatMap((l) => ('atom' in l ? l.atom.args.flatMap((x) => ('var' in x ? [x.var] : [])) : [])));
    for (const l of body) if ('cmp' in l && l.cmp === '=' && 'var' in l.left && !bound.has(l.left.var) && 'var' in l.right && bound.has(l.right.var)) bound.add(l.left.var);
    const free = [...head.args, ...body.flatMap((l) => ('cmp' in l ? [l.left, l.right] : []))].filter((x) => 'var' in x && x.var !== '_' && !bound.has(x.var));
    if (free.length) throw new DatalogError(`variable ${(free[0] as { var: string }).var} is not bound by any atom of the body`, start.line);
    const bodyText = body.map((l) => ('atom' in l ? show(l.atom) : `${'var' in l.left ? l.left.var : l.left.const} ${l.cmp} ${'var' in l.right ? l.right.var : l.right.const}`)).join(', ');
    program.rules.push({ head, body, line: start.line, text: `${show(head)} :- ${bodyText}.` });
  }
  return program;
}

export type Tuple = readonly string[];
const SEP = '\u0000';
const keyOf = (t: Tuple) => t.join(SEP);

export class Relation {
  readonly tuples = new Map<string, Tuple>();
  add(t: Tuple): boolean {
    const k = keyOf(t);
    if (this.tuples.has(k)) return false;
    this.tuples.set(k, t);
    return true;
  }
  has(t: Tuple) {
    return this.tuples.has(keyOf(t));
  }
  get size() {
    return this.tuples.size;
  }
  [Symbol.iterator]() {
    return this.tuples.values();
  }
}

export interface Stats {
  /** Rounds until nothing new was derived. */
  rounds: number;
  /** Partial bindings considered while joining: a measure of work. */
  joins: number;
  /** Tuples derived, counting re-derivations of known ones. */
  derivations: number;
  /** New tuples per round. */
  perRound: number[];
}

export interface Evaluation {
  relations: Map<string, Relation>;
  stats: Stats;
  answers: { text: string; line: number; vars: string[]; rows: string[][] }[];
}

type Binding = Map<string, string>;

function value(t: Term, b: Binding): string | undefined {
  return 'const' in t ? t.const : t.var === '_' ? undefined : b.get(t.var);
}

/** Extends bindings with every tuple of `rel` that matches `atom`. */
function matchAtom(atom: Atom, rel: Iterable<Tuple>, bindings: Binding[], stats: Stats): Binding[] {
  const out: Binding[] = [];
  for (const b of bindings) {
    for (const t of rel) {
      stats.joins++;
      if (t.length !== atom.args.length) continue;
      let next: Binding | undefined = b;
      for (let k = 0; k < t.length && next; k++) {
        const a = atom.args[k]!;
        if ('const' in a) {
          if (a.const !== t[k]) next = undefined;
        } else if (a.var !== '_') {
          const v = next.get(a.var);
          if (v === undefined) {
            if (next === b) next = new Map(b);
            next.set(a.var, t[k]!);
          } else if (v !== t[k]) next = undefined;
        }
      }
      if (next) out.push(next);
    }
  }
  return out;
}

function compare(l: { cmp: '=' | '!='; left: Term; right: Term }, bindings: Binding[]): Binding[] {
  return bindings.flatMap((b) => {
    const x = value(l.left, b);
    const y = value(l.right, b);
    if (l.cmp === '=' && x === undefined && 'var' in l.left && y !== undefined) return [new Map(b).set(l.left.var, y)];
    return (l.cmp === '=' ? x === y : x !== y) ? [b] : [];
  });
}

/** Evaluates a program bottom-up to its least fixpoint. */
export function evaluate(program: Program, options: { seminaive?: boolean; maxRounds?: number } = {}): Evaluation {
  const { seminaive = true, maxRounds = 10_000 } = options;
  const relations = new Map<string, Relation>();
  const rel = (name: string) => relations.get(name) ?? relations.set(name, new Relation()).get(name)!;
  for (const r of program.rules) rel(r.head.rel);
  for (const f of program.facts) rel(f.rel).add(f.args.map((a) => (a as { const: string }).const));
  for (const r of program.rules) for (const l of r.body) if ('atom' in l) rel(l.atom.rel);
  for (const q of program.queries) rel(q.atom.rel);
  const stats: Stats = { rounds: 0, joins: 0, derivations: 0, perRound: [] };
  const idb = new Set(program.rules.map((r) => r.head.rel));
  // Delta: the tuples new in the previous round, per relation (initially, every fact).
  let delta = new Map<string, Relation>();
  for (const [name, r] of relations) {
    const d = new Relation();
    for (const t of r) d.add(t);
    delta.set(name, d);
  }
  const fire = (rule: Rule, sourceFor: (index: number) => Iterable<Tuple>): Tuple[] => {
    let bindings: Binding[] = [new Map()];
    rule.body.forEach((l, index) => {
      if (!bindings.length) return;
      bindings = 'atom' in l ? matchAtom(l.atom, sourceFor(index), bindings, stats) : compare(l, bindings);
    });
    return bindings.map((b) => rule.head.args.map((a) => value(a, b)!));
  };
  for (let round = 0; round < maxRounds; round++) {
    const fresh = new Map<string, Relation>();
    let added = 0;
    for (const rule of program.rules) {
      const atoms = rule.body.map((l, i) => ('atom' in l ? i : -1)).filter((i) => i >= 0);
      const variants: ((index: number) => Iterable<Tuple>)[] = [];
      if (!seminaive || round === 0) variants.push((index) => rel((rule.body[index] as { atom: Atom }).atom.rel));
      else {
        // One variant per body atom over a derived relation: that atom reads only the new tuples.
        for (const pivot of atoms) {
          const name = (rule.body[pivot] as { atom: Atom }).atom.rel;
          if (!idb.has(name) || !delta.get(name)?.size) continue;
          variants.push((index) => (index === pivot ? delta.get(name)! : rel((rule.body[index] as { atom: Atom }).atom.rel)));
        }
      }
      for (const v of variants) {
        for (const t of fire(rule, v)) {
          stats.derivations++;
          if (rel(rule.head.rel).has(t)) continue;
          const f = fresh.get(rule.head.rel) ?? fresh.set(rule.head.rel, new Relation()).get(rule.head.rel)!;
          if (f.add(t)) added++;
        }
      }
    }
    stats.rounds = round + 1;
    stats.perRound.push(added);
    for (const [name, f] of fresh) for (const t of f) rel(name).add(t);
    delta = fresh;
    if (added === 0) break;
  }
  const answers = program.queries.map((q) => {
    const vars = [...new Set(q.atom.args.flatMap((a) => ('var' in a && a.var !== '_' ? [a.var] : [])))];
    const rows = matchAtom(q.atom, rel(q.atom.rel), [new Map()], { rounds: 0, joins: 0, derivations: 0, perRound: [] })
      .map((b) => vars.map((v) => b.get(v)!))
      .sort((a, b) => a.join(SEP).localeCompare(b.join(SEP)));
    const unique = [...new Map(rows.map((r) => [r.join(SEP), r])).values()];
    return { text: q.text, line: q.line, vars, rows: unique };
  });
  return { relations, stats, answers };
}

export function run(src: string, options?: { seminaive?: boolean }): Evaluation {
  return evaluate(parse(src), options);
}
