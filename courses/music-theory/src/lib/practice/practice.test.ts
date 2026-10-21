import { describe, expect, it } from 'vitest';
import { answer, nextItem, BOX_WAIT } from './schedule';
import { SKILLS, MAJOR_KEYS, MINOR_KEYS, keyOf, keyId } from './skills';
import { rng } from '$lib/components/exercise/ear';
import { midi, mod } from '$lib/music/pitch';

describe('schedule', () => {
  it('moves up a box when right and back to the first when wrong', () => {
    let s = answer(undefined, true, 0);
    expect(s.box).toBe(1);
    expect(s.due).toBe(BOX_WAIT[1]);
    s = answer(s, true, 100);
    expect(s.box).toBe(2);
    s = answer(s, false, 200);
    expect(s).toMatchObject({ box: 0, due: 200 + BOX_WAIT[0]!, right: 2, wrong: 1 });
  });
  it('spreads new items across skills', () => {
    const c = ['x:C', 'x:G', 'y', 'z:C'];
    const st = { 'x:C': answer(undefined, true, 0) };
    expect(nextItem(c, st, 10, 'x:C')).toBe('y');
    expect(nextItem(c, { ...st, y: answer(undefined, true, 0) }, 10, 'y')).toBe('z:C');
  });
  it('picks overdue items, then new ones, then the soonest, not repeating the last', () => {
    const states = { a: answer(undefined, true, 0), b: answer(undefined, false, 0) };
    expect(nextItem(['a', 'b', 'c'], states, 61e3)).toBe('b');
    expect(nextItem(['a', 'b', 'c'], states, 61e3, 'b')).toBe('c');
    expect(nextItem(['a', 'b', 'c'], states, 10)).toBe('c');
    expect(nextItem(['a', 'b'], { a: states.a, b: answer(undefined, true, 0) }, 10, 'b')).toBe('a');
  });
});

describe('skills', () => {
  it('make valid cards in every key', () => {
    const r = rng(11);
    for (const s of SKILLS) {
      const keys = s.keyed ? (s.mode === 'minor' ? MINOR_KEYS : MAJOR_KEYS).map((f) => keyOf(f, s.mode ?? 'major')) : [undefined];
      for (const k of keys) {
        for (let i = 0; i < 5; i++) {
          const c = s.card(k, r);
          if (c.type === 'choose') expect(c.options).toContain(c.answer);
          if (c.type === 'play') expect(c.steps.length).toBeGreaterThan(0);
          if (c.type === 'read') expect(midi(c.note)).toBeGreaterThan(20);
        }
      }
    }
  });
  it('names all twelve keys once each', () => {
    expect(new Set(MAJOR_KEYS.map((f) => keyId(keyOf(f, 'major')))).size).toBe(12);
    expect(new Set(MINOR_KEYS.map((f) => mod(midi({ ...keyOf(f, 'minor').tonic, octave: 4 }), 12))).size).toBe(12);
  });
});

describe('practice markup', async () => {
  const { markup } = await import('./markup');
  it('renders names, chords and terms with the settings', () => {
    const out = markup('Play :c[F#m], then :n[Bb4], a :t[crotchet] <b>', { system: 'solfege' }, (w) => (w === 'crotchet' ? 'quarter note' : w));
    expect(out).toBe('Play <strong>Fa♯m</strong>, then <span class="nm">Si♭4</span>, a quarter note &lt;b>');
  });
});
