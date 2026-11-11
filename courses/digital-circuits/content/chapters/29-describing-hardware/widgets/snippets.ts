/**
 * Weft programs that the chapter's playgrounds start from, with their tests (the course's test language,
 * `$lib/weft/testbench.ts`). They live here, not in the Markdown, so that `snippets.test.ts` can run them:
 * the fix-the-test starting point must fail its tests and the solution must pass.
 * (`::snippet-playground{id="…"}` looks them up.)
 */
export interface Snippet {
  title: string;
  /** The module to simulate (default: the only one). */
  top?: string;
  code: string;
  tests?: string;
  /** The corrected program, for the exercises with a fix. */
  solution?: string;
}

const DECADE_TESTS = `test "counts to nine and wraps to zero" {
    set enable = true;
    for i in 0..9 {
        expect digit == i && !carry;
        step;
    }
    expect digit == 9 && carry;
    step;
    expect digit == 0 && !carry;
}

test "holds, and does not carry, while disabled" {
    set enable = true;
    step 9;
    set enable = false;
    expect digit == 9 && !carry;
    step 5;
    expect digit == 9 && !carry;
}
`;

const decade = (wrapAt: number, carry: string) => `/// One decimal digit of a counter: counts 0 to 9, then wraps to 0 and reports a carry for the next digit.
module decade(in clk: clock, in enable: bool, out digit: uint<4>, out carry: bool) {
    reg value: uint<4> = 0;

    if enable {
        value := if value == ${wrapAt} { 0 } else { value +% 1 };
    }
    digit = value;
    carry = ${carry};
}
`;

const TICK_TESTS = `test "one pulse every PERIOD cycles" <PERIOD: 5> {
    for round in 0..3 {
        for i in 0..4 {
            expect !tick;
            step;
        }
        expect tick;
        step;
    }
}

test "a different period" <PERIOD: 3> {
    expect !tick;
    step 2;
    expect tick;
    step;
    expect !tick;
}
`;

export const SNIPPETS: Record<string, Snippet> = {
  'fix-the-test': {
    title: 'A decade counter that fails its tests',
    code: decade(10, 'value == 9'),
    tests: DECADE_TESTS,
    solution: decade(9, 'enable && value == 9'),
  },
  swap: {
    title: 'Two registers that swap',
    code: `/// Loads two registers, then swaps them at every clock edge.
module swap(
    in  clk: clock,
    in  load: bool,
    in  a_in: uint<4>,
    in  b_in: uint<4>,
    out a: uint<4>,
    out b: uint<4>,
) {
    reg first: uint<4> = 0;
    reg second: uint<4> = 0;

    if load {
        first := a_in;
        second := b_in;
    } else {
        first := second;
        second := first;
    }
    a = first;
    b = second;
}
`,
    tests: `test "swaps at every edge" {
    set load = true, a_in = 1, b_in = 2;
    step;
    set load = false;
    expect a == 1 && b == 2;
    step;
    expect a == 2 && b == 1;
    step;
    expect a == 1 && b == 2;
}
`,
  },
  'tick-gen': {
    title: 'Write a tick generator',
    code: `/// Pulses \`tick\` for one cycle in every PERIOD cycles: the heartbeat that the traffic light waits for.
module tick_gen<PERIOD: int>(out tick: bool) {
    // Your turn: a counter that counts 0 .. PERIOD - 1, and a tick on the last count.
    tick = false;
}
`,
    tests: TICK_TESTS,
    solution: `/// Pulses \`tick\` for one cycle in every PERIOD cycles: the heartbeat that the traffic light waits for.
module tick_gen<PERIOD: int>(out tick: bool) {
    reg count: index<PERIOD> = 0;

    count := count +% 1;
    tick = count == PERIOD - 1;
}
`,
  },
};
