/**
 * Builds the course dictionary from the lessons' word lists and Wiktionary.
 *
 *   node --experimental-strip-types scripts/build-lexicon.ts [--wiktionary build/wiktionary-de.jsonl.gz]
 *
 * Writes content/data/lexicon.json (entries), forms.json (every word form that appears in the
 * course → its entries), verbs.json (conjugation tables of the taught verbs) and issues.json
 * (taught words whose gender or plural disagrees with Wiktionary, or that it lacks). The
 * Wiktionary file comes from scripts/slim-wiktionary.py.
 */
import { createReadStream, writeFileSync, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allTexts, lessonWords, type FoundWord } from '../tools/german.ts';
import { split } from '../src/lib/de/text.ts';
import { applyPlural, genderOf, splitParts, type Gender } from '../src/lib/de/notation.ts';
import { LESSONS } from '../content/outline.ts';
import type { Entry, Level } from '../src/lib/de/lexicon.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const wikiPath = arg('wiktionary') ?? join(root, 'build/wiktionary-de.jsonl.gz');
if (!existsSync(wikiPath)) {
  console.error(`No Wiktionary data at ${wikiPath}. See scripts/slim-wiktionary.py.`);
  process.exit(1);
}

interface Wiki {
  w: string;
  p: string;
  g: string[];
  fo: string[];
  tg: string[];
  f: { f: string; t: string[] }[];
  h: string[];
}

