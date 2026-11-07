/**
 * Compiling rewrite systems: decision trees for matching (after Maranget, 2008) and a JavaScript
 * backend, in the spirit of Girafe's compiler. Rules are tried in order (priority semantics) and
 * must be left-linear. Evaluation is innermost: every defined symbol becomes a function that
 * receives its arguments already in normal form.
 */
import type { Rule } from './parse';
import { f, show, isLinear, type Fn, type Term } from './term';

/** A path of argument indices into the arguments of the defined symbol: [i, j] is argument i's argument j. */
export type Occurrence = number[];

export type DTree =
  | { k: 'leaf'; rule: number; bindings: [string, Occurrence][] }
  | { k: 'fail' }
  | { k: 'switch'; occ: Occurrence; cases: { ctor: string; arity: number; tree: DTree }[]; default: DTree };

interface Row {
  pats: Term[];
  rule: number;
  bindings: [string, Occurrence][];
}

/** Compile the rules of one symbol (given in priority order) into a decision tree. */
export function decisionTree(rules: readonly Rule[], arity: number): DTree {
  const rows: Row[] = rules.map((r, rule) => ({ pats: [...(r.lhs as Fn).args], rule, bindings: [] }));
  const occs: Occurrence[] = Array.from({ length: arity }, (_, i) => [i]);
  return cc(occs, rows);
}

function cc(occs: Occurrence[], rows: Row[]): DTree {
  if (rows.length === 0) return { k: 'fail' };
  const first = rows[0]!;
  const col = first.pats.findIndex((p) => p.type === 'fn');
  if (col < 0) {
    const bindings = [...first.bindings];
    first.pats.forEach((p, i) => {
      if (p.type === 'var') bindings.push([p.name, occs[i]!]);
    });
    return { k: 'leaf', rule: first.rule, bindings };
  }
  const ctors = new Map<string, number>();
  for (const r of rows) {
    const p = r.pats[col]!;
    if (p.type === 'fn' && !ctors.has(p.name)) ctors.set(p.name, p.args.length);
  }
  const occ = occs[col]!;
  const restOccs = [...occs.slice(0, col), ...occs.slice(col + 1)];
  const cases = [...ctors].map(([ctor, arity]) => {
    const sub: Row[] = [];
    for (const r of rows) {
      const p = r.pats[col]!;
      const others = [...r.pats.slice(0, col), ...r.pats.slice(col + 1)];
      if (p.type === 'fn') {
        if (p.name !== ctor || p.args.length !== arity) continue;
        sub.push({ pats: [...p.args, ...others], rule: r.rule, bindings: r.bindings });
      } else {
        sub.push({ pats: [...Array.from({ length: arity }, (_, i) => ({ type: 'var' as const, name: `_w${i}` })), ...others], rule: r.rule, bindings: [...r.bindings, [p.name, occ]] });
      }
    }
    const subOccs = [...Array.from({ length: arity }, (_, i) => [...occ, i]), ...restOccs];
    return { ctor, arity, tree: cc(subOccs, sub) };
  });
  const defRows: Row[] = rows
    .filter((r) => r.pats[col]!.type === 'var')
    .map((r) => ({ pats: [...r.pats.slice(0, col), ...r.pats.slice(col + 1)], rule: r.rule, bindings: [...r.bindings, [(r.pats[col] as { name: string }).name, occ]] }));
  return { k: 'switch', occ, cases, default: cc(restOccs, defRows) };
}

/** Number of tests on the path a term takes through the tree (for comparing with naive matching). */
export function treeTests(tree: DTree, args: readonly Term[]): { rule: number | null; tests: number } {
  let tests = 0;
  let t = tree;
  for (;;) {
    if (t.k === 'fail') return { rule: null, tests };
    if (t.k === 'leaf') return { rule: t.rule, tests };
    let u: Term = args[t.occ[0]!]!;
    for (const i of t.occ.slice(1)) u = (u as Fn).args[i]!;
    tests++;
    const c = u.type === 'fn' ? t.cases.find((x) => x.ctor === u.name && x.arity === u.args.length) : undefined;
    t = c ? c.tree : t.default;
  }
}

