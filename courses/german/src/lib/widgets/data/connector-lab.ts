/**
 * ConnectorLab: pairs of clauses and the connectors that make sense with them. Each clause is
 * given whole (de) and in parts, so the widget can put the verb second, first or last. For each
 * connector, `first` says which clause comes first (the connector introduces the other one).
 */

export interface Clause {
  de: string;
  en: string;
  subject: string;
  verb: string;
  middle?: string;
  /** A separable prefix that joins the verb at the end of a subordinate clause. */
  prefix?: string;
}

export type ConnectorId = 'und' | 'aber' | 'oder' | 'denn' | 'weil' | 'obwohl' | 'wenn' | 'dass' | 'damit' | 'deshalb' | 'trotzdem' | 'dann' | 'außerdem';

export interface PairConnector {
  c: ConnectorId;
  first: 'x' | 'y';
  en: string;
}

export interface ClausePair {
  id: string;
  x: Clause;
  y: Clause;
  connectors: PairConnector[];
}

export type ConnectorKind = 'zero' | 'end' | 'invert';

export const CONNECTORS: { c: ConnectorId; kind: ConnectorKind; gloss: string }[] = [
  { c: 'und', kind: 'zero', gloss: 'and' },
  { c: 'aber', kind: 'zero', gloss: 'but' },
  { c: 'oder', kind: 'zero', gloss: 'or' },
  { c: 'denn', kind: 'zero', gloss: 'because, for' },
  { c: 'weil', kind: 'end', gloss: 'because' },
  { c: 'obwohl', kind: 'end', gloss: 'although' },
  { c: 'wenn', kind: 'end', gloss: 'if, when' },
  { c: 'dass', kind: 'end', gloss: 'that' },
  { c: 'damit', kind: 'end', gloss: 'so that' },
  { c: 'deshalb', kind: 'invert', gloss: 'that’s why' },
  { c: 'trotzdem', kind: 'invert', gloss: 'all the same' },
  { c: 'dann', kind: 'invert', gloss: 'then' },
  { c: 'außerdem', kind: 'invert', gloss: 'besides' },
];

export const KIND_RULES: Record<ConnectorKind, { label: string; rule: string }> = {
  zero: { label: 'Position 0: nothing changes', rule: 'The connector stands outside the clause (position 0), so the clause keeps its normal order: subject, then the verb in position 2.' },
  end: { label: 'Verb to the end', rule: 'The connector starts a subordinate clause, and the conjugated verb goes to the very end (a separable verb joins up again).' },
  invert: { label: 'Verb straight after', rule: 'The connector is an adverb that fills position 1 itself, so the verb comes straight after it and the subject follows the verb.' },
};

