/**
 * Small, safe simulations of the interpreters behind injection vulnerabilities (chapter 28): a SQL engine over one
 * table, an HTML scanner, a shell's command splitter, POSIX path normalisation and URL classification. None of
 * them executes anything; each shows how the interpreter would *read* a string built from untrusted input.
 */

// ---------------------------------------------------------------------------------------------------------------
// SQL: SELECT … FROM users WHERE …, with stacked statements and comments.

export interface UserRow {
  id: number;
  name: string;
  role: string;
  email: string;
}

export const USERS: UserRow[] = [
  { id: 1, name: 'alice', role: 'admin', email: 'alice@corkboard.test' },
  { id: 2, name: 'bob', role: 'member', email: 'bob@corkboard.test' },
  { id: 3, name: 'carol', role: 'member', email: 'carol@corkboard.test' },
];

type SqlToken = { kind: 'word' | 'string' | 'number' | 'op' | 'param'; text: string };
export class SqlError extends Error {}

function sqlTokens(sql: string): { tokens: SqlToken[]; comment?: string } {
  const tokens: SqlToken[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i]!;
    if (/\s/.test(c)) i++;
    else if (sql.startsWith('--', i)) return { tokens, comment: sql.slice(i) };
    else if (c === "'") {
      let j = i + 1;
      let text = '';
      for (;;) {
        if (j >= sql.length) throw new SqlError('unterminated string literal');
        if (sql[j] === "'" && sql[j + 1] === "'") (text += "'"), (j += 2);
        else if (sql[j] === "'") break;
        else text += sql[j++];
      }
      tokens.push({ kind: 'string', text });
      i = j + 1;
    } else if (/[0-9]/.test(c)) {
      const m = /^[0-9]+/.exec(sql.slice(i))!;
      tokens.push({ kind: 'number', text: m[0] });
      i += m[0].length;
    } else if (/[A-Za-z_*]/.test(c)) {
      const m = /^(\*|[A-Za-z_][A-Za-z0-9_]*)/.exec(sql.slice(i))!;
      tokens.push({ kind: 'word', text: m[0] });
      i += m[0].length;
    } else if (c === '?') {
      tokens.push({ kind: 'param', text: '?' });
      i++;
    } else {
      const m = /^(<>|!=|<=|>=|=|<|>|\(|\)|,|;)/.exec(sql.slice(i));
      if (!m) throw new SqlError(`unexpected character ${c}`);
      tokens.push({ kind: 'op', text: m[0] });
      i += m[0].length;
    }
  }
  return { tokens };
}

type Value = string | number | boolean;
type Expr = (row: UserRow, params: Value[]) => Value;

export interface SqlResult {
  /** The statements the engine sees, one per `;`. */
  statements: string[];
  /** The rows returned by the first statement. */
  rows: UserRow[];
  columns: string[];
  /** Text after `--`, which the engine ignores. */
  comment?: string;
  error?: string;
}

