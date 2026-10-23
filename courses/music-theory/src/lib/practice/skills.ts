/**
 * The practice room's skills: each makes short cards (one question) from a key and a random source.
 * Pure: the cards are data, rendered by the practice room. A skill is unlocked once the reader has opened
 * the chapter that teaches it. docs/PLAN.md §5.
 */
import { chordSymbol, chordTones, parseChordSymbol, type ChordQuality, QUALITIES } from '$lib/music/chord';
import { intervalName, parseInterval, transpose } from '$lib/music/interval';
import { midi, mod, pitchClass, spell, type Pitch } from '$lib/music/pitch';
import { fifthsOf, keyFromFifths, keyScale, scale, type Key } from '$lib/music/scale';

/** A card: what to show or play, and what counts as the answer. */
export type Card =
  | { type: 'read'; prompt: string; staff: 'treble' | 'bass'; note: Pitch }
  | { type: 'play'; prompt: string; steps: { pcs?: number[]; exact?: number[]; bass?: number; label: string }[]; fifths: number }
  | { type: 'choose'; prompt: string; score?: string; hear?: number[][]; options: string[]; answer: string };

export interface Skill {
  id: string;
  title: string;
  /** Chapter that teaches it (unlocks it). */
  chapter: string;
  /** Keyed skills are practised in all twelve keys and appear in the heatmap. */
  keyed: boolean;
  /** Mode of the keys for keyed skills. */
  mode?: 'major' | 'minor';
  card(key: Key | undefined, r: () => number): Card;
}

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

/** The twelve keys in circle-of-fifths order, from C. Enharmonic keys use the spelling with fewer accidentals (F♯ for the six-accidental key). */
export const MAJOR_KEYS: number[] = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];
export const MINOR_KEYS: number[] = [0, 1, 2, 3, 4, 5, -6, -5, -4, -3, -2, -1];

export const keyId = (k: Key) => `${k.tonic.letter}${k.tonic.alter > 0 ? '#' : k.tonic.alter < 0 ? 'b' : ''}${k.mode === 'minor' ? 'm' : ''}`;
export const keyOf = (fifths: number, mode: 'major' | 'minor'): Key => keyFromFifths(fifths, mode);

/** "C", "F#", "Bb" for use in chord symbols and :n-style names. */
const nm = (p: { letter: string; alter: number }) => `${p.letter}${p.alter > 0 ? '#'.repeat(p.alter) : 'b'.repeat(-p.alter)}`;
const keyText = (k: Key) => `\\key ${k.tonic.letter.toLowerCase()}${k.tonic.alter > 0 ? '#' : k.tonic.alter < 0 ? 'b' : ''} \\${k.mode}`;

function whiteNote(r: () => number, lo: number, hi: number, fifths = 0): Pitch {
  for (;;) {
    const m = lo + Math.floor(r() * (hi - lo + 1));
    if (![1, 3, 6, 8, 10].includes(mod(m, 12))) return spell(m, fifths);
  }
}

