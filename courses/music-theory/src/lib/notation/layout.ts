/**
 * Score layout: turns a parsed score into drawing primitives in staff spaces (the distance between two
 * staff lines). Pure: no DOM, so it is tested directly. The Score component scales and draws the result.
 *
 * Scope (docs/PLAN.md §8): one staff or a grand staff, one voice per staff (chords allowed), clefs, key
 * and time signatures, accidentals, dots, ties, slurs, beams within a beat, flags, rests, ledger lines,
 * text above (chord symbols) and below (Roman numerals), systems that break and justify to a width.
 */
import { diatonic, letterIndex, type Letter, type Pitch } from '$lib/music/pitch';
import { barTicks, beatTicks, ticks } from '$lib/music/rhythm';
import { G, ACCIDENTAL_GLYPH, FLAG_DOWN, FLAG_UP, REST_GLYPH, M } from './glyphs';
import type { Clef, Score, ScoreEvent } from './parse';

export type Prim =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; cls?: string; ev?: number }
  | { k: 'glyph'; x: number; y: number; ch: string; cls?: string; ev?: number; sy?: number }
  | { k: 'poly'; points: [number, number][]; cls?: string; ev?: number }
  | { k: 'path'; d: string; cls?: string; ev?: number }
  | { k: 'text'; x: number; y: number; s: string; anchor: 'start' | 'middle' | 'end'; cls: string; ev?: number }
  | { k: 'hit'; x: number; y: number; w: number; h: number; ev: number };

export interface EventBox {
  /** Notehead column x, the top line of the event's staff, and its system index. */
  x: number;
  staffTop: number;
  system: number;
}

export interface Layout {
  width: number;
  height: number;
  prims: Prim[];
  events: Map<number, EventBox>;
  /** One entry per system: its x range and the tick range it covers (for a playback cursor). */
  systems: { top: number; bottom: number; startTick: number; endTick: number; columns: { tick: number; x: number }[] }[];
}

export interface LayoutOptions {
  /** Available width in staff spaces. */
  width: number;
  /** Show bar numbers at the start of each system after the first. */
  barNumbers?: boolean;
}

const MIDDLE: Record<Clef, number> = { treble: 34, bass: 22 }; // B4, D3
const SHARP_STEPS = [38, 35, 39, 36, 33, 37, 34]; // treble: F5 C5 G5 D5 A4 E5 B4
const FLAT_STEPS = [34, 37, 33, 36, 32, 35, 31]; // treble: B4 E5 A4 D5 G4 C5 F4
const SHARP_LETTERS: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

const HEAD_W = M.noteheadBlack;
const STEM_W = M.stem;
const STEM_LEN = 3.5;
const BEAM_T = 0.5;
const BEAM_GAP = 0.25;
const STAFF_GAP = 7; // between the bottom line of the treble staff and the top line of the bass staff
const TEXT_SIZE = 1.75;

/** y of a diatonic step relative to the staff's top line. */
const stepY = (clef: Clef, step: number) => 2 + (MIDDLE[clef] - step) * 0.5;

function keySteps(clef: Clef, fifths: number): number[] {
  const steps = fifths > 0 ? SHARP_STEPS.slice(0, fifths) : FLAT_STEPS.slice(0, -fifths);
  return steps.map((s) => (clef === 'bass' ? s - 14 : s));
}

function keyAlters(fifths: number): Record<Letter, number> {
  const out = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<Letter, number>;
  if (fifths > 0) for (const l of SHARP_LETTERS.slice(0, fifths)) out[l] = 1;
  else for (const l of [...SHARP_LETTERS].reverse().slice(0, -fifths)) out[l] = -1;
  return out;
}

const textWidth = (s: string, size = TEXT_SIZE) => s.length * size * 0.58;

function spaceFor(delta: number): number {
  return Math.max(1.9, 3.6 + 1.3 * Math.log2(delta / 480));
}

interface Column {
  tick: number;
  /** Space before the noteheads (accidentals). */
  pre: number;
  /** Natural width from this column's noteheads to the next column's. */
  space: number;
  /** Extra room after the heads (dots, chord-second heads, text). */
  minSpace: number;
  x: number;
}