/** Runs a query against USERS. Supports SELECT with WHERE, AND, OR, NOT, comparisons and `?` parameters. */
export function runSql(sql: string, params: Value[] = []): SqlResult {
  let lexed: ReturnType<typeof sqlTokens>;
  try {
    lexed = sqlTokens(sql);
  } catch (e) {
    return { statements: [sql], rows: [], columns: [], error: (e as Error).message };
  }
  // Split into statements at `;`.
  const statements: SqlToken[][] = [[]];
  for (const t of lexed.tokens) {
    if (t.kind === 'op' && t.text === ';') statements.push([]);
    else statements.at(-1)!.push(t);
  }
  const texts = statements.filter((s) => s.length).map((s) => s.map((t) => (t.kind === 'string' ? `'${t.text.replace(/'/g, "''")}'` : t.text)).join(' '));
  const first = statements[0]!;
  let i = 0;
  let paramIndex = 0;
  const peek = () => first[i];
  const word = (w: string) => peek()?.kind === 'word' && peek()!.text.toUpperCase() === w;
  const expectWord = (w: string) => {
    if (!word(w)) throw new SqlError(`expected ${w}${peek() ? ` near “${peek()!.text}”` : ' at the end'}`);
    i++;
  };
  const COLUMNS = ['id', 'name', 'role', 'email'];
  const atom = (): Expr => {
    const t = first[i++];
    if (!t) throw new SqlError('unexpected end of query');
    if (t.kind === 'string') return () => t.text;
    if (t.kind === 'number') return () => Number(t.text);
    if (t.kind === 'param') {
      const k = paramIndex++;
      return (_, ps) => ps[k] ?? '';
    }
    if (t.kind === 'op' && t.text === '(') {
      const e = or();
      if (first[i++]?.text !== ')') throw new SqlError('expected )');
      return e;
    }
    if (t.kind === 'word' && COLUMNS.includes(t.text.toLowerCase())) return (row) => row[t.text.toLowerCase() as keyof UserRow];
    throw new SqlError(`unknown column or syntax error near “${t.text}”`);
  };
  const cmp = (): Expr => {
    if (word('NOT')) {
      i++;
      const e = cmp();
      return (r, p) => !e(r, p);
    }
    const left = atom();
    const op = peek();
    if (op?.kind === 'op' && ['=', '!=', '<>', '<', '>', '<=', '>='].includes(op.text)) {
      i++;
      const right = atom();
      return (r, p) => {
        const a = left(r, p);
        const b = right(r, p);
        // Loose comparison, as many engines do between numbers and numeric strings.
        const x = typeof a === 'number' || typeof b === 'number' ? Number(a) : a;
        const y = typeof a === 'number' || typeof b === 'number' ? Number(b) : b;
        switch (op.text) {
          case '=': return x === y;
          case '!=': case '<>': return x !== y;
          case '<': return x < y;
          case '>': return x > y;
          case '<=': return x <= y;
          default: return x >= y;
        }
      };
    }
    return (r, p) => Boolean(left(r, p));
  };
  const and = (): Expr => {
    let e = cmp();
    while (word('AND')) {
      i++;
      const l = e;
      const r = cmp();
      e = (row, p) => Boolean(l(row, p)) && Boolean(r(row, p));
    }
    return e;
  };
  function or(): Expr {
    let e = and();
    while (word('OR')) {
      i++;
      const l = e;
      const r = and();
      e = (row, p) => Boolean(l(row, p)) || Boolean(r(row, p));
    }
    return e;
  }
  try {
    expectWord('SELECT');
    const columns: string[] = [];
    do {
      if (peek()?.text === ',') i++;
      const t = first[i++];
      if (!t || t.kind !== 'word' || (t.text !== '*' && !COLUMNS.includes(t.text.toLowerCase()))) throw new SqlError(`unknown column near “${t?.text ?? 'the end'}”`);
      columns.push(...(t.text === '*' ? COLUMNS : [t.text.toLowerCase()]));
    } while (peek()?.text === ',');
    expectWord('FROM');
    if (!word('USERS')) throw new SqlError(`unknown table near “${peek()?.text ?? 'the end'}”`);
    i++;
    let where: Expr = () => true;
    if (word('WHERE')) {
      i++;
      where = or();
    }
    if (i < first.length) throw new SqlError(`syntax error near “${first[i]!.text}”`);
    return { statements: texts, rows: USERS.filter((r) => Boolean(where(r, params))), columns, comment: lexed.comment };
  } catch (e) {
    return { statements: texts, rows: [], columns: [], comment: lexed.comment, error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// HTML: which elements, event handlers and script URLs would the browser create?

export interface HtmlFinding {
  tag: string;
  /** What makes it run code: a script element, an event handler attribute, a javascript: URL. */
  why: string;
}

export function scanHtml(html: string): { tags: string[]; scripts: HtmlFinding[] } {
  const tags: string[] = [];
  const scripts: HtmlFinding[] = [];
  for (const m of html.matchAll(/<\s*([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const tag = m[1]!.toLowerCase();
    const attrs = m[2] ?? '';
    tags.push(tag);
    if (tag === 'script') scripts.push({ tag, why: 'a script element' });
    for (const a of attrs.matchAll(/(?:^|[\s/])(on[a-z]+)\s*=/gi)) scripts.push({ tag, why: `an event handler, ${a[1]!.toLowerCase()}` });
    if (/(?:href|src|action)\s*=\s*["']?\s*javascript:/i.test(attrs)) scripts.push({ tag, why: 'a javascript: URL' });
  }
  return { tags, scripts };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------------------------------------------
// Shell: how `sh -c` splits a command line into commands and arguments.

export interface ShellCommand {
  argv: string[];
  /** The operator that precedes this command: `;`, `&&`, `||`, `|`, or a command substitution. */
  via?: string;
}

/** Splits a command line as a POSIX shell would (quotes, `;`, `&&`, `||`, `|`, newlines, `$(…)` and backticks). */
export function splitShell(line: string): ShellCommand[] {
  const commands: ShellCommand[] = [];
  const substitutions: string[] = [];
  let argv: string[] = [];
  let word = '';
  let inWord = false;
  let via: string | undefined;
  const endWord = () => {
    if (inWord) argv.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = (next?: string) => {
    endWord();
    if (argv.length) commands.push({ argv, via });
    argv = [];
    via = next;
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === "'") {
      const j = line.indexOf("'", i + 1);
      word += line.slice(i + 1, j < 0 ? line.length : j);
      inWord = true;
      i = j < 0 ? line.length : j;
    } else if (c === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line.startsWith('$(', j)) {
          const k = line.indexOf(')', j);
          substitutions.push(line.slice(j + 2, k < 0 ? line.length : k));
          j = k < 0 ? line.length : k + 1;
          continue;
        }
        word += line[j++];
      }
      inWord = true;
      i = j;
    } else if (line.startsWith('$(', i)) {
      const k = line.indexOf(')', i);
      substitutions.push(line.slice(i + 2, k < 0 ? line.length : k));
      inWord = true;
      i = k < 0 ? line.length : k;
    } else if (c === '`') {
      const k = line.indexOf('`', i + 1);
      substitutions.push(line.slice(i + 1, k < 0 ? line.length : k));
      inWord = true;
      i = k < 0 ? line.length : k;
    } else if (line.startsWith('&&', i) || line.startsWith('||', i)) {
      endCommand(line.slice(i, i + 2));
      i++;
    } else if (c === ';' || c === '|' || c === '\n' || c === '&') {
      endCommand(c === '\n' ? 'newline' : c);
    } else if (/\s/.test(c)) endWord();
    else {
      word += c;
      inWord = true;
    }
  }
  endCommand();
  // Substitutions run first, as commands of their own.
  return [...substitutions.flatMap((s) => splitShell(s).map((c) => ({ ...c, via: c.via ?? 'substitution' }))), ...commands];
}

// ---------------------------------------------------------------------------------------------------------------
// Paths: POSIX normalisation, as path.join and path.resolve do.

export function normalizePath(p: string): string {
  const absolute = p.startsWith('/');
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (out.length && out.at(-1) !== '..') out.pop();
      else if (!absolute) out.push('..');
    } else out.push(part);
  }
  return (absolute ? '/' : '') + out.join('/') || (absolute ? '/' : '.');
}

/** path.join(root, name): the joined, normalised path. A name starting with `/` does not reset the root. */
export const joinPath = (root: string, name: string) => normalizePath(`${root}/${name}`);
/** path.resolve(root, name): an absolute name replaces the root. */
export const resolvePath = (root: string, name: string) => normalizePath(name.startsWith('/') ? name : `${root}/${name}`);
export const isInside = (root: string, p: string) => p === root || p.startsWith(root.endsWith('/') ? root : `${root}/`);

// ---------------------------------------------------------------------------------------------------------------
// URLs: where would a server-side request go?

export interface UrlTarget {
  href?: string;
  hostname?: string;
  kind: 'public' | 'loopback' | 'private network' | 'link-local (cloud metadata)' | 'invalid';
  userinfo?: string;
}

export function classifyUrl(raw: string): UrlTarget {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'invalid' };
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const userinfo = url.username ? `${url.username}${url.password ? `:${url.password}` : ''}` : undefined;
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host)?.slice(1).map(Number);
  let kind: UrlTarget['kind'] = 'public';
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || (ipv4 && ipv4[0] === 127)) kind = 'loopback';
  else if (ipv4 && (ipv4[0] === 10 || (ipv4[0] === 172 && ipv4[1]! >= 16 && ipv4[1]! <= 31) || (ipv4[0] === 192 && ipv4[1] === 168))) kind = 'private network';
  else if (ipv4 && ipv4[0] === 169 && ipv4[1] === 254) kind = 'link-local (cloud metadata)';
  return { href: url.href, hostname: url.hostname, kind, userinfo };
}
