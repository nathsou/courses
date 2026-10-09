import { describe, expect, it } from 'vitest';
import { validateExercise } from './validate';

describe('write exercises', () => {
  it('accepts characters to trace, words to recall, or both', () => {
    expect(validateExercise('write', { chars: '吃喝' }, 'w')).toEqual([]);
    expect(validateExercise('write', { recall: ['米饭', '茶 | tea'] }, 'w')).toEqual([]);
    expect(validateExercise('write', { chars: '饭', recall: ['吃饭'] }, 'w')).toEqual([]);
  });

  it('rejects an empty block and recall items without Chinese', () => {
    expect(validateExercise('write', {}, 'w')).toEqual(['w: needs chars or recall']);
    expect(validateExercise('write', { recall: [] }, 'w')).toEqual(['w: recall needs a list of words']);
    expect(validateExercise('write', { recall: ['rice | 米饭'] }, 'w')).toEqual(['w recall 1: needs a Chinese word']);
    expect(validateExercise('write', { chars: 'abc' }, 'w')).toEqual(['w: chars needs Chinese characters']);
  });
});

describe('read exercises', () => {
  const text = '我叫小红。我是中国人。';
  it('accepts true/false claims and multiple-choice questions', () => {
    const d = { text, questions: [{ claim: '小红是中国人。', answer: true }, { prompt: 'Who is it?', options: ['小红', '马克'], answer: 0 }] };
    expect(validateExercise('read', d, 'r')).toEqual([]);
  });

  it('needs text and questions, and a boolean answer for each claim', () => {
    expect(validateExercise('read', { questions: [] }, 'r')).toEqual(['r: needs text', 'r: needs questions']);
    expect(validateExercise('read', { text, questions: [{ claim: '小红是中国人。', answer: '对' }] }, 'r')).toEqual(['r question 1: answer must be true or false']);
    expect(validateExercise('read', { text, questions: [{ prompt: 'Who?', options: ['小红'], answer: 0 }] }, 'r')).toEqual(['r question 1: needs at least two options']);
  });
});
