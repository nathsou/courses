import { describe, expect, test } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { checkHdl, show, summary, type HdlInput } from './check';

const synth = nodeSynth();

const priority: HdlInput = {
  id: 't/pe',
  top: 'priority_encoder',
  start: `module priority_encoder(in req: uint<4>, out valid: bool, out highest: uint<2>) {
    valid = false;
    highest = 0;
}
`,
  reference: `module priority_encoder(in req: uint<4>, out valid: bool, out highest: uint<2>) {
    valid = req.any();
    highest = if req[3] { 3 } else if req[2] { 2 } else if req[1] { 1 } else { 0 };
}
`,
  tests: `test "highest wins" {
    set req = 0b0110;
    expect valid && highest == 2;
}
test "none" {
    set req = 0;
    expect !valid;
}
`,
};

const counter: HdlInput = {
  id: 't/sat',
  top: 'sat',
  start: `module sat(in clk: clock, in en: bool, in up: bool, out count: uint<4>) {
    reg v: uint<4> = 0;
    if en {
        v := if up { v +% 1 } else { v -% 1 };
    }
    count = v;
}
`,
  reference: `module sat(in clk: clock, in en: bool, in up: bool, out count: uint<4>) {
    reg v: uint<4> = 0;
    if en {
        if up {
            if v < 15 { v := v + 1; }
        } else if v > 0 {
            v := v - 1;
        }
    }
    count = v;
}
`,
};

describe('checkHdl', () => {
  test('the reference passes its own exercise, exhaustively', async () => {
    const r = await checkHdl(synth, priority, priority.reference!);
    expect(summary(r)).toBe('All hidden tests pass and the design matches the reference.');
    expect(r.tests.map((t) => t.passed)).toEqual([true, true]);
    expect(r.equivalence).toMatchObject({ pass: true, kind: 'exhaustive', vectors: 16, sequential: false });
  });

  test('a wrong design fails the hidden tests and comes back as a table of counterexamples', async () => {
    const r = await checkHdl(synth, priority, priority.start);
    expect(r.pass).toBe(false);
    expect(r.tests[0]).toMatchObject({ passed: false });
    expect(r.tests[0]!.message).toContain('expected valid && highest == 2');
    expect(r.equivalence!.pass).toBe(false);
    expect(r.equivalence!.mismatches).toBe(15);
    expect(r.equivalence!.rows[0]).toMatchObject({ inputs: { req: '0b0001' }, expected: { valid: '1', highest: '0b00' }, got: { valid: '0' }, differ: ['valid'] });
  });

  test('a clocked design is compared over input sequences, and the run to the first mismatch is shown', async () => {
    const good = await checkHdl(synth, counter, counter.reference!);
    expect(good.equivalence).toMatchObject({ pass: true, kind: 'sequences', sequential: true });
    const bad = await checkHdl(synth, counter, counter.start);
    expect(bad.pass).toBe(false);
    const rows = bad.equivalence!.rows;
    expect(rows.at(-1)!.differ).toEqual(['count']);
    expect(rows.length).toBeGreaterThan(0);
  });

  test('errors, a missing module and changed ports are reported plainly', async () => {
    const e = await checkHdl(synth, priority, 'module priority_encoder(in req: uint<4>, out valid: bool, out highest: uint<2>) { valid = 3; highest = 0; }\n');
    expect(summary(e)).toMatch(/^error: /);
    const ports = await checkHdl(synth, priority, 'module priority_encoder(in req: uint<4>, out valid: bool, out highest: uint<3>) {\n    valid = false;\n    highest = 0;\n}\n');
    expect(ports.problems[0]).toContain('The ports must not change');
  });

  test('values are shown in binary up to a byte, then hexadecimal', () => {
    expect(show(5n, 4)).toBe('0b0101');
    expect(show(1n, 1)).toBe('1');
    expect(show(0xabcn, 12)).toBe('0xABC');
  });
});
