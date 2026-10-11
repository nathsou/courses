/**
 * Splits a sentence with a separable verb into highlighted pieces: the prefix, the verb stem,
 * the ge- or zu- inside it, and the auxiliary or modal. Pure, for testing.
 */
import type { SepVerb, Structure } from '../data/separable-verbs';

export type PieceKind = 'text' | 'prefix' | 'stem' | 'infix' | 'aux';
export interface Piece {
  t: string;
  k: PieceKind;
}

const AUX = new Set(['habe', 'hast', 'hat', 'haben', 'habt', 'bin', 'bist', 'ist', 'sind', 'seid']);
const MODALS = new Set(['muss', 'musst', 'müssen', 'kann', 'kannst', 'können', 'will', 'willst', 'wollen', 'darf', 'darfst', 'dürfen', 'soll', 'sollst', 'sollen', 'möchte', 'möchtest', 'möchten']);

/** The pieces of one word, or null if it is not part of the verb. */
function word(w: string, v: SepVerb): Piece[] | null {
  const lw = w.toLowerCase();
  const inf = v.verb.slice(v.prefix.length);
  const base = new Set([...v.base, inf]);
  const keep = (s: string, from: number, to?: number) => w.slice(from, to);
  const p = v.prefix.length;
  if (lw === v.prefix) return [{ t: w, k: 'prefix' }];
  if (lw === v.pp) return [{ t: keep(w, 0, p), k: 'prefix' }, { t: keep(w, p, p + 2), k: 'infix' }, { t: keep(w, p + 2), k: 'stem' }];
  if (lw === `${v.prefix}zu${inf}`) return [{ t: keep(w, 0, p), k: 'prefix' }, { t: keep(w, p, p + 2), k: 'infix' }, { t: keep(w, p + 2), k: 'stem' }];
  if (lw.startsWith(v.prefix) && base.has(lw.slice(p))) return [{ t: keep(w, 0, p), k: 'prefix' }, { t: keep(w, p), k: 'stem' }];
  if (base.has(lw)) return [{ t: w, k: 'stem' }];
  return null;
}

export function pieces(sentence: string, v: SepVerb, structure: Structure): Piece[] {
  const out: Piece[] = [];
  let auxDone = !(structure === 'perfect' || structure === 'modal');
  const push = (p: Piece) => {
    const last = out[out.length - 1];
    if (last && last.k === 'text' && p.k === 'text') last.t += p.t;
    else out.push(p);
  };
  for (const tok of sentence.split(/([\p{L}]+)/u)) {
    if (!tok) continue;
    if (!/^\p{L}+$/u.test(tok)) {
      push({ t: tok, k: 'text' });
      continue;
    }
    const lw = tok.toLowerCase();
    if (!auxDone && (structure === 'perfect' ? AUX : MODALS).has(lw)) {
      out.push({ t: tok, k: 'aux' });
      auxDone = true;
      continue;
    }
    const ps = word(tok, v);
    if (ps) ps.forEach((x) => out.push(x));
    else push({ t: tok, k: 'text' });
  }
  return out;
}
