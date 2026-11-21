/**
 * Two-level minimisation for small functions: prime implicants by enumerating cubes, and a minimum cover by
 * exhaustive search. A cube is a string over {0, 1, -}, one character per variable, most significant first.
 */

export function minterms(cube: string): number[] {
  const out: number[] = [];
  const n = cube.length;
  const rec = (i: number, acc: number) => {
    if (i === n) {
      out.push(acc);
      return;
    }
    const c = cube[i]!;
    const bit = 1 << (n - 1 - i);
    if (c !== '1') rec(i + 1, acc);
    if (c !== '0') rec(i + 1, acc | bit);
  };
  rec(0, 0);
  return out.sort((a, b) => a - b);
}

/** All cubes over n variables. */
function cubes(n: number): string[] {
  let out = [''];
  for (let i = 0; i < n; i++) out = out.flatMap((c) => [`${c}0`, `${c}1`, `${c}-`]);
  return out;
}

/** Prime implicants of the function with these ones and don't-cares. */
export function primeImplicants(n: number, ones: number[], dcs: number[] = []): string[] {
  const allowed = new Set([...ones, ...dcs]);
  const onesSet = new Set(ones);
  const valid = cubes(n).filter((c) => minterms(c).every((m) => allowed.has(m)) && minterms(c).some((m) => onesSet.has(m)));
  const validSet = new Set(cubes(n).filter((c) => minterms(c).every((m) => allowed.has(m))));
  return valid.filter((c) => {
    // Prime: no single 0/1 can be widened to '-' and stay valid.
    for (let i = 0; i < n; i++) if (c[i] !== '-' && validSet.has(c.slice(0, i) + '-' + c.slice(i + 1))) return false;
    return true;
  });
}

const literals = (c: string) => [...c].filter((x) => x !== '-').length;

/** A minimum cover of the ones by prime implicants: fewest terms, then fewest literals. */
export function minimumCover(n: number, ones: number[], dcs: number[] = []): string[] {
  const pis = primeImplicants(n, ones, dcs);
  if (!ones.length) return [];
  let best: string[] | null = null;
  const covers = (set: string[]) => ones.every((m) => set.some((c) => minterms(c).includes(m)));
  const total = pis.length;
  for (let mask = 1; mask < 1 << total; mask++) {
    const set = pis.filter((_, i) => mask & (1 << i));
    if (best && (set.length > best.length || (set.length === best.length && set.reduce((s, c) => s + literals(c), 0) >= best.reduce((s, c) => s + literals(c), 0)))) continue;
    if (covers(set)) best = set;
  }
  return best ?? [];
}

/** "q3·¬q0" for a cube, given variable names (most significant first). */
export function termText(cube: string, names: string[]): string {
  const parts = [...cube].flatMap((c, i) => (c === '-' ? [] : c === '1' ? [names[i]!] : [`¬${names[i]!}`]));
  return parts.length ? parts.join('·') : '1';
}

/** The decade counter's next-state bit as a function of q (with en = 1, rst = 0). */
export function counterNextBit(bit: number, useDontCares: boolean): { ones: number[]; dcs: number[] } {
  const ones: number[] = [];
  const dcs: number[] = [];
  for (let q = 0; q < 16; q++) {
    if (q >= 10 && useDontCares) {
      dcs.push(q);
      continue;
    }
    const next = q === 9 ? 0 : (q + 1) & 15;
    if ((next >> bit) & 1) ones.push(q);
  }
  return { ones, dcs };
}
