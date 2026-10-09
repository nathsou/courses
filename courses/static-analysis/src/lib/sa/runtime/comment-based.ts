/**
 * Comment-based tests, in the format SonarJS uses for its rule fixtures (`cb.fixture.*`). The course has its own
 * implementation of the format; the syntax is the same:
 *
 *     foo(a, a);   // Noncompliant {{Message one}} {{Message two}}      two issues on this line
 *     //    ^      the primary location of the issue above (the carets sit under the code)
 *     bar();
 *     // Noncompliant@-1 {{Message}}                                   the issue is on the line above
 *     x == x;      // Noncompliant [[qf1]] {{Use something else.}}
 *     //^^^^^^
 *     // fix@qf1 {{Description of the suggestion}}
 *     // edit@qf1 [[sc=0;ec=6]] {{true}}
 *     a + b;
 *     //  ^< {{A secondary location after the primary, with its message}}
 *
 * `^^^>` marks a secondary location that comes *before* its primary location (the arrow points to the primary),
 * `^^^<` one that comes after it. `[[qf1!]]` marks an automatic fix rather than a suggestion. `add@qf1 {{line}}` inserts a
 * line, `del@qf1` deletes one; `@+N`/`@-N` adjust the line of a change relative to the issue's line.
 */
import { parse } from '@typescript-eslint/typescript-estree';
import { applyFix, type Issue } from './lint.js';

