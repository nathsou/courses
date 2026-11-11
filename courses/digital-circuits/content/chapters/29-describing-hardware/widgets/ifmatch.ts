/**
 * An `if` chain, a `match` and a priority chain, choosing among N inputs of 8 bits, compiled by synth and
 * measured (widgets/IfVsMatch.svelte): the depth of the and-inverter graph as the source describes it (after
 * lowering) and after synth's optimisation, and the iCE40 LUTs it maps to. `ifmatch.test.ts` measures them
 * with the pinned synth and checks `ifmatch-measured.json`, which the figure shows.
 */
import measured from './ifmatch-measured.json';
import type { DesignGraph } from '$lib/synth/api';

export type Style = 'if' | 'match' | 'priority';
export const STYLES: Style[] = ['if', 'match', 'priority'];

export const WIDTH = 8;
/** The sizes offered: 2, 4, 8 or 16 inputs. */
export const SELECTOR_BITS = [1, 2, 3, 4] as const;

/** Weft for "pick one of 2^k inputs", in synth's format. */
export function pickSource(style: Style, k: number, width = WIDTH): string {
  const arms = 2 ** k;
  const select = style === 'priority' ? `in  req: uint<${arms}>,` : `in  sel: uint<${k}>,`;
  const inputs = Array.from({ length: arms }, (_, i) => `    in  x${i}: uint<${width}>,\n`).join('');
  const head = `module pick(\n    ${select}\n${inputs}    out y: uint<${width}>,\n) {\n`;
  if (style === 'match') {
    const cases = Array.from({ length: arms }, (_, i) => `        ${i} => x${i},\n`).join('');
    return `${head}    y = match sel {\n${cases}    };\n}\n`;
  }
  const test = (i: number) => (style === 'if' ? `sel == ${i}` : `req[${i}]`);
  let body = `    y = if ${test(0)} {\n        x0\n    }`;
  for (let i = 1; i < arms - 1; i++) body += ` else if ${test(i)} {\n        x${i}\n    }`;
  body += ` else {\n        x${arms - 1}\n    };\n`;
  return `${head}${body}}\n`;
}

/** The longest path of AND gates from an input or flip-flop to an output or flip-flop. */
export function andDepth(g: DesignGraph): number {
  const ins: number[][] = g.nodes.map(() => []);
  for (const e of g.edges) ins[e.d]!.push(e.s);
  const memo = new Map<number, number>();
  const depth = (i: number): number => {
    const hit = memo.get(i);
    if (hit !== undefined) return hit;
    memo.set(i, 0);
    const node = g.nodes[i]!;
    let v = 0;
    if (node.k === 'and') v = 1 + Math.max(0, ...ins[i]!.map(depth));
    memo.set(i, v);
    return v;
  };
  let best = 0;
  g.nodes.forEach((n, i) => {
    if (n.k === 'out' || n.k === 'ff') for (const s of ins[i]!) best = Math.max(best, depth(s));
  });
  return best;
}

export interface Measure {
  style: Style;
  arms: number;
  /** RTL cells as elaborated: comparisons and 2-way multiplexers. */
  muxes: number;
  /** AND gates and their depth as the source describes the choice, then after synth's optimisation. */
  ands: number;
  depthWritten: number;
  depthOptimised: number;
  /** iCE40 LUT4s after mapping. */
  luts: number;
}

/** The measurements, by style and selector width. */
export const MEASURED = measured as Record<string, Measure>;
export const key = (style: Style, k: number) => `${style}-${k}`;