/** Draw a decision tree as indented text. */
export function showTree(tree: DTree, rules: readonly Rule[], indent = ''): string {
  const occName = (o: Occurrence) => `x${o[0]! + 1}${o.slice(1).map((i) => `.${i + 1}`).join('')}`;
  if (tree.k === 'fail') return `${indent}no rule (normal form)`;
  if (tree.k === 'leaf') return `${indent}rule ${tree.rule + 1}: ${show(rules[tree.rule]!.lhs)} -> ${show(rules[tree.rule]!.rhs)}`;
  const lines = [`${indent}switch ${occName(tree.occ)}`];
  for (const c of tree.cases) lines.push(`${indent}  case ${c.ctor}${c.arity ? `/${c.arity}` : ''}:`, showTree(c.tree, rules, indent + '    '));
  lines.push(`${indent}  default:`, showTree(tree.default, rules, indent + '    '));
  return lines.join('\n');
}

// ───────────── JavaScript backend ─────────────

export interface Compiled {
  source: string;
  /** Normalise a ground term with the compiled code. */
  run: (t: Term) => Term;
  trees: Map<string, DTree>;
}

const ident = (name: string) => `F_${[...name].map((ch) => (/[A-Za-z0-9]/.test(ch) ? ch : `$${ch.charCodeAt(0).toString(16)}`)).join('')}`;
const ARITH = new Set(['add', 'sub', 'mul', 'mult', 'div', 'mod', 'lt', 'le', 'gt', 'ge', 'equ', 'eq', 'neq', 'max', 'min']);