export interface Range {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface ExpectedSecondary extends Range {
  message?: string;
}

export interface ExpectedChange {
  type: 'edit' | 'add' | 'del';
  line: number;
  start?: number;
  end?: number;
  contents?: string;
}

export interface ExpectedQuickFix {
  id: string;
  /** An automatic fix (`[[qf!]]`) rather than a suggestion. */
  mandatory: boolean;
  messageIndex: number;
  description?: string;
  changes: ExpectedChange[];
}

export interface ExpectedIssue {
  line: number;
  /** One entry per issue on the line; '' means "any message". */
  messages: string[];
  primary?: Range;
  secondaries: ExpectedSecondary[];
  quickfixes: ExpectedQuickFix[];
}

export interface Expectations {
  issues: ExpectedIssue[];
  errors: string[];
}

interface Comment {
  value: string;
  line: number;
  /** Column (0-based) of the first character after `//` or `/*`. */
  column: number;
}

function extractComments(source: string): Comment[] {
  const ast = parse(source, { comment: true, loc: true, jsx: true });
  return (ast.comments ?? []).map((c) => ({ value: c.value, line: c.loc.start.line, column: c.loc.start.column + 2 }));
}

const LINE_ADJUSTMENT = String.raw`(?:@(?<adj>(?<rel>[+-])?\d+))?`;
const NONCOMPLIANT = new RegExp(String.raw`^\s*Noncompliant${LINE_ADJUSTMENT}\s*(?:\[\[(?<qfs>[^\]]+)\]\])?\s*(?<messages>(?:\{\{.*?\}\}\s*)*)\s*$`, 'i');
const LOCATION = new RegExp(String.raw`^\s*(?<range>\^+)${LINE_ADJUSTMENT}\s*(?<dir>[<>])?\s*(?:\{\{(?<message>.*?)\}\})?\s*`);
const QF_DESCRIPTION = /^\s*fix@(?<id>\w+)\s*(?:\{\{(?<message>.*?)\}\})?\s*$/;
const QF_CHANGE = new RegExp(String.raw`^\s*(?<type>edit|add|del)@(?<id>\w+)(?:@?(?<adj>(?<rel>[+-])?\d+))?\s*(?:\[\[(?<cols>[^\]]+)\]\])?\s*(?:\{\{(?<contents>.*?)\}\})?\s*$`);

function effectiveLine(base: number, m: RegExpExecArray): number {
  const adj = m.groups?.adj;
  if (!adj) return base;
  return m.groups?.rel ? base + Number.parseInt(adj, 10) : Number.parseInt(adj, 10);
}

/** Reads the expectations written in a fixture's comments. */
export function parseExpectations(source: string): Expectations {
  const errors: string[] = [];
  let comments: Comment[];
  try {
    comments = extractComments(source);
  } catch (e) {
    return { issues: [], errors: [`The fixture does not parse: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const byLine = new Map<number, ExpectedIssue>();
  const quickfixes = new Map<string, ExpectedQuickFix>();
  const primaries: { range: Range; issue?: ExpectedIssue }[] = [];
  const secondaries: { range: Range; message?: string; primaryBefore: boolean; order: number }[] = [];
  let order = 0;

  for (const c of comments) {
    const text = c.value;
    if (/^\s*Noncompliant/i.test(text)) {
      const m = NONCOMPLIANT.exec(text);
      if (!m) {
        errors.push(`line ${c.line}: cannot read this Noncompliant comment`);
        continue;
      }
      const line = effectiveLine(c.line, m);
      const messages = m.groups?.messages?.trim() ? [...m.groups.messages.matchAll(/\{\{(.*?)\}\}/g)].map((x) => x[1]!) : [''];
      const issue = byLine.get(line) ?? { line, messages: [], secondaries: [], quickfixes: [] };
      const firstIndex = issue.messages.length;
      issue.messages.push(...messages);
      byLine.set(line, issue);
      for (const [i, spec] of (m.groups?.qfs?.split(/[,\s]+/).filter(Boolean) ?? []).entries()) {
        const [rawId, idx] = spec.split('=');
        const mandatory = rawId!.endsWith('!');
        const id = mandatory ? rawId!.slice(0, -1) : rawId!;
        const qf: ExpectedQuickFix = { id, mandatory, messageIndex: firstIndex + (idx ? Number(idx) : i), changes: [] };
        quickfixes.set(id, qf);
        issue.quickfixes.push(qf);
      }
    } else if (/^\s*\^/.test(text)) {
      // One or more ranges on the same comment line.
      let rest = text;
      let consumed = 0;
      while (rest.length && /^\s*\^/.test(rest)) {
        const m = LOCATION.exec(rest);
        if (!m) break;
        const caret = rest.indexOf('^');
        const column = c.column + consumed + caret;
        const line = effectiveLine(c.line - 1, m);
        const range: Range = { line, column, endLine: line, endColumn: column + m.groups!.range!.length };
        if (m.groups?.dir) secondaries.push({ range, message: m.groups.message, primaryBefore: m.groups.dir === '<', order: order++ });
        else primaries.push({ range });
        consumed += m[0].length;
        rest = rest.slice(m[0].length);
      }
      if (rest.trim().length) errors.push(`line ${c.line}: unexpected text after the location: "${rest.trim()}"`);
    } else if (/^\s*fix@/.test(text)) {
      const m = QF_DESCRIPTION.exec(text);
      const qf = m && quickfixes.get(m.groups!.id!);
      if (!qf) errors.push(`line ${c.line}: unknown quick fix in "${text.trim()}"`);
      else qf.description = m.groups?.message;
    } else if (/^\s*(edit|add|del)@/.test(text)) {
      const m = QF_CHANGE.exec(text);
      const qf = m && quickfixes.get(m.groups!.id!);
      if (!m || !qf) {
        errors.push(`line ${c.line}: unknown quick fix in "${text.trim()}"`);
        continue;
      }
      const issueLine = [...byLine.values()].find((i) => i.quickfixes.includes(qf))!.line;
      const change: ExpectedChange = { type: m.groups!.type as ExpectedChange['type'], line: effectiveLine(issueLine, m), contents: m.groups?.contents };
      for (const part of m.groups?.cols?.split(';') ?? []) {
        const [k, v] = part.split('=');
        if (k === 'sc') change.start = Number(v);
        if (k === 'ec') change.end = Number(v);
      }
      qf.changes.push(change);
    }
    order++;
  }

  // Attach each primary range to the issue on its line.
  for (const p of primaries) {
    const issue = byLine.get(p.range.line);
    if (!issue) errors.push(`line ${p.range.line}: a primary location (^) without a Noncompliant comment for that line`);
    else if (issue.primary) errors.push(`line ${p.range.line}: two primary locations for the same line`);
    else issue.primary = p.range;
  }
  // Attach secondaries: `<` to the closest primary before them, `>` to the closest primary after them.
  const withPrimary = [...byLine.values()].filter((i) => i.primary).sort((a, b) => a.line - b.line || a.primary!.column - b.primary!.column);
  for (const s of secondaries) {
    const target = s.primaryBefore
      ? [...withPrimary].reverse().find((i) => i.primary!.line < s.range.line || (i.primary!.line === s.range.line && i.primary!.column <= s.range.column))
      : withPrimary.find((i) => i.primary!.line > s.range.line || (i.primary!.line === s.range.line && i.primary!.column >= s.range.column));
    if (!target) errors.push(`line ${s.range.line}: a secondary location (${s.primaryBefore ? '<' : '>'}) with no primary location ${s.primaryBefore ? 'before' : 'after'} it`);
    else target.secondaries.push({ ...s.range, message: s.message });
  }
  return { issues: [...byLine.values()].sort((a, b) => a.line - b.line), errors };
}

export type Verdict = 'matched' | 'missing' | 'unexpected' | 'mismatch';

export interface CheckEntry {
  verdict: Verdict;
  line: number;
  expected?: { message: string; primary?: Range; secondaries: ExpectedSecondary[] };
  actual?: Issue;
  /** What differs, for mismatches. */
  details: string[];
}

export interface CheckResult {
  pass: boolean;
  entries: CheckEntry[];
  errors: string[];
}

const fmt = (r: Range) => (r.line === r.endLine ? `${r.line}:${r.column}–${r.endColumn}` : `${r.line}:${r.column}–${r.endLine}:${r.endColumn}`);
const sameRange = (a: Range, b: Range) => a.line === b.line && a.column === b.column && a.endLine === b.endLine && a.endColumn === b.endColumn;

/** Removes the test comments from a text, so that fixed outputs can be compared regardless of them. */
function stripTestComments(text: string): string {
  return text
    .split('\n')
    .filter((l) => !/^\s*\/\/\s*(\^|fix@|edit@|add@|del@|Noncompliant)/i.test(l))
    .map((l) => l.replace(/\s*\/\/\s*Noncompliant.*$/i, '').replace(/\s+$/, ''))
    .join('\n');
}

function expectedOutput(source: string, qf: ExpectedQuickFix): string {
  const lines = source.split('\n');
  // Apply bottom-up so earlier line numbers stay valid.
  for (const ch of [...qf.changes].sort((a, b) => b.line - a.line)) {
    if (ch.type === 'add') lines.splice(ch.line - 1, 0, ch.contents ?? '');
    else if (ch.type === 'del') lines.splice(ch.line - 1, 1);
    else {
      const line = lines[ch.line - 1] ?? '';
      if (ch.start === undefined && ch.end === undefined) lines[ch.line - 1] = ch.contents ?? '';
      else lines[ch.line - 1] = line.slice(0, ch.start ?? 0) + (ch.contents ?? '') + line.slice(ch.end ?? line.length);
    }
  }
  return lines.join('\n');
}

/** Compares a rule's issues on a fixture with the fixture's expectations. */
export function checkFixture(source: string, issues: Issue[]): CheckResult {
  const exp = parseExpectations(source);
  const entries: CheckEntry[] = [];
  const actualByLine = new Map<number, Issue[]>();
  for (const i of issues) actualByLine.set(i.line, [...(actualByLine.get(i.line) ?? []), i]);
  const lines = new Set([...exp.issues.map((i) => i.line), ...actualByLine.keys()]);

  for (const line of [...lines].sort((a, b) => a - b)) {
    const expected = exp.issues.find((i) => i.line === line);
    const actual = [...(actualByLine.get(line) ?? [])];
    const wanted = expected?.messages ?? [];
    // Pair messages that agree first, then the rest in order.
    const pairs: [number, Issue | undefined][] = [];
    const remaining = [...actual];
    const unpaired: number[] = [];
    wanted.forEach((msg, idx) => {
      const j = remaining.findIndex((a) => msg !== '' && a.message === msg);
      if (j >= 0) pairs.push([idx, remaining.splice(j, 1)[0]]);
      else unpaired.push(idx);
    });
    for (const idx of unpaired) pairs.push([idx, remaining.shift()]);
    for (const [idx, a] of pairs.sort((x, y) => x[0] - y[0])) {
      const msg = wanted[idx]!;
      const exp1 = { message: msg, primary: expected?.primary, secondaries: expected?.secondaries ?? [] };
      if (!a) {
        entries.push({ verdict: 'missing', line, expected: exp1, details: [] });
        continue;
      }
      const details: string[] = [];
      if (msg !== '' && a.message !== msg) details.push(`message: expected “${msg}”, got “${a.message}”`);
      const actualRange = { line: a.line, column: a.column, endLine: a.endLine, endColumn: a.endColumn };
      if (expected?.primary && !sameRange(expected.primary, actualRange)) details.push(`primary location: expected ${fmt(expected.primary)}, got ${fmt(actualRange)}`);
      const es = expected?.secondaries ?? [];
      const as = a.secondaryLocations;
      // Secondary locations are checked when the expectation gives a primary range or secondaries (SonarJS's own
      // checker is stricter: for rules with secondaries it compares them on every issue).
      if (es.length || (expected?.primary && as.length)) {
        const unmatched = [...as];
        for (const s of es) {
          const k = unmatched.findIndex((x) => sameRange(x, s) && (s.message === undefined || x.message === s.message));
          if (k >= 0) unmatched.splice(k, 1);
          else details.push(`missing secondary location ${fmt(s)}${s.message ? ` “${s.message}”` : ''}`);
        }
        for (const x of unmatched) details.push(`unexpected secondary location ${fmt(x)}${x.message ? ` “${x.message}”` : ''}`);
      }
      for (const qf of expected?.quickfixes.filter((q) => q.messageIndex === idx) ?? []) {
        const want = stripTestComments(expectedOutput(source, qf));
        if (qf.mandatory) {
          if (!a.fix) details.push(`expected an automatic fix (${qf.id})`);
          else if (stripTestComments(applyFix(source, a.fix)) !== want) details.push(`the automatic fix ${qf.id} produces different code`);
        } else {
          const match = a.suggestions?.find((s) => stripTestComments(applyFix(source, s.fix)) === want);
          if (!match) details.push(`expected a suggestion ${qf.id}${qf.description ? ` (“${qf.description}”)` : ''} producing different code`);
          else if (qf.description !== undefined && match.desc !== qf.description) details.push(`suggestion ${qf.id}: expected description “${qf.description}”, got “${match.desc}”`);
        }
      }
      entries.push({ verdict: details.length ? 'mismatch' : 'matched', line, expected: exp1, actual: a, details });
    }
    for (const a of remaining) entries.push({ verdict: 'unexpected', line, actual: a, details: [] });
  }
  return { pass: exp.errors.length === 0 && entries.every((e) => e.verdict === 'matched'), entries, errors: exp.errors };
}
