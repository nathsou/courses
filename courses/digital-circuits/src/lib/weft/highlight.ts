/**
 * Highlighting of Weft sources (and of the IR text synth prints for each step of its flow: `.rtl`, `.gates`,
 * `.netlist`, and of PCF pin files), ported from synth's playground (crates/synth-playground/web/highlight.js)
 * so that the course colours Weft as synth's own tools do.
 *
 * Node-importable (the Markdown compiler calls it at build time): no imports, erasable TypeScript only.
 */

export type HighlightKind =
  | 'keyword'
  | 'type'
  | 'number'
  | 'string'
  | 'comment'
  | 'doc'
  | 'operator'
  | 'function'
  | 'attr'
  | 'domain'
  | 'register'
  | 'port'
  | 'instance';

export interface Token {
  from: number;
  to: number;
  kind: HighlightKind;
}

/** `tests` is the course's test language for Weft designs (`testbench.ts`). */
export type SourceLang = 'weft' | 'rtl' | 'gates' | 'netlist' | 'pcf' | 'tests';

export const WEFT_KEYWORDS = new Set(['module', 'extern', 'fn', 'struct', 'enum', 'const', 'let', 'var', 'wire', 'reg', 'mem', 'inst', 'domain', 'default', 'if', 'else', 'match', 'for', 'in', 'out', 'inout', 'init', 'type', 'async', 'assert', 'true', 'false', 'undef']);
export const WEFT_TYPES = new Set(['bool', 'uint', 'sint', 'index', 'clock', 'int', 'string']);
export const WEFT_BUILTINS = new Set(['concat', 'from_bits', 'unsafe_cross', 'hex_file', 'bin_file', 'clog2', 'bits_for', 'min', 'max', 'sync', 'reset_sync', 'power_on_reset', 'rising', 'falling', 'divider', 'count_ones', 'onehot_to_index', 'priority', 'synth_pll']);
const PCF_KEYWORDS = new Set(['set_io', 'set_frequency', '-nowarn', '-pullup', '-pullup_resistor']);
const TEST_KEYWORDS = new Set(['test', 'set', 'step', 'expect', 'for', 'in', 'true', 'false']);

const IR_STMT = new Set(['module', 'input', 'output', 'inout', 'wire', 'connect', 'inst', 'cell', 'memory', 'init', 'write']);
const IR_KW = new Set(['signed', 'posedge', 'negedge', 'offset']);
const IR_FLAGS = new Set(['en_over_srst']);

/** What the analysis says a name is (synth's `refs[].kind`), as a highlight kind. */
export const SEMANTIC_KIND: Record<string, HighlightKind | undefined> = {
  Register: 'register',
  Port: 'port',
  Module: 'type',
  Type: 'type',
  Function: 'function',
  Variant: 'attr',
  Domain: 'domain',
  Instance: 'instance',
  Const: 'number',
  Generic: 'number',
};

const isDigit = (c: string) => c >= '0' && c <= '9' && c !== '';
const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
const isId = (c: string) => /[A-Za-z0-9_$]/.test(c);

