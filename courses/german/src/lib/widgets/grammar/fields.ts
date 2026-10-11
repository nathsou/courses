/**
 * The topological field model: Vorfeld | finite verb (left bracket) | Mittelfeld | verb at the
 * end (right bracket) | Nachfeld. Builds the fields of statements, questions and clauses with
 * weil/dass/ob/wenn from the WordOrder presets. Pure, for testing.
 */
import type { MainPreset, SubPreset, Lead } from '../data/word-order';

export type SlotKind = 'subject' | 'chunk' | 'verb' | 'end' | 'q' | 'conj' | 'clause' | 'nach';
export interface Slot {
  key: string;
  de: string;
  kind: SlotKind;
}
export interface Row {
  vorfeld: Slot[];
  left: Slot[];
  mittel: Slot[];
  right: Slot[];
  nach: Slot[];
}
export const FIELDS = ['vorfeld', 'left', 'mittel', 'right', 'nach'] as const;
export type Field = (typeof FIELDS)[number];

/** What goes first: a chunk ("subject", "c0", "c1"…), a yes/no question, or a W-question for a chunk. */
export type Front = { kind: 'chunk'; id: string } | { kind: 'yesno' } | { kind: 'wh'; id: string };

const empty = (): Row => ({ vorfeld: [], left: [], mittel: [], right: [], nach: [] });

/** The chunks of a preset with stable keys: "subject", "c0", "c1"… */
export function chunksOf(p: MainPreset): (Slot & { q?: string; question?: string })[] {
  return [{ key: 'subject', kind: 'subject' as const, ...p.subject }, ...p.chunks.map((c, i) => ({ key: `c${i}`, kind: 'chunk' as const, ...c }))];
}

export function mainRow(p: MainPreset, front: Front): Row {
  const row = empty();
  const all = chunksOf(p);
  const lead = front.kind === 'yesno' ? undefined : all.find((c) => c.key === front.id);
  if (front.kind === 'chunk' && lead) row.vorfeld.push(slot(lead));
  if (front.kind === 'wh' && lead?.q) row.vorfeld.push({ key: `q-${lead.key}`, de: lead.q, kind: 'q' });
  row.left.push({ key: 'verb', de: p.verb, kind: 'verb' });
  row.mittel = all.filter((c) => c !== lead || front.kind === 'yesno').map(slot);
  if (p.end) row.right.push({ key: 'end', de: p.end, kind: 'end' });
  if (p.nach) row.nach.push({ key: 'nach', de: p.nach, kind: 'nach' });
  return row;
}

const slot = (c: Slot): Slot => ({ key: c.key, de: c.de, kind: c.kind });

/** Lower-case "ich" etc. inside a sentence; the first word gets a capital. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The sentence a row spells, with commas around clauses. */
export function rowText(row: Row, punct = '.'): string {
  const slots = FIELDS.flatMap((f) => row[f]);
  const parts = slots.map((s, i) => {
    let t = i === 0 ? cap(s.de) : s.de;
    if (s.kind === 'clause') {
      if (i > 0) t = `, ${t}`;
      if (i < slots.length - 1) t += ',';
    }
    return t;
  });
  return parts.join(' ').replace(/ , /g, ', ') + punct;
}

/** A subordinate clause: conjunction | Mittelfeld | verb cluster (finite verb last). */
export function subRow(p: SubPreset, conj: string): Row {
  const row = empty();
  row.left.push({ key: 'conj', de: conj, kind: 'conj' });
  row.mittel = [{ key: 'subject', de: p.subject, kind: 'subject' }, ...p.chunks.map((c, i) => ({ key: `c${i}`, de: c, kind: 'chunk' as const }))];
  if (p.end && p.prefix) row.right.push({ key: 'verb', de: p.end + p.verb, kind: 'verb' });
  else {
    if (p.end) row.right.push({ key: 'end', de: p.end, kind: 'end' });
    row.right.push({ key: 'verb', de: p.verb, kind: 'verb' });
  }
  return row;
}

/** The clause as a main clause on its own: "Ich stehe morgen früh auf." */
export function standalone(p: SubPreset): Row {
  const row = empty();
  row.vorfeld.push({ key: 'subject', de: p.subject, kind: 'subject' });
  row.left.push({ key: 'verb', de: p.verb, kind: 'verb' });
  row.mittel = p.chunks.map((c, i) => ({ key: `c${i}`, de: c, kind: 'chunk' as const }));
  if (p.end) row.right.push({ key: 'end', de: p.end, kind: 'end' });
  return row;
}

/** Text of a row without its final punctuation and capital (for embedding). */
export function clauseText(row: Row): string {
  return FIELDS.flatMap((f) => row[f])
    .map((s) => s.de)
    .join(' ');
}

/** The main clause with the subordinate clause in its Nachfeld, or (subFirst) in its Vorfeld. */
export function withClause(lead: Lead, clause: string, subFirst: boolean): { row: Row; punct: string } {
  const row = empty();
  const cl: Slot = { key: 'clause', de: clause, kind: 'clause' };
  const subj: Slot = { key: 'lead-subject', de: lead.subject, kind: 'subject' };
  const rest: Slot[] = lead.rest ? [{ key: 'lead-rest', de: lead.rest, kind: 'chunk' }] : [];
  row.left.push({ key: 'lead-verb', de: lead.verb, kind: 'verb' });
  if (lead.end) row.right.push({ key: 'lead-end', de: lead.end, kind: 'end' });
  if (subFirst && !lead.ask) {
    row.vorfeld.push(cl);
    row.mittel = [subj, ...rest];
  } else {
    if (!lead.ask) row.vorfeld.push(subj);
    row.mittel = lead.ask ? [subj, ...rest] : rest;
    row.nach.push(cl);
  }
  return { row, punct: lead.ask ? '?' : '.' };
}

/** Conjunctions whose clause can come first (Weil ich krank bin, bleibe ich …). */
export const CAN_FRONT = new Set(['weil', 'wenn']);
