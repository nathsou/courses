import { expect, test } from 'vitest';
import path from 'node:path';
import { compile } from 'svelte/compiler';
import { compileMarkdown } from './compile';

const file = path.resolve(import.meta.dirname, '../../content/chapters/audit/index.md');

test('chapter links use the runtime base path, including links inside quiz HTML', async () => {
  const { code } = await compileMarkdown(`Follow [the next chapter](/chapters/next/#section) or [an external link](//example.com).

\`\`\`quiz
q: 'See [the appendix](/appendix/reference/).'
options:
  - text: Continue
    correct: true
\`\`\`
`, file);
  expect(code).toContain('href="{base}/chapters/next/#section"');
  expect(code).toContain('href="//example.com"');
  expect(code).toContain('data={withBase(');
  expect(code).toContain('__COURSE_BASE__/appendix/reference/');
  expect(code).not.toContain('%C2%A7BASE');
  expect(() => compile(code, { filename: file.replace(/\.md$/, '.svelte'), generate: 'server' })).not.toThrow();
});

test('score blocks become Score components with their source and attributes', async () => {
  const { code } = await compileMarkdown('```score caption="Four chords" tempo="72" play="false"\n\\time 4/4 c\'1 |\n```\n', file);
  expect(code).toContain('<B.Score src={"\\\\time 4/4 c\'1 |"} play={false} tempo={72} caption={withBase("Four chords")} />');
  expect(() => compile(code, { filename: 'x.svelte', generate: 'server' })).not.toThrow();
});

test('note names, chords and terms follow the reader’s settings in prose and in exercise prompts', async () => {
  const { code } = await compileMarkdown(`Middle :n[C4], the chord :c[Am], a :t[crotchet]{both}.

\`\`\`play
id: t/one
prompt: 'Play :n[C4] then :c[G].'
steps:
  - chord: G
\`\`\`
`, file);
  expect(code).toContain('<B.NoteName note={"C4"}>');
  expect(code).toContain('<B.ChordName chord={"Am"}>');
  expect(code).toContain('<B.Term both={true} word={"crotchet"}>');
  expect(code).toContain('data-note=\\"C4\\"');
  expect(code).toContain('data-chord=\\"G\\"');
  expect(code).toContain('<B.PlayExercise spec={withBase(');
  expect(() => compile(code, { filename: 'x.svelte', generate: 'server' })).not.toThrow();
});

test('ratios in prose stay text', async () => {
  const { code } = await compileMarkdown('The octave is 2:1 and the fifth 3:2.', file);
  expect(code).toContain('2:1 and the fifth 3:2');
});

test('exercises inside :::check are listed as the chapter’s Check yourself', async () => {
  const { code } = await compileMarkdown(`:::check
\`\`\`play
id: x/check-1
steps:
  - chord: C
\`\`\`
:::

\`\`\`play
id: x/later
steps:
  - chord: G
\`\`\`
`, file);
  expect(code).toContain('export const checks = ["x/check-1"];');
});
