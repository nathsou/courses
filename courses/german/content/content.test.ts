/**
 * Checks over all lesson content: every lesson compiles (Markdown and Svelte), every exercise is
 * well formed, every taught word is in the dictionary with the gender and plural Wiktionary
 * gives, and every der/die/das noun and conjugated verb has the data its exercise needs.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import YAML from 'yaml';
import { compile } from 'svelte/compiler';
import type { Code } from 'mdast';
import { compileLesson } from '$tools/markdown/compile';
import { EXERCISE_KINDS } from '$lib/exercises/kinds';
import { validateExercise } from '$lib/exercises/validate';
import { lookup, nounKey } from '$lib/de/lexicon';
import { conjugate } from '$lib/de/verbs';
import { LESSONS } from './outline';
import ISSUES from './data/issues.json';
import ACCEPTED from './data/accepted-issues.json';

const dir = join(__dirname, 'lessons');
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const accepted = new Set((ACCEPTED as { issue: string; why: string }[]).map((a) => a.issue.replace(/^\S+:\d+ /, '')));

function blocks(src: string): Code[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(src.replace(/^---\n[\s\S]*?\n---\n/, ''));
  const out: Code[] = [];
  visit(tree, 'code', (c: Code) => void out.push(c));
  return out;
}

describe('lessons', () => {
  it('match the outline', () => {
    const slugs = new Set(LESSONS.map((l) => l.slug));
    for (const f of files) expect(slugs.has(f.replace('.md', '')), f).toBe(true);
  });

  for (const f of files) {
    describe(f, () => {
      const src = readFileSync(join(dir, f), 'utf8');
      const slug = f.replace('.md', '');
      it('compiles to a Svelte component', () => {
        const out = compileLesson(src, join(dir, f));
        expect(() => compile(out, { filename: f.replace('.md', '.svelte'), generate: 'server' })).not.toThrow();
      });
      it('leaves no stray braces in the prose (German runs are {plain text}, no **bold** inside)', () => {
        const out = compileLesson(src, join(dir, f));
        const stray = [...out.matchAll(/.{0,30}&#12[35];.{0,30}/g)].map((m) => m[0]);
        expect(stray).toEqual([]);
      });
      it('has well-formed exercises', () => {
        const errors: string[] = [];
        for (const c of blocks(src)) {
          if (!c.lang || !EXERCISE_KINDS.includes(c.lang)) continue;
          let data: unknown;
          try {
            data = YAML.parse(c.value);
          } catch (e) {
            errors.push(`${f}:${c.position?.start.line} ${c.lang}: invalid YAML: ${(e as Error).message.split('\n')[0]}`);
            continue;
          }
          errors.push(...validateExercise(c.lang, data, `${f}:${c.position?.start.line} ${c.lang}`));
          const d = data as { items?: unknown[] };
          if (c.lang === 'gender')
            for (const n of (d.items ?? []) as string[]) if (!nounKey(n)) errors.push(`${f}:${c.position?.start.line} gender: "${n}" is not a noun in the dictionary`);
          if (c.lang === 'conjugate')
            for (const it of (d.items ?? []) as { verb: string; tense: 'present'; persons?: number[] }[]) {
              const persons = it.persons ?? (String(it.tense) === 'imperative' ? [1, 4] : [0, 1, 2, 3, 4, 5]);
              for (const p of persons) if (!conjugate(it.verb, it.tense, p)) errors.push(`${f}:${c.position?.start.line} conjugate: no ${it.tense} form of "${it.verb}" for person ${p} (is it a taught verb? run npm run lexicon)`);
            }
        }
        expect(errors).toEqual([]);
      });
      it('teaches only dictionary words (run npm run lexicon after editing word lists)', () => {
        const meta = compileLesson(src, join(dir, f));
        const words = JSON.parse(/export const metadata = (.*);/.exec(meta)![1]!).words as string[];
        expect(words.filter((w) => !lookup(w)?.l)).toEqual([]);
      });
      it('agrees with Wiktionary on genders, plurals and verb forms (or the issue is accepted)', () => {
        const mine = (ISSUES as string[]).filter((i) => i.startsWith(`${slug}.md:`)).filter((i) => !accepted.has(i.replace(/^\S+:\d+ /, '')));
        expect(mine).toEqual([]);
      });
    });
  }
});
