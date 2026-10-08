/**
 * Mote compiler: type checks a program and compiles each function to a stack bytecode. The operand stack of
 * every frame lives in simulated memory (not in JavaScript), so a collector can see every temporary pointer.
 * The compiler tracks which operand-stack entries hold pointers and records a **stack map** at every safepoint
 * (allocations, calls, the `gc()` built-in and loop back edges): the slots a precise collector must treat as
 * roots there (chapter 24).
 */
import { MoteError, parse, typeName, isPtr, type Expr, type FnDecl, type Pos, type Program, type Stmt, type TypeExpr } from './syntax';

export type Op =
  | 'CONST' | 'STR' | 'LOAD' | 'MOVE' | 'STORE' | 'GLOAD' | 'GMOVE' | 'GSTORE'
  | 'NEW' | 'NEWARR' | 'GETF' | 'SETF' | 'GETI' | 'SETI' | 'LEN'
  | 'FN' | 'CALL' | 'CALLV' | 'RET' | 'RETV'
  | 'JMP' | 'JZ' | 'JNZ' | 'POP' | 'DUP'
  | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOD' | 'EQ' | 'NE' | 'LT' | 'LE' | 'GT' | 'GE' | 'NEG' | 'NOT'
  | 'PRINT' | 'FREE' | 'GC' | 'ASSERT' | 'RAND';

export interface Instr {
  op: Op;
  a: number;
  b: number;
  pos: Pos;
  /** First instruction of a statement (for stepping and for the reachability oracle). */
  stmt?: boolean;
  /** Field and element accesses: the static type of the object (to recognise type confusion). */
  ty?: number;
  /** PRINT: the kind of each argument (s = string, i = int, b = bool, p = pointer, f = function). */
  kinds?: string;
}

export interface StackMap {
  /** Operand-stack depths (0 = bottom) that hold pointers. */
  stack: number[];
  /** Operand-stack depth at the safepoint. */
  depth: number;
}

export interface FieldInfo {
  name: string;
  type: TypeExpr;
  ptr: boolean;
  weak: boolean;
}

export interface TypeInfo {
  id: number;
  name: string;
  kind: 'struct' | 'array';
  fields: FieldInfo[];
  /** Arrays: whether elements are pointers. */
  elemPtr?: boolean;
  elem?: TypeExpr;
}

export interface LocalInfo {
  name: string;
  type: TypeExpr;
  ptr: boolean;
  /** Ownership setting: a borrow (parameters, and locals initialised with `&e`) never owns what it points to. */
  borrow: boolean;
  param: boolean;
}

export interface FnInfo {
  id: number;
  name: string;
  params: TypeExpr[];
  ret: TypeExpr;
  locals: LocalInfo[];
  code: Instr[];
  maxStack: number;
  /** Stack maps by instruction index (safepoints only). */
  maps: Map<number, StackMap>;
  pos: Pos;
  end: Pos;
}

export interface GlobalInfo {
  name: string;
  type: TypeExpr;
  ptr: boolean;
}

export interface Compiled {
  program: Program;
  types: TypeInfo[];
  fns: FnInfo[];
  globals: GlobalInfo[];
  strings: string[];
  /** Index of `$init` (global initialisers) and `main`. */
  init: number;
  main: number;
}

/** Function values are code addresses: what a real machine would store in a function pointer. */
export const CODE_BASE = 0x40_0000;
export const fnAddress = (id: number) => CODE_BASE + id * 0x40;
export const fnFromAddress = (a: number) => ((a - CODE_BASE) % 0x40 === 0 ? (a - CODE_BASE) / 0x40 : -1);

const INT: TypeExpr = { k: 'int' };
const BOOL: TypeExpr = { k: 'bool' };
const VOID: TypeExpr = { k: 'void' };
const NULL: TypeExpr = { k: 'null' };
const STR: TypeExpr = { k: 'str' };

const BUILTINS = new Set(['print', 'free', 'len', 'gc', 'assert', 'random']);

