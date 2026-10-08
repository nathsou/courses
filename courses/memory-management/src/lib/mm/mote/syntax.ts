/**
 * Mote: the course's small language (appendix E). Lexer, AST and parser.
 *
 *   struct Node { value: int, next: Node? }
 *   fn push(head: Node?, v: int) -> Node { return new Node { value: v, next: head } }
 *   fn main() { var list: Node? = null  for i in 0..10 { list = push(list, i) } }
 *
 * Statements end at a newline or a semicolon. An expression never continues on the next line with a binary
 * operator, a call or an index, which keeps the grammar free of semicolons without surprises.
 */

export interface Pos {
  line: number;
  col: number;
}

export class MoteError extends Error {
  constructor(
    message: string,
    readonly pos: Pos,
    readonly kind: 'syntax' | 'type' | 'runtime' = 'syntax',
  ) {
    super(`${kind === 'runtime' ? 'runtime error' : kind === 'type' ? 'type error' : 'syntax error'} at line ${pos.line}: ${message}`);
  }
}

// ── Lexer ────────────────────────────────────────────────────────────────────────────────────────────────

export type TokKind = 'int' | 'str' | 'name' | 'kw' | 'op' | 'eof';
export interface Token {
  kind: TokKind;
  text: string;
  pos: Pos;
  /** The token is the first on its line. */
  nl: boolean;
}

const KEYWORDS = new Set(['struct', 'fn', 'let', 'var', 'if', 'else', 'while', 'for', 'in', 'return', 'break', 'continue', 'new', 'null', 'true', 'false', 'weak', 'int', 'bool']);
const OPS = ['->', '==', '!=', '<=', '>=', '&&', '||', '..', '+', '-', '*', '/', '%', '<', '>', '=', '!', '.', ',', ':', ';', '(', ')', '{', '}', '[', ']', '?', '&'];

export function lex(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let nl = true;
  const adv = (n: number) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === '\n') {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') {
      nl = true;
      adv(1);
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      adv(1);
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') adv(1);
      continue;
    }
    const pos = { line, col };
    if (/[0-9]/.test(c)) {
      const m = /^(0x[0-9a-fA-F_]+|[0-9][0-9_]*)/.exec(src.slice(i))!;
      out.push({ kind: 'int', text: m[0].replace(/_/g, ''), pos, nl });
      adv(m[0].length);
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ kind: KEYWORDS.has(m[0]) ? 'kw' : 'name', text: m[0], pos, nl });
      adv(m[0].length);
    } else if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== '"' && src[j] !== '\n') {
        if (src[j] === '\\' && j + 1 < src.length) {
          s += src[j + 1] === 'n' ? '\n' : src[j + 1];
          j += 2;
        } else s += src[j++];
      }
      if (src[j] !== '"') throw new MoteError('unterminated string', pos);
      out.push({ kind: 'str', text: s, pos, nl });
      adv(j + 1 - i);
    } else {
      const op = OPS.find((o) => src.startsWith(o, i));
      if (!op) throw new MoteError(`unexpected character ${JSON.stringify(c)}`, pos);
      out.push({ kind: 'op', text: op, pos, nl });
      adv(op.length);
    }
    nl = false;
  }
  out.push({ kind: 'eof', text: '', pos: { line, col }, nl: true });
  return out;
}

// ── AST ──────────────────────────────────────────────────────────────────────────────────────────────────

export type TypeExpr =
  | { k: 'int' }
  | { k: 'bool' }
  | { k: 'str' }
  | { k: 'null' }
  | { k: 'void' }
  | { k: 'struct'; name: string }
  | { k: 'array'; elem: TypeExpr }
  | { k: 'fn'; params: TypeExpr[]; ret: TypeExpr };

