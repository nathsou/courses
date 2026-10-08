/**
 * The storage rule (PLAN §7): an allocator's bookkeeping must live in the simulated heap. As in the CS:APP malloc
 * lab, only scalar variables are allowed outside it. This check reads the reader's TypeScript as tokens (comments
 * and strings removed) and rejects the constructs that would let bookkeeping live in JavaScript instead: arrays,
 * maps, sets, typed arrays, array literals, and objects used as dictionaries. It is a teaching check, not a
 * sandbox; the badge says so.
 */
export interface StorageViolation {
  line: number;
  message: string;
}

const FORBIDDEN: [RegExp, string][] = [
  [/\bnew\s+(Map|Set|WeakMap|WeakSet|Array|Object)\b/, 'collections must live in the heap: no Map, Set or Array'],
  [/\b(Map|Set|Array)\s*\(/, 'collections must live in the heap: no Map, Set or Array'],
  [/\bnew\s+\w*(Int|Uint|Float|BigInt)\w*Array\b/, 'typed arrays are memory outside the heap'],
  [/\bArrayBuffer\b|\bDataView\b/, 'raw buffers are memory outside the heap'],
  [/\.(push|unshift|splice)\s*\(/, 'growing a JavaScript array: keep lists in the heap instead'],
  [/\bstructuredClone\b|\bJSON\b|\blocalStorage\b|\bglobalThis\b|\beval\b|\bFunction\s*\(/, 'not available to allocator code'],
];

/** Remove comments and the contents of strings and template literals, keeping line breaks. */
export function stripCode(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '/' && d === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) out += src[i++] === '\n' ? '\n' : '';
      i += 2;
    } else if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        else if (src[i] === '\n') out += '\n';
        i++;
      }
      out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function checkStorage(src: string): StorageViolation[] {
  const code = stripCode(src);
  const out: StorageViolation[] = [];
  code.split('\n').forEach((line, n) => {
    for (const [re, message] of FORBIDDEN) if (re.test(line)) out.push({ line: n + 1, message });
    // An array literal: "[" that does not follow an identifier, ")" or "]" (which would be indexing or a type).
    const lit = /(^|[=(,?&|!{;]|return|=>)\s*\[/.exec(line);
    if (lit && !/:\s*\w+\s*\[\s*\]/.test(line)) out.push({ line: n + 1, message: 'array literals keep data outside the heap' });
    // Computed property writes: obj[key] = … turns an object into a dictionary.
    if (/\w\s*\[[^\]]+\]\s*=[^=]/.test(line)) out.push({ line: n + 1, message: 'indexed writes (x[i] = …) store data outside the heap; use heap.store64' });
  });
  return out;
}
