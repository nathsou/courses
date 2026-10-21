/**
 * The course's score format: a small, LilyPond-like text that reads well in a diff.
 *
 *   \time 3/4  \key g \major  \tempo 96
 *   \staff treble   d'4 g'2 | b'8 a' g'4 e'4 |
 *   \staff bass     <g b d'>2. | <c e g>2 r4 |
 *
 * - Pitches are absolute: `c` is C3, `c'` is C4 (middle C), `c''` is C5, `c,` is C2. Accidentals follow the
 *   letter: `f#`, `bb` (B flat), `e##`, `abb`, and `n` for a written natural (`fn'`).
 * - Durations follow the pitch (1, 2, 4, 8, 16, 32, with dots) and carry over to the next note when left out.
 * - `r` is a rest, `<c' e' g'>4` a chord, `~` after a note ties it to the next, `(` and `)` after notes open
 *   and close a slur, `|` checks that a bar ends there.
 * - `^"C"` puts text above a note (chord symbols), `_"I"` below it (Roman numerals).
 * - `\staff treble` or `\staff bass` starts a staff; without one there is a single treble staff (or the
 *   clef set by `\clef`). Two staves make a grand staff.
 * - `\partial 4` before the first note makes an upbeat of that length.
 */
import { LETTERS, type Letter, type Pitch } from '$lib/music/pitch';
import { barTicks, ticks, type Denominator, type Duration, type TimeSignature } from '$lib/music/rhythm';
import { fifthsOf, type Mode } from '$lib/music/scale';

export type Clef = 'treble' | 'bass';

export interface ScoreEvent {
  id: number;
  staff: number;
  kind: 'note' | 'rest';
  pitches: Pitch[];
  /** Accidental written explicitly with `n` (a courtesy natural), by pitch index. */
  forceNatural: boolean[];
  duration: Duration;
  /** Onset in ticks from the start of the piece (after any upbeat: the upbeat starts at a negative time). */
  start: number;
  /** Bar number (0 for an upbeat bar). */
  bar: number;
  tie: boolean;
  slurStart: boolean;
  slurEnd: boolean;
  above?: string;
  below?: string;
}

export interface Staff {
  clef: Clef;
  events: ScoreEvent[];
}

export interface Score {
  staves: Staff[];
  fifths: number;
  mode: Mode;
  time: TimeSignature;
  /** Felt beats per minute. */
  tempo: number;
  /** Length of the upbeat in ticks (0 if none). */
  partial: number;
  /** Total length in ticks, including the upbeat. */
  length: number;
}

export class ScoreError extends Error {}

type Token =
  | { t: 'cmd'; v: string; at: number }
  | { t: 'str'; v: string; at: number }
  | { t: 'bar'; at: number }
  | { t: 'note'; v: string; above?: string; below?: string; at: number };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const readString = (): string => {
    const start = i;
    i++; // opening quote
    while (i < src.length && src[i] !== '"') i++;
    if (i >= src.length) throw new ScoreError(`Unclosed string at ${start}`);
    return src.slice(start + 1, i++);
  };
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c) || c === '{' || c === '}') {
      i++;
    } else if (c === '%') {
      while (i < src.length && src[i] !== '\n') i++;
    } else if (c === '\\') {
      const m = /^\\([a-zA-Z]+)/.exec(src.slice(i))!;
      if (!m) throw new ScoreError(`Bad command at ${i}`);
      out.push({ t: 'cmd', v: m[1]!, at: i });
      i += m[0].length;
    } else if (c === '"') {
      const at = i;
      out.push({ t: 'str', v: readString(), at });
    } else if (c === '|') {
      out.push({ t: 'bar', at: i });
      i++;
    } else {
      const at = i;
      let v = '';
      if (c === '<') {
        const end = src.indexOf('>', i);
        if (end < 0) throw new ScoreError(`Unclosed chord at ${i}`);
        v = src.slice(i, end + 1);
        i = end + 1;
      }
      while (i < src.length && !/[\s|^_"\\<{}%]/.test(src[i]!)) v += src[i++];
      const tok: Token = { t: 'note', v, at };
      while (src[i] === '^' || src[i] === '_') {
        const where = src[i]!;
        i++;
        if (src[i] !== '"') throw new ScoreError(`Expected "text" after ${where} at ${i}`);
        const s = readString();
        if (where === '^') tok.above = s;
        else tok.below = s;
      }
      out.push(tok);
    }
  }
  return out;
}

