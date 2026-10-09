/**
 * A statement-level control-flow graph for one JavaScript function, for the course's dataflow figures (Part III)
 * and engines (Part V onwards). Each node is one simple statement: an assignment, a condition, an expression,
 * a return. Nodes record the variables they define and use, restricted to the function's own variables
 * (parameters and local declarations).
 *
 * Supported: declarations, assignments (`=`, compound, `++`/`--`), `if`, `while`, `do…while`, `for`, `for…of`,
 * `for…in`, `break`, `continue`, `return`, `throw`, blocks and expression statements. Not supported: `switch`,
 * `try`, labels; an assignment nested inside an expression is not seen as a definition.
 */
import * as espree from 'espree';
import type estree from 'estree';

export type CfgNodeKind = 'entry' | 'exit' | 'assign' | 'declare' | 'cond' | 'expr' | 'return' | 'throw';

export interface CfgNode {
  id: number;
  kind: CfgNodeKind;
  /** Source text to show (for entry/exit: a label). */
  text: string;
  range?: [number, number];
  defs: string[];
  uses: string[];
  succ: number[];
  pred: number[];
  /** The assigned expression, for `assign` nodes (`x = e`, also `x += e` as `x + e`). */
  value?: estree.Expression;
  /** For `cond` nodes: the test expression. */
  test?: estree.Expression;
  /** For `expr`, `return` and `throw` nodes: the expression evaluated. */
  expr?: estree.Node;
}

export interface Cfg {
  name: string;
  params: string[];
  /** Every variable of the function: parameters, then locals in declaration order. */
  variables: string[];
  nodes: CfgNode[];
  entry: number;
  exit: number;
  /** Back edges [from, to] found by depth-first search from the entry. */
  backEdges: [number, number][];
  source: string;
}

export class CfgError extends Error {}

type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

export function parseFunctions(source: string): FunctionNode[] {
  let program: estree.Program;
  try {
    program = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true }) as unknown as estree.Program;
  } catch (e) {
    throw new CfgError(e instanceof Error ? e.message : String(e));
  }
  const out: FunctionNode[] = [];
  for (const s of program.body) {
    const d = s.type === 'ExportNamedDeclaration' || s.type === 'ExportDefaultDeclaration' ? (s.declaration as estree.Node | null) : s;
    if (d?.type === 'FunctionDeclaration') out.push(d);
    if (d?.type === 'VariableDeclaration') for (const v of d.declarations) if (v.init && (v.init.type === 'FunctionExpression' || v.init.type === 'ArrowFunctionExpression')) out.push(v.init);
  }
  return out;
}

/** Builds the CFG of the first function in `source` (or the one called `name`). */
export function buildCfg(source: string, name?: string): Cfg {
  const fns = parseFunctions(source);
  const fn = name ? fns.find((f) => f.type === 'FunctionDeclaration' && f.id?.name === name) : fns[0];
  if (!fn) throw new CfgError(name ? `No function called ${name}` : 'No function found');
  return lowerFunction(fn, source);
}

const range = (n: estree.Node) => (n as estree.Node & { range: [number, number] }).range;

function collectDeclared(node: estree.Node, out: string[]) {
  const visit = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    const x = n as estree.Node;
    if (typeof x.type !== 'string') return;
    if (x.type === 'FunctionDeclaration' || x.type === 'FunctionExpression' || x.type === 'ArrowFunctionExpression') {
      if (x.type === 'FunctionDeclaration' && x.id) out.push(x.id.name);
      return;
    }
    if (x.type === 'VariableDeclarator') patternNames(x.id, out);
    for (const [k, v] of Object.entries(x)) {
      if (k === 'parent' || k === 'range' || k === 'loc') continue;
      if (Array.isArray(v)) v.forEach(visit);
      else visit(v);
    }
  };
  visit(node);
}

