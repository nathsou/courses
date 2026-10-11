/**
 * The family in the FamilyTree widget: three generations around Lena and Jonas, with the words
 * for each relation (`de`, German; `en`, English) in both sexes.
 */

export type Sex = 'm' | 'f';

export interface Person {
  id: string;
  name: string;
  sex: Sex;
  parents?: [string, string];
  spouse?: string;
  /** Generation (0 = grandparents) and horizontal position in per cent, for the drawing. */
  row: number;
  x: number;
}

export const FAMILY: Person[] = [
  { id: 'klaus', name: 'Klaus', sex: 'm', spouse: 'helga', row: 0, x: 15 },
  { id: 'helga', name: 'Helga', sex: 'f', spouse: 'klaus', row: 0, x: 35 },
  { id: 'mehmet', name: 'Mehmet', sex: 'm', spouse: 'fatma', row: 0, x: 65 },
  { id: 'fatma', name: 'Fatma', sex: 'f', spouse: 'mehmet', row: 0, x: 85 },
  { id: 'markus', name: 'Markus', sex: 'm', spouse: 'sabine', row: 1, x: 10 },
  { id: 'sabine', name: 'Sabine', sex: 'f', parents: ['klaus', 'helga'], spouse: 'markus', row: 1, x: 30 },
  { id: 'thomas', name: 'Thomas', sex: 'm', parents: ['klaus', 'helga'], spouse: 'aylin', row: 1, x: 50 },
  { id: 'aylin', name: 'Aylin', sex: 'f', parents: ['mehmet', 'fatma'], spouse: 'thomas', row: 1, x: 70 },
  { id: 'emre', name: 'Emre', sex: 'm', parents: ['mehmet', 'fatma'], row: 1, x: 90 },
  { id: 'mia', name: 'Mia', sex: 'f', parents: ['markus', 'sabine'], row: 2, x: 10 },
  { id: 'noah', name: 'Noah', sex: 'm', parents: ['markus', 'sabine'], row: 2, x: 30 },
  { id: 'lena', name: 'Lena', sex: 'f', parents: ['thomas', 'aylin'], row: 2, x: 50 },
  { id: 'jonas', name: 'Jonas', sex: 'm', parents: ['thomas', 'aylin'], row: 2, x: 70 },
];

export type Relation =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'grandparent'
  | 'grandchild'
  | 'uncle'
  | 'cousin'
  | 'nephew'
  | 'parentInLaw'
  | 'childInLaw'
  | 'siblingInLaw';

export interface Word {
  de: string;
  en: string;
}

export const RELATION_WORDS: Record<Relation, Record<Sex, Word>> = {
  parent: { m: { de: 'Vater', en: 'father' }, f: { de: 'Mutter', en: 'mother' } },
  child: { m: { de: 'Sohn', en: 'son' }, f: { de: 'Tochter', en: 'daughter' } },
  sibling: { m: { de: 'Bruder', en: 'brother' }, f: { de: 'Schwester', en: 'sister' } },
  spouse: { m: { de: 'Mann', en: 'husband' }, f: { de: 'Frau', en: 'wife' } },
  grandparent: { m: { de: 'Großvater', en: 'grandfather' }, f: { de: 'Großmutter', en: 'grandmother' } },
  grandchild: { m: { de: 'Enkel', en: 'grandson' }, f: { de: 'Enkelin', en: 'granddaughter' } },
  uncle: { m: { de: 'Onkel', en: 'uncle' }, f: { de: 'Tante', en: 'aunt' } },
  cousin: { m: { de: 'Cousin', en: 'cousin' }, f: { de: 'Cousine', en: 'cousin' } },
  nephew: { m: { de: 'Neffe', en: 'nephew' }, f: { de: 'Nichte', en: 'niece' } },
  parentInLaw: { m: { de: 'Schwiegervater', en: 'father-in-law' }, f: { de: 'Schwiegermutter', en: 'mother-in-law' } },
  childInLaw: { m: { de: 'Schwiegersohn', en: 'son-in-law' }, f: { de: 'Schwiegertochter', en: 'daughter-in-law' } },
  siblingInLaw: { m: { de: 'Schwager', en: 'brother-in-law' }, f: { de: 'Schwägerin', en: 'sister-in-law' } },
};

/** The relations the quiz asks about (the A1 family words). */
export const QUIZ_RELATIONS: Relation[] = ['parent', 'child', 'sibling', 'spouse', 'grandparent', 'grandchild', 'uncle', 'cousin'];
