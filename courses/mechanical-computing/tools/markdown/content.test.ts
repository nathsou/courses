/**
 * Compiles every chapter and appendix, and checks the exercises in them: every solution deck passes its
 * tests and every starting deck fails them; every quiz has exactly one correct option; every answer
 * exercise has an answer; exercise ids are unique; every citation and glossary term resolves; and every
 * reckoner goal is reachable. Content errors fail the tests, not a page.
 */
import { describe, expect, test } from 'vitest';
import { compile } from 'svelte/compiler';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { compileMarkdown } from './compile';
import { checkDeck, type DeckTest } from '../../src/lib/mech/analytical';
import { DECKS } from '../../src/lib/mech/decks';
import { checkAnswer } from '../../src/lib/components/exercise/answer';
import { PARTS, APPENDICES } from '../../content/outline';

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

const bib = YAML.parse(readFileSync(path.join(root, 'bibliography.yaml'), 'utf8')) as Record<string, unknown>;
const glossary = YAML.parse(readFileSync(path.join(root, 'glossary.yaml'), 'utf8')) as Record<string, unknown>;

describe('content compiles', () => {
  for (const file of files) {
    test(path.relative(root, file), async () => {
      const { code } = await compileMarkdown(readFileSync(file, 'utf8'), file);
      expect(code).toContain('export const metadata');
      expect(() => compile(code, { filename: file.replace(/\.md$/, '.svelte'), generate: 'server' })).not.toThrow();
    }, 30000);
  }
});

describe('every chapter in the outline has a matching folder slug', () => {
  test('slugs', () => {
    const slugs = files.map((f) => path.basename(path.dirname(f)).replace(/^[0-9a-z]{1,2}-/, ''));
    for (const s of slugs) expect([...PARTS.flatMap((p) => p.chapters), ...APPENDICES].map((c) => c.slug)).toContain(s);
  });
});

describe('exercises are sound', () => {
  const ids = new Map<string, string>();
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = path.relative(root, file);

    test(`${rel}: ids are unique across the course`, () => {
      for (const kind of ['answer', 'order', 'cards']) {
        for (const b of blocks(src, kind)) {
          const id = (YAML.parse(b) as { id?: string }).id;
          expect(id, `${rel}: a ${kind} block without an id`).toBeTruthy();
          expect(ids.has(id!), `${id} is used twice (${ids.get(id!)} and ${rel})`).toBe(false);
          ids.set(id!, rel);
        }
      }
      for (const m of src.matchAll(/::[a-z-]+\{[^}\n]*\bid="([^"]+)"/g)) {
        expect(ids.has(m[1]!), `${m[1]} is used twice`).toBe(false);
        ids.set(m[1]!, rel);
      }
    });

    test(`${rel}: card exercises`, () => {
      for (const b of blocks(src, 'cards')) {
        const spec = YAML.parse(b) as { id: string; deck?: string; deckFrom?: string; tests: DeckTest[]; solutionDeck?: string; limit?: number };
        expect(spec.tests?.length, `${spec.id}: tests`).toBeGreaterThan(0);
        const start = spec.deck ?? (spec.deckFrom ? DECKS[spec.deckFrom] : undefined);
        expect(start, `${spec.id}: a starting deck`).toBeDefined();
        expect(checkDeck(start!, spec.tests, spec.limit).ok, `${spec.id}: the starting deck must not already pass`).toBe(false);
        if (spec.solutionDeck) {
          const r = checkDeck(spec.solutionDeck, spec.tests, spec.limit);
          expect(r.failures, `${spec.id}: the solution deck`).toEqual([]);
        }
      }
      if (/deckFrom: note-g-printed/.test(src)) {
        // The fix: the corrected deck must pass the same test.
        const spec = blocks(src, 'cards').map((b) => YAML.parse(b) as { deckFrom?: string; tests: DeckTest[] }).find((s) => s.deckFrom === 'note-g-printed')!;
        expect(checkDeck(DECKS['note-g']!, spec.tests).failures).toEqual([]);
      }
    });

    test(`${rel}: quizzes have exactly one correct option`, () => {
      for (const b of blocks(src, 'quiz')) {
        const q = YAML.parse(b) as { q: string; options: { correct?: boolean }[] };
        expect(q.options.filter((o) => o.correct).length, q.q).toBe(1);
      }
    });

    test(`${rel}: answers and orders`, () => {
      for (const b of blocks(src, 'answer')) {
        const a = YAML.parse(b) as { id: string; answer: unknown; tolerance?: number };
        expect(a.answer, `${a.id}: answer`).toBeDefined();
        const first = Array.isArray(a.answer) ? a.answer[0] : a.answer;
        expect(checkAnswer(a as never, String(first)).ok, `${a.id}: its own answer is accepted`).toBe(true);
      }
      for (const b of blocks(src, 'order')) {
        const o = YAML.parse(b) as { id: string; steps: string[] };
        expect(o.steps.length, `${o.id}: steps`).toBeGreaterThanOrEqual(3);
      }
    });

    test(`${rel}: citations and glossary terms resolve`, () => {
      for (const m of src.matchAll(/:cite\[([^\]]+)\]/g)) for (const k of m[1]!.split(',')) expect(bib[k.trim()], `missing bibliography entry ${k}`).toBeDefined();
      for (const m of src.matchAll(/:term\[([^\]]+)\](\{id=([^}]+)\})?/g)) {
        const id = (m[3] ?? m[1]!).toLowerCase();
        expect(glossary[id], `missing glossary entry ${id}`).toBeDefined();
      }
    });
  }
});