/** Compile a left-linear system with priority semantics to JavaScript. */
export function compileToJS(rules: readonly Rule[]): Compiled {
  const groups = new Map<string, { arity: number; rules: Rule[] }>();
  for (const r of rules) {
    if (r.lhs.type !== 'fn') continue;
    if (!isLinear(r.lhs)) throw new Error(`the compiler needs left-linear rules: ${show(r.lhs)} repeats a variable`);
    if (r.conditions?.length) throw new Error('the compiler does not handle conditional rules');
    const g = groups.get(r.lhs.name);
    if (g && g.arity !== r.lhs.args.length) throw new Error(`${r.lhs.name} is used with two arities`);
    (g ?? groups.set(r.lhs.name, { arity: r.lhs.args.length, rules: [] }).get(r.lhs.name)!).rules.push(r);
  }
  const trees = new Map<string, DTree>();
  const fns: string[] = [];
  const rhs = (t: Term, env: Map<string, string>): string => {
    if (t.type === 'var') return env.get(t.name) ?? 'undefined';
    if (t.name === 'if' && t.args.length === 3) return `(${rhs(t.args[0]!, env)}.n === 'True' ? ${rhs(t.args[1]!, env)} : ${rhs(t.args[2]!, env)})`;
    if (t.name === '?' && t.args.length === 1) return rhs(t.args[0]!, env);
    const args = t.args.map((a) => rhs(a, env));
    if (t.name[0] === '@' && ARITH.has(t.name.slice(1)) && args.length === 2) return `ext(${JSON.stringify(t.name.slice(1))}, ${args.join(', ')})`;
    if (groups.has(t.name) && groups.get(t.name)!.arity === args.length) return `${ident(t.name)}(${args.join(', ')})`;
    return `mk(${JSON.stringify(t.name)}, [${args.join(', ')}])`;
  };
  for (const [name, g] of groups) {
    const tree = decisionTree(g.rules, g.arity);
    trees.set(name, tree);
    const params = Array.from({ length: g.arity }, (_, i) => `a${i}`);
    const occExpr = (o: Occurrence) => `a${o[0]}${o.slice(1).map((i) => `.a[${i}]`).join('')}`;
    const gen = (t: DTree, ind: string): string => {
      if (t.k === 'fail') return `${ind}return mk(${JSON.stringify(name)}, [${params.join(', ')}]);`;
      if (t.k === 'leaf') {
        const env = new Map(t.bindings.map(([x, o]) => [x, occExpr(o)]));
        return `${ind}return ${rhs(g.rules[t.rule]!.rhs, env)};`;
      }
      const e = occExpr(t.occ);
      const parts = t.cases.map((c, i) => `${ind}${i ? 'else ' : ''}if (${e}.n === ${JSON.stringify(c.ctor)} && ${e}.a.length === ${c.arity}) {\n${gen(c.tree, ind + '  ')}\n${ind}}`);
      return `${parts.join('\n')}\n${gen(t.default, ind)}`;
    };
    fns.push(`function ${ident(name)}(${params.join(', ')}) {\n  if (++steps > FUEL) throw new RangeError('out of fuel');\n${gen(tree, '  ')}\n}`);
  }
  const source = [
    `const FUEL = 50000000; let steps = 0;`,
    `const mk = (n, a) => ({ n, a });`,
    `const INT = /^-?\\d+$/;`,
    `const B = (b) => mk(b ? 'True' : 'False', []);`,
    `const eqT = (x, y) => x.n === y.n && x.a.length === y.a.length && x.a.every((c, i) => eqT(c, y.a[i]));`,
    `function ext(op, x, y) {`,
    `  if (op === 'equ' || op === 'eq') return B(eqT(x, y));`,
    `  if (op === 'neq') return B(!eqT(x, y));`,
    `  if (!INT.test(x.n) || !INT.test(y.n) || x.a.length || y.a.length) return mk('@' + op, [x, y]);`,
    `  const a = BigInt(x.n), b = BigInt(y.n);`,
    `  switch (op) {`,
    `    case 'add': return mk(String(a + b), []); case 'sub': return mk(String(a - b), []);`,
    `    case 'mul': case 'mult': return mk(String(a * b), []);`,
    `    case 'div': return b === 0n ? mk('@div', [x, y]) : mk(String(a / b), []);`,
    `    case 'mod': return b === 0n ? mk('@mod', [x, y]) : mk(String(((a % b) + b) % b), []);`,
    `    case 'lt': return B(a < b); case 'le': return B(a <= b); case 'gt': return B(a > b); case 'ge': return B(a >= b);`,
    `    case 'max': return a > b ? x : y; case 'min': return a < b ? x : y;`,
    `  }`,
    `}`,
    ...fns,
  ].join('\n');
  const entry = new Function(`${source}\nreturn { fns: { ${[...groups.keys()].map((n) => `${JSON.stringify(n)}: ${ident(n)}`).join(', ')} }, ext, mk, reset: () => { steps = 0; } };`)() as {
    fns: Record<string, (...a: unknown[]) => unknown>;
    ext: (op: string, x: unknown, y: unknown) => unknown;
    mk: (n: string, a: unknown[]) => unknown;
    reset: () => void;
  };
  type JT = { n: string; a: JT[] };
  const toJS = (t: Term): JT => {
    if (t.type === 'var') throw new Error('compiled code runs on ground terms only');
    const a = t.args.map(toJS);
    const fn = entry.fns[t.name];
    if (fn && fn.length === a.length) return fn(...a) as JT;
    if (t.name[0] === '@' && a.length === 2) return entry.ext(t.name.slice(1), a[0], a[1]) as JT;
    if (t.name === 'if' && a.length === 3) return a[0]!.n === 'True' ? a[1]! : a[0]!.n === 'False' ? a[2]! : { n: 'if', a };
    return { n: t.name, a };
  };
  const fromJS = (x: JT): Term => f(x.n, ...x.a.map(fromJS));
  return {
    source,
    trees,
    run: (t) => {
      entry.reset();
      return fromJS(toJS(t));
    },
  };
}