function same(a: TypeExpr, b: TypeExpr): boolean {
  if (a.k !== b.k) return false;
  if (a.k === 'struct') return a.name === (b as typeof a).name;
  if (a.k === 'array') return same(a.elem, (b as typeof a).elem);
  if (a.k === 'fn') {
    const f = b as typeof a;
    return a.params.length === f.params.length && a.params.every((p, i) => same(p, f.params[i]!)) && same(a.ret, f.ret);
  }
  return true;
}

/** Can a value of type `v` be stored where `t` is expected? */
function assignable(t: TypeExpr, v: TypeExpr): boolean {
  if (v.k === 'null') return t.k === 'struct' || t.k === 'array' || t.k === 'fn';
  return same(t, v);
}

export function compile(src: string): Compiled {
  const program = parse(src);
  const types: TypeInfo[] = [];
  const typeIds = new Map<string, number>();
  const err = (msg: string, pos: Pos): never => {
    throw new MoteError(msg, pos, 'type');
  };

  // Structs first, so fields can name any struct.
  for (const s of program.structs) {
    if (typeIds.has(s.name)) err(`struct ${s.name} is declared twice`, s.pos);
    typeIds.set(s.name, types.length);
    types.push({ id: types.length, name: s.name, kind: 'struct', fields: [] });
  }
  const checkType = (t: TypeExpr, pos: Pos): TypeExpr => {
    if (t.k === 'struct' && !typeIds.has(t.name)) err(`unknown type ${t.name}`, pos);
    if (t.k === 'array') checkType(t.elem, pos);
    if (t.k === 'fn') {
      t.params.forEach((p) => checkType(p, pos));
      checkType(t.ret, pos);
    }
    return t;
  };
  for (const s of program.structs) {
    const info = types[typeIds.get(s.name)!]!;
    const seen = new Set<string>();
    for (const f of s.fields) {
      if (seen.has(f.name)) err(`field ${f.name} appears twice in ${s.name}`, f.pos);
      seen.add(f.name);
      checkType(f.type, f.pos);
      if (f.weak && !isPtr(f.type)) err(`only pointer fields can be weak`, f.pos);
      info.fields.push({ name: f.name, type: f.type, ptr: isPtr(f.type), weak: f.weak });
    }
  }
  const arrayType = (elem: TypeExpr): number => {
    const name = `[${typeName(elem)}]`;
    let id = typeIds.get(name);
    if (id === undefined) {
      id = types.length;
      typeIds.set(name, id);
      types.push({ id, name, kind: 'array', fields: [], elemPtr: isPtr(elem), elem });
    }
    return id;
  };

  const fnIndex = new Map<string, number>();
  const fns: FnInfo[] = [];
  const decls: (FnDecl | undefined)[] = [];
  // $init runs the global initialisers before main.
  fns.push({ id: 0, name: '$init', params: [], ret: VOID, locals: [], code: [], maxStack: 0, maps: new Map(), pos: { line: 1, col: 1 }, end: { line: 1, col: 1 } });
  decls.push(undefined);
  for (const f of program.fns) {
    if (fnIndex.has(f.name) || BUILTINS.has(f.name)) err(`function ${f.name} is declared twice (or is a built-in)`, f.pos);
    f.params.forEach((p) => checkType(p.type, p.pos));
    checkType(f.ret, f.pos);
    fnIndex.set(f.name, fns.length);
    fns.push({ id: fns.length, name: f.name, params: f.params.map((p) => p.type), ret: f.ret, locals: [], code: [], maxStack: 0, maps: new Map(), pos: f.pos, end: f.end });
    decls.push(f);
  }
  const main = fnIndex.get('main');
  if (main === undefined) err('a program needs a function main()', { line: 1, col: 1 });

  const globals: GlobalInfo[] = [];
  const globalIndex = new Map<string, number>();
  const strings: string[] = [];

  // ── Per-function code generation ──
  function gen(fn: FnInfo, decl: FnDecl | undefined) {
    const scopes: Map<string, number>[] = [new Map()];
    /** Compile-time operand stack: whether each entry is a pointer. */
    const stack: boolean[] = [];
    const loops: { breaks: number[]; continues: number[] }[] = [];
    let stmtStart = false;

    const emit = (op: Op, pos: Pos, a = 0, b = 0): number => {
      fn.code.push({ op, a, b, pos, ...(stmtStart ? { stmt: true } : {}) });
      stmtStart = false;
      return fn.code.length - 1;
    };
    const push = (ptr: boolean) => {
      stack.push(ptr);
      fn.maxStack = Math.max(fn.maxStack, stack.length);
    };
    const pop = (n = 1) => stack.splice(stack.length - n, n);
    const safepoint = (at: number, popped = 0) => {
      const live = stack.slice(0, stack.length - popped);
      fn.maps.set(at, { depth: live.length, stack: live.flatMap((p, i) => (p ? [i] : [])) });
    };
    const declare = (name: string, type: TypeExpr, pos: Pos, borrow = false, param = false): number => {
      if (scopes.at(-1)!.has(name)) err(`${name} is already declared in this block`, pos);
      fn.locals.push({ name, type, ptr: isPtr(type), borrow, param });
      scopes.at(-1)!.set(name, fn.locals.length - 1);
      return fn.locals.length - 1;
    };
    const lookup = (name: string): number | undefined => {
      for (let i = scopes.length - 1; i >= 0; i--) {
        const s = scopes[i]!.get(name);
        if (s !== undefined) return s;
      }
      return undefined;
    };

    if (decl) decl.params.forEach((p) => declare(p.name, p.type, p.pos, true, true));

    /** Compile an expression; `move` marks a context that takes ownership (ownership setting only). */
    function expr(e: Expr, move = false): TypeExpr {
      switch (e.k) {
        case 'int':
          emit('CONST', e.pos, e.v);
          push(false);
          return INT;
        case 'bool':
          emit('CONST', e.pos, e.v ? 1 : 0);
          push(false);
          return BOOL;
        case 'null':
          emit('CONST', e.pos, 0);
          push(true);
          return NULL;
        case 'str':
          strings.push(e.v);
          emit('STR', e.pos, strings.length - 1);
          push(false);
          return STR;
        case 'borrow':
          return expr(e.e, false);
        case 'name': {
          const slot = lookup(e.name);
          if (slot !== undefined) {
            const l = fn.locals[slot]!;
            emit(move && l.ptr && !l.borrow ? 'MOVE' : 'LOAD', e.pos, slot);
            push(l.ptr);
            return l.type;
          }
          const g = globalIndex.get(e.name);
          if (g !== undefined) {
            const gi = globals[g]!;
            emit(move && gi.ptr ? 'GMOVE' : 'GLOAD', e.pos, g);
            push(gi.ptr);
            return gi.type;
          }
          const f = fnIndex.get(e.name);
          if (f !== undefined) {
            emit('FN', e.pos, f);
            push(false);
            return { k: 'fn', params: fns[f]!.params, ret: fns[f]!.ret };
          }
          return err(`unknown name ${e.name}`, e.pos);
        }
        case 'field': {
          const t = expr(e.obj);
          if (t.k === 'array' && e.name === 'length') {
            emit('LEN', e.pos);
            pop();
            push(false);
            return INT;
          }
          if (t.k !== 'struct') return err(`${typeName(t)} has no fields`, e.pos);
          const s = types[typeIds.get(t.name)!]!;
          const i = s.fields.findIndex((f) => f.name === e.name);
          if (i < 0) return err(`${s.name} has no field ${e.name}`, e.pos);
          // In a move context, reading an owning field moves the value out of it (as Option::take would).
          fn.code[emit('GETF', e.pos, i, move && s.fields[i]!.ptr && !s.fields[i]!.weak ? 1 : 0)]!.ty = s.id;
          pop();
          push(s.fields[i]!.ptr);
          return s.fields[i]!.type;
        }
        case 'index': {
          const t = expr(e.arr);
          if (t.k !== 'array') return err(`${typeName(t)} is not an array`, e.pos);
          if (expr(e.index).k !== 'int') err('an array index must be an int', e.index.pos);
          fn.code[emit('GETI', e.pos, move && isPtr(t.elem) ? 1 : 0)]!.ty = arrayType(t.elem);
          pop(2);
          push(isPtr(t.elem));
          return t.elem;
        }
        case 'unary': {
          const t = expr(e.e);
          if (e.op === '-' && t.k !== 'int') err('- needs an int', e.pos);
          if (e.op === '!' && t.k !== 'bool') err('! needs a bool', e.pos);
          emit(e.op === '-' ? 'NEG' : 'NOT', e.pos);
          return t;
        }
        case 'binary': {
          if (e.op === '&&' || e.op === '||') {
            if (expr(e.l).k !== 'bool') err(`${e.op} needs bools`, e.l.pos);
            emit('DUP', e.pos);
            push(false);
            const j = emit(e.op === '&&' ? 'JZ' : 'JNZ', e.pos);
            pop();
            emit('POP', e.pos);
            pop();
            if (expr(e.r).k !== 'bool') err(`${e.op} needs bools`, e.r.pos);
            fn.code[j]!.a = fn.code.length;
            return BOOL;
          }
          const l = expr(e.l);
          const r = expr(e.r);
          pop(2);
          push(false);
          const ops: Record<string, Op> = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD', '==': 'EQ', '!=': 'NE', '<': 'LT', '<=': 'LE', '>': 'GT', '>=': 'GE' };
          emit(ops[e.op]!, e.pos);
          if (e.op === '==' || e.op === '!=') {
            if (!(assignable(l, r) || assignable(r, l))) err(`cannot compare ${typeName(l)} with ${typeName(r)}`, e.pos);
            return BOOL;
          }
          if (l.k !== 'int' || r.k !== 'int') err(`${e.op} needs ints, not ${typeName(l)} and ${typeName(r)}`, e.pos);
          return ['<', '<=', '>', '>='].includes(e.op) ? BOOL : INT;
        }
        case 'new': {
          const id = typeIds.get(e.type);
          if (id === undefined || types[id]!.kind !== 'struct') return err(`unknown struct ${e.type}`, e.pos);
          const s = types[id]!;
          // Push every field's value in declaration order; missing fields are zero (or null).
          for (const f of s.fields) {
            const init = e.inits.find((x) => x.name === f.name);
            if (!init) {
              emit('CONST', e.pos, 0);
              push(f.ptr);
              continue;
            }
            const t = expr(init.e, true);
            if (!assignable(f.type, t)) err(`field ${f.name} of ${s.name} is ${typeName(f.type)}, not ${typeName(t)}`, init.pos);
          }
          for (const x of e.inits) if (!s.fields.some((f) => f.name === x.name)) err(`${s.name} has no field ${x.name}`, x.pos);
          const at = emit('NEW', e.pos, id, s.fields.length);
          safepoint(at);
          pop(s.fields.length);
          push(true);
          return { k: 'struct', name: s.name };
        }
        case 'newarr': {
          checkType(e.elem, e.pos);
          if (expr(e.len).k !== 'int') err('an array length must be an int', e.len.pos);
          const at = emit('NEWARR', e.pos, arrayType(e.elem));
          safepoint(at);
          pop();
          push(true);
          return { k: 'array', elem: e.elem };
        }
        case 'call':
          return call(e);
      }
    }

    function call(e: Extract<Expr, { k: 'call' }>): TypeExpr {
      const callee = e.callee;
      if (callee.k === 'name' && BUILTINS.has(callee.name) && lookup(callee.name) === undefined) {
        const n = callee.name;
        if (n === 'print') {
          let kinds = '';
          for (const a of e.args) {
            const t = expr(a);
            kinds += t.k === 'str' ? 's' : t.k === 'int' ? 'i' : t.k === 'bool' ? 'b' : t.k === 'fn' ? 'f' : 'p';
          }
          const at = emit('PRINT', e.pos, e.args.length);
          fn.code[at]!.kinds = kinds;
          pop(e.args.length);
          return VOID;
        }
        if (n === 'free') {
          if (e.args.length !== 1) err('free takes one pointer', e.pos);
          if (!isPtr(expr(e.args[0]!))) err('free takes a pointer', e.pos);
          emit('FREE', e.pos);
          pop();
          return VOID;
        }
        if (n === 'len') {
          if (e.args.length !== 1 || expr(e.args[0]!).k !== 'array') err('len takes an array', e.pos);
          emit('LEN', e.pos);
          pop();
          push(false);
          return INT;
        }
        if (n === 'gc') {
          const at = emit('GC', e.pos);
          safepoint(at);
          return VOID;
        }
        if (n === 'assert') {
          if (e.args.length !== 1 || expr(e.args[0]!).k !== 'bool') err('assert takes a bool', e.pos);
          emit('ASSERT', e.pos);
          pop();
          return VOID;
        }
        if (n === 'random') {
          if (e.args.length !== 1 || expr(e.args[0]!).k !== 'int') err('random(n) takes an int', e.pos);
          emit('RAND', e.pos);
          pop();
          push(false);
          return INT;
        }
      }
      let ft: TypeExpr;
      let direct = -1;
      if (callee.k === 'name' && lookup(callee.name) === undefined && !globalIndex.has(callee.name) && fnIndex.has(callee.name)) {
        direct = fnIndex.get(callee.name)!;
        ft = { k: 'fn', params: fns[direct]!.params, ret: fns[direct]!.ret };
      } else {
        ft = expr(callee);
        if (ft.k !== 'fn') return err(`${typeName(ft)} is not a function`, e.pos);
      }
      if (ft.k !== 'fn') return VOID;
      if (ft.params.length !== e.args.length) err(`expected ${ft.params.length} argument(s), got ${e.args.length}`, e.pos);
      e.args.forEach((a, i) => {
        const t = expr(a);
        if (!assignable(ft.params[i]!, t)) err(`argument ${i + 1} should be ${typeName(ft.params[i]!)}, not ${typeName(t)}`, a.pos);
      });
      const at = direct >= 0 ? emit('CALL', e.pos, direct, e.args.length) : emit('CALLV', e.pos, e.args.length);
      pop(e.args.length + (direct >= 0 ? 0 : 1));
      safepoint(at);
      if (ft.ret.k !== 'void') push(isPtr(ft.ret));
      return ft.ret;
    }

    function block(stmts: Stmt[]) {
      scopes.push(new Map());
      for (const s of stmts) stmt(s);
      scopes.pop();
    }

    function stmt(s: Stmt) {
      stmtStart = true;
      switch (s.k) {
        case 'let': {
          const borrow = s.init.k === 'borrow';
          const t = expr(s.init, !borrow);
          if (t.k === 'void') err('this expression has no value', s.init.pos);
          if (t.k === 'str') err('strings can only be printed', s.init.pos);
          const ty = s.type ? checkType(s.type, s.pos) : t;
          if (!s.type && t.k === 'null') err(`give ${s.name} a type: var ${s.name}: SomeStruct = null`, s.pos);
          if (!assignable(ty, t)) err(`${s.name} is ${typeName(ty)} but the value is ${typeName(t)}`, s.pos);
          const slot = declare(s.name, ty, s.pos, borrow);
          emit('STORE', s.pos, slot);
          pop();
          break;
        }
        case 'assign': {
          const tg = s.target;
          if (tg.k === 'name') {
            const slot = lookup(tg.name);
            if (slot !== undefined) {
              const l = fn.locals[slot]!;
              const t = expr(s.value, !l.borrow);
              if (!assignable(l.type, t)) err(`${tg.name} is ${typeName(l.type)}, not ${typeName(t)}`, s.pos);
              emit('STORE', s.pos, slot);
              pop();
              break;
            }
            const g = globalIndex.get(tg.name);
            if (g === undefined) err(`unknown variable ${tg.name}`, tg.pos);
            const t = expr(s.value, true);
            if (!assignable(globals[g!]!.type, t)) err(`${tg.name} is ${typeName(globals[g!]!.type)}, not ${typeName(t)}`, s.pos);
            emit('GSTORE', s.pos, g!);
            pop();
          } else if (tg.k === 'field') {
            const ot = expr(tg.obj);
            if (ot.k !== 'struct') err(`${typeName(ot)} has no fields`, tg.pos);
            const st = types[typeIds.get((ot as { name: string }).name)!]!;
            const i = st.fields.findIndex((f) => f.name === tg.name);
            if (i < 0) err(`${st.name} has no field ${tg.name}`, tg.pos);
            const t = expr(s.value, !st.fields[i]!.weak);
            if (!assignable(st.fields[i]!.type, t)) err(`${st.name}.${tg.name} is ${typeName(st.fields[i]!.type)}, not ${typeName(t)}`, s.pos);
            fn.code[emit('SETF', s.pos, i)]!.ty = st.id;
            pop(2);
          } else if (tg.k === 'index') {
            const at = expr(tg.arr);
            if (at.k !== 'array') err(`${typeName(at)} is not an array`, tg.pos);
            if (expr(tg.index).k !== 'int') err('an array index must be an int', tg.index.pos);
            const t = expr(s.value, true);
            if (at.k === 'array' && !assignable(at.elem, t)) err(`elements are ${typeName(at.elem)}, not ${typeName(t)}`, s.pos);
            const si = emit('SETI', s.pos);
            if (at.k === 'array') fn.code[si]!.ty = arrayType(at.elem);
            pop(3);
          }
          break;
        }
        case 'expr': {
          const t = expr(s.e);
          if (t.k !== 'void') {
            emit('POP', s.pos);
            pop();
          }
          break;
        }
        case 'if': {
          if (expr(s.cond).k !== 'bool') err('an if condition must be a bool', s.cond.pos);
          const j = emit('JZ', s.pos);
          pop();
          block(s.then);
          if (s.else) {
            const k = emit('JMP', s.pos);
            fn.code[j]!.a = fn.code.length;
            block(s.else);
            fn.code[k]!.a = fn.code.length;
          } else fn.code[j]!.a = fn.code.length;
          break;
        }
        case 'while': {
          const top = fn.code.length;
          if (expr(s.cond).k !== 'bool') err('a while condition must be a bool', s.cond.pos);
          const j = emit('JZ', s.pos);
          pop();
          loops.push({ breaks: [], continues: [] });
          block(s.body);
          const l = loops.pop()!;
          l.continues.forEach((c) => (fn.code[c]!.a = top));
          const back = emit('JMP', s.pos, top);
          safepoint(back);
          fn.code[j]!.a = fn.code.length;
          l.breaks.forEach((b) => (fn.code[b]!.a = fn.code.length));
          break;
        }
        case 'for': {
          scopes.push(new Map());
          if (expr(s.from).k !== 'int') err('a for range must be ints', s.from.pos);
          const i = declare(s.name, INT, s.pos);
          emit('STORE', s.pos, i);
          pop();
          if (expr(s.to).k !== 'int') err('a for range must be ints', s.to.pos);
          const end = declare(`$end${fn.locals.length}`, INT, s.pos);
          emit('STORE', s.pos, end);
          pop();
          const top = fn.code.length;
          emit('LOAD', s.pos, i);
          emit('LOAD', s.pos, end);
          push(false);
          push(false);
          emit('LT', s.pos);
          pop();
          const j = emit('JZ', s.pos);
          pop();
          loops.push({ breaks: [], continues: [] });
          block(s.body);
          const l = loops.pop()!;
          const inc = fn.code.length;
          fn.maxStack = Math.max(fn.maxStack, stack.length + 2);
          l.continues.forEach((c) => (fn.code[c]!.a = inc));
          emit('LOAD', s.pos, i);
          emit('CONST', s.pos, 1);
          emit('ADD', s.pos);
          emit('STORE', s.pos, i);
          const back = emit('JMP', s.pos, top);
          safepoint(back);
          fn.code[j]!.a = fn.code.length;
          l.breaks.forEach((b) => (fn.code[b]!.a = fn.code.length));
          scopes.pop();
          break;
        }
        case 'return': {
          if (s.e) {
            if (fn.ret.k === 'void') err(`${fn.name} does not return a value`, s.pos);
            const t = expr(s.e, true);
            if (!assignable(fn.ret, t)) err(`${fn.name} returns ${typeName(fn.ret)}, not ${typeName(t)}`, s.pos);
            emit('RET', s.pos);
            pop();
          } else {
            if (fn.ret.k !== 'void') err(`${fn.name} must return a ${typeName(fn.ret)}`, s.pos);
            emit('RETV', s.pos);
          }
          break;
        }
        case 'break':
        case 'continue': {
          const l = loops.at(-1);
          if (!l) err(`${s.k} outside a loop`, s.pos);
          const j = emit('JMP', s.pos);
          (s.k === 'break' ? l!.breaks : l!.continues).push(j);
          break;
        }
      }
    }

    if (decl) {
      block(decl.body);
      if (fn.ret.k !== 'void' && fn.code.at(-1)?.op !== 'RET') {
        stmtStart = true;
        emit('CONST', decl.end, 0);
        push(isPtr(fn.ret));
        emit('RET', decl.end);
        pop();
      } else {
        stmtStart = true;
        emit('RETV', decl.end);
      }
    } else {
      // $init: evaluate each global initialiser in order.
      for (const g of program.globals) {
        stmtStart = true;
        const t = expr(g.init, true);
        const ty = g.type ? checkType(g.type, g.pos) : t;
        if (ty.k === 'null' || ty.k === 'void' || ty.k === 'str') err(`give the global ${g.name} a type`, g.pos);
        if (!assignable(ty, t)) err(`${g.name} is ${typeName(ty)} but the value is ${typeName(t)}`, g.pos);
        if (globalIndex.has(g.name)) err(`global ${g.name} is declared twice`, g.pos);
        globalIndex.set(g.name, globals.length);
        globals.push({ name: g.name, type: ty, ptr: isPtr(ty) });
        emit('GSTORE', g.pos, globals.length - 1);
        pop();
      }
      emit('RETV', { line: 1, col: 1 });
    }
  }

  // Globals must be known before functions are compiled: compile $init first.
  gen(fns[0]!, undefined);
  for (let i = 1; i < fns.length; i++) gen(fns[i]!, decls[i]);
  const m = fns[main!]!;
  if (m.params.length) err('main takes no parameters', m.pos);
  return { program, types, fns, globals, strings, init: 0, main: main! };
}

/** Disassemble a function (for the stack-map viewer and debugging). */
export function disassemble(c: Compiled, fn: FnInfo): string[] {
  return fn.code.map((ins, i) => {
    let arg = '';
    switch (ins.op) {
      case 'LOAD':
      case 'MOVE':
      case 'STORE':
        arg = fn.locals[ins.a]?.name ?? String(ins.a);
        break;
      case 'GLOAD':
      case 'GMOVE':
      case 'GSTORE':
        arg = c.globals[ins.a]?.name ?? String(ins.a);
        break;
      case 'NEW':
      case 'NEWARR':
        arg = c.types[ins.a]!.name;
        break;
      case 'CALL':
      case 'FN':
        arg = c.fns[ins.a]!.name;
        break;
      case 'CONST':
        arg = String(ins.a);
        break;
      case 'STR':
        arg = JSON.stringify(c.strings[ins.a]);
        break;
      case 'JMP':
      case 'JZ':
      case 'JNZ':
        arg = `→ ${ins.a}`;
        break;
      case 'GETF':
      case 'SETF':
        arg = String(ins.a);
        break;
    }
    return `${String(i).padStart(3)}  ${ins.op.padEnd(6)} ${arg}`;
  });
}
