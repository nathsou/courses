/**
 * Family relations: who someone is to someone else ("Sabine ist Lenas Tante"), and the
 * possessive -s of names (Lenas, but Jonas').
 */
import { RELATION_WORDS, QUIZ_RELATIONS, type Person, type Relation, type Word } from '$lib/widgets/data/family';
import { shuffle } from '$lib/exercises/shuffle';

/** The genitive of a name: Lenas, Mehmets; an apostrophe after s, ß, x, z (Jonas', Max', Fritz'). */
export function genitive(name: string): string {
  return /(s|ß|x|z|ce)$/i.test(name) ? `${name}'` : `${name}s`;
}

export class Family {
  private byId: Map<string, Person>;
  constructor(public people: Person[]) {
    this.byId = new Map(people.map((p) => [p.id, p]));
  }
  get(id: string): Person {
    const p = this.byId.get(id);
    if (!p) throw new Error(`No one called ${id}`);
    return p;
  }
  parents(id: string): string[] {
    return this.get(id).parents ?? [];
  }
  children(id: string): string[] {
    return this.people.filter((p) => p.parents?.includes(id)).map((p) => p.id);
  }
  siblings(id: string): string[] {
    const ps = this.parents(id);
    if (!ps.length) return [];
    return this.people.filter((p) => p.id !== id && p.parents?.some((x) => ps.includes(x))).map((p) => p.id);
  }
  spouse(id: string): string | undefined {
    return this.get(id).spouse;
  }

  /** What `other` is to `me`: relation('lena', 'sabine') → 'uncle' (Sabine is Lena's aunt). */
  relation(me: string, other: string): Relation | null {
    if (me === other) return null;
    const has = (ids: (string | undefined)[]) => ids.includes(other);
    const parents = this.parents(me);
    const siblings = this.siblings(me);
    const spouse = this.spouse(me);
    if (has(parents)) return 'parent';
    if (has(this.children(me))) return 'child';
    if (has(siblings)) return 'sibling';
    if (spouse === other) return 'spouse';
    if (has(parents.flatMap((p) => this.parents(p)))) return 'grandparent';
    if (has(this.children(me).flatMap((c) => this.children(c)))) return 'grandchild';
    const parentsSiblings = parents.flatMap((p) => this.siblings(p));
    if (has(parentsSiblings) || has(parentsSiblings.map((s) => this.spouse(s)))) return 'uncle';
    if (has(parentsSiblings.flatMap((s) => this.children(s)))) return 'cousin';
    const spouseSiblings = spouse ? this.siblings(spouse) : [];
    if (has([...siblings, ...spouseSiblings].flatMap((s) => this.children(s)))) return 'nephew';
    if (spouse && has(this.parents(spouse))) return 'parentInLaw';
    if (has(this.children(me).map((c) => this.spouse(c)))) return 'childInLaw';
    if (has(spouseSiblings) || has(siblings.map((s) => this.spouse(s)))) return 'siblingInLaw';
    return null;
  }

  /** The word for what `other` is to `me` (Tante), or null if they are not related. */
  word(me: string, other: string): Word | null {
    const r = this.relation(me, other);
    return r ? RELATION_WORDS[r][this.get(other).sex] : null;
  }

  /** "Das ist Sabine, Lenas Tante." */
  introduce(me: string, other: string): { de: string; en: string } {
    const o = this.get(other);
    if (me === other) return { de: `Das ist ${o.name}.`, en: `This is ${o.name}.` };
    const w = this.word(me, other);
    const m = this.get(me);
    if (!w) return { de: `Das ist ${o.name}. ${o.sex === 'm' ? 'Er' : 'Sie'} ist nicht mit ${m.name} verwandt.`, en: `This is ${o.name}, who is not related to ${m.name}.` };
    return { de: `Das ist ${o.name}, ${genitive(m.name)} ${w.de}.`, en: `This is ${o.name}, ${m.name}’s ${w.en}.` };
  }
}

export interface FamilyQuestion {
  me: string;
  relation: Relation;
  /** The German question: "Wer ist Lenas Tante?" */
  de: string;
  /** Everyone who is a right answer. */
  answers: string[];
}

/** Every question with at least one answer, about the quiz relations, in both sexes. */
export function allQuestions(f: Family): FamilyQuestion[] {
  const out: FamilyQuestion[] = [];
  for (const me of f.people)
    for (const relation of QUIZ_RELATIONS)
      for (const sex of ['m', 'f'] as const) {
        const answers = f.people.filter((p) => p.sex === sex && f.relation(me.id, p.id) === relation).map((p) => p.id);
        if (!answers.length) continue;
        const word = RELATION_WORDS[relation][sex].de;
        out.push({ me: me.id, relation, de: `Wer ist ${genitive(me.name)} ${word}?`, answers });
      }
  return out;
}

/** A round of questions, no two about the same person and relation. */
export function familyRound(f: Family, count: number, seed: number): FamilyQuestion[] {
  const seen = new Set<string>();
  const out: FamilyQuestion[] = [];
  for (const q of shuffle(allQuestions(f), seed)) {
    const k = `${q.me}:${q.relation}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= count) break;
  }
  return out;
}
