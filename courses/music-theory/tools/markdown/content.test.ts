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
import { onsetsOf } from '../../src/lib/components/exercise/perform';
import { exampleChords, judge, realiseScore, slotsOf } from '../../src/lib/components/exercise/realise';
import { checkVoiceLeading } from '../../src/lib/music/voicelead';
import { midi } from '../../src/lib/music/pitch';

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
      for (const kind of ['play', 'perform', 'ear', 'spell', 'read', 'analyse', 'realise']) {
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
          if (kind === 'analyse') {
            const sc = parseScore(spec.score);
            const slots = spec.per === 'bar' ? new Set(sc.staves.flatMap((st) => st.events.map((e) => e.bar))).size : spec.per === 'note' ? sc.staves[0]!.events.filter((e) => e.kind === 'note').length : onsetsOf(sc).length;
            expect(slots, `${spec.id}: one answer per ${spec.per ?? 'chord'}`).toBe(spec.answers.length);
          }
          if (kind === 'realise') {
            const slots = slotsOf(spec);
            for (const list of [spec.figures, spec.numerals]) if (list) expect(list.length, `${spec.id}: one label per note`).toBe(slots.length);
            parseScore(realiseScore(spec, slots, []));
            const ex = exampleChords(spec);
            if (ex.length) {
              expect(ex.length, `${spec.id}: example has one chord per note`).toBe(slots.length);
              ex.forEach((c, i) => expect(c[slots[i]!.given.voice], `${spec.id}: example chord ${i + 1} keeps the given note`).toBe(slots[i]!.given.midi));
              const faults = judge(spec, slots, ex).filter((f) => f.severity === 'fault');
              expect(faults.map((f) => `${f.at + 1}: ${f.text}`), `${spec.id}: example has faults`).toEqual([]);
            }
          }
        }
      }
    });
  }
});

/** Parallel fifths and octaves in the course's own four-part examples: keyboard-style chord scores and ear progressions. */
describe('content voice leading', () => {
  const C = { tonic: { letter: 'C' as const, alter: 0 }, mode: 'major' as const };
  const rules = ['parallel-fifths', 'parallel-octaves', 'crossing'] as const;
  const faults = (chords: number[][]) => checkVoiceLeading(chords, { key: C, style: 'keyboard', rules: [...rules] }).map((f) => `chord ${f.at + 1}: ${f.text}`);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    test(`${path.relative(root, file)}: no parallels`, () => {
      // Ear progressions of four-note chords.
      for (const m of src.matchAll(/- play: \[([^\]]+)\]/g)) {
        const groups = m[1]!.split(',').map((g) => g.trim().split(/\s+/));
        if (groups.length < 2 || groups.some((g) => g.length !== 4)) continue;
        expect(faults(groups.map((g) => g.map((n) => midi(parsePitch(n))).sort((a, b) => b - a))), m[1]).toEqual([]);
      }
      // Scores of three-note chords over a bass, one voice per staff; a caption that mentions parallels is a demonstration.
      for (const m of src.matchAll(/^```score([^\n]*)\n([\s\S]*?)^```/gm)) {
        if (/parallel/i.test(m[1]!)) continue;
        const sc = parseScore(m[2]!);
        if (sc.staves.length !== 2 || sc.staves.some((st) => st.events.some((e) => e.voice === 1))) continue;
        const [t, b] = sc.staves.map((st) => st.events.filter((e) => e.kind === 'note'));
        if (t!.length < 2 || t!.length !== b!.length || t!.some((e, i) => e.start !== b![i]!.start || e.pitches.length !== 3 || b![i]!.pitches.length !== 1)) continue;
        const chords = t!.map((e, i) => [...e.pitches.map(midi), midi(b![i]!.pitches[0]!)].sort((x, y) => y - x));
        expect(faults(chords), m[2]!.slice(0, 80)).toEqual([]);
      }
    });
  }
});

