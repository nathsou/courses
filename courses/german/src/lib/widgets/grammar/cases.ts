/**
 * CaseMachine logic: a verb, nouns in roles, and the sentence with the right articles in any
 * word order. Pure, for testing.
 */
import { determiner, joined, nounForm, type Case, type Form, type Gender } from '$lib/de/declension';
import { CASE_NOUNS, CASE_VERBS, type CaseNoun, type CaseVerb } from '../data/case-machine';

export type Role = 'nom' | 'acc' | 'dat';
export type ArticleMode = 'def' | 'indef';

export interface Setup {
  verb: string;
  nouns: Partial<Record<Role, string>>;
  article: ArticleMode;
  /** The role in first position (the Vorfeld). */
  front: Role;
  /** A genitive owner, attached to one of the roles: "der Hund des Nachbarn". */
  owner?: { noun: string; of: Role } | null;
}

export interface NP {
  role: Role;
  article: Form | null;
  noun: Form;
  g: Gender;
  /** The genitive attribute, if any. */
  owner?: { article: Form; noun: Form; g: Gender };
  text: string;
}

export interface Built {
  /** Constituents in order; the verb is a string between them. */
  order: (NP | { verb: string })[];
  text: string;
  en: string;
}

export const nounById = (id: string): CaseNoun => CASE_NOUNS.find((n) => n.id === id) ?? CASE_NOUNS[0]!;
export const verbById = (id: string): CaseVerb => CASE_VERBS.find((v) => v.id === id) ?? CASE_VERBS[0]!;

/** The roles a verb has: always a subject, then its objects. */
export const rolesOf = (v: CaseVerb): Role[] => ['nom', ...v.objects];

/** Which nouns may fill a role of a verb. */
export function fits(v: CaseVerb, role: Role, n: CaseNoun): boolean {
  const want = role === 'nom' ? v.subject : role === 'acc' ? v.acc : v.dat;
  return want === 'any' || want === n.kind;
}

/** Verbs available for a set of cases (nom,acc: only verbs with an accusative object). */
export function verbsFor(cases: Case[]): CaseVerb[] {
  return CASE_VERBS.filter((v) => v.objects.every((o) => cases.includes(o)));
}

/** Fill any empty or unfitting roles with fitting nouns not used elsewhere. */
export function complete(s: Setup): Setup {
  const v = verbById(s.verb);
  const nouns: Partial<Record<Role, string>> = {};
  for (const r of rolesOf(v)) {
    const cur = s.nouns[r];
    const used = new Set(Object.values(nouns));
    if (cur && fits(v, r, nounById(cur)) && !used.has(cur)) nouns[r] = cur;
    else nouns[r] = CASE_NOUNS.find((n) => fits(v, r, n) && !used.has(n.id) && !Object.values(s.nouns).includes(n.id))?.id ?? CASE_NOUNS.find((n) => fits(v, r, n) && !used.has(n.id))!.id;
  }
  const front = rolesOf(v).includes(s.front) ? s.front : 'nom';
  const owner = s.owner && rolesOf(v).includes(s.owner.of) && !Object.values(nouns).includes(s.owner.noun) ? s.owner : null;
  return { ...s, nouns, front, owner };
}

function np(role: Role, n: CaseNoun, mode: ArticleMode, owner?: CaseNoun): NP {
  const g = n.g;
  const article = determiner(mode === 'def' ? 'der' : 'ein', role, g);
  const noun = nounForm(n, role, g === 'pl');
  const parts = [article ? joined(article) : '', joined(noun)].filter(Boolean);
  let o: NP['owner'];
  if (owner) {
    o = { article: determiner('der', 'gen', owner.g)!, noun: nounForm(owner, 'gen', owner.g === 'pl'), g: owner.g };
    parts.push(joined(o.article), joined(o.noun));
  }
  return { role, article, noun, g, owner: o, text: parts.join(' ') };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** English noun phrase: "the dog", "a dog", "an apple", "children", "the neighbour's dog". */
export function englishNP(n: CaseNoun, mode: ArticleMode, owner?: CaseNoun): string {
  const plural = n.g === 'pl';
  if (owner) {
    const poss = owner.en.endsWith('s') ? `${owner.en}'` : `${owner.en}'s`;
    return mode === 'def' || plural ? `the ${poss} ${n.en}` : `a ${n.en} of the ${poss}`;
  }
  if (mode === 'def') return `the ${n.en}`;
  if (plural) return n.en;
  return /^[aeiou]/.test(n.en) ? `an ${n.en}` : `a ${n.en}`;
}

export function build(input: Setup): Built {
  const s = complete(input);
  const v = verbById(s.verb);
  const owner = s.owner ? nounById(s.owner.noun) : undefined;
  const nps: Record<string, NP> = {};
  for (const r of rolesOf(v)) nps[r] = np(r, nounById(s.nouns[r]!), s.article, s.owner?.of === r ? owner : undefined);
  const subj = nounById(s.nouns.nom!);
  const verb = subj.g === 'pl' ? v.pl : v.sg;
  // Vorfeld, verb, then the rest in the neutral order: subject, dative, accusative.
  const rest = rolesOf(v).filter((r) => r !== s.front);
  const order: Built['order'] = [nps[s.front]!, { verb }, ...rest.map((r) => nps[r]!)];
  const words = order.map((x) => ('verb' in x ? x.verb : x.text)).join(' ');
  const text = cap(words) + '.';
  const en = v.pattern
    .replace('S', englishNP(subj, s.article, s.owner?.of === 'nom' ? owner : undefined))
    .replace('V', subj.g === 'pl' ? v.enPl : v.en)
    .replace('D', s.nouns.dat ? englishNP(nounById(s.nouns.dat), s.article, s.owner?.of === 'dat' ? owner : undefined) : '')
    .replace('A', s.nouns.acc ? englishNP(nounById(s.nouns.acc), s.article, s.owner?.of === 'acc' ? owner : undefined) : '');
  return { order, text, en: cap(en) + '.' };
}

/**
 * Fronting the object is ambiguous when neither noun phrase shows its case: feminine, neuter and
 * plural look the same in the nominative and accusative ("Die Katze sieht die Frau").
 */
export function ambiguous(input: Setup): boolean {
  const s = complete(input);
  if (s.front !== 'acc' || !s.nouns.acc) return false;
  const same = (r: Role) => {
    const n = nounById(s.nouns[r]!);
    const owner = s.owner?.of === r ? nounById(s.owner.noun) : undefined;
    return np('nom', n, s.article, owner).text === np('acc', n, s.article, owner).text;
  };
  return same('nom') && same('acc');
}