export const SKILLS: Skill[] = [
  {
    id: 'read-treble',
    title: 'Reading the treble staff',
    chapter: 'grand-staff',
    keyed: false,
    card: (_k, r) => ({ type: 'read', prompt: 'Play this note.', staff: 'treble', note: whiteNote(r, 60, 81) }),
  },
  {
    id: 'read-bass',
    title: 'Reading the bass staff',
    chapter: 'grand-staff',
    keyed: false,
    card: (_k, r) => ({ type: 'read', prompt: 'Play this note.', staff: 'bass', note: whiteNote(r, 40, 60) }),
  },
  {
    id: 'semitone-tone',
    title: 'Semitone or tone',
    chapter: 'semitones-and-tones',
    keyed: false,
    card: (_k, r) => {
      const a = 55 + Math.floor(r() * 14);
      const tone = r() < 0.5;
      return { type: 'choose', prompt: 'Semitone or tone?', hear: [[a], [a + (tone ? 2 : 1)]], options: ['Semitone', 'Tone'], answer: tone ? 'Tone' : 'Semitone' };
    },
  },
  {
    id: 'note-values',
    title: 'Note values',
    chapter: 'pulse-and-rhythm',
    keyed: false,
    card: (_k, r) => {
      const qs: [string, string[], string][] = [
        ['How many :t[crotchet] beats in a dotted :t[minim]?', ['2', '3', '4'], '3'],
        ['How many :t[quaver]s in a :t[semibreve]?', ['4', '6', '8'], '8'],
        ['How many :t[semiquaver]s in a dotted :t[crotchet]?', ['4', '6', '8'], '6'],
        ['A dotted :t[crotchet] lasts how many beats in 4/4?', ['1', '1½', '2'], '1½'],
        ['How many :t[crotchet] beats does a :t[bar] of 3/4 hold?', ['2', '3', '4'], '3'],
        ['In 6/8, how many beats are there in each :t[bar]?', ['2', '3', '6'], '2'],
      ];
      const [prompt, options, answer] = pick(r, qs);
      return { type: 'choose', prompt, options, answer };
    },
  },
  {
    id: 'major-scale',
    title: 'Major scales',
    chapter: 'major-scale',
    keyed: true,
    mode: 'major',
    card: (k) => {
      const notes = keyScale(k!);
      return { type: 'play', prompt: `Play the notes of :n[${nm(k!.tonic)}] major, from the tonic up, any octave.`, steps: notes.map((p) => ({ pcs: [pitchClass(p)], label: nm(p) })), fifths: fifthsOf(k!) };
    },
  },
  {
    id: 'key-signature',
    title: 'Key signatures',
    chapter: 'circle-of-fifths',
    keyed: true,
    mode: 'major',
    card: (k, r) => {
      const f = fifthsOf(k!);
      const others = MAJOR_KEYS.filter((x) => x !== f && Math.abs(x - f) <= 3).sort(() => r() - 0.5).slice(0, 3);
      const names = [f, ...others].map((x) => `:n[${nm(keyOf(x, 'major').tonic)}] major`);
      return { type: 'choose', prompt: 'Which major key has this signature?', score: `${keyText(k!)} \\hidetime s1 |`, options: names.sort(() => r() - 0.5), answer: names.find((n) => n.includes(`[${nm(k!.tonic)}]`))! };
    },
  },
  {
    id: 'interval-ear',
    title: 'Hearing intervals',
    chapter: 'intervals',
    keyed: false,
    card: (_k, r) => {
      const pool = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
      const name = pick(r, pool);
      const a = 55 + Math.floor(r() * 10);
      const near = pool.filter((p) => p !== name && Math.abs(parseInterval(p).semitones - parseInterval(name).semitones) <= 3).sort(() => r() - 0.5).slice(0, 3);
      return { type: 'choose', prompt: 'Which interval?', hear: [[a], [a + parseInterval(name).semitones]], options: [name, ...near].sort((x, y) => parseInterval(x).semitones - parseInterval(y).semitones).map((p) => intervalName(parseInterval(p))), answer: intervalName(parseInterval(name)) };
    },
  },
  {
    id: 'interval-build',
    title: 'Building intervals',
    chapter: 'intervals',
    keyed: false,
    card: (_k, r) => {
      const name = pick(r, ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M2']);
      const lo = whiteNote(r, 55, 69);
      const hi = transpose(lo, name);
      return { type: 'play', prompt: `Play a ${intervalName(parseInterval(name))} above :n[${nm(lo)}${lo.octave}], both notes together.`, steps: [{ exact: [midi(lo), midi(hi)], label: `${nm(lo)} + ${nm(hi)}` }], fifths: 0 };
    },
  },
  {
    id: 'minor-scale',
    title: 'Harmonic minor scales',
    chapter: 'minor',
    keyed: true,
    mode: 'minor',
    card: (k) => {
      const notes = scale({ ...k!.tonic, octave: 4 }, 'harmonic-minor');
      return { type: 'play', prompt: `Play :n[${nm(k!.tonic)}] harmonic minor, from the tonic up, any octave.`, steps: notes.map((p) => ({ pcs: [pitchClass(p)], label: nm(p) })), fifths: fifthsOf(k!) };
    },
  },
  {
    id: 'triad-play',
    title: 'Playing triads',
    chapter: 'triads',
    keyed: true,
    mode: 'major',
    card: (k, r) => {
      const q = pick(r, ['', 'm', 'dim', 'aug'] as const);
      const sym = `${nm(k!.tonic)}${q}`;
      const c = parseChordSymbol(sym);
      return { type: 'play', prompt: `Play :c[${sym}].`, steps: [{ pcs: [...new Set(chordTones(c).map(pitchClass))], label: chordSymbol(c) }], fifths: fifthsOf(k!) };
    },
  },
  {
    id: 'triad-ear',
    title: 'Hearing triads',
    chapter: 'triads',
    keyed: false,
    card: (_k, r) => {
      const q = pick(r, ['maj', 'min', 'dim', 'aug'] as ChordQuality[]);
      const a = 52 + Math.floor(r() * 10);
      const labels: Record<string, string> = { maj: 'Major', min: 'Minor', dim: 'Diminished', aug: 'Augmented' };
      return { type: 'choose', prompt: 'Which kind of triad?', hear: [QUALITIES[q].intervals.map((i) => a + parseInterval(i).semitones)], options: Object.values(labels), answer: labels[q]! };
    },
  },
  {
    id: 'inversion-play',
    title: 'Inversions',
    chapter: 'inversions',
    keyed: true,
    mode: 'major',
    card: (k, r) => {
      const tones = chordTones({ root: k!.tonic, quality: 'maj' });
      const inv = 1 + Math.floor(r() * 2);
      const bass = tones[inv]!;
      return { type: 'play', prompt: `Play :c[${nm(k!.tonic)}/${nm(bass)}] (${inv === 1 ? 'first' : 'second'} inversion).`, steps: [{ pcs: tones.map(pitchClass), bass: pitchClass(bass), label: `${nm(k!.tonic)}/${nm(bass)}` }], fifths: fifthsOf(k!) };
    },
  },
  {
    id: 'seventh-play',
    title: 'Playing seventh chords',
    chapter: 'seventh-chords',
    keyed: true,
    mode: 'major',
    card: (k, r) => {
      const q = pick(r, ['maj7', '7', 'm7', 'm7b5', 'dim7'] as ChordQuality[]);
      const c = { root: k!.tonic, quality: q };
      const sym = `${nm(k!.tonic)}${q}`;
      return { type: 'play', prompt: `Play :c[${sym}] (${QUALITIES[q].name}).`, steps: [{ pcs: [...new Set(chordTones(c).map(pitchClass))], label: chordSymbol(c) }], fifths: fifthsOf(k!) };
    },
  },
  {
    id: 'seventh-ear',
    title: 'Hearing seventh chords',
    chapter: 'seventh-chords',
    keyed: false,
    card: (_k, r) => {
      const labels: Partial<Record<ChordQuality, string>> = { maj7: 'Major seventh', '7': 'Dominant seventh', m7: 'Minor seventh', m7b5: 'Half-diminished', dim7: 'Diminished seventh' };
      const q = pick(r, Object.keys(labels) as ChordQuality[]);
      const a = 50 + Math.floor(r() * 10);
      return { type: 'choose', prompt: 'Which kind of seventh chord?', hear: [QUALITIES[q].intervals.map((i) => a + parseInterval(i).semitones)], options: Object.values(labels) as string[], answer: labels[q]! };
    },
  },
  {
    id: 'cadence-ear',
    title: 'Hearing cadences',
    chapter: 'function-and-cadence',
    keyed: false,
    card: (_k, r) => {
      // Four-chord phrases in C, voiced without parallels, then moved to a random key.
      const I = [48, 64, 67, 72];
      const phrases: Record<string, number[][]> = {
        Perfect: [I, [53, 65, 69, 72], [55, 62, 67, 71], I],
        Imperfect: [I, [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]],
        Plagal: [I, [45, 64, 69, 72], [41, 65, 69, 72], I],
        Interrupted: [I, [53, 65, 69, 72], [55, 62, 67, 71], [57, 60, 64, 72]],
      };
      const name = pick(r, Object.keys(phrases));
      const shift = Math.floor(r() * 12) - 5;
      return { type: 'choose', prompt: 'A short phrase. Which cadence ends it?', hear: phrases[name]!.map((c) => c.map((m) => m + shift)), options: Object.keys(phrases), answer: name };
    },
  },
  {
    id: 'ii-v-i',
    title: 'ii–V–I in every key',
    chapter: 'ii-v-i',
    keyed: true,
    mode: 'major',
    card: (k) => {
      const chords = [
        { root: transpose({ ...k!.tonic, octave: 4 }, 'M2'), quality: 'm7' as ChordQuality },
        { root: transpose({ ...k!.tonic, octave: 4 }, 'P5'), quality: '7' as ChordQuality },
        { root: k!.tonic, quality: 'maj7' as ChordQuality },
      ];
      const syms = chords.map((c) => `${nm(c.root)}${c.quality}`);
      return {
        type: 'play',
        prompt: `ii7 – V7 – Imaj7 in :n[${nm(k!.tonic)}] major: :c[${syms[0]}], :c[${syms[1]}], :c[${syms[2]}]. Any voicing; try shells or guide tones moving by step.`,
        steps: chords.map((c) => ({ pcs: [...new Set(chordTones(c).map(pitchClass))], label: chordSymbol(c) })),
        fifths: fifthsOf(k!),
      };
    },
  },
  {
    id: 'mode-ear',
    title: 'Hearing modes',
    chapter: 'modes',
    keyed: false,
    card: (_k, r) => {
      const modes = { dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', 'natural-minor': 'Aeolian' } as const;
      const kind = pick(r, Object.keys(modes) as (keyof typeof modes)[]);
      const tonic = spell(57 + Math.floor(r() * 7), 0);
      const notes = scale(tonic, kind).map(midi);
      return { type: 'choose', prompt: 'A mode, played up from its tonic. Which one?', hear: [...notes, midi(tonic) + 12].map((m) => [m]), options: Object.values(modes), answer: modes[kind] };
    },
  },
];

export const skillById = (id: string) => SKILLS.find((s) => s.id === id);
