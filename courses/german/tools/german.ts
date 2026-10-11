/**
 * Every piece of German in the course: lesson prose ({braced} runs), dialogues, word lists,
 * exercises, exams, the placement check and widget data. Used to build the dictionary (which
 * words need entries) and the audio clip list (what the course can speak).
 *
 * In exercise YAML and data files, a string under one of ENGLISH_KEYS is English, with German
 * only inside {braces}; every other string is German.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import YAML from 'yaml';
import type { Code, Text, InlineCode } from 'mdast';
import { EXERCISE_KINDS } from '../src/lib/exercises/kinds.ts';
import { parseWordLine, type Headword } from '../src/lib/de/notation.ts';
import { braced, unbrace } from '../src/lib/de/text.ts';
import { fillCloze } from '../src/lib/de/check.ts';

/** Keys whose strings are English (German only in {braces}). */
export const ENGLISH_KEYS = new Set([
  'title', 'prompt', 'explain', 'en', 'setting', 'goal', 'partner', 'theyEn', 'replyEn', 'end', 'task', 'target', 'hint', 'hints',
  'checks', 'openerEn', 'instructions', 'question', 'summary', 'blurb', 'tagline', 'note', 'why', 'rule', 'label', 'meaning', 'gloss',
  'tense', 'kind', 'id', 'skill', 'lesson', 'level', 'picture', 'pictures', 'optionLang', 'mode', 'tip', 'english',
]);

export interface FoundText {
  text: string;
  /** Where it came from, for error messages. */
  where: string;
  /** A whole German string (spoken as a unit), not a run inside English. */
  whole: boolean;
  tier: 'words' | 'lessons' | 'extras';
}

export interface FoundWord {
  head: Headword;
  gloss?: string;
  raw: string;
  lesson: string;
  line: number;
}

const FRONT = /^---\n[\s\S]*?\n---\n/;

export function lessonFiles(root: string): string[] {
  const dir = join(root, 'content/lessons');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => join(dir, f));
}

/** Walk a parsed YAML/data value, reporting German strings by the key rule above. */
export function walkData(v: unknown, where: string, tier: FoundText['tier'], out: FoundText[], key = ''): void {
  if (typeof v === 'string') {
    if (ENGLISH_KEYS.has(key)) for (const b of braced(v)) out.push({ text: b, where, whole: false, tier });
    // Cloze gaps ("Ich [fahre](fahren) mit [dem] Bus") are read with their first answer filled in.
    else if (/\p{L}/u.test(v)) out.push({ text: unbrace(/\[[^\]]+\]/.test(v) ? fillCloze(v) : v), where, whole: true, tier });
  } else if (Array.isArray(v)) v.forEach((x) => walkData(x, where, tier, out, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkData(x, where, tier, out, k);
}

export function lessonWords(root: string): FoundWord[] {
  const out: FoundWord[] = [];
  for (const file of lessonFiles(root)) {
    const src = readFileSync(file, 'utf8');
    const lesson = file.split('/').pop()!.replace(/\.md$/, '');
    const offset = (FRONT.exec(src)?.[0].split('\n').length ?? 1) - 1;
    const tree = unified().use(remarkParse).use(remarkGfm).parse(src.replace(FRONT, ''));
    visit(tree, 'code', (c: Code) => {
      if (c.lang !== 'words') return;
      c.value.split('\n').forEach((l, i) => {
        if (!l.trim()) return;
        const w = parseWordLine(l.trim());
        out.push({ ...w, lesson, line: (c.position?.start.line ?? 0) + offset + i + 1 });
      });
    });
    const fm = FRONT.exec(src);
    if (fm) {
      const front = YAML.parse(fm[0].slice(4, -5)) as { words?: string[] };
      for (const w of front?.words ?? []) out.push({ ...parseWordLine(w), lesson, line: 1 });
    }
  }
  return out;
}

export function lessonTexts(file: string, out: FoundText[] = []): FoundText[] {
  const src = readFileSync(file, 'utf8');
  const name = file.split('/').pop()!;
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(src.replace(FRONT, ''));
  visit(tree, (node) => {
    const where = `${name}:${node.position?.start.line ?? 0}`;
    if (node.type === 'text' || node.type === 'inlineCode') {
      for (const b of braced((node as Text | InlineCode).value)) out.push({ text: b, where, whole: false, tier: 'lessons' });
      return;
    }
    if (node.type !== 'code') return;
    const c = node as Code;
    if (c.lang === 'words') {
      for (const l of c.value.split('\n')) {
        if (!l.trim()) continue;
        const { head } = parseWordLine(l.trim());
        out.push({ text: head.key, where, whole: true, tier: 'words' });
      }
    } else if (c.lang === 'dialogue') {
      for (const l of c.value.split('\n')) {
        const m = /^([^:]+):\s*(.+)$/.exec(l.trim());
        if (!m || m[1] === 'title') continue;
        out.push({ text: m[2]!.split(' | ')[0]!.trim(), where, whole: true, tier: 'lessons' });
      }
    } else if (c.lang && EXERCISE_KINDS.includes(c.lang)) {
      let data: unknown;
      try {
        data = YAML.parse(c.value);
      } catch {
        return;
      }
      walkData(data, where, 'lessons', out);
    }
  });
  return out;
}

/** Data modules (exams, placement, widgets) whose German is collected like exercise YAML. */
export async function dataTexts(root: string, out: FoundText[] = []): Promise<FoundText[]> {
  const dirs = ['content/exams', 'content/data', 'src/lib/widgets/data'];
  for (const d of dirs) {
    let files: string[] = [];
    try {
      files = readdirSync(join(root, d)).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'types.ts');
    } catch {
      continue;
    }
    for (const f of files) {
      const mod = (await import(join(root, d, f))) as Record<string, unknown>;
      for (const [name, value] of Object.entries(mod)) walkData(value, `${d}/${f}#${name}`, 'extras', out);
    }
  }
  return out;
}

export async function allTexts(root: string): Promise<FoundText[]> {
  const out: FoundText[] = [];
  for (const f of lessonFiles(root)) lessonTexts(f, out);
  await dataTexts(root, out);
  return out;
}
