/**
 * The course's Analytical Engine: a store of 1,000 columns of 50 decimal digits and a sign, a mill with two
 * ingress axes and an egress, and a chain of cards. The notation is the course's own (Appendix A); the
 * kinds of card are Babbage's.
 *
 *   # comment                       anything after # is ignored
 *   N7 3.25                         number card: put 3.25 into column V7
 *   + − × ÷   (or - * x /)          operation card: what the mill does with the next two numbers
 *   L7                              variable card: give V7 to the mill and keep it in the store
 *   Z7                              variable card: give V7 to the mill and clear the column (zero)
 *   S7                              variable card: store the mill's result in V7
 *   S7'                             store the remainder of the last division in V7
 *   P                               print the last result
 *   CF n / CB n                     combinatorial card: skip forward / back n cards
 *   CF? n / CB? n                   … only if the run-up lever is set
 *   BELL                            ring the bell (attract the attendant)
 *   H                               halt
 *   .decimal d                      fixed point: numbers carry d decimal places (Babbage's stepping cards)
 *
 * The mill takes the first number given after a result (or after an operation card) on ingress axis 1,
 * the second on axis 2, and then works. The run-up lever is set when a result has the opposite sign to the
 * first number (a subtraction that went below zero), when a result overflows 50 digits, or on division by
 * zero; every working of the mill resets it first. A conditional card reads it.
 */

export const DIGITS = 50;
export const COLUMNS = 1000;
const LIMIT = 10n ** BigInt(DIGITS);

export type Op = '+' | '-' | '×' | '÷';

export type Card =
  | { kind: 'number'; v: number; value: bigint; text: string; line: number }
  | { kind: 'op'; op: Op; line: number }
  | { kind: 'load'; v: number; zero: boolean; line: number }
  | { kind: 'store'; v: number; remainder: boolean; line: number }
  | { kind: 'print'; line: number }
  | { kind: 'jump'; forward: boolean; n: number; conditional: boolean; line: number }
  | { kind: 'bell'; line: number }
  | { kind: 'halt'; line: number };

export interface Deck {
  cards: Card[];
  decimals: number;
  /** Source lines of each card (1-based). */
  errors: { line: number; message: string }[];
}

/**
 * Timings in seconds, after Babbage's own estimates for the engine as designed: about a second for an
 * addition or subtraction, about a minute to multiply or divide fifty-digit numbers. Moving a number between
 * store and mill and reading a control card take a fraction of a second.
 */
export const TIMING = { add: 1, mul: 60, div: 60, transfer: 0.5, control: 0.1 };

