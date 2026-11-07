import { expect, test } from 'vitest';
import path from 'node:path';
import { compileMarkdown } from './compile';

const file = path.resolve(import.meta.dirname, '../../content/chapters/99-test/index.md');

test('front matter, headings and the table of contents', async () => {
  const { code } = await compileMarkdown('---\nnumber: 9\ntitle: T\nsummary: S\n---\n\n## A section\n\nText.\n', file);
  expect(code).toContain('"number":"9"');
  expect(code).toContain('export const toc = [{"id":"a-section","text":"A section","depth":2}]');
});

test('callouts of the course: modern, know, ledger and source', async () => {
  const { code } = await compileMarkdown(':::modern[Title]\nBody\n:::\n\n:::ledger{machine="X"}\nL\n:::\n', file);
  expect(code).toContain('kind={"modern"}');
  expect(code).toContain('kind={"ledger"}');
});

test('exercise blocks become components with their data', async () => {
  const { code } = await compileMarkdown('```answer\nid: t/a\nprompt: Two and two?\nanswer: 4\n```\n\n```cards\nid: t/c\ndeck: |\n  N1 2\ntests:\n  - expect: { V1: 2 }\n```\n', file);
  expect(code).toContain('<B.AnswerExercise spec=');
  expect(code).toContain('"answer":4');
  expect(code).toContain('<B.CardsExercise spec=');
  expect(code).toContain('"deck":"N1 2\\n"');
});

test('deck fences show a runnable deck', async () => {
  const { code } = await compileMarkdown('```deck caption="Hi"\nN1 5\n```\n', file);
  expect(code).toContain('<B.Deck src={"N1 5"} caption={"Hi"} />');
});

test('unknown widgets fail loudly', async () => {
  await expect(compileMarkdown('::no-such-widget\n', file)).rejects.toThrow(/unknown directive/);
});
