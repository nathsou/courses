import { describe, expect, it } from 'vitest';
import { nodeSynth } from '../synth/node';
import { parseTests, runTestSource, TestSyntaxError } from './testbench';

const synth = nodeSynth();
const decade = (wrap: number) => ({
  name: 'decade.weft',
  text: `module decade(in clk: clock, in enable: bool, out digit: uint<4>, out carry: bool) {
    reg value: uint<4> = 0;
    if enable { value := if value == ${wrap} { 0 } else { value +% 1 }; }
    digit = value;
    carry = enable && value == 9;
}
`,
});

const TESTS = `
test "counts to nine and wraps" {
    set enable = true;
    for i in 0..9 {
        expect digit == i && !carry;
        step;
    }
    expect digit == 9 && carry;
    step;
    expect digit == 0;
}

test "holds while disabled" {
    set enable = 1;
    step 9;
    set enable = false;
    expect digit == 9 && !carry;
    step 5;
    expect value == 9;   // the register, by name
    expect digit[0] && !digit[1] && digit[3];
}
`;

describe('Weft tests', () => {
  it('parses tests, loops and generic arguments', () => {
    const t = parseTests('test "a" <N: 3, M: -1> { set x = 1, y = 0x2; step; step 2; expect (x + 1) * 2 == 4 || !y; for i in 0..=3 { expect q != i; } }');
    expect(t[0]!.params).toEqual({ N: '3', M: '-1' });
    expect(t[0]!.body.map((s) => s.k)).toEqual(['set', 'step', 'step', 'expect', 'for']);
    expect(() => parseTests('test "a" { expect a < b < c; }')).toThrow(/chain/);
    expect(() => parseTests('test "a" { jump; }')).toThrow(TestSyntaxError);
  });

  it('passes a correct design', async () => {
    const r = await runTestSource(synth, [decade(9)], undefined, TESTS);
    expect(r.ok).toBe(true);
    expect(r.results.map((x) => [x.name, x.pass, x.error])).toEqual([
      ['counts to nine and wraps', true, undefined],
      ['holds while disabled', true, undefined],
    ]);
    expect(r.results[0]!.trace[0]).toMatchObject({ after: 'set enable = 1', cycle: 0 });
  });

  it('reports the first failing check with the values it read', async () => {
    const r = await runTestSource(synth, [decade(10)], undefined, TESTS);
    const f = r.results[0]!.failed!;
    expect(f.text).toBe('digit == 0');
    expect(f.values).toEqual({ digit: 10n });
    expect(f.cycle).toBe(10);
  });

  it('reports a design that does not compile, and unknown names', async () => {
    const bad = await runTestSource(synth, [{ name: 'x.weft', text: 'module m(out q: uint<2>) { q = 9; }\n' }], undefined, 'test "t" { expect q == 1; }');
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/^line 1: /);
    const r = await runTestSource(synth, [decade(9)], undefined, 'test "t" { set nope = 1; }');
    expect(r.results[0]!.pass).toBe(false);
    expect(r.results[0]!.error).toContain('nope');
  });

  it('passes generic arguments and reads signed ports', async () => {
    const m = { name: 'm.weft', text: 'module m<K: int = 1>(in a: sint<8>, out b: sint<9>) {\n    b = a - K;\n}\n' };
    const r = await runTestSource(synth, [m], undefined, 'test "default" { set a = -5; expect b == -6; }\ntest "K is 10" <K: 10> { set a = 3; expect b == -7; }');
    expect(r.results.map((x) => x.pass)).toEqual([true, true]);
  });
});
