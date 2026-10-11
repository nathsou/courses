/**
 * Telling the time in German.
 *
 * Formal (timetables, the radio, appointments): the 24-hour clock read out, 14:30 → "vierzehn
 * Uhr dreißig". Informal (everyday speech): the 12-hour clock with nach, vor, Viertel and halb,
 * where halb looks forward to the next hour: 2:30 → "halb drei". Where two forms are common
 * (zwanzig nach drei / zehn vor halb vier) the commoner standard form is `main` and the others
 * are listed in `alt`, with regional ones (viertel vier, drei viertel vier) marked as such.
 */
import { numberWord } from './numbers';

export interface Alternative {
  de: string;
  /** English: where or how the form is used. */
  note?: string;
}

export interface Reading {
  main: string;
  alt: Alternative[];
}

const REGIONAL = 'regional: eastern and southern Germany, Austria';

function check(h: number, m: number): void {
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) throw new RangeError(`Not a time: ${h}:${m}`);
}

/** "ein Uhr" but "eins" elsewhere. */
function hourBeforeUhr(h: number): string {
  return h === 1 ? 'ein' : numberWord(h);
}

/** The 24-hour reading: 14:30 → "vierzehn Uhr dreißig", 1:05 → "ein Uhr fünf", 0:00 → "null Uhr". */
export function formalTime(h: number, m: number): string {
  check(h, m);
  const hour = `${hourBeforeUhr(h)} Uhr`;
  return m ? `${hour} ${numberWord(m)}` : hour;
}

/** The hour on a 12-hour clock face: 0 and 12 → 12, 14 → 2. */
export function hour12(h: number): number {
  return h % 12 || 12;
}

/** Minutes as words in "… nach drei": 1 is "eine Minute". */
const mins = (k: number) => (k === 1 ? 'eine Minute' : numberWord(k));

/** The everyday 12-hour reading, with the common alternatives. */
export function informalTime(h: number, m: number): Reading {
  check(h, m);
  const H = numberWord(hour12(h));
  const N = numberWord(hour12(h + 1));
  const r = (main: string, ...alt: (string | Alternative)[]): Reading => ({ main, alt: alt.map((a) => (typeof a === 'string' ? { de: a } : a)) });
  switch (m) {
    case 0: {
      const alt: Alternative[] = [{ de: H }];
      if (h === 0) alt.push({ de: 'Mitternacht' });
      if (h === 12) alt.push({ de: 'Mittag', note: 'zwölf Uhr mittags' });
      return { main: `${hourBeforeUhr(hour12(h))} Uhr`, alt };
    }
    case 5:
      return r(`fünf nach ${H}`);
    case 10:
      return r(`zehn nach ${H}`);
    case 15:
      return r(`Viertel nach ${H}`, { de: `viertel ${N}`, note: REGIONAL });
    case 20:
      return r(`zwanzig nach ${H}`, `zehn vor halb ${N}`);
    case 25:
      return r(`fünf vor halb ${N}`, `fünfundzwanzig nach ${H}`);
    case 30:
      return r(`halb ${N}`);
    case 35:
      return r(`fünf nach halb ${N}`, `fünfundzwanzig vor ${N}`);
    case 40:
      return r(`zwanzig vor ${N}`, `zehn nach halb ${N}`);
    case 45:
      return r(`Viertel vor ${N}`, { de: `drei viertel ${N}`, note: REGIONAL });
    case 50:
      return r(`zehn vor ${N}`);
    case 55:
      return r(`fünf vor ${N}`);
  }
  if (m < 5) return r(`kurz nach ${H}`, `${mins(m)} nach ${H}`);
  if (m < 20) return r(`${mins(m)} nach ${H}`);
  if (m < 25) return r(`${mins(30 - m)} vor halb ${N}`, `${mins(m)} nach ${H}`);
  if (m < 30) return r(`kurz vor halb ${N}`, `${mins(30 - m)} vor halb ${N}`);
  if (m < 35) return r(`kurz nach halb ${N}`, `${mins(m - 30)} nach halb ${N}`);
  if (m < 40) return r(`${mins(m - 30)} nach halb ${N}`, `${mins(60 - m)} vor ${N}`);
  if (m < 45) return r(`${mins(60 - m)} vor ${N}`, `${mins(m - 30)} nach halb ${N}`);
  if (m < 55) return r(`${mins(60 - m)} vor ${N}`);
  return r(`kurz vor ${N}`, `${mins(60 - m)} vor ${N}`);
}

/** The part of the day an informal time needs to be unambiguous: "halb drei nachmittags". */
export function dayPart(h: number): string {
  if (h < 5) return 'nachts';
  if (h < 10) return 'morgens';
  if (h < 12) return 'vormittags';
  if (h < 14) return 'mittags';
  if (h < 18) return 'nachmittags';
  if (h < 22) return 'abends';
  return 'nachts';
}

/** 14, 5 → "14:05". */
export function digital(h: number, m: number): string {
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Whether a clock set to h:m shows the target; informal times only fix the 12-hour face. */
export function sameTime(target: { h: number; m: number }, h: number, m: number, twelveHour: boolean): boolean {
  if (target.m !== m) return false;
  return twelveHour ? target.h % 12 === h % 12 : target.h === h;
}

/** A random time on a five-minute step, for listening drills. */
export function randomTime(r: () => number): { h: number; m: number } {
  return { h: Math.floor(r() * 24), m: Math.floor(r() * 12) * 5 };
}
