import { describe as group, expect, it } from 'vitest';
import { build, describe, part } from './components';
import COMPONENTS from '$content/data/components.json';

group('character components', () => {
  it('splits sound-and-meaning characters into their roles', () => {
    const b = build('饭')!;
    expect(b.kind).toBe('pictophonetic');
    expect(b.parts.map((p) => [p.ch, p.role])).toEqual([['饣', 'meaning'], ['反', 'sound']]);
    expect(describe(b)).toBe('饣 food (side form of 食) (meaning) + 反 fǎn (sound)');
  });

  it('keeps a pictograph whole and tells its story', () => {
    const b = build('米')!;
    expect(b.parts).toEqual([]);
    expect(describe(b)).toBe('Grains of rice');
  });

  it('explains ideas built from parts', () => {
    const b = build('好')!;
    expect(b.parts.map((p) => p.ch)).toEqual(['女', '子']);
    expect(b.hint).toMatch(/woman/i);
  });

  it('names strokes and side forms instead of odd dictionary glosses', () => {
    expect(part('丨').gloss).toBe('vertical stroke');
    expect(part('氵').gloss).toMatch(/^water/);
  });

  it('covers the HSK 1 characters, with a meaning for every part of every course character', () => {
    const missing = [...'我你他她好是不人大中国学生吃喝饭茶水家妈爸听说读写看'].filter((ch) => !build(ch));
    expect(missing).toEqual([]);
    const unnamed = Object.keys((COMPONENTS as { chars: object }).chars).flatMap((ch) => build(ch)!.parts.filter((p) => !p.gloss).map((p) => `${ch}:${p.ch}`));
    expect(unnamed).toEqual([]);
  });
});
