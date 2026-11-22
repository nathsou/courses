import { describe, expect, test } from 'vitest';
import { design, parse } from './hdl';
import { randomStimulus, simulate } from './sim';
import { equivalent, inputSpace, prove, reachable } from './check';
import { checkRtl } from './exercise';
import { highlightHdl } from './highlight';
import { ADDER_BITS, ADDER_PLUS, BINARY_COUNTER, DECADE_COUNTER, DECADE_COUNTER_BUGGY } from './designs';

const errorOf = (src: string) => {
  const r = parse(src);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.errors[0]!.message;
};

describe('parsing and widths', () => {
  test('the decade counter elaborates', () => {
    const d = design(DECADE_COUNTER);
    expect(d.inputs.map((s) => s.name)).toEqual(['en', 'rst']);
    expect(d.regs.map((s) => [s.name, s.width])).toEqual([['q', 4]]);
    expect(d.outputs.map((s) => s.name)).toEqual(['tc', 'digit']);
  });

  test('context widths keep the carry: a 5-bit sum of 4-bit operands', () => {
    const d = design(ADDER_PLUS);
    const t = simulate(d, [{ a: 15, b: 15 }, { a: 9, b: 8 }]);
    expect(t.cycles.map((c) => c.values.s)).toEqual([30, 17]);
  });

  test('self-determined widths wrap: a 4-bit counter wraps at 16', () => {
    const t = simulate(design(BINARY_COUNTER), Array.from({ length: 18 }, () => ({})));
    expect(t.cycles.map((c) => c.values.count)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1]);
  });

  test('slices, concatenation, shifts and comparisons', () => {
    const d = design('input a: 8\noutput hi: 4 = a[7:4]\noutput sw: 8 = {a[3:0], a[7:4]}\noutput sh: 8 = a << 1\noutput lt = a < 0x80\noutput neg: 8 = -a\n');
    const v = simulate(d, [{ a: 0xa5 }]).cycles[0]!.values;
    expect([v.hi, v.sw, v.sh, v.lt, v.neg]).toEqual([0xa, 0x5a, 0x4a, 0, 0x5b]);
  });

  test('literals: decimal, binary and hex', () => {
    const v = simulate(design('output a: 8 = 0b1010\noutput b: 8 = 0xff\noutput c: 8 = 1_0\n'), [{}]).cycles[0]!.values;
    expect([v.a, v.b, v.c]).toEqual([10, 255, 10]);
  });

  test('errors name the line and the problem', () => {
    expect(errorOf('output y = x\n')).toMatch(/“x” is not declared/);
    expect(errorOf('input a\nwire w = a\nw <= a\n')).toMatch(/only registers/);
    expect(errorOf('wire a = b\nwire b = a\n')).toMatch(/combinational loop: a → b → a/);
    expect(errorOf('input a: 4\noutput y = a[4]\n')).toMatch(/bit 4 does not exist/);
    expect(errorOf('reg q: 2 = 5\n')).toMatch(/does not fit/);
    expect(errorOf('reg q\nq <= 1\nq <= 0\n')).toMatch(/already has a next value/);
    expect(errorOf('input a: 40\n')).toMatch(/widths go from 1 to 32/);
    expect(errorOf('reg q\nq = 1\n')).toMatch(/use “<=”/);
    const r = parse('input a\n\noutput y = a +\n');
    expect(r.ok ? 0 : r.errors[0]!.line).toBe(3);
  });

  test('semicolons separate statements; newlines inside brackets do not', () => {
    const d = design('input a; input b\noutput y = (a &\n  b)\n');
    expect(simulate(d, [{ a: 1, b: 1 }]).cycles[0]!.values.y).toBe(1);
  });
});

