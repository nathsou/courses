import { describe, expect, it } from 'vitest';
import { Family, genitive, allQuestions, familyRound } from './family';
import { FAMILY } from '$lib/widgets/data/family';

const f = new Family(FAMILY);
const word = (me: string, other: string) => f.word(me, other)?.de ?? null;

describe('genitive', () => {
  it('adds -s to names, or an apostrophe after an s sound', () => {
    expect(genitive('Lena')).toBe('Lenas');
    expect(genitive('Mehmet')).toBe('Mehmets');
    expect(genitive('Jonas')).toBe("Jonas'");
    expect(genitive('Markus')).toBe("Markus'");
    expect(genitive('Max')).toBe("Max'");
    expect(genitive('Fritz')).toBe("Fritz'");
  });
});

describe('relations seen from Lena', () => {
  it('names the close family', () => {
    expect(word('lena', 'thomas')).toBe('Vater');
    expect(word('lena', 'aylin')).toBe('Mutter');
    expect(word('lena', 'jonas')).toBe('Bruder');
    expect(word('lena', 'klaus')).toBe('Großvater');
    expect(word('lena', 'fatma')).toBe('Großmutter');
  });
  it('counts aunts and uncles by blood and by marriage', () => {
    expect(word('lena', 'sabine')).toBe('Tante');
    expect(word('lena', 'emre')).toBe('Onkel');
    expect(word('lena', 'markus')).toBe('Onkel');
  });
  it('names cousins in both sexes', () => {
    expect(word('lena', 'mia')).toBe('Cousine');
    expect(word('lena', 'noah')).toBe('Cousin');
  });
});

describe('relations seen from others', () => {
  it('works up and down the tree', () => {
    expect(word('klaus', 'lena')).toBe('Enkelin');
    expect(word('helga', 'noah')).toBe('Enkel');
    expect(word('thomas', 'jonas')).toBe('Sohn');
    expect(word('aylin', 'lena')).toBe('Tochter');
    expect(word('aylin', 'thomas')).toBe('Mann');
    expect(word('thomas', 'aylin')).toBe('Frau');
    expect(word('sabine', 'thomas')).toBe('Bruder');
  });
  it('knows nephews and in-laws', () => {
    expect(word('emre', 'lena')).toBe('Nichte');
    expect(word('markus', 'jonas')).toBe('Neffe');
    expect(word('thomas', 'mehmet')).toBe('Schwiegervater');
    expect(word('fatma', 'thomas')).toBe('Schwiegersohn');
    expect(word('thomas', 'emre')).toBe('Schwager');
    expect(word('emre', 'thomas')).toBe('Schwager');
    expect(word('aylin', 'sabine')).toBe('Schwägerin');
  });
  it('knows who is not related', () => {
    expect(word('mia', 'mehmet')).toBeNull();
    expect(word('lena', 'lena')).toBeNull();
  });
});

describe('sentences and questions', () => {
  it('introduces people', () => {
    expect(f.introduce('lena', 'emre').de).toBe('Das ist Emre, Lenas Onkel.');
    expect(f.introduce('jonas', 'sabine').de).toBe("Das ist Sabine, Jonas' Tante.");
    expect(f.introduce('lena', 'lena').de).toBe('Das ist Lena.');
    expect(f.introduce('mia', 'fatma').de).toBe('Das ist Fatma. Sie ist nicht mit Mia verwandt.');
  });
  it('asks questions with every right answer', () => {
    const qs = allQuestions(f);
    const onkel = qs.find((q) => q.de === 'Wer ist Lenas Onkel?')!;
    expect(onkel.answers.sort()).toEqual(['emre', 'markus']);
    expect(qs.find((q) => q.de === "Wer ist Jonas' Cousine?")!.answers).toEqual(['mia']);
    expect(qs.every((q) => q.answers.length > 0)).toBe(true);
  });
  it('builds rounds without repeats', () => {
    const r = familyRound(f, 8, 3);
    expect(r).toHaveLength(8);
    expect(new Set(r.map((q) => `${q.me}:${q.relation}`)).size).toBe(8);
  });
});