export function parseDeck(src: string): Deck {
  const cards: Card[] = [];
  const errors: Deck['errors'] = [];
  let decimals = 0;
  const pendingNumbers: { card: Extract<Card, { kind: 'number' }> }[] = [];
  src.split('\n').forEach((raw, i) => {
    const line = i + 1;
    const text = raw.replace(/#.*$/, '').trim();
    if (!text) return;
    let m: RegExpExecArray | null;
    if ((m = /^\.decimal\s+(\d+)$/i.exec(text))) {
      decimals = Math.min(40, Number(m[1]));
      return;
    }
    const col = (s: string) => {
      const v = Number(s);
      if (!Number.isInteger(v) || v < 0 || v >= COLUMNS) {
        errors.push({ line, message: `there is no column V${s}: columns run from V0 to V${COLUMNS - 1}` });
        return -1;
      }
      return v;
    };
    if ((m = /^N\s*(\d+)\s+([-−+]?\d*\.?\d+)$/i.exec(text))) {
      const v = col(m[1]!);
      const c = { kind: 'number' as const, v, value: 0n, text: m[2]!.replace('−', '-'), line };
      pendingNumbers.push({ card: c });
      cards.push(c);
    } else if (/^[+\-−×x*÷/]$/.test(text)) {
      const op: Op = text === '+' ? '+' : /[-−]/.test(text) ? '-' : /[×x*]/.test(text) ? '×' : '÷';
      cards.push({ kind: 'op', op, line });
    } else if ((m = /^([LZ])\s*(\d+)$/i.exec(text))) {
      cards.push({ kind: 'load', v: col(m[2]!), zero: m[1]!.toUpperCase() === 'Z', line });
    } else if ((m = /^S\s*(\d+)\s*('?)$/i.exec(text))) {
      cards.push({ kind: 'store', v: col(m[1]!), remainder: m[2] === "'", line });
    } else if (/^P$/i.test(text)) cards.push({ kind: 'print', line });
    else if (/^BELL$/i.test(text)) cards.push({ kind: 'bell', line });
    else if (/^H(ALT)?$/i.test(text)) cards.push({ kind: 'halt', line });
    else if ((m = /^C([FB])\s*(\?)?\s*\+?(\d+)$/i.exec(text))) {
      cards.push({ kind: 'jump', forward: m[1]!.toUpperCase() === 'F', conditional: !!m[2], n: Number(m[3]), line });
    } else errors.push({ line, message: `“${text}” is not a card this engine reads (see Appendix A)` });
  });
  // Number cards are scaled once the decimal setting is known (it applies to the whole deck).
  for (const { card } of pendingNumbers) card.value = toFixed(card.text, decimals);
  return { cards, decimals, errors };
}

export function toFixed(text: string, d: number): bigint {
  const neg = text.startsWith('-');
  const t = text.replace(/^[-+]/, '');
  const [ip = '0', fp = ''] = t.split('.');
  const frac = (fp + '0'.repeat(d)).slice(0, d);
  const v = BigInt((ip || '0') + frac);
  return neg ? -v : v;
}

export function formatFixed(v: bigint, d: number): string {
  const neg = v < 0n;
  let s = (neg ? -v : v).toString();
  if (d > 0) {
    s = s.padStart(d + 1, '0');
    s = `${s.slice(0, -d)}.${s.slice(-d)}`.replace(/\.?0+$/, '');
  }
  return (neg ? '−' : '') + s;
}

export interface Step {
  /** Index of the card read. */
  pc: number;
  card: Card;
  /** What happened, in words. */
  note: string;
  time: number;
}

export interface RunResult {
  store: Map<number, bigint>;
  printed: string[];
  steps: number;
  /** Estimated running time on the engine, in seconds. */
  time: number;
  halted: 'halt' | 'end' | 'limit' | 'error';
  error?: string;
  trace: Step[];
  bells: number;
}

export class Engine {
  store = new Map<number, bigint>();
  ingress: bigint[] = [];
  op: Op = '+';
  result = 0n;
  remainder = 0n;
  lever = false;
  printed: string[] = [];
  pc = 0;
  time = 0;
  steps = 0;
  bells = 0;
  done: RunResult['halted'] | null = null;
  error: string | undefined;
  trace: Step[] = [];

  constructor(readonly deck: Deck, initial: Record<number, number | string> = {}, readonly keepTrace = true) {
    for (const [k, v] of Object.entries(initial)) this.store.set(Number(k), toFixed(String(v), deck.decimals));
  }

  get(v: number): bigint {
    return this.store.get(v) ?? 0n;
  }

  /** Read one card. Returns false once the engine has stopped. */
  step(): boolean {
    if (this.done) return false;
    const card = this.deck.cards[this.pc];
    if (!card) {
      this.done = 'end';
      return false;
    }
    const d = this.deck.decimals;
    const scale = 10n ** BigInt(d);
    let note = '';
    let dt = TIMING.control;
    let next = this.pc + 1;
    switch (card.kind) {
      case 'number':
        this.store.set(card.v, card.value);
        note = `V${card.v} ← ${formatFixed(card.value, d)}`;
        dt = TIMING.transfer;
        break;
      case 'op':
        this.op = card.op;
        this.ingress = [];
        note = `the mill is set to ${{ '+': 'add', '-': 'subtract', '×': 'multiply', '÷': 'divide' }[card.op]}`;
        break;
      case 'load': {
        const x = this.get(card.v);
        if (card.zero) this.store.delete(card.v);
        this.ingress.push(x);
        dt = TIMING.transfer;
        note = `V${card.v} (${formatFixed(x, d)}) → ingress axis ${this.ingress.length}${card.zero ? `, V${card.v} cleared` : ''}`;
        if (this.ingress.length === 2) {
          const [a, b] = this.ingress as [bigint, bigint];
          this.ingress = [];
          this.lever = false;
          let r = 0n;
          if (this.op === '+' || this.op === '-') {
            r = this.op === '+' ? a + b : a - b;
            dt += TIMING.add;
            if ((a >= 0n) !== (r >= 0n) && r !== 0n) this.lever = true;
          } else if (this.op === '×') {
            r = (a * b) / scale;
            dt += TIMING.mul;
          } else {
            dt += TIMING.div;
            if (b === 0n) {
              this.lever = true;
              r = 0n;
              this.remainder = 0n;
            } else {
              const num = a * scale;
              r = num / b;
              this.remainder = num % b;
            }
          }
          if (r >= LIMIT || r <= -LIMIT) {
            this.lever = true;
            r %= LIMIT;
          }
          this.result = r;
          note += `; the mill works: ${formatFixed(a, d)} ${this.op === '-' ? '−' : this.op} ${formatFixed(b, d)} = ${formatFixed(r, d)}${this.lever ? ' (run-up lever set)' : ''}`;
        }
        break;
      }
      case 'store':
        this.store.set(card.v, card.remainder ? this.remainder : this.result);
        dt = TIMING.transfer;
        note = `${card.remainder ? 'remainder' : 'result'} ${formatFixed(card.remainder ? this.remainder : this.result, d)} → V${card.v}`;
        break;
      case 'print':
        this.printed.push(formatFixed(this.result, d));
        note = `printed ${formatFixed(this.result, d)}`;
        break;
      case 'bell':
        this.bells++;
        note = 'the bell rings';
        break;
      case 'halt':
        this.done = 'halt';
        note = 'halt';
        break;
      case 'jump': {
        const go = !card.conditional || this.lever;
        if (go) next = card.forward ? this.pc + 1 + card.n : this.pc + 1 - card.n - 1;
        note = go ? `the chain moves ${card.forward ? 'forward' : 'back'} ${card.n} card${card.n === 1 ? '' : 's'}` : 'the lever is not set: carry on';
        if (go && (next < 0 || next > this.deck.cards.length)) {
          this.done = 'error';
          this.error = `card ${this.pc + 1} (line ${card.line}) moves the chain off its end`;
        }
        break;
      }
    }
    this.time += dt;
    this.steps++;
    if (this.keepTrace && this.trace.length < 5000) this.trace.push({ pc: this.pc, card, note, time: this.time });
    this.pc = next;
    return !this.done;
  }

  run(limit = 200000): RunResult {
    while (this.step()) {
      if (this.steps >= limit) {
        this.done = 'limit';
        this.error = `stopped after ${limit.toLocaleString('en-GB')} cards: does the deck loop for ever?`;
        break;
      }
    }
    return { store: this.store, printed: this.printed, steps: this.steps, time: this.time, halted: this.done ?? 'end', error: this.error, trace: this.trace, bells: this.bells };
  }
}

export function run(src: string, initial: Record<number, number | string> = {}, limit?: number): RunResult & { deck: Deck } {
  const deck = parseDeck(src);
  if (deck.errors.length) return { deck, store: new Map(), printed: [], steps: 0, time: 0, halted: 'error', error: deck.errors.map((e) => `line ${e.line}: ${e.message}`).join('; '), trace: [], bells: 0 };
  return { deck, ...new Engine(deck, initial).run(limit) };
}

/** A test of a deck: starting values, and what the store or the printer must hold at the end. */
export interface DeckTest {
  set?: Record<string, number | string>;
  expect?: Record<string, number | string>;
  printed?: (number | string)[];
  /** Optional: tolerance in the last decimal places for fixed-point results. */
  tolerance?: number;
}

export function checkDeck(src: string, tests: DeckTest[], limit?: number): { ok: boolean; failures: string[]; runs: (RunResult & { deck: Deck })[] } {
  const failures: string[] = [];
  const runs = tests.map((t, i) => {
    const initial = Object.fromEntries(Object.entries(t.set ?? {}).map(([k, v]) => [Number(k.replace(/^V/i, '')), v]));
    const r = run(src, initial, limit);
    const label = tests.length > 1 ? `Test ${i + 1}${t.set ? ` (${Object.entries(t.set).map(([k, v]) => `${k} = ${v}`).join(', ')})` : ''}: ` : '';
    if (r.halted === 'error' || r.halted === 'limit') failures.push(label + (r.error ?? 'the engine stopped'));
    else {
      const d = r.deck.decimals;
      const tol = BigInt(t.tolerance ?? 0);
      for (const [k, v] of Object.entries(t.expect ?? {})) {
        const col = Number(k.replace(/^V/i, ''));
        const want = toFixed(String(v), d);
        const got = r.store.get(col) ?? 0n;
        const diff = got > want ? got - want : want - got;
        if (diff > tol) failures.push(`${label}V${col} should hold ${formatFixed(want, d)} but holds ${formatFixed(got, d)}`);
      }
      if (t.printed) {
        const want = t.printed.map((v) => formatFixed(toFixed(String(v), d), d));
        if (want.join(',') !== r.printed.join(',')) failures.push(`${label}the printer should show ${want.join(', ') || 'nothing'} but shows ${r.printed.join(', ') || 'nothing'}`);
      }
    }
    return r;
  });
  return { ok: failures.length === 0, failures, runs };
}

/**
 * Group a deck into operations, as Lovelace tabulated them in Note G: one row per working of the mill, with
 * the operation, the columns acted on, and the columns that receive the result.
 */
export interface TableRow {
  n: number;
  op: Op;
  operands: { v: number; zero: boolean }[];
  results: { v: number; remainder: boolean }[];
  lines: number[];
}

export function noteGTable(deck: Deck): TableRow[] {
  const rows: TableRow[] = [];
  let op: Op = '+';
  let cur: TableRow | null = null;
  for (const c of deck.cards) {
    if (c.kind === 'op') op = c.op;
    else if (c.kind === 'load') {
      if (!cur || cur.operands.length >= 2) {
        cur = { n: rows.length + 1, op, operands: [], results: [], lines: [] };
        rows.push(cur);
      }
      cur.operands.push({ v: c.v, zero: c.zero });
      cur.lines.push(c.line);
    } else if (c.kind === 'store' && cur) {
      cur.results.push({ v: c.v, remainder: c.remainder });
      cur.lines.push(c.line);
    }
  }
  return rows;
}

/** Human time: "4 s", "3 min 20 s", "2 h 5 min". */
export function duration(s: number): string {
  if (s < 60) return `${Math.round(s)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
}