export interface FieldDecl {
  name: string;
  type: TypeExpr;
  weak: boolean;
  pos: Pos;
}
export interface StructDecl {
  kind: 'struct';
  name: string;
  fields: FieldDecl[];
  pos: Pos;
}
export interface Param {
  name: string;
  type: TypeExpr;
  pos: Pos;
}
export interface FnDecl {
  kind: 'fn';
  name: string;
  params: Param[];
  ret: TypeExpr;
  body: Stmt[];
  pos: Pos;
  end: Pos;
}
export interface GlobalDecl {
  kind: 'global';
  name: string;
  type?: TypeExpr;
  init: Expr;
  pos: Pos;
}
export type Item = StructDecl | FnDecl | GlobalDecl;

export type Stmt =
  | { k: 'let'; name: string; mutable: boolean; type?: TypeExpr; init: Expr; pos: Pos }
  | { k: 'assign'; target: Expr; value: Expr; pos: Pos }
  | { k: 'expr'; e: Expr; pos: Pos }
  | { k: 'if'; cond: Expr; then: Stmt[]; else?: Stmt[]; pos: Pos }
  | { k: 'while'; cond: Expr; body: Stmt[]; pos: Pos }
  | { k: 'for'; name: string; from: Expr; to: Expr; body: Stmt[]; pos: Pos }
  | { k: 'return'; e?: Expr; pos: Pos }
  | { k: 'break' | 'continue'; pos: Pos };

export type Expr =
  | { k: 'int'; v: number; pos: Pos }
  | { k: 'bool'; v: boolean; pos: Pos }
  | { k: 'null'; pos: Pos }
  | { k: 'str'; v: string; pos: Pos }
  | { k: 'name'; name: string; pos: Pos }
  | { k: 'field'; obj: Expr; name: string; pos: Pos }
  | { k: 'index'; arr: Expr; index: Expr; pos: Pos }
  | { k: 'call'; callee: Expr; args: Expr[]; pos: Pos }
  | { k: 'new'; type: string; inits: { name: string; e: Expr; pos: Pos }[]; pos: Pos }
  | { k: 'newarr'; elem: TypeExpr; len: Expr; pos: Pos }
  | { k: 'unary'; op: '-' | '!'; e: Expr; pos: Pos }
  /** `&e`: a borrow. Only the ownership setting gives it a meaning (a non-owning reference); elsewhere it is `e`. */
  | { k: 'borrow'; e: Expr; pos: Pos }
  | { k: 'binary'; op: string; l: Expr; r: Expr; pos: Pos };

export interface Program {
  items: Item[];
  structs: StructDecl[];
  fns: FnDecl[];
  globals: GlobalDecl[];
}

// ── Parser ───────────────────────────────────────────────────────────────────────────────────────────────

const PREC: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