interface Bar {
  index: number;
  start: number;
  end: number;
  columns: Column[];
  natural: number;
}

interface Head {
  step: number;
  /** Accidental to draw, if any. */
  acc?: number;
  /** Shifted to the other side of the stem (chord seconds). */
  shifted: boolean;
}

interface Placed {
  ev: ScoreEvent;
  heads: Head[];
  up: boolean;
  beamed: boolean;
}

export function layoutScore(score: Score, opts: LayoutOptions): Layout {
  const prims: Prim[] = [];
  const events = new Map<number, EventBox>();
  const bt = barTicks(score.time);
  const grand = score.staves.length > 1;
  const all = score.staves.flatMap((s) => s.events);

  // ── Bars and columns ──
  const bars: Bar[] = [];
  const firstBar = score.partial ? 0 : 1;
  const lastBar = Math.max(firstBar, ...all.map((e) => e.bar));
  for (let b = firstBar; b <= lastBar; b++) {
    const start = b === 0 ? -score.partial : (b - 1) * bt;
    const end = b === 0 ? 0 : b * bt;
    const evs = all.filter((e) => e.bar === b);
    const ticksIn = [...new Set(evs.map((e) => e.start))].sort((a, c) => a - c);
    const columns: Column[] = ticksIn.map((tick, i) => {
      const next = ticksIn[i + 1] ?? end;
      const at = evs.filter((e) => e.start === tick);
      const text = Math.max(0, ...at.map((e) => Math.max(textWidth(e.above ?? ''), textWidth(e.below ?? ''))));
      const dots = at.some((e) => e.duration.dots > 0) ? 0.9 : 0;
      return { tick, pre: 0, space: spaceFor(next - tick), minSpace: Math.max(HEAD_W + 0.9 + dots, text + 0.6), x: 0 };
    });
    bars.push({ index: b, start, end, columns, natural: 0 });
  }

  // ── Accidentals (per staff, per bar, from the key signature) and stems ──
  const placed = new Map<number, Placed>();
  for (const staff of score.staves) {
    let state: Record<string, number> = {};
    let currentBar = -1;
    let tiedFrom: Pitch[] = [];
    for (const ev of staff.events) {
      if (ev.bar !== currentBar) {
        currentBar = ev.bar;
        state = {};
      }
      const sig = keyAlters(score.fifths);
      const heads: Head[] = ev.pitches.map((p, i) => {
        const key = `${p.letter}${p.octave}`;
        const current = state[key] ?? sig[p.letter];
        const tiedInto = tiedFrom.some((q) => q.letter === p.letter && q.octave === p.octave && q.alter === p.alter);
        let acc: number | undefined;
        if (!tiedInto && (p.alter !== current || ev.forceNatural[i])) acc = p.alter;
        state[key] = p.alter;
        return { step: diatonic(p), acc, shifted: false };
      });
      tiedFrom = ev.tie ? ev.pitches : [];
      const mid = MIDDLE[staff.clef];
      const hi = Math.max(...heads.map((h) => h.step), mid);
      const lo = Math.min(...heads.map((h) => h.step), mid);
      const up = heads.length ? hi - mid < mid - lo : true;
      placed.set(ev.id, { ev, heads, up, beamed: false });
      // Columns with an accidental need room in front.
      const col = bars.find((b) => b.index === ev.bar)!.columns.find((c) => c.tick === ev.start)!;
      const nAcc = heads.filter((h) => h.acc !== undefined).length;
      if (nAcc) col.pre = Math.max(col.pre, 1.3 + (nAcc > 1 ? 0.9 : 0));
      // Seconds in a chord put a head on the other side of the stem.
      shiftSeconds(heads, up);
      if (heads.some((h) => h.shifted)) col.minSpace = Math.max(col.minSpace, 2 * HEAD_W + 0.9);
    }
  }

  // ── Beams: consecutive quavers or shorter within one beat ──
  const beamGroups: Placed[][] = [];
  const beat = beatTicks(score.time);
  for (const staff of score.staves) {
    let group: Placed[] = [];
    const flush = () => {
      if (group.length > 1) beamGroups.push(group);
      group = [];
    };
    for (const ev of staff.events) {
      const p = placed.get(ev.id)!;
      const beamable = ev.kind === 'note' && ev.duration.value >= 8;
      const beatOf = (e: ScoreEvent) => Math.floor((e.start - (e.bar === 0 ? -score.partial : (e.bar - 1) * bt)) / beat) + 1000 * e.bar;
      if (!beamable || (group.length && beatOf(group[0]!.ev) !== beatOf(ev))) flush();
      if (beamable) group.push(p);
    }
    flush();
  }
  for (const g of beamGroups) {
    const clef = score.staves[g[0]!.ev.staff]!.clef;
    const mid = MIDDLE[clef];
    const sum = g.reduce((a, p) => a + p.heads.reduce((s, h) => s + h.step - mid, 0) / p.heads.length, 0);
    const up = sum < 0;
    for (const p of g) {
      p.up = up;
      p.beamed = true;
      for (const h of p.heads) h.shifted = false;
      shiftSeconds(p.heads, up);
    }
  }

  // ── Bar widths ──
  for (const bar of bars) {
    let w = 1.2;
    for (const c of bar.columns) w += c.pre + Math.max(c.space, c.minSpace);
    bar.natural = w + 0.4;
  }

  // ── Systems ──
  const keyW = Math.abs(score.fifths) * 1.05;
  const timeW = 2.4 * Math.max(String(score.time.beats).length, String(score.time.unit).length) / 1.4 + 0.6;
  const left = grand ? 1.8 : 0.3;
  const headerW = (first: boolean) => left + 0.6 + 2.9 + (keyW ? keyW + 0.5 : 0) + (first ? timeW : 0) + 0.6;
  const width = Math.max(opts.width, 24);
  const lines: Bar[][] = [];
  let line: Bar[] = [];
  let used = headerW(true);
  for (const bar of bars) {
    if (line.length && used + bar.natural > width) {
      lines.push(line);
      line = [];
      used = headerW(false);
    }
    line.push(bar);
    used += bar.natural;
  }
  if (line.length) lines.push(line);

  // ── Vertical extents per staff (in steps), to space staves and systems ──
  const above = (si: number) => Math.max(4, ...score.staves[si]!.events.flatMap((e) => placed.get(e.id)!.heads.map((h) => (MIDDLE[score.staves[si]!.clef] - h.step) * -0.5 + 2 + (placed.get(e.id)!.up ? STEM_LEN : 0.6))));
  const below = (si: number) => Math.max(4, ...score.staves[si]!.events.flatMap((e) => placed.get(e.id)!.heads.map((h) => (MIDDLE[score.staves[si]!.clef] - h.step) * 0.5 + 2 + (placed.get(e.id)!.up ? 0.6 : STEM_LEN))));
  const hasAbove = all.some((e) => e.above);
  const hasBelow = all.some((e) => e.below);
  const topPad = Math.max(above(0) - 4 + 1.5, 2.5) + (hasAbove ? 2.6 : 0);
  const gap = grand ? Math.max(STAFF_GAP, below(0) - 4 + above(1) - 4 + 1.5) : 0;
  const bottomPad = Math.max(below(score.staves.length - 1) - 4 + 1.5, 2.5) + (hasBelow ? 2.8 : 0);
  const systemH = topPad + 4 + (grand ? gap + 4 : 0) + bottomPad;

  const systems: Layout['systems'] = [];
  const staffTops = (sys: number) => {
    const top = sys * systemH + topPad;
    return grand ? [top, top + 4 + gap] : [top];
  };

  lines.forEach((bs, si) => {
    const tops = staffTops(si);
    const first = si === 0;
    const hw = headerW(first);
    const natural = bs.reduce((a, b) => a + b.natural, 0);
    const avail = width - hw;
    const last = si === lines.length - 1;
    const stretch = last && natural < avail * 0.7 ? 1 : avail / natural;
    const lineEnd = hw + natural * stretch;
    const sysTop = tops[0]!;
    const sysBottom = tops.at(-1)! + 4;

    // Staff lines, brace, clefs, key and time signatures.
    for (const [i, top] of tops.entries()) {
      const clef = score.staves[i]!.clef;
      for (let l = 0; l < 5; l++) prims.push({ k: 'line', x1: left, y1: top + l, x2: lineEnd, y2: top + l, w: M.staffLine, cls: 'staff' });
      prims.push({ k: 'glyph', x: left + 0.6, y: top + (clef === 'treble' ? 3 : 1), ch: clef === 'treble' ? G.gClef : G.fClef, cls: 'clef' });
      let x = left + 0.6 + 2.9;
      for (const s of keySteps(clef, score.fifths)) {
        prims.push({ k: 'glyph', x, y: top + stepY(clef, s), ch: score.fifths > 0 ? G.sharp : G.flat, cls: 'keysig' });
        x += 1.05;
      }
      if (keyW) x += 0.5;
      if (first) {
        const digits = (n: number) => [...String(n)].map((d) => String.fromCodePoint(0xe080 + Number(d))).join('');
        const tw = timeW - 0.6;
        prims.push({ k: 'glyph', x: x + (tw - String(score.time.beats).length * 1.8) / 2, y: top + 1, ch: digits(score.time.beats), cls: 'timesig' });
        prims.push({ k: 'glyph', x: x + (tw - String(score.time.unit).length * 1.8) / 2, y: top + 3, ch: digits(score.time.unit), cls: 'timesig' });
      }
    }
    if (grand) {
      prims.push({ k: 'glyph', x: 0.2, y: sysBottom, ch: G.brace, cls: 'brace', sy: (sysBottom - sysTop) / 4 });
      prims.push({ k: 'line', x1: left, y1: sysTop, x2: left, y2: sysBottom, w: M.thinBarline, cls: 'bar' });
    }
    if (opts.barNumbers && !first && bs[0]) prims.push({ k: 'text', x: left, y: sysTop - 1.6, s: String(bs[0].index), anchor: 'start', cls: 'barnum' });

    // Columns and bar lines.
    const sysColumns: { tick: number; x: number }[] = [];
    let x = hw;
    for (const [bi, bar] of bs.entries()) {
      x += 1.2 * stretch;
      for (const c of bar.columns) {
        x += c.pre;
        c.x = x;
        sysColumns.push({ tick: c.tick, x });
        x += Math.max(c.space, c.minSpace) * stretch;
      }
      x += 0.4 * stretch;
      const finalBar = si === lines.length - 1 && bi === bs.length - 1;
      if (finalBar) {
        prims.push({ k: 'line', x1: x - 1.0, y1: sysTop, x2: x - 1.0, y2: sysBottom, w: M.thinBarline, cls: 'bar' });
        prims.push({ k: 'line', x1: x - 0.25, y1: sysTop, x2: x - 0.25, y2: sysBottom, w: M.thickBarline, cls: 'bar' });
      } else prims.push({ k: 'line', x1: x, y1: sysTop, x2: x, y2: sysBottom, w: M.thinBarline, cls: 'bar' });
    }
    systems.push({
      top: sysTop - topPad,
      bottom: sysBottom + bottomPad,
      startTick: bs[0]!.start,
      endTick: bs.at(-1)!.end,
      columns: sysColumns,
    });

    // Events.
    for (const bar of bs) {
      for (const [stIndex, staff] of score.staves.entries()) {
        const top = tops[stIndex]!;
        for (const ev of staff.events.filter((e) => e.bar === bar.index)) {
          const col = bar.columns.find((c) => c.tick === ev.start)!;
          events.set(ev.id, { x: col.x, staffTop: top, system: si });
          const p = placed.get(ev.id)!;
          if (ev.kind === 'rest') drawRest(prims, ev, col.x, top, bar, bt, stretch, hw);
          else drawNote(prims, p, staff.clef, col.x, top);
          if (ev.above) prims.push({ k: 'text', x: col.x, y: sysTop - Math.max(1.2, above(0) - 4 + 0.6) - 0.6, s: ev.above, anchor: 'start', cls: 'chordsym', ev: ev.id });
          if (ev.below) prims.push({ k: 'text', x: col.x + HEAD_W / 2, y: sysBottom + Math.max(1.2, below(score.staves.length - 1) - 4 + 0.6) + 2, s: ev.below, anchor: 'middle', cls: 'roman', ev: ev.id });
          prims.push({ k: 'hit', x: col.x - 0.6, y: top - 2, w: HEAD_W + 1.2, h: 8, ev: ev.id });
        }
      }
    }
  });

  // Beams (after positions are known).
  for (const g of beamGroups) drawBeam(prims, g, score, events);

  // Ties and slurs.
  for (const staff of score.staves) {
    const evs = staff.events;
    let slurFrom: ScoreEvent | undefined;
    evs.forEach((ev, i) => {
      const box = events.get(ev.id)!;
      const p = placed.get(ev.id)!;
      if (ev.tie && evs[i + 1]) {
        const nb = events.get(evs[i + 1]!.id)!;
        for (const h of p.heads) {
          const y = box.staffTop + stepY(staff.clef, h.step);
          const x1 = box.x + HEAD_W + 0.15;
          const x2 = nb.system === box.system ? nb.x - 0.15 : x1 + 2.5;
          const dir = p.up ? 1 : -1;
          prims.push({ k: 'path', d: curve(x1, y + 0.45 * dir, x2, y + 0.45 * dir, dir * Math.min(1.1, 0.25 + (x2 - x1) * 0.08)), cls: 'tie', ev: ev.id });
          if (nb.system !== box.system) {
            const xs = nb.x - 2.5;
            prims.push({ k: 'path', d: curve(xs, nb.staffTop + stepY(staff.clef, h.step) + 0.45 * dir, nb.x - 0.15, nb.staffTop + stepY(staff.clef, h.step) + 0.45 * dir, dir * 0.45), cls: 'tie' });
          }
        }
      }
      if (ev.slurStart) slurFrom = ev;
      if (ev.slurEnd && slurFrom) {
        const a = events.get(slurFrom.id)!;
        const pa = placed.get(slurFrom.id)!;
        const pb = placed.get(ev.id)!;
        const dir = pa.up ? 1 : -1;
        const edge = (pp: Placed, bx: EventBox) => {
          const steps = pp.heads.map((h) => h.step);
          const step = dir > 0 ? Math.min(...steps) : Math.max(...steps);
          return bx.staffTop + stepY(staff.clef, step) + dir * 1.0;
        };
        if (a.system === box.system) {
          const x1 = a.x + HEAD_W / 2;
          const x2 = box.x + HEAD_W / 2;
          prims.push({ k: 'path', d: curve(x1, edge(pa, a), x2, edge(pb, box), dir * Math.min(2, 0.6 + (x2 - x1) * 0.06)), cls: 'slur' });
        }
        slurFrom = undefined;
      }
    });
  }

  return { width, height: lines.length * systemH, prims, events, systems };
}