function patternNames(p: estree.Pattern, out: string[]) {
  switch (p.type) {
    case 'Identifier':
      out.push(p.name);
      break;
    case 'ObjectPattern':
      for (const q of p.properties) patternNames(q.type === 'RestElement' ? q.argument : q.value, out);
      break;
    case 'ArrayPattern':
      for (const q of p.elements) if (q) patternNames(q, out);
      break;
    case 'RestElement':
      patternNames(p.argument, out);
      break;
    case 'AssignmentPattern':
      patternNames(p.left, out);
      break;
    default:
      break;
  }
}

/** The variables an expression reads (identifiers in reference position), in order, without duplicates. */
export function readsOf(node: estree.Node | null | undefined, vars: Set<string>): string[] {
  const out: string[] = [];
  const visit = (n: estree.Node | null | undefined) => {
    if (!n) return;
    switch (n.type) {
      case 'Identifier':
        if (vars.has(n.name) && !out.includes(n.name)) out.push(n.name);
        return;
      case 'MemberExpression':
        visit(n.object as estree.Node);
        if (n.computed) visit(n.property as estree.Node);
        return;
      case 'Property':
        if (n.computed) visit(n.key as estree.Node);
        visit(n.value as estree.Node);
        return;
      default:
        for (const [k, v] of Object.entries(n)) {
          if (k === 'type' || k === 'range' || k === 'loc' || k === 'parent' || k === 'typeAnnotation' || k === 'returnType' || k === 'typeParameters' || k === 'typeArguments') continue;
          if (Array.isArray(v)) v.forEach((c) => c && typeof c === 'object' && typeof (c as estree.Node).type === 'string' && visit(c as estree.Node));
          else if (v && typeof v === 'object' && typeof (v as estree.Node).type === 'string') visit(v as estree.Node);
        }
    }
  };
  visit(node);
  return out;
}