function tokenizeIr(text: string): Token[] {
  const out: Token[] = [];
  const n = text.length;
  let i = 0;
  let stmt: string | null = null;
  let last: string | null = null;
  let colons = 0;
  const push = (from: number, to: number, kind: HighlightKind) => out.push({ from, to, kind });
  while (i < n) {
    const c = text.charAt(i);
    if (c === '\n') {
      stmt = null;
      last = null;
      colons = 0;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '/' && text.charAt(i + 1) === '/') {
      let j = text.indexOf('\n', i);
      if (j < 0) j = n;
      push(i, j, 'comment');
      i = j;
      continue;
    }
    if (c === '@') {
      let j = i + 1;
      if (text.charAt(j) === '"') {
        j++;
        while (j < n && text.charAt(j) !== '"' && text.charAt(j) !== '\n') j += text.charAt(j) === '\\' ? 2 : 1;
        j++;
      } else while (j < n && /[A-Za-z0-9_$.]/.test(text.charAt(j))) j++;
      push(i, Math.min(j, n), 'attr');
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && text.charAt(j) !== '"' && text.charAt(j) !== '\n') j += text.charAt(j) === '\\' ? 2 : 1;
      if ((stmt === 'inst' || stmt === 'cell') && last === ':' && colons === 1) push(i, j + 1, 'type');
      stmt = stmt ?? 'name';
      last = 'word';
      i = j + 1;
      continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (j < n && isDigit(text.charAt(j))) j++;
      if (text.charAt(j) === "'" && /[bdhBDH]/.test(text.charAt(j + 1))) {
        j += 2;
        while (j < n && /[0-9a-fA-FxXzZ_]/.test(text.charAt(j))) j++;
      }
      push(i, j, 'number');
      last = 'num';
      i = j;
      continue;
    }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$.]/.test(text.charAt(j))) j++;
      const w = text.slice(i, j);
      let k = j;
      while (text.charAt(k) === ' ') k++;
      const key = (text.charAt(k) === ':' || text.startsWith('->', k) || text.startsWith('<->', k)) && [',', '(', '{', 'op'].includes(last ?? '');
      let kind: HighlightKind | null = null;
      if (stmt === null && IR_STMT.has(w)) kind = 'keyword';
      else if (IR_KW.has(w) || (w === 'x' && last === 'num' && stmt === 'memory')) kind = 'keyword';
      else if (IR_FLAGS.has(w)) kind = 'attr';
      else if (last === '=' && stmt !== 'connect') kind = 'function';
      else if (key) kind = 'attr';
      else if ((stmt === 'inst' || stmt === 'cell') && last === ':' && colons === 1) kind = 'type';
      if (kind) push(i, j, kind);
      last = kind === 'function' ? 'op' : 'word';
      if (stmt === null) stmt = IR_STMT.has(w) ? w : 'name';
      i = j;
      continue;
    }
    const three = text.slice(i, i + 3);
    const two = text.slice(i, i + 2);
    const op = three === '<->' ? three : two === '->' ? two : '=?:~'.includes(c) ? c : null;
    if (op) {
      push(i, i + op.length, 'operator');
      if (op === ':') colons++;
      last = op;
      i += op.length;
      continue;
    }
    last = c;
    i++;
  }
  return out;
}

/**
 * The tokens of a source. `semantic` maps the start offset of a name to what the analysis found it to be
 * (synth's `refs[].kind`), which colours registers, ports, instances and domains by what they are.
 */
export function tokenize(text: string, lang: SourceLang = 'weft', semantic?: Map<number, string>): Token[] {
  if (lang === 'rtl' || lang === 'gates' || lang === 'netlist') return tokenizeIr(text);
  const out: Token[] = [];
  const push = (from: number, to: number, kind: HighlightKind) => out.push({ from, to, kind });
  const n = text.length;
  let i = 0;
  let prevWord = '';
  while (i < n) {
    const c = text.charAt(i);
    const two = text.slice(i, i + 2);
    if ((lang !== 'pcf' && two === '//') || ((lang === 'pcf' || lang === 'tests') && c === '#')) {
      let j = text.indexOf('\n', i);
      if (j < 0) j = n;
      push(i, j, lang === 'weft' && text.startsWith('///', i) ? 'doc' : 'comment');
      i = j;
      continue;
    }
    if (lang !== 'pcf' && two === '/*') {
      let j = text.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      push(i, j, 'comment');
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n && text.charAt(j) !== '"' && text.charAt(j) !== '\n') j += text.charAt(j) === '\\' ? 2 : 1;
      push(i, Math.min(n, j + 1), 'string');
      i = j + 1;
      continue;
    }
    if (lang === 'weft' && two === '#[') {
      let j = text.indexOf(']', i);
      j = j < 0 ? n : j + 1;
      push(i, j, 'attr');
      i = j;
      continue;
    }
    if (isDigit(c)) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_?'.]/.test(text.charAt(j)) && !(text.charAt(j) === '.' && text.charAt(j + 1) === '.')) j++;
      push(i, j, 'number');
      i = j;
      prevWord = '';
      continue;
    }
    if (isIdStart(c) || (lang === 'pcf' && c === '-')) {
      let j = i + 1;
      while (j < n && (isId(text.charAt(j)) || (lang === 'pcf' && /[-[\]]/.test(text.charAt(j))))) j++;
      const w = text.slice(i, j);
      let kind: HighlightKind | null = null;
      const sem = semantic?.get(i);
      if (lang === 'weft') {
        if (text.charAt(i - 1) === '@') kind = 'domain';
        else if (WEFT_KEYWORDS.has(w)) kind = 'keyword';
        else if (WEFT_TYPES.has(w)) kind = 'type';
        else if (sem && SEMANTIC_KIND[sem]) kind = SEMANTIC_KIND[sem]!;
        else if (prevWord === 'module' || prevWord === 'struct' || prevWord === 'enum') kind = 'type';
        else if (prevWord === 'fn') kind = 'function';
        else if (text.charAt(i - 1) === '.' && /[A-Z]/.test(c)) kind = 'attr';
        else if (WEFT_BUILTINS.has(w) || /^\s*(<[^;{}]*>)?\s*\(/.test(text.slice(j, j + 40))) kind = /^[A-Z]/.test(w) ? 'type' : 'function';
      } else if (lang === 'tests') {
        if (TEST_KEYWORDS.has(w)) kind = 'keyword';
      } else if (PCF_KEYWORDS.has(w)) kind = 'keyword';
      if (kind) push(i, j, kind);
      prevWord = w;
      i = j;
      continue;
    }
    if (c === '@' && lang === 'weft') {
      let j = i + 1;
      while (j < n && isId(text.charAt(j))) j++;
      push(i, j, 'domain');
      i = j;
      continue;
    }
    if (/[+\-*/%=<>!&|^~:?]/.test(c)) {
      let j = i + 1;
      while (j < n && /[+\-*/%=<>!&|^~:]/.test(text.charAt(j)) && j - i < 3) j++;
      push(i, j, 'operator');
      i = j;
      continue;
    }
    if (!/\s/.test(c)) prevWord = c === '.' ? prevWord : '';
    i++;
  }
  return out;
}