function shiftSeconds(heads: Head[], up: boolean): void {
  const order = up ? heads : [...heads].reverse();
  let prev: Head | undefined;
  for (const h of order) {
    if (prev && Math.abs(h.step - prev.step) === 1 && !prev.shifted) h.shifted = true;
    prev = h;
  }
}

/** A filled tie or slur: two cubic curves with a little thickness in the middle. */
function curve(x1: number, y1: number, x2: number, y2: number, bow: number): string {
  const dx = (x2 - x1) / 4;
  const t = Math.sign(bow) * 0.18;
  const f = (n: number) => n.toFixed(3);
  return `M${f(x1)} ${f(y1)} C${f(x1 + dx)} ${f(y1 + bow)} ${f(x2 - dx)} ${f(y2 + bow)} ${f(x2)} ${f(y2)} C${f(x2 - dx)} ${f(y2 + bow + t)} ${f(x1 + dx)} ${f(y1 + bow + t)} ${f(x1)} ${f(y1)}Z`;
}

function drawNote(prims: Prim[], p: Placed, clef: Clef, x: number, top: number): void {
  const { ev, heads, up } = p;
  const id = ev.id;
  const value = ev.duration.value;
  const head = value === 1 ? G.noteheadWhole : value === 2 ? G.noteheadHalf : G.noteheadBlack;
  const headW = value === 1 ? M.noteheadWhole : HEAD_W;
  const ys = heads.map((h) => top + stepY(clef, h.step));
  // Ledger lines.
  const ledgers = new Set<number>();
  for (const h of heads) {
    const mid = MIDDLE[clef];
    for (let s = mid + 6; s <= h.step; s += 2) ledgers.add(s);
    for (let s = mid - 6; s >= h.step; s -= 2) ledgers.add(s);
  }
  const shiftedSide = heads.some((h) => h.shifted);
  for (const s of ledgers) {
    const y = top + stepY(clef, s);
    const extra = shiftedSide ? headW - STEM_W : 0;
    const x1 = up ? x - 0.4 : x - 0.4 - extra;
    const x2 = up ? x + headW + 0.4 + extra : x + headW + 0.4;
    prims.push({ k: 'line', x1, y1: y, x2, y2: y, w: M.legerLine, cls: 'ledger', ev: id });
  }
  // Heads, accidentals and dots.
  let accColumn = 0;
  const accs = heads.map((h, i) => ({ h, y: ys[i]! })).filter(({ h }) => h.acc !== undefined).reverse();
  for (const { h, y } of accs) {
    const ch = ACCIDENTAL_GLYPH[h.acc!]!;
    const off = h.shifted && !up ? headW - STEM_W : 0;
    prims.push({ k: 'glyph', x: x - 1.25 - off - accColumn * 0.95, y, ch, cls: 'acc', ev: id });
    accColumn = accColumn ? 0 : accs.length > 1 ? 1 : 0;
  }
  heads.forEach((h, i) => {
    const dx = h.shifted ? (up ? headW - STEM_W : -(headW - STEM_W)) : 0;
    prims.push({ k: 'glyph', x: x + dx, y: ys[i]!, ch: head, cls: 'head', ev: id });
    for (let d = 0; d < ev.duration.dots; d++) {
      const onLine = (MIDDLE[clef] - h.step) % 2 === 0;
      const dotX = x + headW + (shiftedSide && up ? headW - STEM_W : 0) + 0.45 + d * 0.55;
      prims.push({ k: 'glyph', x: dotX, y: ys[i]! - (onLine ? 0.5 : 0), ch: G.dot, cls: 'dot', ev: id });
    }
  });
  if (value === 1) return;
  // Stem (beamed stems are drawn with the beam).
  if (p.beamed) return;
  const yTop = Math.min(...ys);
  const yBot = Math.max(...ys);
  const mid = top + 2;
  const sx = up ? x + headW - STEM_W / 2 : x + STEM_W / 2;
  const y1 = up ? yBot - 0.17 : yTop + 0.17;
  let y2 = up ? yTop - STEM_LEN : yBot + STEM_LEN;
  if (up && y2 > mid && yTop > top + 4) y2 = mid;
  if (!up && y2 < mid && yBot < top) y2 = mid;
  if (value >= 16) y2 += up ? -0.5 * (Math.log2(value) - 3) : 0.5 * (Math.log2(value) - 3);
  prims.push({ k: 'line', x1: sx, y1, x2: sx, y2, w: STEM_W, cls: 'stem', ev: id });
  if (value >= 8) prims.push({ k: 'glyph', x: sx - STEM_W / 2, y: y2, ch: (up ? FLAG_UP : FLAG_DOWN)[value]!, cls: 'flag', ev: id });
}

