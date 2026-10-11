/**
 * Directions in a grid town: walking a route street by street, the buildings beside each stretch
 * of street, and the route put into German the way a passer-by would say it: "Gehen Sie geradeaus
 * und dann die zweite Straße links. Dann ist es auf der rechten Seite."
 *
 * The town has COLS × ROWS blocks with streets between and around them: vertical streets x = 0 …
 * COLS, horizontal streets y = 0 … ROWS (y grows southwards). The walker starts south of the
 * town on the street x = START_X, facing north.
 */

export const COLS = 4;
export const ROWS = 3;
export const START_X = 2;

export type Heading = 'N' | 'E' | 'S' | 'W';
export type Move = 'S' | 'L' | 'R';
export type Side = 'L' | 'R';

export interface Pos {
  x: number;
  y: number;
  h: Heading;
}

const D: Record<Heading, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const LEFT: Record<Heading, Heading> = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT: Record<Heading, Heading> = { N: 'E', E: 'S', S: 'W', W: 'N' };

/** Where the walker stands before the first step: just south of the town. */
export const START: Pos = { x: START_X, y: ROWS + 1, h: 'N' };

const onGrid = (x: number, y: number) => x >= 0 && x <= COLS && y >= 0 && y <= ROWS;
const isStart = (x: number, y: number) => x === START.x && y === START.y;

export function turn(h: Heading, m: Move): Heading {
  return m === 'L' ? LEFT[h] : m === 'R' ? RIGHT[h] : h;
}

/** Whether a street leaves this point in that direction (the stub to the start counts). */
export function streetFrom(x: number, y: number, h: Heading): boolean {
  const [dx, dy] = D[h];
  const nx = x + dx;
  const ny = y + dy;
  if (isStart(x, y)) return h === 'N';
  return onGrid(nx, ny) || isStart(nx, ny);
}

/** One step: straight on, or turn and walk to the next crossing. Null if there is no street. */
export function step(p: Pos, m: Move): Pos | null {
  const h = turn(p.h, m);
  if (isStart(p.x, p.y) && m !== 'S') return null;
  const [dx, dy] = D[h];
  const x = p.x + dx;
  const y = p.y + dy;
  return onGrid(x, y) ? { x, y, h } : null;
}

/** Every position along a route, starting with START. Throws on an impossible move. */
export function walk(moves: Move[]): Pos[] {
  const out = [START];
  for (const m of moves) {
    const n = step(out[out.length - 1]!, m);
    if (!n) throw new Error(`Cannot go ${m} from ${JSON.stringify(out[out.length - 1])}`);
    out.push(n);
  }
  return out;
}

export interface Block {
  c: number;
  r: number;
}

/** The block beside the street walked from a to b, on the walker's left or right. */
export function blockBeside(a: Pos, b: Pos, side: Side): Block | null {
  let c: number;
  let r: number;
  const h = b.h;
  if (h === 'N' || h === 'S') {
    const top = Math.min(a.y, b.y);
    const west = (h === 'N') === (side === 'L');
    c = west ? a.x - 1 : a.x;
    r = top;
  } else {
    const left = Math.min(a.x, b.x);
    const north = (h === 'E') === (side === 'L');
    c = left;
    r = north ? a.y - 1 : a.y;
  }
  return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { c, r } : null;
}

/** The block across the street from `b` along the stretch a → b (for "gegenüber"). */
export function blockOpposite(a: Pos, b: Pos, side: Side): Block | null {
  return blockBeside(a, b, side === 'L' ? 'R' : 'L');
}

const ORDINAL = ['erste', 'zweite', 'dritte', 'vierte', 'fünfte'];
const CROSSINGS = ['', 'die nächste Kreuzung', 'zwei Kreuzungen', 'drei Kreuzungen', 'vier Kreuzungen'];
const SIDE_WORD: Record<Side, string> = { L: 'links', R: 'rechts' };
const SIDE_ADJ: Record<Side, string> = { L: 'linken', R: 'rechten' };