/** The colour of each kind of token: the `--code-*` design tokens (app.css), shared with the editor. */
export const TOKEN_COLOUR: Record<HighlightKind, string> = {
  keyword: '--code-keyword',
  type: '--code-type',
  number: '--code-number',
  string: '--code-string',
  comment: '--code-comment',
  doc: '--code-comment',
  operator: '--code-punct',
  function: '--code-fn',
  attr: '--code-string',
  domain: '--code-number',
  register: '--code-fn',
  port: '--code-type',
  instance: '--code-def',
};

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function span(text: string, kind: HighlightKind): string {
  const v = TOKEN_COLOUR[kind];
  const italic = kind === 'comment' || kind === 'doc' ? ';font-style:italic' : '';
  const weight = kind === 'doc' || kind === 'register' ? ';font-weight:500' : '';
  return `<span class="tok-${kind}" style="--shiki-light:var(${v});--shiki-dark:var(${v})${italic}${weight}">${escape(text)}</span>`;
}

/** Source text as highlighted lines of HTML (one string per line). */
export function highlightLines(code: string, lang: SourceLang = 'weft', semantic?: Map<number, string>): string[] {
  const src = code.replace(/\r\n?/g, '\n');
  const lines: string[] = [];
  let line = '';
  const emit = (text: string, kind?: HighlightKind) => {
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        lines.push(line);
        line = '';
      }
      if (part) line += kind ? span(part, kind) : escape(part);
    });
  };
  let pos = 0;
  for (const t of tokenize(src, lang, semantic)) {
    if (t.from < pos) continue;
    if (t.from > pos) emit(src.slice(pos, t.from));
    emit(src.slice(t.from, t.to), t.kind);
    pos = t.to;
  }
  if (pos < src.length) emit(src.slice(pos));
  lines.push(line);
  return lines;
}

/**
 * A source as the HTML of a code block (without the surrounding `<figure>`), in the structure of the Shiki
 * blocks of other languages (`<pre class="shiki …"><code><span class="line">…`), so the page's code-block
 * styles apply in both themes.
 */
export function highlightWeftHtml(code: string, lang: SourceLang = 'weft'): string {
  const body = highlightLines(code.replace(/\n$/, ''), lang)
    .map((l) => `<span class="line">${l}</span>`)
    .join('\n');
  return `<!-- svelte-ignore a11y_no_noninteractive_tabindex --><pre class="shiki shiki-themes bench-light bench-dark ${lang}" style="--shiki-light:var(--code-def);--shiki-dark:var(--code-def);--shiki-light-bg:var(--pn);--shiki-dark-bg:var(--pn)" tabindex="0"><code>${body}</code></pre>`;
}
