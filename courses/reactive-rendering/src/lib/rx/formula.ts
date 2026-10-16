/**
 * A tiny spreadsheet formula language, evaluated against a function that reads other cells.
 *
 *   =A1+B1*2     =SUM(C2:C4)     =IF(A1>10, B1, C1)     =MAX(A1, B1)     =(A1+A2)/2
 *
 * `compile(text)` returns a function `(read) => number | string`, where `read(ref)` returns another cell's value.
 * Because `read` is called as the evaluation proceeds, a reactive `read` (one that calls `signal.get()`) lets the
 * *evaluation itself* discover which cells a formula depends on: `IF` reads only the branch it takes.
 */
export type Value = number | string;
export type Reader = (ref: string) => Value;

export class FormulaError extends Error {}

type Node = (read: Reader) => Value;

const REF = /^[A-Z][0-9]+$/;

export function compile(text: string): Node {
  if (!text.startsWith('=')) {
    const t = text.trim();
    if (t === '') return () => 0;
    const num = Number(t);
    return () => (Number.isFinite(num) ? num : t);
  }
  const src = text.slice(1);
  const tokens = src.match(/\s*([A-Za-z]+[0-9]*|[0-9]*\.?[0-9]+|<=|>=|<>|[-+*/(),:<>=])/g)?.map((t) => t.trim()) ?? [];
  if (tokens.join('') !== src.replace(/\s+/g, '')) throw new FormulaError('unexpected character');
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++]!;
  const expect = (t: string) => {
    if (next() !== t) throw new FormulaError(`expected ${t}`);
  };
  const num = (v: Value): number => {
    if (typeof v === 'number') return v;
    const n = Number(v);
    if (v === '' || Number.isNaN(n)) throw new FormulaError('#VALUE');
    return n;
  };

  function comparison(): Node {
    let left = additive();
    while (['>', '<', '=', '>=', '<=', '<>'].includes(peek() ?? '')) {
      const op = next();
      const l = left;
      const r = additive();
      left = (read) => {
        const a = num(l(read));
        const b = num(r(read));
        return (op === '>' ? a > b : op === '<' ? a < b : op === '=' ? a === b : op === '>=' ? a >= b : op === '<=' ? a <= b : a !== b) ? 1 : 0;
      };
    }
    return left;
  }
  function additive(): Node {
    let left = term();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const l = left;
      const r = term();
      left = op === '+' ? (read) => num(l(read)) + num(r(read)) : (read) => num(l(read)) - num(r(read));
    }
    return left;
  }
  function term(): Node {
    let left = unary();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const l = left;
      const r = unary();
      left = op === '*' ? (read) => num(l(read)) * num(r(read)) : (read) => {
        const d = num(r(read));
        if (d === 0) throw new FormulaError('#DIV/0');
        return num(l(read)) / d;
      };
    }
    return left;
  }
  function unary(): Node {
    if (peek() === '-') {
      next();
      const e = unary();
      return (read) => -num(e(read));
    }
    return primary();
  }
  function range(a: string, b: string): string[] {
    const [ca, ra] = [a[0]!, Number(a.slice(1))];
    const [cb, rb] = [b[0]!, Number(b.slice(1))];
    const out: string[] = [];
    for (let c = Math.min(ca.charCodeAt(0), cb.charCodeAt(0)); c <= Math.max(ca.charCodeAt(0), cb.charCodeAt(0)); c++) {
      for (let r = Math.min(ra, rb); r <= Math.max(ra, rb); r++) out.push(String.fromCharCode(c) + r);
    }
    return out;
  }
  function args(): Node[][] {
    // Each argument is either a range (A1:B3) or an expression; a range expands to several nodes.
    const list: Node[][] = [];
    expect('(');
    if (peek() !== ')') {
      for (;;) {
        if (REF.test(peek() ?? '') && tokens[i + 1] === ':') {
          const a = next();
          next();
          const b = next();
          list.push(range(a, b).map((ref) => (read: Reader) => read(ref)));
        } else list.push([comparison()]);
        if (peek() === ',') next();
        else break;
      }
    }
    expect(')');
    return list;
  }
  function primary(): Node {
    const t = next();
    if (t === undefined) throw new FormulaError('unexpected end');
    if (t === '(') {
      const e = comparison();
      expect(')');
      return e;
    }
    if (/^[0-9.]/.test(t)) return () => Number(t);
    if (REF.test(t)) return (read) => read(t);
    if (/^[A-Za-z]+$/.test(t) && peek() === '(') {
      const name = t.toUpperCase();
      const a = args();
      const flat = a.flat();
      if (name === 'SUM') return (read) => flat.reduce((s, n) => s + (Number(n(read)) || 0), 0);
      if (name === 'MAX') return (read) => Math.max(...flat.map((n) => num(n(read))));
      if (name === 'MIN') return (read) => Math.min(...flat.map((n) => num(n(read))));
      if (name === 'IF') {
        if (a.length !== 3) throw new FormulaError('IF needs three arguments');
        const [c, x, y] = a.map((g) => g[0]!);
        // Only the branch taken is evaluated, so only its cells become dependencies.
        return (read) => (num(c!(read)) !== 0 ? x!(read) : y!(read));
      }
      throw new FormulaError(`unknown function ${name}`);
    }
    throw new FormulaError(`unexpected ${t}`);
  }
  const root = comparison();
  if (i < tokens.length) throw new FormulaError(`unexpected ${tokens[i]}`);
  return root;
}