export interface Describe {
  /** The goal, named: "die Post". Without it the goal is "es". */
  goal?: string;
  /** Where the goal is, with a landmark: "neben der Bank". */
  clue?: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A route in German. `side` is where the goal is along the last stretch; without it the
 * sentence describes the way so far.
 */
export function describe(moves: Move[], side?: Side, opts: Describe = {}): string {
  if (!moves.length) return '';
  const path = walk(moves);
  // Split into legs: a new leg starts with every turn.
  const legs: { turn: Move; from: number; to: number }[] = [];
  moves.forEach((m, i) => {
    if (i === 0 || m !== 'S') legs.push({ turn: m, from: i, to: i + 1 });
    else legs[legs.length - 1]!.to = i + 1;
  });

  const clauses: string[] = [];
  legs.forEach((leg, li) => {
    const next = legs[li + 1];
    if (!next) return;
    // The walker turns at path[leg.to]; count the crossings on this leg with a street on that side.
    const dir = next.turn as Side;
    let n = 0;
    for (let k = leg.from + 1; k <= leg.to; k++) {
      const p = path[k]!;
      if (streetFrom(p.x, p.y, turn(p.h, dir))) n++;
    }
    const at = path[leg.to]!;
    const end = !streetFrom(at.x, at.y, at.h);
    if (li === 0) {
      if (end) clauses.push(`Gehen Sie geradeaus bis zum Ende der Straße und dann ${SIDE_WORD[dir]}`);
      else if (n === 1) clauses.push(`Gehen Sie die erste Straße ${SIDE_WORD[dir]}`);
      else clauses.push(`Gehen Sie geradeaus und dann die ${ORDINAL[n - 1]} Straße ${SIDE_WORD[dir]}`);
    } else if (end) clauses.push(`dann am Ende der Straße ${SIDE_WORD[dir]}`);
    else clauses.push(`dann die ${ORDINAL[n - 1]} Straße ${SIDE_WORD[dir]}`);
  });

  // The last leg: crossings passed after the last turn (from the start, the stub has no buildings).
  const last = legs[legs.length - 1]!;
  const crossed = last.to - last.from - 1;
  if (legs.length === 1) clauses.push(crossed > 0 ? `Gehen Sie geradeaus über ${crossed === 1 ? 'die erste Kreuzung' : CROSSINGS[crossed]}` : 'Gehen Sie geradeaus');
  else if (crossed > 0) clauses.push(`dann geradeaus über ${CROSSINGS[crossed]}`);

  let text = `${clauses.join(', ')}.`;
  if (side) {
    const where = `auf der ${SIDE_ADJ[side]} Seite${opts.clue ? `, ${opts.clue}` : ''}`;
    text += opts.goal ? ` ${cap(opts.goal)} ist dann ${where}.` : ` Dann ist es ${where}.`;
  }
  return text;
}

export interface Route {
  moves: Move[];
  side: Side;
  block: Block;
}

/** Every route with at most one turn whose last stretch has a building on the given side. */
export function simpleRoutes(): Route[] {
  const out: Route[] = [];
  const tryRoute = (moves: Move[]) => {
    let path: Pos[];
    try {
      path = walk(moves);
    } catch {
      return;
    }
    const a = path[path.length - 2]!;
    const b = path[path.length - 1]!;
    for (const side of ['L', 'R'] as Side[]) {
      const block = blockBeside(a, b, side);
      if (block) out.push({ moves, side, block });
    }
  };
  for (let k = 1; k <= ROWS + 1; k++) {
    const straight: Move[] = Array(k).fill('S');
    if (k > 1) tryRoute(straight);
    for (const t of ['L', 'R'] as Move[]) for (let m = 1; m <= 2; m++) tryRoute([...straight, t, ...Array<Move>(m - 1).fill('S')]);
  }
  return out;
}