export function lowerFunction(fn: FunctionNode, source: string): Cfg {
  const params: string[] = [];
  for (const p of fn.params) patternNames(p, params);
  const locals: string[] = [];
  if (fn.body.type === 'BlockStatement') collectDeclared(fn.body, locals);
  const variables = [...params, ...locals.filter((l, i) => !params.includes(l) && locals.indexOf(l) === i)];
  const vars = new Set(variables);
  const nodes: CfgNode[] = [];
  const text = (n: estree.Node) => source.slice(...range(n)).replace(/\s+/g, ' ');
  const add = (kind: CfgNodeKind, label: string, r: [number, number] | undefined, defs: string[], uses: string[], extra: Partial<CfgNode> = {}): number => {
    const id = nodes.length;
    nodes.push({ id, kind, text: label, range: r, defs, uses, succ: [], pred: [], ...extra });
    return id;
  };
  const edge = (a: number, b: number) => {
    if (!nodes[a]!.succ.includes(b)) nodes[a]!.succ.push(b);
    if (!nodes[b]!.pred.includes(a)) nodes[b]!.pred.push(a);
  };

  const entry = add('entry', params.length ? `entry (${params.join(', ')})` : 'entry', undefined, params, []);
  const exit = add('exit', 'exit', undefined, [], []);

  type Loop = { breakTo: number[]; continueTo: number };
  /**
   * Lowers `s`, whose control comes from the nodes in `from`. Returns the nodes whose control falls out of `s`.
   * `loops` holds the enclosing loops, innermost last.
   */
  function stmt(s: estree.Statement, from: number[], loops: Loop[]): number[] {
    const link = (id: number) => {
      for (const f of from) edge(f, id);
      return [id];
    };
    switch (s.type) {
      case 'BlockStatement': {
        let cur = from;
        for (const t of s.body) cur = stmt(t as estree.Statement, cur, loops);
        return cur;
      }
      case 'EmptyStatement':
        return from;
      case 'VariableDeclaration': {
        let cur = from;
        for (const d of s.declarations) {
          const names: string[] = [];
          patternNames(d.id, names);
          const id = d.init
            ? add('assign', `${s.kind} ${text(d)}`, range(d), names, readsOf(d.init, vars), { value: d.id.type === 'Identifier' ? d.init : undefined })
            : add('declare', `${s.kind} ${text(d)}`, range(d), names, []);
          for (const f of cur) edge(f, id);
          cur = [id];
        }
        return cur;
      }
      case 'FunctionDeclaration':
        return link(add('declare', `function ${s.id?.name ?? ''}`, range(s), s.id ? [s.id.name] : [], []));
      case 'ExpressionStatement': {
        const e = s.expression;
        if (e.type === 'AssignmentExpression' && e.left.type === 'Identifier' && vars.has(e.left.name)) {
          const x = e.left.name;
          const uses = readsOf(e.right, vars);
          if (e.operator !== '=' && !uses.includes(x)) uses.unshift(x);
          const value: estree.Expression =
            e.operator === '=' ? e.right : ({ type: 'BinaryExpression', operator: e.operator.slice(0, -1), left: e.left, right: e.right } as estree.BinaryExpression);
          return link(add('assign', text(s), range(s), [x], uses, { value }));
        }
        if (e.type === 'UpdateExpression' && e.argument.type === 'Identifier' && vars.has(e.argument.name)) {
          const x = e.argument.name;
          const value = { type: 'BinaryExpression', operator: e.operator === '++' ? '+' : '-', left: e.argument, right: { type: 'Literal', value: 1, raw: '1' } } as estree.BinaryExpression;
          return link(add('assign', text(s), range(s), [x], [x], { value }));
        }
        if (e.type === 'AssignmentExpression' && e.left.type !== 'Identifier') {
          // `obj.p = v` writes memory, not a variable: it reads obj (and v).
          return link(add('expr', text(s), range(s), [], readsOf(e, vars), { expr: e }));
        }
        return link(add('expr', text(s), range(s), [], readsOf(e, vars), { expr: e }));
      }
      case 'ReturnStatement': {
        const id = add('return', text(s), range(s), [], readsOf(s.argument, vars), s.argument ? { expr: s.argument } : {});
        for (const f of from) edge(f, id);
        edge(id, exit);
        return [];
      }
      case 'ThrowStatement': {
        const id = add('throw', text(s), range(s), [], readsOf(s.argument, vars), { expr: s.argument });
        for (const f of from) edge(f, id);
        edge(id, exit);
        return [];
      }
      case 'IfStatement': {
        const c = add('cond', `if (${text(s.test)})`, range(s.test), [], readsOf(s.test, vars), { test: s.test });
        for (const f of from) edge(f, c);
        const thenOut = stmt(s.consequent, [c], loops);
        const elseOut = s.alternate ? stmt(s.alternate, [c], loops) : [c];
        return [...thenOut, ...elseOut];
      }
      case 'WhileStatement': {
        const c = add('cond', `while (${text(s.test)})`, range(s.test), [], readsOf(s.test, vars), { test: s.test });
        for (const f of from) edge(f, c);
        const loop: Loop = { breakTo: [], continueTo: c };
        const bodyOut = stmt(s.body, [c], [...loops, loop]);
        for (const b of bodyOut) edge(b, c);
        return [c, ...loop.breakTo];
      }
      case 'DoWhileStatement': {
        const c = add('cond', `while (${text(s.test)})`, range(s.test), [], readsOf(s.test, vars), { test: s.test });
        const loop: Loop = { breakTo: [], continueTo: c };
        // Nodes are created in execution order, so the body's first node is the first one created for it.
        const start = nodes.length;
        const bodyOut = stmt(s.body, from, [...loops, loop]);
        for (const b of bodyOut) edge(b, c);
        const first = nodes.length > start ? start : c;
        if (first === c) for (const f of from) edge(f, c);
        else edge(c, first);
        return [c, ...loop.breakTo];
      }
      case 'ForStatement': {
        let cur = from;
        if (s.init) cur = s.init.type === 'VariableDeclaration' ? stmt(s.init, cur, loops) : stmt({ type: 'ExpressionStatement', expression: s.init, range: range(s.init) } as unknown as estree.Statement, cur, loops);
        const c = add('cond', s.test ? `for (…; ${text(s.test)}; …)` : 'for (;;)', s.test ? range(s.test) : range(s), [], readsOf(s.test, vars), { test: s.test ?? undefined });
        for (const f of cur) edge(f, c);
        const update = s.update ? (stmt({ type: 'ExpressionStatement', expression: s.update, range: range(s.update) } as unknown as estree.Statement, [], loops)[0] ?? c) : c;
        const loop: Loop = { breakTo: [], continueTo: update };
        const bodyOut = stmt(s.body, [c], [...loops, loop]);
        for (const b of bodyOut) edge(b, update);
        if (update !== c) edge(update, c);
        return s.test ? [c, ...loop.breakTo] : loop.breakTo;
      }
      case 'ForOfStatement':
      case 'ForInStatement': {
        const names: string[] = [];
        if (s.left.type === 'VariableDeclaration') for (const d of s.left.declarations) patternNames(d.id, names);
        else patternNames(s.left as estree.Pattern, names);
        const head = add('cond', `for (${text(s.left)} ${s.type === 'ForOfStatement' ? 'of' : 'in'} ${text(s.right)})`, [range(s.left)[0], range(s.right)[1]], names, readsOf(s.right, vars));
        for (const f of from) edge(f, head);
        const loop: Loop = { breakTo: [], continueTo: head };
        const bodyOut = stmt(s.body, [head], [...loops, loop]);
        for (const b of bodyOut) edge(b, head);
        return [head, ...loop.breakTo];
      }
      case 'BreakStatement':
      case 'ContinueStatement': {
        if (s.label) throw new CfgError('Labels are not supported in this figure');
        const loop = loops.at(-1);
        if (!loop) throw new CfgError(`${s.type === 'BreakStatement' ? 'break' : 'continue'} outside a loop`);
        if (s.type === 'BreakStatement') loop.breakTo.push(...from);
        else for (const f of from) edge(f, loop.continueTo);
        return [];
      }
      default:
        throw new CfgError(`${s.type.replace('Statement', '').toLowerCase()} statements are not supported in this figure`);
    }
  }

  const body: estree.Statement[] = fn.body.type === 'BlockStatement' ? fn.body.body : [{ type: 'ReturnStatement', argument: fn.body, range: range(fn.body) } as unknown as estree.Statement];
  let cur = [entry];
  for (const s of body) cur = stmt(s, cur, []);
  for (const c of cur) edge(c, exit);

  // Back edges: edges to a node on the current depth-first search stack.
  const backEdges: [number, number][] = [];
  const state = new Map<number, 'open' | 'done'>();
  const dfs = (n: number) => {
    state.set(n, 'open');
    for (const m of nodes[n]!.succ) {
      if (state.get(m) === 'open') backEdges.push([n, m]);
      else if (!state.has(m)) dfs(m);
    }
    state.set(n, 'done');
  };
  dfs(entry);

  const name = fn.type === 'FunctionDeclaration' && fn.id ? fn.id.name : 'function';
  return { name, params, variables, nodes, entry, exit, backEdges, source };
}

/** Nodes in reverse postorder from the entry: a good order for forward analyses. */
export function reversePostorder(cfg: Cfg): number[] {
  const seen = new Set<number>();
  const post: number[] = [];
  const dfs = (n: number) => {
    seen.add(n);
    for (const m of cfg.nodes[n]!.succ) if (!seen.has(m)) dfs(m);
    post.push(n);
  };
  dfs(cfg.entry);
  for (const n of cfg.nodes) if (!seen.has(n.id)) dfs(n.id);
  return post.reverse();
}