const PITCH = /^([a-g])(##|#|bb|b|n)?([',]*)$/;

function parsePitchToken(s: string, at: number): { pitch: Pitch; natural: boolean } {
  const m = PITCH.exec(s);
  if (!m) throw new ScoreError(`Not a pitch: “${s}” at ${at}`);
  const acc = m[2] ?? '';
  const alter = { '##': 2, '#': 1, bb: -2, b: -1, n: 0, '': 0 }[acc]!;
  let octave = 3;
  for (const ch of m[3]!) octave += ch === "'" ? 1 : -1;
  return { pitch: { letter: m[1]!.toUpperCase() as Letter, alter, octave }, natural: acc === 'n' };
}

const NOTE = /^(r|<[^>]*>|[a-g](?:##|#|bb|b|n)?[',]*)(1|2|4|8|16|32)?(\.*)(~)?([()]*)$/;

/** Parse a score. Throws ScoreError with the position of the first problem. */
export function parseScore(src: string): Score {
  const tokens = tokenize(src);
  const staves: Staff[] = [];
  let fifths = 0;
  let mode: Mode = 'major';
  let time: TimeSignature = { beats: 4, unit: 4 };
  let tempo = 80;
  let partial = 0;
  let clef: Clef = 'treble';
  let id = 0;

  let staff: Staff | undefined;
  let pos = 0;
  let dur: Duration = { value: 4, dots: 0 };
  let inSlur = false;

  const startStaff = (c: Clef) => {
    staff = { clef: c, events: [] };
    staves.push(staff);
    pos = -partial;
    dur = { value: 4, dots: 0 };
    inSlur = false;
  };

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k]!;
    const next = () => {
      const n = tokens[++k];
      if (!n) throw new ScoreError(`Unexpected end after \\${(tok as { v: string }).v}`);
      return n;
    };
    if (tok.t === 'cmd') {
      switch (tok.v) {
        case 'staff':
        case 'clef': {
          const n = next();
          const v = n.t === 'note' || n.t === 'str' ? n.v : '';
          if (v !== 'treble' && v !== 'bass') throw new ScoreError(`Unknown clef “${v}” at ${n.at}`);
          if (tok.v === 'staff' || !staff) startStaff(v);
          else staff.clef = v;
          clef = v;
          break;
        }
        case 'key': {
          const n = next();
          const m = next();
          if (n.t !== 'note' || m.t !== 'cmd' || (m.v !== 'major' && m.v !== 'minor')) throw new ScoreError(`Expected \\key <note> \\major|\\minor at ${tok.at}`);
          const { pitch } = parsePitchToken(n.v, n.at);
          mode = m.v;
          fifths = fifthsOf({ tonic: { letter: pitch.letter, alter: pitch.alter }, mode });
          if (Math.abs(fifths) > 7) throw new ScoreError(`No key signature for that key at ${n.at}`);
          break;
        }
        case 'time': {
          const n = next();
          const m = n.t === 'note' || n.t === 'str' ? /^(\d+)\/(1|2|4|8|16)$/.exec(n.v) : null;
          if (!m) throw new ScoreError(`Expected \\time n/d at ${tok.at}`);
          time = { beats: Number(m[1]), unit: Number(m[2]) as Denominator };
          break;
        }
        case 'tempo': {
          const n = next();
          tempo = Number(n.t === 'note' ? n.v : NaN);
          if (!(tempo > 0)) throw new ScoreError(`Expected \\tempo <beats per minute> at ${tok.at}`);
          break;
        }
        case 'partial': {
          const n = next();
          const m = n.t === 'note' ? /^(1|2|4|8|16)(\.*)$/.exec(n.v) : null;
          if (!m || staves.length) throw new ScoreError(`\\partial <duration> must come before the first staff and note, at ${tok.at}`);
          partial = ticks({ value: Number(m[1]) as Denominator, dots: m[2]!.length });
          break;
        }
        default:
          throw new ScoreError(`Unknown command \\${tok.v} at ${tok.at}`);
      }
      continue;
    }
    if (tok.t === 'str') throw new ScoreError(`Unexpected text "${tok.v}" at ${tok.at}`);
    if (!staff) startStaff(clef);
    const st = staff!;
    const bt = barTicks(time);
    if (tok.t === 'bar') {
      if (((pos % bt) + bt) % bt !== 0) throw new ScoreError(`Bar check failed at ${tok.at}: the bar is ${pos % bt} ticks into a ${bt}-tick bar`);
      continue;
    }
    const m = NOTE.exec(tok.v);
    if (!m) throw new ScoreError(`Cannot read “${tok.v}” at ${tok.at}`);
    if (m[2]) dur = { value: Number(m[2]) as Denominator, dots: m[3]!.length };
    else if (m[3]) dur = { ...dur, dots: m[3].length };
    const head = m[1]!;
    const pitches: Pitch[] = [];
    const naturals: boolean[] = [];
    if (head !== 'r') {
      const parts = head.startsWith('<') ? head.slice(1, -1).trim().split(/\s+/) : [head];
      for (const p of parts) {
        const { pitch, natural } = parsePitchToken(p, tok.at);
        pitches.push(pitch);
        naturals.push(natural);
      }
      const order = pitches.map((p, i) => [p, i] as const).sort((a, b) => 7 * a[0].octave + LETTERS.indexOf(a[0].letter) - (7 * b[0].octave + LETTERS.indexOf(b[0].letter)));
      pitches.splice(0, pitches.length, ...order.map(([p]) => p));
      const nat = order.map(([, i]) => naturals[i]!);
      naturals.splice(0, naturals.length, ...nat);
    }
    const length = ticks(dur);
    const barIndex = pos < 0 ? 0 : Math.floor(pos / bt) + 1;
    const barEnd = (Math.floor(pos / bt) + 1) * bt;
    if (pos + length > barEnd) throw new ScoreError(`“${tok.v}” at ${tok.at} crosses a bar line: split it and tie the halves with ~`);
    const slurs = m[5] ?? '';
    const ev: ScoreEvent = {
      id: id++,
      staff: staves.length - 1,
      kind: head === 'r' ? 'rest' : 'note',
      pitches,
      forceNatural: naturals,
      duration: { ...dur },
      start: pos,
      bar: barIndex,
      tie: !!m[4],
      slurStart: slurs.includes('(') && !inSlur,
      slurEnd: slurs.includes(')') && inSlur,
      above: tok.above,
      below: tok.below,
    };
    if (ev.slurStart) inSlur = true;
    if (ev.slurEnd) inSlur = false;
    st.events.push(ev);
    pos += length;
  }

  if (!staves.length) throw new ScoreError('Empty score');
  const lengths = staves.map((s) => (s.events.length ? s.events.at(-1)!.start + ticks(s.events.at(-1)!.duration) : -partial));
  const length = Math.max(...lengths) + partial;
  if (new Set(lengths).size > 1) throw new ScoreError(`Staves have different lengths: ${lengths.map((l) => l + partial).join(', ')} ticks`);
  return { staves, fifths, mode, time, tempo, partial, length };
}

/** Seconds per tick at the score's tempo. */
export function secondsPerTick(score: Score): number {
  const compound = score.time.unit >= 8 && score.time.beats % 3 === 0 && score.time.beats > 3;
  const beat = (compound ? 3 : 1) * ((4 * 480) / score.time.unit);
  return 60 / score.tempo / beat;
}
