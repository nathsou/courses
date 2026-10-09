/**
 * Builds content/data/components.json: how each character in the course is put together (its
 * parts, which part gives the meaning and which the sound, and a one-line origin), from the
 * Make Me a Hanzi dictionary (github.com/skishore/makemeahanzi, dictionary.txt, LGPL-3.0-or-later;
 * see content/data/components.LICENSE.md).
 *
 *   npm run components                  # downloads dictionary.txt
 *   npm run components -- path.txt      # or reads a local copy
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Entry {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  etymology?: { type: 'ideographic' | 'pictographic' | 'pictophonetic'; hint?: string; semantic?: string; phonetic?: string };
}

const SOURCE_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const root = new URL('..', import.meta.url).pathname;
const source = process.argv[2];
const text = source ? readFileSync(source, 'utf8') : await (await fetch(SOURCE_URL)).text();
const dict = new Map<string, Entry>();
for (const line of text.split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line) as Entry;
  dict.set(e.character, e);
}

/** Full forms and the side forms they take inside a character. */
const VARIANTS: [string, string][] = [
  ['人', '亻'], ['水', '氵'], ['手', '扌'], ['心', '忄'], ['言', '讠'], ['食', '饣'], ['金', '钅'],
  ['糸', '纟'], ['艸', '艹'], ['辵', '辶'], ['刀', '刂'], ['示', '礻'], ['衣', '衤'], ['犬', '犭'],
  ['火', '灬'], ['玉', '王'], ['足', '⻊'], ['竹', '⺮'], ['肉', '月'], ['阜', '阝'], ['邑', '阝'],
];
const same = (a: string, b: string) => a === b || VARIANTS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
const isIdc = (ch: string) => /[⿰-⿿]/.test(ch);

const chars = new Set<string>();
const add = (s: string) => {
  for (const ch of s) if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
};
add(Object.keys(JSON.parse(readFileSync(join(root, 'content/data/lexicon.json'), 'utf8'))).join(''));
add(Object.keys(JSON.parse(readFileSync(join(root, 'content/data/chars.json'), 'utf8'))).join(''));
const content = join(root, 'content');
for (const f of readdirSync(content, { recursive: true }) as string[]) if (/\.(md|ts)$/.test(f)) add(readFileSync(join(content, f), 'utf8'));

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

/** A short gloss: the first sense, at most two comma-separated words. */
function shortGloss(definition = ''): string {
  if (/kwukyel/i.test(definition)) return '';
  const first = tidy(definition.split(';')[0]!);
  return first.split(',').slice(0, 2).map((s) => s.trim()).filter(Boolean).join(', ');
}

type Role = 'm' | 's' | '';
const out: Record<string, { k?: string; h?: string; p: [string, Role][] }> = {};
const parts: Record<string, [string, string]> = {};
const missing: string[] = [];
for (const ch of [...chars].sort()) {
  const e = dict.get(ch);
  if (!e) {
    missing.push(ch);
    continue;
  }
  const et = e.etymology;
  // A pictograph is one drawing: splitting it into shapes (米 into 丷 and 木) would mislead.
  const pieces = et?.type === 'pictographic' ? [] : [...e.decomposition].filter((c) => !isIdc(c) && c !== '？' && c !== ch);
  const p = pieces.map((c): [string, Role] => [c, et?.semantic && same(c, et.semantic) ? 'm' : et?.phonetic && same(c, et.phonetic) ? 's' : '']);
  const entry: (typeof out)[string] = { p };
  if (et) entry.k = et.type;
  // For sound-and-meaning characters the dictionary's hint only repeats the meaning part's gloss.
  if (et?.hint && et.type !== 'pictophonetic') entry.h = tidy(et.hint);
  if (!p.length && !entry.h) continue;
  out[ch] = entry;
  for (const [c] of p) {
    const pe = dict.get(c);
    if (pe && !parts[c]) parts[c] = [pe.pinyin[0] ?? '', shortGloss(pe.definition)];
  }
}

writeFileSync(join(root, 'content/data/components.json'), JSON.stringify({ chars: out, parts }) + '\n');
console.log(`${Object.keys(out).length} characters, ${Object.keys(parts).length} parts${missing.length ? `; not in the dictionary: ${missing.join('')}` : ''}`);
