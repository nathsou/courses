import { describe, expect, it } from 'vitest';
import { nodeSynth } from '../synth/node';
import { analyzeSource, firstError, refAt } from './analysis';
import { byteToIndex } from './offsets';
import { indentFor } from './editor/language';

describe('Weft analysis', () => {
  it('converts synth byte offsets to string indices', () => {
    const text = 'a — b';
    const at = byteToIndex(text);
    expect(at(0)).toBe(0);
    expect(at(2)).toBe(2);
    expect(at(5)).toBe(3);
    expect(at(7)).toBe(5);
  });

  it('locates diagnostics and names past non-ASCII comments', async () => {
    const src = '// a counter — four bits\nmodule m(in clk: clock, out q: uint<4>) {\n    reg c: uint<4> = 0;\n    c := c + 1;\n    q = c;\n}\n';
    const a = await analyzeSource(nodeSynth(), src);
    expect(firstError(a)).toMatch(/^line 4: /);
    const d = a.located[0]!;
    expect(src.slice(d.from, d.to)).toBe('c + 1');
    const r = refAt(a, src.indexOf('q = c') + 1);
    expect(r?.item.kind).toBe('Port');
    expect(a.kinds.get(src.indexOf('c := c'))).toBe('Register');
  });

  it('indents by brackets, four spaces each', () => {
    const t = 'module m() {\n    if x {\ny\n    }\n}';
    expect(indentFor(t, t.indexOf('y'))).toBe(8);
    expect(indentFor(t, t.lastIndexOf('}'))).toBe(0);
  });
});