export const CLAUSE_PAIRS: ClausePair[] = [
  {
    id: 'tired',
    x: { de: 'Ich bin müde.', en: 'I’m tired.', subject: 'ich', verb: 'bin', middle: 'müde' },
    y: { de: 'Ich gehe ins Bett.', en: 'I’m going to bed.', subject: 'ich', verb: 'gehe', middle: 'ins Bett' },
    connectors: [
      { c: 'und', first: 'x', en: 'I’m tired and I’m going to bed.' },
      { c: 'denn', first: 'y', en: 'I’m going to bed, for I’m tired.' },
      { c: 'weil', first: 'y', en: 'I’m going to bed because I’m tired.' },
      { c: 'deshalb', first: 'x', en: 'I’m tired, so I’m going to bed.' },
    ],
  },
  {
    id: 'rain',
    x: { de: 'Es regnet.', en: 'It’s raining.', subject: 'es', verb: 'regnet' },
    y: { de: 'Wir gehen spazieren.', en: 'We’re going for a walk.', subject: 'wir', verb: 'gehen', middle: 'spazieren' },
    connectors: [
      { c: 'aber', first: 'x', en: 'It’s raining, but we’re going for a walk.' },
      { c: 'obwohl', first: 'y', en: 'We’re going for a walk although it’s raining.' },
      { c: 'trotzdem', first: 'x', en: 'It’s raining; we’re going for a walk all the same.' },
    ],
  },
  {
    id: 'time',
    x: { de: 'Ich habe Zeit.', en: 'I have time.', subject: 'ich', verb: 'habe', middle: 'Zeit' },
    y: { de: 'Ich komme mit.', en: 'I’ll come along.', subject: 'ich', verb: 'komme', prefix: 'mit' },
    connectors: [
      { c: 'wenn', first: 'y', en: 'I’ll come along if I have time.' },
      { c: 'weil', first: 'y', en: 'I’m coming along because I have time.' },
      { c: 'denn', first: 'y', en: 'I’m coming along, for I have time.' },
      { c: 'deshalb', first: 'x', en: 'I have time, so I’m coming along.' },
    ],
  },
  {
    id: 'berlin',
    x: { de: 'Ich rufe dich an.', en: 'I’ll phone you.', subject: 'ich', verb: 'rufe', middle: 'dich', prefix: 'an' },
    y: { de: 'Ich komme in Berlin an.', en: 'I arrive in Berlin.', subject: 'ich', verb: 'komme', middle: 'in Berlin', prefix: 'an' },
    connectors: [
      { c: 'wenn', first: 'x', en: 'I’ll phone you when I arrive in Berlin.' },
      { c: 'dann', first: 'y', en: 'I’ll arrive in Berlin, then I’ll phone you.' },
      { c: 'und', first: 'y', en: 'I’ll arrive in Berlin and I’ll phone you.' },
    ],
  },
  {
    id: 'food',
    x: { de: 'Das Essen war sehr gut.', en: 'The food was very good.', subject: 'das Essen', verb: 'war', middle: 'sehr gut' },
    y: { de: 'Es war nicht teuer.', en: 'It wasn’t expensive.', subject: 'es', verb: 'war', middle: 'nicht teuer' },
    connectors: [
      { c: 'und', first: 'x', en: 'The food was very good and it wasn’t expensive.' },
      { c: 'außerdem', first: 'x', en: 'The food was very good; besides, it wasn’t expensive.' },
      { c: 'obwohl', first: 'x', en: 'The food was very good although it wasn’t expensive.' },
    ],
  },
  {
    id: 'slow',
    x: { de: 'Ich spreche langsam.', en: 'I speak slowly.', subject: 'ich', verb: 'spreche', middle: 'langsam' },
    y: { de: 'Du verstehst mich.', en: 'You understand me.', subject: 'du', verb: 'verstehst', middle: 'mich' },
    connectors: [
      { c: 'damit', first: 'x', en: 'I’m speaking slowly so that you understand me.' },
      { c: 'deshalb', first: 'x', en: 'I’m speaking slowly, so you understand me.' },
      { c: 'weil', first: 'y', en: 'You understand me because I’m speaking slowly.' },
      { c: 'denn', first: 'y', en: 'You understand me, for I’m speaking slowly.' },
    ],
  },
  {
    id: 'evening',
    x: { de: 'Wir gehen ins Kino.', en: 'We’re going to the cinema.', subject: 'wir', verb: 'gehen', middle: 'ins Kino' },
    y: { de: 'Wir essen eine Pizza.', en: 'We’re having a pizza.', subject: 'wir', verb: 'essen', middle: 'eine Pizza' },
    connectors: [
      { c: 'und', first: 'x', en: 'We’re going to the cinema and we’re having a pizza.' },
      { c: 'oder', first: 'x', en: 'We’ll go to the cinema or we’ll have a pizza.' },
      { c: 'dann', first: 'x', en: 'We’re going to the cinema, then we’re having a pizza.' },
    ],
  },
  {
    id: 'great',
    x: { de: 'Ich finde es toll.', en: 'I think it’s great.', subject: 'ich', verb: 'finde', middle: 'es toll' },
    y: { de: 'Du kommst mit.', en: 'You’re coming along.', subject: 'du', verb: 'kommst', prefix: 'mit' },
    connectors: [{ c: 'dass', first: 'x', en: 'I think it’s great that you’re coming along.' }],
  },
];