describe('simulation', () => {
  test('the decade counter counts to 9 and wraps, with terminal count', () => {
    const d = design(DECADE_COUNTER);
    const t = simulate(d, Array.from({ length: 12 }, () => ({ en: 1, rst: 0 })));
    expect(t.cycles.map((c) => c.values.digit)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
    expect(t.cycles.map((c) => c.values.tc)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
  });

  test('en low holds; rst clears', () => {
    const d = design(DECADE_COUNTER);
    const t = simulate(d, [{ en: 1 }, { en: 1 }, { en: 0 }, { en: 0 }, { en: 1, rst: 1 }, { en: 1 }]);
    expect(t.cycles.map((c) => c.values.q)).toEqual([0, 1, 2, 2, 2, 0]);
  });

  test('random stimulus is repeatable and respects biases', () => {
    const d = design(DECADE_COUNTER);
    expect(randomStimulus(d, 50, 7)).toEqual(randomStimulus(d, 50, 7));
    const s = randomStimulus(d, 1000, 3, { rst: 0.05 });
    const resets = s.filter((v) => v.rst).length;
    expect(resets).toBeGreaterThan(20);
    expect(resets).toBeLessThan(90);
  });
});

describe('proof by exhaustive exploration', () => {
  test('the decade counter reaches exactly ten states', () => {
    expect(reachable(design(DECADE_COUNTER)).map((s) => s.q)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('an assertion that holds is proved; the off-by-one bug gives a shortest counterexample', () => {
    expect(prove(design(DECADE_COUNTER + 'assert q <= 9\n'))).toMatchObject({ ok: true, complete: true, states: 10 });
    const r = prove(design(DECADE_COUNTER_BUGGY + 'assert q <= 9\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.counterexample.stimulus).toHaveLength(11); // ten counting cycles, then q = 10
  });

  test('assumptions restrict the inputs a proof considers', () => {
    const src = 'input a\nreg seen = 0\nseen <= seen | a\nassume !a\nassert !seen\n';
    expect(prove(design(src)).ok).toBe(true);
    expect(prove(design(src.replace('assume !a\n', ''))).ok).toBe(false);
  });

  test('the bit-level adder is equivalent to a + b; a broken one is not', () => {
    expect(equivalent(design(ADDER_BITS), design(ADDER_PLUS), ['s'])).toMatchObject({ ok: true, complete: true });
    // A carry computed with OR in place of XOR is still right: when both bits are 1, a·b already carries.
    const or = ADDER_BITS.replace('(c2 & (a[2] ^ b[2]))', '(c2 & (a[2] | b[2]))');
    expect(equivalent(design(or), design(ADDER_PLUS), ['s']).ok).toBe(true);
    const broken = ADDER_BITS.replace('wire c4 = (a[3] & b[3]) | (c3 & (a[3] ^ b[3]))', 'wire c4 = a[3] & b[3]');
    const r = equivalent(design(broken), design(ADDER_PLUS), ['s']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.counterexample.stimulus).toHaveLength(1);
  });

  test('the input space has every combination', () => {
    expect(inputSpace(design(DECADE_COUNTER).inputs)).toHaveLength(4);
  });
});

describe('exercises', () => {
  const ref = DECADE_COUNTER;
  test('equivalence: the reference passes, the buggy one fails with a cycle', () => {
    expect(checkRtl({ id: 't', code: '', reference: ref }, ref)).toMatchObject({ ok: true });
    const v = checkRtl({ id: 't', code: '', reference: ref }, DECADE_COUNTER_BUGGY);
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/digit is 10 but should be 0/);
  });

  test('missing outputs and wrong widths are reported plainly', () => {
    expect(checkRtl({ id: 't', code: '', reference: ref }, 'input en\ninput rst\noutput tc = 0\n').message).toMatch(/no output called “digit”/);
    expect(checkRtl({ id: 't', code: '', reference: ref }, 'input en\ninput rst\noutput tc = 0\noutput digit: 3 = 0\n').message).toMatch(/4 bits wide/);
  });

  test('catch: an assertion must fail on the buggy design and hold on the correct one', () => {
    const spec = { id: 't', code: DECADE_COUNTER_BUGGY, reference: ref, mode: 'catch' as const };
    expect(checkRtl(spec, DECADE_COUNTER_BUGGY).ok).toBe(false);
    expect(checkRtl(spec, DECADE_COUNTER_BUGGY + 'assert q < 16\n').message).toMatch(/hold in all/);
    expect(checkRtl(spec, DECADE_COUNTER_BUGGY + 'assert q < 5\n').message).toMatch(/also fails on a correct design/);
    expect(checkRtl(spec, DECADE_COUNTER_BUGGY + 'assert q <= 9\n')).toMatchObject({ ok: true });
    expect(checkRtl(spec, DECADE_COUNTER + 'assert q <= 9\n').message).toMatch(/behaves differently/);
  });

  test('explicit tests', () => {
    const spec = { id: 't', code: '', tests: [{ inputs: [{ en: 1 }, { en: 1 }], expect: [{ digit: 0 }, { digit: 1 }] }] };
    expect(checkRtl(spec, ref)).toMatchObject({ ok: true });
    expect(checkRtl(spec, BINARY_COUNTER).ok).toBe(false);
  });
});

test('highlighting escapes and marks keywords', () => {
  const h = highlightHdl('reg q: 4 = 0 // a < b\nq <= q + 1');
  expect(h).toContain('<span class="kw">reg</span>');
  expect(h).toContain('<span class="com">// a &lt; b</span>');
  expect(h).toContain('<span class="op">&lt;=</span>');
});
