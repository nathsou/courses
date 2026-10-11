/** Structural checks for exercise YAML, run over every lesson by the content tests. */
import type { ChooseItem } from './types';

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
const str = (x: unknown) => typeof x === 'string' && x.trim().length > 0;

function chooseItem(it: unknown, where: string, errors: string[]): void {
  if (!isObj(it)) return void errors.push(`${where}: item must be an object`);
  const c = it as unknown as ChooseItem;
  if (!Array.isArray(c.options) || c.options.length < 2) errors.push(`${where}: needs at least two options`);
  else if (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= c.options.length) errors.push(`${where}: answer ${c.answer} out of range`);
  else if (new Set(c.options.map(String)).size !== c.options.length) errors.push(`${where}: duplicate options`);
  if (!c.prompt && !c.de && !c.audio) errors.push(`${where}: needs a prompt, de or audio`);
  if (c.listen && !c.audio && !c.de) errors.push(`${where}: listen needs audio or de`);
}

function items(d: Obj, where: string, errors: string[]): unknown[] {
  if (!Array.isArray(d.items) || !d.items.length) {
    errors.push(`${where}: needs items`);
    return [];
  }
  return d.items;
}

export function validateExercise(kind: string, d: unknown, where: string): string[] {
  const errors: string[] = [];
  if (!isObj(d)) return [`${where}: exercise must be a YAML mapping`];
  switch (kind) {
    case 'choose':
      items(d, where, errors).forEach((it, i) => chooseItem(it, `${where} item ${i + 1}`, errors));
      break;
    case 'type':
      items(d, where, errors).forEach((it, i) => {
        const w = `${where} item ${i + 1}`;
        if (!isObj(it)) return void errors.push(`${w}: item must be an object`);
        const answers = Array.isArray(it.answer) ? it.answer : [it.answer];
        if (!answers.length || !answers.every(str)) errors.push(`${w}: needs an answer`);
        if (!it.prompt && !it.de && !it.listen) errors.push(`${w}: needs a prompt, de or listen`);
        if (it.de !== undefined && String(it.de).split('___').length > 2) errors.push(`${w}: at most one ___ gap`);
      });
      break;
    case 'cloze':
      items(d, where, errors).forEach((it, i) => {
        if (!isObj(it) || !str(it.de)) return void errors.push(`${where} item ${i + 1}: needs de`);
        if (!/\[[^\]]+\]/.test(String(it.de))) errors.push(`${where} item ${i + 1}: needs at least one [gap]`);
        if (/\[\s*\]/.test(String(it.de))) errors.push(`${where} item ${i + 1}: empty [ ] gap`);
      });
      break;
    case 'gender':
      items(d, where, errors).forEach((it, i) => {
        if (!str(it) || /^(der|die|das) /.test(String(it))) errors.push(`${where} item ${i + 1}: give the noun without its article`);
      });
      break;
    case 'conjugate':
      items(d, where, errors).forEach((it, i) => {
        if (!isObj(it) || !str(it.verb)) return void errors.push(`${where} item ${i + 1}: needs a verb`);
        if (!['present', 'preterite', 'perfect', 'konj2', 'konj1', 'imperative'].includes(String(it.tense))) errors.push(`${where} item ${i + 1}: unknown tense ${it.tense}`);
        const persons = it.persons as unknown;
        if (persons !== undefined && (!Array.isArray(persons) || persons.some((p) => !Number.isInteger(p) || p < 0 || p > 5))) errors.push(`${where} item ${i + 1}: persons are 0–5 (ich … sie)`);
        if (it.tense === 'imperative' && Array.isArray(persons) && persons.some((p) => p !== 1 && p !== 4)) errors.push(`${where} item ${i + 1}: the imperative has du (1) and ihr (4)`);
      });
      break;
    case 'order':
      items(d, where, errors).forEach((it, i) => {
        if (!isObj(it) || !str(it.en) || !str(it.de)) return void errors.push(`${where} item ${i + 1}: needs en and de`);
        const tiles = String(it.de).split(/\s+/);
        if (tiles.length < 2) errors.push(`${where} item ${i + 1}: needs at least two tiles`);
        for (const alt of (it.also as string[] | undefined) ?? []) {
          const lc = (xs: string[]) => xs.map((x) => x.toLowerCase().replace(/[.!?]$/, '')).sort().join();
          if (lc(alt.split(/\s+/)) !== lc(tiles)) errors.push(`${where} item ${i + 1}: "also" order uses different tiles`);
        }
      });
      break;
    case 'match':
      if (!Array.isArray(d.pairs) || d.pairs.length < 2) errors.push(`${where}: needs at least two pairs`);
      else if (d.pairs.some((p) => !Array.isArray(p) || p.length !== 2)) errors.push(`${where}: each pair needs two entries`);
      else if (d.pairs.length > 8) errors.push(`${where}: at most 8 pairs`);
      break;
    case 'fill':
      items(d, where, errors).forEach((it, i) => {
        if (!isObj(it) || !String(it.de ?? '').includes('___')) return void errors.push(`${where} item ${i + 1}: de needs a ___ gap`);
        chooseItem({ ...it, prompt: 'x' }, `${where} item ${i + 1}`, errors);
      });
      break;
    case 'sort':
      if (!Array.isArray(d.buckets) || d.buckets.length < 2) errors.push(`${where}: needs at least two buckets`);
      if (!Array.isArray(d.items) || !d.items.length) errors.push(`${where}: needs items`);
      else
        (d.items as unknown[]).forEach((it, i) => {
          if (!Array.isArray(it) || !str(it[0]) || !Number.isInteger(it[1]) || it[1] < 0 || it[1] >= (d.buckets as unknown[]).length)
            errors.push(`${where} item ${i + 1}: should be [text, bucket index]`);
        });
      break;
    case 'scene':
      if (!str(d.title) || !str(d.partner)) errors.push(`${where}: needs title and partner`);
      if (!Array.isArray(d.turns) || !d.turns.length) errors.push(`${where}: needs turns`);
      else
        (d.turns as unknown[]).forEach((t, i) => {
          if (!isObj(t) || !Array.isArray(t.options) || !t.options.length) return void errors.push(`${where} turn ${i + 1}: needs options`);
          if ((t.options as Obj[]).some((o) => !str(o.de))) errors.push(`${where} turn ${i + 1}: every option needs de`);
          const ok = (t.options as Obj[]).filter((o) => o.ok);
          if (ok.length < 1) errors.push(`${where} turn ${i + 1}: needs at least one ok option`);
          if ((t.options as Obj[]).some((o) => !o.ok && !o.reply)) errors.push(`${where} turn ${i + 1}: wrong options need a reply`);
        });
      break;
    case 'story':
      if (!str(d.title)) errors.push(`${where}: needs a title`);
      if (!Array.isArray(d.paragraphs) || !d.paragraphs.length) errors.push(`${where}: needs paragraphs`);
      else if ((d.paragraphs as unknown[]).some((p) => !isObj(p) || !str(p.de))) errors.push(`${where}: every paragraph needs de`);
      ((d.questions as unknown[]) ?? []).forEach((q, i) => chooseItem(q, `${where} question ${i + 1}`, errors));
      break;
    case 'read':
      if (!str(d.text)) errors.push(`${where}: needs text`);
      if (!Array.isArray(d.questions) || !d.questions.length) errors.push(`${where}: needs questions`);
      else
        (d.questions as unknown[]).forEach((q, i) => {
          if (isObj(q) && 'claim' in q) {
            if (!str(q.claim)) errors.push(`${where} question ${i + 1}: needs a claim`);
            if (typeof q.answer !== 'boolean') errors.push(`${where} question ${i + 1}: answer must be true or false`);
          } else chooseItem(q, `${where} question ${i + 1}`, errors);
        });
      break;
    case 'speak':
      items(d, where, errors);
      break;
    case 'roleplay':
      for (const k of ['title', 'setting', 'goal', 'partner', 'opener']) if (!str(d[k])) errors.push(`${where}: needs ${k}`);
      break;
    case 'compose':
      if (!str(d.task)) errors.push(`${where}: needs a task`);
      break;
    default:
      errors.push(`${where}: unknown exercise kind ${kind}`);
  }
  return errors;
}
