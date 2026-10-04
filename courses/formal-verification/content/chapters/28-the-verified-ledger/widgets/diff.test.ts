import { expect, test } from 'vitest';
import { diffLines } from './diff';

test('a changed line shows as the old line removed, then the new one added', () => {
  expect(diffLines('a\nb\nc', 'a\nx\nc')).toEqual([
    { kind: 'same', text: 'a' },
    { kind: 'del', text: 'b' },
    { kind: 'add', text: 'x' },
    { kind: 'same', text: 'c' },
  ]);
  expect(diffLines('a\nc', 'a\nb\nc').map((d) => d.kind)).toEqual(['same', 'add', 'same']);
  expect(diffLines('a\nb\nc', 'a\nc').map((d) => d.kind)).toEqual(['same', 'del', 'same']);
  expect(diffLines('same', 'same')).toEqual([{ kind: 'same', text: 'same' }]);
});
