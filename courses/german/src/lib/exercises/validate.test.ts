import { describe, expect, it } from 'vitest';
import { validateExercise } from './validate';

describe('type and cloze exercises', () => {
  it('accepts answers, alternatives and gaps', () => {
    expect(validateExercise('type', { items: [{ de: 'Ich ___ müde.', answer: ['bin'] }, { listen: true, answer: 'Guten Tag' }] }, 't')).toEqual([]);
    expect(validateExercise('cloze', { items: [{ de: 'Ich fahre mit [dem] Bus [zur/zu der](zu) Arbeit.' }] }, 'c')).toEqual([]);
  });
  it('rejects missing answers and gapless clozes', () => {
    expect(validateExercise('type', { items: [{ de: 'Ich ___ müde.' }] }, 't')).toEqual(['t item 1: needs an answer']);
    expect(validateExercise('cloze', { items: [{ de: 'Kein Loch.' }] }, 'c')).toEqual(['c item 1: needs at least one [gap]']);
  });
});

describe('gender and conjugate exercises', () => {
  it('wants bare nouns and known tenses', () => {
    expect(validateExercise('gender', { items: ['Tisch', 'Lampe'] }, 'g')).toEqual([]);
    expect(validateExercise('gender', { items: ['der Tisch'] }, 'g')).toEqual(['g item 1: give the noun without its article']);
    expect(validateExercise('conjugate', { items: [{ verb: 'fahren', tense: 'present' }] }, 'v')).toEqual([]);
    expect(validateExercise('conjugate', { items: [{ verb: 'fahren', tense: 'future' }] }, 'v')).toEqual(['v item 1: unknown tense future']);
    expect(validateExercise('conjugate', { items: [{ verb: 'gehen', tense: 'imperative', persons: [0] }] }, 'v')).toEqual(['v item 1: the imperative has du (1) and ihr (4)']);
  });
});

describe('order exercises', () => {
  it('accepts other orders of the same tiles, ignoring the capital of the first word', () => {
    expect(validateExercise('order', { items: [{ en: 'Today I am going to the cinema.', de: 'Heute gehe ich ins_Kino', also: ['Ich gehe heute ins_Kino'] }] }, 'o')).toEqual([]);
    expect(validateExercise('order', { items: [{ en: 'x', de: 'Ich gehe', also: ['Ich laufe'] }] }, 'o')).toEqual(['o item 1: "also" order uses different tiles']);
  });
});

describe('read exercises', () => {
  const text = 'Ich heiße Anna. Ich komme aus Wien.';
  it('accepts true/false claims and multiple-choice questions', () => {
    const d = { text, questions: [{ claim: 'Anna kommt aus Wien.', answer: true }, { prompt: 'Who is it?', options: ['Anna', 'Tom'], answer: 0 }] };
    expect(validateExercise('read', d, 'r')).toEqual([]);
  });
  it('needs text and questions, and a boolean answer for each claim', () => {
    expect(validateExercise('read', { questions: [] }, 'r')).toEqual(['r: needs text', 'r: needs questions']);
    expect(validateExercise('read', { text, questions: [{ claim: 'Anna kommt aus Wien.', answer: 'richtig' }] }, 'r')).toEqual(['r question 1: answer must be true or false']);
  });
});