function drawRest(prims: Prim[], ev: ScoreEvent, x: number, top: number, bar: { start: number; end: number; columns: Column[] }, bt: number, stretch: number, _hw: number): void {
  const fullBar = ticks(ev.duration) === bt && bar.columns.length === 1;
  const value = fullBar ? 1 : ev.duration.value;
  const ch = REST_GLYPH[value]!;
  const y = value === 1 ? top + 1 : value === 2 ? top + 2 : top + 2;
  // A whole-bar rest is centred in the bar.
  const rx = fullBar ? x + Math.max(0, (bar.columns[0]!.space * stretch - M.restWhole) / 2) - 0.6 : x;
  prims.push({ k: 'glyph', x: rx, y, ch, cls: 'rest', ev: ev.id });
  for (let d = 0; d < ev.duration.dots && !fullBar; d++) prims.push({ k: 'glyph', x: rx + 1.6 + d * 0.55, y: top + 1.5, ch: G.dot, cls: 'dot', ev: ev.id });
}

function drawBeam(prims: Prim[], g: Placed[], score: Score, events: Map<number, EventBox>): void {
  const clef = score.staves[g[0]!.ev.staff]!.clef;
  const up = g[0]!.up;
  const pts = g.map((p) => {
    const box = events.get(p.ev.id)!;
    const ys = p.heads.map((h) => box.staffTop + stepY(clef, h.step));
    const x = up ? box.x + HEAD_W - STEM_W / 2 : box.x + STEM_W / 2;
    return { p, x, near: up ? Math.min(...ys) : Math.max(...ys), far: up ? Math.max(...ys) : Math.min(...ys), system: box.system, top: box.staffTop };
  });
  // Keep a group on one system (a group never spans a line break, since it lies within one beat).
  const first = pts[0]!;
  const last = pts.at(-1)!;
  const dir = up ? -1 : 1;
  let slope = last.x === first.x ? 0 : (last.near - first.near) / (last.x - first.x);
  slope = Math.max(-0.25, Math.min(0.25, slope));
  const maxLevels = Math.max(...g.map((p) => Math.log2(p.ev.duration.value) - 2));
  const minLen = STEM_LEN - 0.5 + (maxLevels - 1) * (BEAM_T + BEAM_GAP) * 0.5;
  // Beam line y(x) = y0 + slope (x − first.x); move it away from the heads until every stem is long enough.
  let y0 = first.near + dir * STEM_LEN;
  for (const q of pts) {
    const need = q.near + dir * minLen - slope * (q.x - first.x);
    y0 = up ? Math.min(y0, need) : Math.max(y0, need);
  }
  // Very low (or high) groups: reach at least the middle line.
  const mid = first.top + 2;
  if (up && y0 > mid && Math.min(...pts.map((q) => q.near)) > first.top + 4) y0 = mid;
  if (!up && y0 < mid && Math.max(...pts.map((q) => q.near)) < first.top) y0 = mid;
  const yAt = (x: number) => y0 + slope * (x - first.x);
  for (const q of pts) prims.push({ k: 'line', x1: q.x, y1: q.far - dir * 0.17, x2: q.x, y2: yAt(q.x), w: STEM_W, cls: 'stem', ev: q.p.ev.id });
  const level = (n: number) => -dir * n * (BEAM_T + BEAM_GAP);
  const beam = (xa: number, xb: number, n: number) => {
    const ya = yAt(xa) + level(n);
    const yb = yAt(xb) + level(n);
    const t = up ? BEAM_T : -BEAM_T;
    prims.push({ k: 'poly', points: [[xa - STEM_W / 2, ya], [xb + STEM_W / 2, yb], [xb + STEM_W / 2, yb + t], [xa - STEM_W / 2, ya + t]], cls: 'beam' });
  };
  beam(first.x, last.x, 0);
  // Secondary beams for semiquavers, with a stub for a lone short note.
  for (let n = 1; n < maxLevels; n++) {
    const need = (q: (typeof pts)[number]) => Math.log2(q.p.ev.duration.value) - 2 > n;
    let i = 0;
    while (i < pts.length) {
      if (!need(pts[i]!)) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < pts.length && need(pts[j + 1]!)) j++;
      if (j > i) beam(pts[i]!.x, pts[j]!.x, n);
      else {
        const stub = i === pts.length - 1 ? -1.1 : 1.1;
        const xa = Math.min(pts[i]!.x, pts[i]!.x + stub);
        beam(xa, xa + 1.1, n);
      }
      i = j + 1;
    }
  }
}

export { letterIndex };