// 1. What the course needs: taught words and every word form in its German text.
const words = lessonWords(root);
const texts = await allTexts(root);
const surfaces = new Set<string>();
for (const t of texts) for (const tok of split(t.text)) if (tok.w) surfaces.add(tok.t);
// Words in -n with no markers are verbs if Wiktionary has them as verbs (decided below).
const lemmas = new Set(words.map((w) => w.head.lemma));
// Feminine -in nouns missing from Wiktionary are checked against their base: Partnerin → Partner.
for (const w of words) if (w.head.kind === 'noun' && w.head.lemma.endsWith('in')) for (const b of baseOfIn(w.head.lemma)) lemmas.add(b);
function baseOfIn(noun: string): string[] {
  const stem = noun.slice(0, -2);
  return [stem, stem.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')];
}
for (const w of words) for (const tok of split(w.head.key)) if (tok.w) surfaces.add(tok.t);
// Sentence-initial words are also looked up in lower case ("Die" → "die").
const lowered = new Set<string>();
for (const s of [...surfaces]) {
  const l = s.charAt(0).toLowerCase() + s.slice(1);
  if (l !== s && !surfaces.has(l)) lowered.add(l);
}
for (const l of lowered) surfaces.add(l);
const needed = (s: string) => surfaces.has(s) || lemmas.has(s);
/** Grammatical glosses ("plural of Esse", "nominative singular feminine of der") are not meanings. */
const GRAMMATICAL = /^(nominative|accusative|dative|genitive|inflection|inflected|plural|singular|gerund|feminine|masculine|neuter|first|second|third|past|present|alternative|obsolete|archaic|dated|superseded|misspelling|nonstandard|comparative|superlative|strong|weak|mixed|form|diminutive|clipping|abbreviation|contraction|eye dialect)\b/i;

// 2. Stream Wiktionary once, keeping the entries the course can use.
const byWord = new Map<string, Wiki[]>();
const formOf = new Map<string, Set<string>>();
/** Surface form → kept entries that list it among their forms. */
const formIndex = new Map<string, Wiki[]>();
const rl = createInterface({ input: createReadStream(wikiPath).pipe(createGunzip()), crlfDelay: Infinity });
for await (const line of rl) {
  const e = JSON.parse(line) as Wiki;
  if (e.p === 'name') continue;
  const isForm = e.fo.length > 0 && e.g.every((g) => / of [\p{L}'’-]+(\s*\(.*\))?$/u.test(g) || GRAMMATICAL.test(g));
  if (isForm) {
    if (needed(e.w)) for (const l of e.fo) (formOf.get(e.w) ?? formOf.set(e.w, new Set()).get(e.w)!).add(l);
    continue;
  }
  const hit = needed(e.w) || (!e.w.includes(' ') && formWords(e).some((x) => surfaces.has(x)));
  if (!hit) continue;
  (byWord.get(e.w) ?? byWord.set(e.w, []).get(e.w)!).push(e);
  for (const part of formWords(e)) if (surfaces.has(part)) (formIndex.get(part) ?? formIndex.set(part, []).get(part)!).push(e);
}

/**
 * The single words that are forms of an entry: "fährt"; "ruft" from "ruft an"; "schönsten" from
 * "am schönsten". Multi-word constructions (hat gefahren) and table metadata are skipped.
 */
function formWords(e: Wiki): string[] {
  const out: string[] = [];
  for (const f of e.f) {
    if (f.t.some((t) => t === 'table-tags' || t === 'inflection-template' || t === 'auxiliary' || t === 'class' || t === 'multiword-construction' || t === 'canonical')) continue;
    if (!f.f.includes(' ')) out.push(f.f);
    else if (f.f.startsWith('am ')) out.push(f.f.slice(3));
    else if (e.p === 'verb' && /^\S+ \p{Ll}+$/u.test(f.f) && (e.w.startsWith(f.f.split(' ')[1]!) || f.f.endsWith(' sich'))) out.push(f.f.split(' ')[0]!);
  }
  return out;
}

// 3. Helpers to read Wiktionary entries.
const has = (f: { t: string[] }, ...tags: string[]) => tags.every((t) => f.t.includes(t));
const only = (f: { t: string[] }, ...tags: string[]) => has(f, ...tags) && f.t.length === tags.length;
const genderTag = (e: Wiki): Gender | undefined =>
  e.tg.includes('masculine') ? 'm' : e.tg.includes('feminine') ? 'f' : e.tg.includes('neuter') ? 'n' : e.tg.includes('plural') || e.tg.includes('plural-only') ? 'pl' : undefined;
function headGenders(e: Wiki): Gender[] {
  // "See m (strong…)" — the head template shows every gender the noun takes.
  const h = e.h[0] ?? '';
  const m = /^\S+\s+((?:[mfn](?:\s+or\s+|\s*,\s*)?)+|p\b)/.exec(h);
  if (!m) return genderTag(e) ? [genderTag(e)!] : [];
  return m[1]!.split(/\s+or\s+|\s*,\s*/).filter(Boolean).map((x) => (x === 'p' ? 'pl' : (x as Gender)));
}
const plural = (e: Wiki) => e.f.find((f) => only(f, 'plural'))?.f ?? e.f.find((f) => has(f, 'nominative', 'plural'))?.f;
const genitive = (e: Wiki) => e.f.find((f) => only(f, 'genitive'))?.f ?? e.f.find((f) => has(f, 'genitive', 'singular'))?.f;
const noPlural = (e: Wiki) => e.h.some((h) => /no plural|uncountable|singular only/.test(h)) || e.tg.includes('uncountable') || e.tg.includes('singular-only');

function cleanGloss(g: string): string {
  let s = g;
  while (/\([^()]*\)/.test(s)) s = s.replace(/\s*\([^()]*\)/g, '');
  s = s.replace(/\s+([,;])/g, '$1').replace(/\s+/g, ' ').trim();
  s = s.split(/;\s*/)[0]!;
  if (s.length > 70) s = s.slice(0, 67).replace(/[ ,][^ ,]*$/, '') + '…';
  return s.replace(/[.:]$/, '');
}
function gloss(es: Wiki[]): string {
  // Verbs: prefer a "to …" sense ("sein" is "to be" before it is an auxiliary).
  for (const e of es) if (e.p === 'verb') for (const g of e.g) if (/^to /.test(g)) return cleanGloss(g);
  for (const e of es) for (const g of e.g) if (g && !GRAMMATICAL.test(g)) return cleanGloss(g);
  for (const e of es) if (e.g[0]) return cleanGloss(e.g[0]);
  return '';
}

function verbParts(e: Wiki): Entry['v'] | undefined {
  const p3 = e.f.find((f) => has(f, 'present', 'singular', 'third-person') && !has(f, 'subordinate-clause') && !has(f, 'subjunctive'))?.f;
  const pret = e.f.find((f) => only(f, 'past'))?.f ?? e.f.find((f) => has(f, 'preterite', 'singular', 'third-person', 'indicative'))?.f;
  const pp = e.f.find((f) => has(f, 'participle', 'past'))?.f;
  const auxes = new Set(e.f.filter((f) => only(f, 'auxiliary')).map((f) => f.f));
  if (!p3 || !pret || !pp) return undefined;
  const aux = auxes.has('sein') && auxes.has('haben') ? 'hs' : auxes.has('sein') ? 's' : 'h';
  return [p3, pret, pp, aux];
}

export interface VerbTable {
  pres: string[];
  pret: string[];
  k2: string[];
  k1: string[];
  imp: [string, string];
  pp: string;
  aux: 'h' | 's' | 'hs';
}
const PERSONS: [string, string][] = [
  ['first-person', 'singular'],
  ['second-person', 'singular'],
  ['third-person', 'singular'],
  ['first-person', 'plural'],
  ['second-person', 'plural'],
  ['third-person', 'plural'],
];
function table(e: Wiki): VerbTable | undefined {
  const pick = (mood: string[], [pers, num]: [string, string]) =>
    e.f.find((f) => has(f, ...mood, pers, num) && !has(f, 'subordinate-clause') && !has(f, 'multiword-construction') && !has(f, 'rare'))?.f ??
    e.f.find((f) => has(f, ...mood, pers, num) && !has(f, 'subordinate-clause') && !has(f, 'multiword-construction'))?.f ??
    '';
  const pres = PERSONS.map((p) => pick(['indicative', 'present'], p));
  const pret = PERSONS.map((p) => pick(['indicative', 'preterite'], p));
  const k2 = PERSONS.map((p) => pick(['subjunctive-ii'], p));
  const k1 = PERSONS.map((p) => pick(['subjunctive-i'], p));
  const impDu = e.f.find((f) => has(f, 'imperative', 'second-person', 'singular'))?.f ?? '';
  const impIhr = e.f.find((f) => has(f, 'imperative', 'second-person', 'plural'))?.f ?? '';
  const v = verbParts(e);
  if (!v || pres.some((x) => !x)) return undefined;
  return { pres, pret, k2, k1, imp: [impDu, impIhr], pp: v[2], aux: v[3] };
}

// 4. Taught words: first lesson in course order wins.
const order = new Map(LESSONS.map((l, i) => [l.slug, i]));
const levelOf = new Map(LESSONS.map((l) => [l.slug, l.part.level as Level]));
words.sort((a, b) => (order.get(a.lesson) ?? 999) - (order.get(b.lesson) ?? 999));

const lexicon: Record<string, Entry> = {};
const verbs: Record<string, VerbTable> = {};
const issues: string[] = [];
const forms = new Map<string, string[]>();
const addForm = (surface: string, key: string) => {
  if (!surfaces.has(surface) && !lemmas.has(surface)) return;
  const list = forms.get(surface) ?? [];
  if (!list.includes(key)) list.push(key);
  forms.set(surface, list);
};
/** Register every form of a Wiktionary entry (and its separable verb's split forms) for a key. */
function registerForms(key: string, e: Wiki, word: string) {
  addForm(word, key);
  for (const f of formWords(e)) addForm(f, key);
}

function pickNoun(cands: Wiki[], g?: Gender): Wiki | undefined {
  const nouns = cands.filter((e) => e.p === 'noun');
  return nouns.find((e) => g && headGenders(e).includes(g)) ?? nouns[0];
}

const where = (w: FoundWord) => `${w.lesson}.md:${w.line} "${w.raw}"`;
for (const w of words) {
  const head = { ...w.head };
  if (head.maybeVerb && (byWord.get(head.lemma) ?? []).some((e) => e.p === 'verb')) head.kind = 'verb';
  if (lexicon[head.key]?.l) continue;
  const cands = byWord.get(head.lemma) ?? [];
  const level = levelOf.get(w.lesson);
  const base = { l: level, s: w.lesson } as Pick<Entry, 'l' | 's'>;
  if (head.kind === 'noun') {
    const g: Gender = head.pluralOnly ? 'pl' : genderOf(head.article!);
    const e = pickNoun(cands, g);
    const entry: Entry = { p: 'n', g: w.gloss ?? (e ? gloss([e]) : ''), a: g, ...base };
    const derived = !e && g === 'f' && head.lemma.endsWith('in') && baseOfIn(head.lemma).some((b) => (byWord.get(b) ?? []).some((x) => x.p === 'noun'));
    if (!e && !derived) issues.push(`${where(w)}: not in Wiktionary as a noun (check the spelling)`);
    if (derived && !head.plural) entry.pl = `${head.lemma}nen`;
    else if (e && !head.pluralOnly && !headGenders(e).includes(g)) issues.push(`${where(w)}: Wiktionary gives the gender as ${headGenders(e).join('/') || '?'}`);
    if (!head.pluralOnly) {
      const wikiPl = e ? plural(e) : undefined;
      if (head.plural === 'Sg.') entry.pl = null;
      else if (head.plural) {
        const pl = applyPlural(head.lemma, head.plural);
        entry.pl = pl ?? null;
        if (e && pl && wikiPl && pl !== wikiPl && !e.f.some((f) => has(f, 'plural') && f.f === pl)) issues.push(`${where(w)}: plural ${pl}, Wiktionary has ${wikiPl}`);
      } else if (wikiPl) entry.pl = wikiPl;
      else if (e && noPlural(e)) entry.pl = null;
      const gs = e ? genitive(e) : undefined;
      if (gs && /e?n$/.test(gs) && g !== 'f' && !gs.endsWith('ens') && gs !== head.lemma) entry.gs = gs;
    }
    if (head.extra) entry.x = head.extra;
    lexicon[head.key] = entry;
    if (e) registerForms(head.key, e, head.lemma);
    else addForm(head.lemma, head.key);
    if (entry.pl) {
      addForm(entry.pl, head.key);
      addForm(entry.pl.endsWith('n') || entry.pl.endsWith('s') ? entry.pl : `${entry.pl}n`, head.key);
    }
  } else if (head.kind === 'verb') {
    const e = cands.find((x) => x.p === 'verb');
    const entry: Entry = { p: 'v', g: w.gloss ?? (e ? gloss([e]) : ''), ...base };
    if (head.reflexive) entry.r = 1;
    if (head.extra) entry.x = head.extra;
    const v = e ? verbParts(e) : undefined;
    if (v) {
      entry.v = v;
      const sp = / (\p{Ll}+)$/u.exec(v[0]);
      if (sp && head.lemma.startsWith(sp[1]!)) entry.sep = sp[1];
    } else issues.push(`${where(w)}: no conjugation in Wiktionary${e ? '' : ' (not found as a verb)'}`);
    if (head.prefix && entry.sep !== head.prefix) issues.push(`${where(w)}: written separable with "${head.prefix}|", Wiktionary disagrees`);
    if (head.parts && v) {
      const p = splitParts(head.parts);
      const wikiAux = v[3];
      if (!p) issues.push(`${where(w)}: principal parts should read "fährt, fuhr, ist gefahren"`);
      else {
        if (p.present !== v[0] || p.past !== v[1] || p.participle !== v[2]) issues.push(`${where(w)}: parts "${head.parts}", Wiktionary has ${v[0]}, ${v[1]}, ${v[2]}`);
        if ((p.aux === 'ist') !== wikiAux.includes('s')) issues.push(`${where(w)}: auxiliary "${p.aux}", Wiktionary has ${wikiAux === 's' ? 'sein' : wikiAux === 'hs' ? 'haben or sein' : 'haben'}`);
        if (p.aux === 'ist' && wikiAux === 'hs') entry.v = [v[0], v[1], v[2], 's'];
        if (p.aux === 'hat' && wikiAux === 'hs') entry.v = [v[0], v[1], v[2], 'h'];
      }
    }
    lexicon[head.key] = entry;
    if (e) {
      registerForms(head.key, e, head.lemma);
      const t = table(e);
      if (t) verbs[head.key] = { ...t, aux: entry.v?.[3] ?? t.aux };
    } else addForm(head.lemma, head.key);
  } else {
    // Adjectives, adverbs, phrases and function words.
    const e = cands.find((x) => x.p === 'adj') ?? cands.find((x) => x.p !== 'noun' && x.p !== 'verb') ?? cands[0];
    const isAdj = e?.p === 'adj';
    const entry: Entry = { p: isAdj ? 'a' : 'x', g: w.gloss ?? (e ? gloss([e]) : ''), ...base };
    if (isAdj && e) {
      const c = e.f.find((f) => only(f, 'comparative'))?.f;
      const s = e.f.find((f) => only(f, 'superlative'))?.f;
      if (c && s) entry.c = [c, s];
    }
    if (head.extra) entry.x = head.extra;
    if (!entry.g) issues.push(`${where(w)}: needs a gloss (not in Wiktionary)`);
    lexicon[head.key] = entry;
    if (e && head.key === e.w) registerForms(head.key, e, head.lemma);
    else addForm(head.key, head.key);
    // Phrases are also found word by word in text.
  }
}

// 5. Everything else in the course's German text: background entries from Wiktionary.
const POS: Record<string, Entry['p']> = { noun: 'n', verb: 'v', adj: 'a' };
function backgroundKey(e: Wiki): string {
  if (e.p === 'noun') {
    const g = headGenders(e)[0];
    if (g && g !== 'pl') return `${{ m: 'der', f: 'die', n: 'das' }[g]} ${e.w}`;
    if (g === 'pl') return `die ${e.w}`;
  }
  return e.w;
}
function background(e: Wiki): string {
  const key = backgroundKey(e);
  if (!lexicon[key]) {
    const entry: Entry = { p: POS[e.p] ?? 'x', g: gloss([e]) };
    if (e.p === 'noun') {
      const g = headGenders(e)[0];
      if (g) entry.a = g;
      const pl = plural(e);
      if (pl) entry.pl = pl;
    }
    if (e.p === 'verb') {
      const v = verbParts(e);
      if (v) entry.v = v;
    }
    if (entry.g) lexicon[key] = entry;
  }
  return key;
}
/** Articles before pronouns before everything else: "die" is first of all the article. */
const PRIORITY = ['article', 'det', 'pron', 'noun', 'verb', 'adj', 'adv', 'prep', 'conj'];
const byPriority = (es: Wiki[]) => [...es].sort((a, b) => (PRIORITY.indexOf(a.p) + 99) % 99 - (PRIORITY.indexOf(b.p) + 99) % 99);
const taughtByLemma = new Map<string, string[]>();
for (const [k, e] of Object.entries(lexicon)) {
  const lemma = k.replace(/^(der|die|das|sich) /, '');
  taughtByLemma.set(lemma, [...(taughtByLemma.get(lemma) ?? []), k]);
  void e;
}
for (const s of surfaces) {
  if (forms.get(s)?.some((k) => lexicon[k]?.l)) continue;
  const keys: string[] = [];
  const add = (k: string) => {
    if (lexicon[k] && !keys.includes(k)) keys.push(k);
  };
  for (const k of forms.get(s) ?? []) add(k);
  // The word itself as a lemma.
  for (const e of byPriority(byWord.get(s) ?? [])) add(taughtByLemma.get(e.w)?.[0] ?? background(e));
  // Inflected forms: Wiktionary's form-of entries, then any entry listing it as a form.
  for (const l of lowered.has(s) ? [] : (formOf.get(s) ?? [])) {
    for (const k of taughtByLemma.get(l) ?? []) add(k);
    for (const e of byWord.get(l) ?? []) add(background(e));
  }
  // Lower-cased sentence starts only count as themselves, never as some other word's form.
  if (!keys.length && !lowered.has(s)) for (const e of formIndex.get(s) ?? []) add(taughtByLemma.get(e.w)?.[0] ?? background(e));
  if (keys.length) forms.set(s, keys.slice(0, 4));
}

// 6. Write, sorted for stable diffs.
const sorted = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b, 'de')));
const out = join(root, 'content/data');
writeFileSync(join(out, 'lexicon.json'), JSON.stringify(sorted(lexicon)) + '\n');
writeFileSync(join(out, 'forms.json'), JSON.stringify(sorted(Object.fromEntries(forms))) + '\n');
writeFileSync(join(out, 'verbs.json'), JSON.stringify(sorted(verbs)) + '\n');
writeFileSync(join(out, 'issues.json'), JSON.stringify(issues, null, 1) + '\n');
const taughtCount = Object.values(lexicon).filter((e) => e.l).length;
const known = (s: string) => forms.has(s) || !!lexicon[s];
const unknown = [...surfaces].filter((s) => !lowered.has(s) && !known(s) && !known(s.charAt(0).toLowerCase() + s.slice(1)));
console.log(`${taughtCount} taught words, ${Object.keys(lexicon).length - taughtCount} background entries, ${forms.size} forms, ${Object.keys(verbs).length} verb tables.`);
console.log(`${unknown.length} word forms in the course text have no entry${unknown.length ? `: ${unknown.slice(0, 40).join(', ')}${unknown.length > 40 ? '…' : ''}` : ''}.`);
if (issues.length) console.log(`\n${issues.length} issue(s) in word lists (content/data/issues.json):\n  ${issues.join('\n  ')}`);
