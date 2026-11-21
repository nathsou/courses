import { expect, test } from 'vitest';
import path from 'node:path';
import { compileMarkdown } from './compile';

const file = path.resolve(import.meta.dirname, '../../content/chapters/99-test/index.md');

test('front matter, headings and the table of contents', async () => {
  const { code } = await compileMarkdown('---\nnumber: 9\ntitle: T\nsummary: S\n---\n\n## A section\n\nText.\n', file);
  expect(code).toContain('"number":"9"');
  expect(code).toContain('export const toc = [{"id":"a-section","text":"A section","depth":2}]');
});

test('callouts of the course: fab, know, scale and software', async () => {
  const { code } = await compileMarkdown(':::fab[Title]\nBody\n:::\n\n:::scale\nL\n:::\n\n:::software\nS\n:::\n\n:::know\nK\n:::\n', file);
  for (const k of ['fab', 'scale', 'software', 'know']) expect(code).toContain(`kind={"${k}"}`);
});

test('maths is rendered at build time, inline and display', async () => {
  const { code } = await compileMarkdown('Gap $E_g$ here.\n\n$$\nn = p\n$$\n', file);
  expect(code).toContain('class="katex"');
  expect(code).toContain('<div class="math-display">');
  expect(code).not.toContain('$E_g$');
});

test('exercise blocks become components with their data', async () => {
  const { code } = await compileMarkdown('```answer\nid: t/a\nprompt: Two and two?\nanswer: 4\n```\n\n```rtl\nid: t/r\ncode: |\n  input a\nsolution: |\n  input b\n```\n', file);
  expect(code).toContain('<B.AnswerExercise spec=');
  expect(code).toContain('"answer":4');
  expect(code).toContain('<B.RtlExercise spec=');
  expect(code).toContain('"code":"input a\\n"');
  expect(code).toContain('"solution":"input b\\n"');
});

test('hdl fences show highlighted code', async () => {
  const { code } = await compileMarkdown('```hdl caption="Hi"\ninput a\n```\n', file);
  expect(code).toContain('<B.CodeBlock src={"input a"} caption={"Hi"} />');
});

test('unknown widgets fail loudly', async () => {
  await expect(compileMarkdown('::no-such-widget\n', file)).rejects.toThrow(/unknown directive/);
});
