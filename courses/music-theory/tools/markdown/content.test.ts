/**
 * Compiles every chapter and appendix, and checks the music in them: every score parses and lays out, and
 * every exercise's notes, chords, keys and answers are valid. Content errors fail the tests, not a page.
 */
import { describe, expect, test } from 'vitest';
import { compile } from 'svelte/compiler';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { compileMarkdown } from './compile';
import { parseScore } from '../../src/lib/notation/parse';
import { layoutScore } from '../../src/lib/notation/layout';
import { parseChordSymbol } from '../../src/lib/music/chord';
import { parsePitch } from '../../src/lib/music/pitch';
import { parseInterval } from '../../src/lib/music/interval';
import { QUALITIES } from '../../src/lib/music/chord';
import { parseKey } from '../../src/lib/components/exercise/play';
import { checkSpelling } from '../../src/lib/components/exercise/spell';

const root = path.resolve(import.meta.dirname, '../../content');
const files = ['chapters', 'appendices'].flatMap((dir) => {
  const d = path.join(root, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .map((c) => path.join(d, c, 'index.md'))
    .filter((f) => existsSync(f));
});

function blocks(src: string, lang: string): string[] {
  return [...src.matchAll(new RegExp('^```' + lang + '\\b[^\\n]*\\n([\\s\\S]*?)^```', 'gm'))].map((m) => m[1]!);
}

describe('content compiles', () => {
  for (const file of files) {
    test(path.relative(root, file), async () => {
      const { code } = await compileMarkdown(readFileSync(file, 'utf8'), file);
      expect(code).toContain('export const metadata');
      expect(() => compile(code, { filename: file.replace(/\.md$/, '.svelte'), generate: 'server' })).not.toThrow();
    }, 30000);
  }
});

describe('content music is valid', () => {
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    test(`${rel}: scores`, () => {
      for (const s of blocks(src, 'score')) {
        const score = parseScore(s);
        expect(layoutScore(score, { width: 40 }).prims.length).toBeGreaterThan(0);
      }
    });
    test(`${rel}: exercises`, () => {
      const ids = new Set<string>();
      for (const kind of ['play', 'perform', 'ear', 'spell', 'read']) {
        for (const b of blocks(src, kind)) {
          const spec = YAML.parse(b);
          expect(spec.id, `${kind} block needs an id`).toBeTruthy();
          expect(ids.has(spec.id), `duplicate id ${spec.id}`).toBe(false);
          ids.add(spec.id);
          if (spec.key) parseKey(spec.key);
          if (kind === 'play') for (const st of spec.steps) st.chord ? parseChordSymbol(st.chord) : st.notes.forEach((n: string) => parsePitch(n));
          if (kind === 'perform') parseScore(spec.score);
          if (kind === 'ear') {
            if (spec.kind === 'interval') spec.pool.forEach((p: string) => parseInterval(p));
            if (spec.kind === 'quality') spec.pool.forEach((q: string) => expect(QUALITIES).toHaveProperty(q));
            if (spec.kind === 'custom') for (const it of spec.items) {
              it.play.forEach((g: string) => g.split(/\s+/).forEach((n) => parsePitch(n)));
              expect(spec.options ?? spec.items.map((i: { answer: string }) => i.answer)).toContain(it.answer);
            }
          }
          if (kind === 'spell') for (const it of spec.items) expect(checkSpelling(it.answer.map((n: string) => parsePitch(n)), it).ok).toBe(true);
          if (kind === 'read') (spec.range ?? []).forEach((n: string) => parsePitch(n));
        }
      }
    });
  }
});
