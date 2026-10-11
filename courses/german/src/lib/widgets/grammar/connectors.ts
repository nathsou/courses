/**
 * ConnectorLab logic: join two clauses with a connector and put the verb where that connector
 * wants it (position 2, the end, or straight after the connector). Pure.
 */
import { CONNECTORS, type Clause, type ClausePair, type ConnectorId, type ConnectorKind } from '../data/connector-lab';

export type TokKind = '' | 'conn' | 'verb' | 'subj';
export interface Tok {
  t: string;
  k: TokKind;
}

export const kindOf = (c: ConnectorId): ConnectorKind => CONNECTORS.find((x) => x.c === c)!.kind;

/** Connectors whose clause may come first ("Weil ich müde bin, gehe ich ins Bett."). */
export const CAN_LEAD = new Set<ConnectorId>(['weil', 'obwohl', 'wenn', 'damit']);

const words = (s: string | undefined, k: TokKind = ''): Tok[] => (s ? [{ t: s, k }] : []);

/** Subject – verb – middle – prefix. */
export const mainOrder = (c: Clause): Tok[] => [...words(c.subject, 'subj'), ...words(c.verb, 'verb'), ...words(c.middle), ...words(c.prefix, 'verb')];
/** Subject – middle – verb (with its prefix joined on). */
export const endOrder = (c: Clause): Tok[] => [...words(c.subject, 'subj'), ...words(c.middle), { t: (c.prefix ?? '') + c.verb, k: 'verb' }];
/** Verb – subject – middle – prefix. */
export const invertedOrder = (c: Clause): Tok[] => [...words(c.verb, 'verb'), ...words(c.subject, 'subj'), ...words(c.middle), ...words(c.prefix, 'verb')];

const ORDER: Record<ConnectorKind, (c: Clause) => Tok[]> = { zero: mainOrder, end: endOrder, invert: invertedOrder };

/** Join two clauses. `order` overrides the word order of the second clause (for wrong quiz options). */
export function join(pair: ClausePair, conn: ConnectorId, opts: { lead?: boolean; order?: ConnectorKind } = {}): Tok[] {
  const pc = pair.connectors.find((x) => x.c === conn);
  const firstIsX = (pc?.first ?? 'x') === 'x';
  const first = firstIsX ? pair.x : pair.y;
  const second = firstIsX ? pair.y : pair.x;
  const kind = kindOf(conn);
  const order = ORDER[opts.order ?? kind];
  const c: Tok = { t: conn, k: 'conn' };
  let toks: Tok[];
  if (opts.lead && kind === 'end' && CAN_LEAD.has(conn)) {
    // The subordinate clause fills position 1, so the main verb follows the comma.
    toks = [c, ...order(second), { t: ',', k: '' }, ...invertedOrder(first)];
  } else {
    const comma = kind !== 'zero' || conn === 'aber' || conn === 'denn' ? [{ t: ',', k: '' as TokKind }] : [];
    toks = [...mainOrder(first), ...comma, c, ...order(second)];
  }
  toks.push({ t: '.', k: '' });
  toks[0] = { ...toks[0]!, t: toks[0]!.t.charAt(0).toUpperCase() + toks[0]!.t.slice(1) };
  return toks;
}

/** The sentence as text, with punctuation attached. */
export function text(toks: Tok[]): string {
  return toks
    .map((x) => x.t)
    .join(' ')
    .replace(/ ([,.])/g, '$1');
}

/** Wrong orders for a quiz: the same connector with the other two word orders (distinct only). */
export function variants(pair: ClausePair, conn: ConnectorId): { right: string; wrong: string[] } {
  const right = text(join(pair, conn));
  const wrong = (['zero', 'end', 'invert'] as ConnectorKind[])
    .filter((k) => k !== kindOf(conn))
    .map((k) => text(join(pair, conn, { order: k })))
    .filter((s, i, xs) => s !== right && xs.indexOf(s) === i);
  return { right, wrong };
}