export function parse(src: string): Program {
  const toks = lex(src);
  let p = 0;
  const peek = (o = 0) => toks[Math.min(p + o, toks.length - 1)]!;
  const at = (text: string) => (peek().kind === 'op' || peek().kind === 'kw') && peek().text === text;
  const eat = (text: string) => (at(text) ? (p++, true) : false);
  const expect = (text: string, what = `'${text}'`): Token => {
    if (!at(text)) throw new MoteError(`expected ${what}, found ${peek().kind === 'eof' ? 'the end of the program' : `'${peek().text}'`}`, peek().pos);
    return toks[p++]!;
  };
  const name = (what = 'a name'): Token => {
    if (peek().kind !== 'name') throw new MoteError(`expected ${what}, found '${peek().text || 'end'}'`, peek().pos);
    return toks[p++]!;
  };
  const endStmt = () => {
    if (eat(';')) return;
    if (at('}') || peek().kind === 'eof' || peek().nl) return;
    throw new MoteError(`expected the end of the statement, found '${peek().text}'`, peek().pos);
  };

  function type(): TypeExpr {
    const t = peek();
    if (eat('int')) return { k: 'int' };
    if (eat('bool')) return { k: 'bool' };
    if (eat('[')) {
      const elem = type();
      expect(']');
      eat('?');
      return { k: 'array', elem };
    }
    if (eat('fn')) {
      expect('(');
      const params: TypeExpr[] = [];
      if (!at(')')) do params.push(type()); while (eat(','));
      expect(')');
      const ret = eat('->') ? type() : { k: 'void' as const };
      return { k: 'fn', params, ret };
    }
    if (t.kind === 'name') {
      p++;
      eat('?');
      return { k: 'struct', name: t.text };
    }
    throw new MoteError(`expected a type, found '${t.text}'`, t.pos);
  }

  function block(): Stmt[] {
    expect('{');
    const out: Stmt[] = [];
    while (!at('}')) {
      if (peek().kind === 'eof') throw new MoteError("expected '}' to close the block", peek().pos);
      if (eat(';')) continue;
      out.push(stmt());
    }
    expect('}');
    return out;
  }

  function stmt(): Stmt {
    const t = peek();
    const pos = t.pos;
    if (at('let') || at('var')) {
      const mutable = toks[p++]!.text === 'var';
      const n = name('a variable name').text;
      const ty = eat(':') ? type() : undefined;
      expect('=', "'=' and an initial value");
      const init = expr();
      endStmt();
      return { k: 'let', name: n, mutable, type: ty, init, pos };
    }
    if (eat('if')) return ifRest(pos);
    if (eat('while')) {
      const cond = expr();
      return { k: 'while', cond, body: block(), pos };
    }
    if (eat('for')) {
      const n = name('a loop variable').text;
      expect('in');
      const from = expr();
      expect('..', "'..' (as in 0..n)");
      const to = expr();
      return { k: 'for', name: n, from, to, body: block(), pos };
    }
    if (eat('return')) {
      const e = at('}') || peek().nl || at(';') ? undefined : expr();
      endStmt();
      return { k: 'return', e, pos };
    }
    if (eat('break')) {
      endStmt();
      return { k: 'break', pos };
    }
    if (eat('continue')) {
      endStmt();
      return { k: 'continue', pos };
    }
    const e = expr();
    if (at('=') && !peek().nl) {
      p++;
      if (e.k !== 'name' && e.k !== 'field' && e.k !== 'index') throw new MoteError('only a variable, a field or an array element can be assigned to', e.pos);
      const value = expr();
      endStmt();
      return { k: 'assign', target: e, value, pos };
    }
    endStmt();
    return { k: 'expr', e, pos };
  }

  function ifRest(pos: Pos): Stmt {
    const cond = expr();
    const then = block();
    let els: Stmt[] | undefined;
    if (eat('else')) els = at('if') ? (p++, [ifRest(toks[p - 1]!.pos)]) : block();
    return { k: 'if', cond, then, else: els, pos };
  }

  function expr(min = 1): Expr {
    let l = unary();
    for (;;) {
      const t = peek();
      const prec = t.kind === 'op' ? PREC[t.text] : undefined;
      if (prec === undefined || prec < min || t.nl) return l;
      p++;
      const r = expr(prec + 1);
      l = { k: 'binary', op: t.text, l, r, pos: t.pos };
    }
  }

  function unary(): Expr {
    const t = peek();
    if (at('-') || at('!')) {
      p++;
      return { k: 'unary', op: t.text as '-' | '!', e: unary(), pos: t.pos };
    }
    if (eat('&')) return { k: 'borrow', e: unary(), pos: t.pos };
    return postfix(primary());
  }

  function postfix(e: Expr): Expr {
    for (;;) {
      const t = peek();
      if (t.nl) return e;
      if (eat('.')) e = { k: 'field', obj: e, name: name('a field name').text, pos: t.pos };
      else if (eat('[')) {
        const index = expr();
        expect(']');
        e = { k: 'index', arr: e, index, pos: t.pos };
      } else if (eat('(')) {
        const args: Expr[] = [];
        if (!at(')')) do args.push(expr()); while (eat(','));
        expect(')');
        e = { k: 'call', callee: e, args, pos: t.pos };
      } else if (at('!') && !t.nl && peek(1).kind === 'op' && peek(1).text === '.') p++; // `x!.f` is accepted and means `x.f`
      else return e;
    }
  }

  function primary(): Expr {
    const t = peek();
    const pos = t.pos;
    if (t.kind === 'int') {
      p++;
      return { k: 'int', v: Number(t.text), pos };
    }
    if (t.kind === 'str') {
      p++;
      return { k: 'str', v: t.text, pos };
    }
    if (eat('true')) return { k: 'bool', v: true, pos };
    if (eat('false')) return { k: 'bool', v: false, pos };
    if (eat('null')) return { k: 'null', pos };
    if (eat('(')) {
      const e = expr();
      expect(')');
      return e;
    }
    if (eat('new')) {
      if (eat('[')) {
        const elem = type();
        expect(';', "';' and a length, as in new [int; 10]");
        const len = expr();
        expect(']');
        return { k: 'newarr', elem, len, pos };
      }
      const ty = name('a struct name after new').text;
      const inits: { name: string; e: Expr; pos: Pos }[] = [];
      expect('{', "'{' and the fields' values");
      while (!at('}')) {
        const f = name('a field name');
        expect(':');
        inits.push({ name: f.text, e: expr(), pos: f.pos });
        if (!eat(',') && !at('}') && !peek().nl) throw new MoteError("expected ',' between fields", peek().pos);
      }
      expect('}');
      return { k: 'new', type: ty, inits, pos };
    }
    if (t.kind === 'name') {
      p++;
      return { k: 'name', name: t.text, pos };
    }
    throw new MoteError(t.kind === 'eof' ? 'unexpected end of the program' : `unexpected '${t.text}'`, pos);
  }

  const items: Item[] = [];
  while (peek().kind !== 'eof') {
    const t = peek();
    if (eat(';')) continue;
    if (eat('struct')) {
      const n = name('a struct name').text;
      expect('{');
      const fields: FieldDecl[] = [];
      while (!at('}')) {
        const weak = eat('weak');
        const f = name('a field name');
        expect(':');
        fields.push({ name: f.text, type: type(), weak, pos: f.pos });
        if (!eat(',') && !at('}') && !peek().nl) throw new MoteError("expected ',' or a new line between fields", peek().pos);
      }
      expect('}');
      items.push({ kind: 'struct', name: n, fields, pos: t.pos });
    } else if (eat('fn')) {
      const n = name('a function name').text;
      expect('(');
      const params: Param[] = [];
      if (!at(')')) {
        do {
          const pn = name('a parameter name');
          expect(':');
          params.push({ name: pn.text, type: type(), pos: pn.pos });
        } while (eat(','));
      }
      expect(')');
      const ret = eat('->') ? type() : { k: 'void' as const };
      const bodyStart = p;
      const body = block();
      items.push({ kind: 'fn', name: n, params, ret, body, pos: t.pos, end: toks[p - 1]!.pos });
      void bodyStart;
    } else if (eat('var') || eat('let')) {
      const n = name('a global name').text;
      const ty = eat(':') ? type() : undefined;
      expect('=');
      items.push({ kind: 'global', name: n, type: ty, init: expr(), pos: t.pos });
      endStmt();
    } else throw new MoteError(`expected 'struct', 'fn' or 'var' at the top level, found '${t.text}'`, t.pos);
  }
  return {
    items,
    structs: items.filter((i): i is StructDecl => i.kind === 'struct'),
    fns: items.filter((i): i is FnDecl => i.kind === 'fn'),
    globals: items.filter((i): i is GlobalDecl => i.kind === 'global'),
  };
}

export function typeName(t: TypeExpr): string {
  switch (t.k) {
    case 'struct':
      return t.name;
    case 'array':
      return `[${typeName(t.elem)}]`;
    case 'fn':
      return `fn(${t.params.map(typeName).join(', ')})${t.ret.k === 'void' ? '' : ` -> ${typeName(t.ret)}`}`;
    default:
      return t.k;
  }
}

export const isPtr = (t: TypeExpr) => t.k === 'struct' || t.k === 'array' || t.k === 'null';
