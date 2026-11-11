/**
 * Weft programs that Chapter 18's playgrounds start from, with their tests (the course's test language,
 * `$lib/weft/testbench.ts`). They live here, not in the Markdown, so that `snippets.test.ts` can run them.
 * (`::snippet-playground{id="…"}` looks them up.) A snippet with `rejected` is meant not to compile.
 */
export interface Snippet {
  title: string;
  /** The module to simulate (default: the only one). */
  top?: string;
  code: string;
  tests?: string;
  /** The program shows something Weft refuses: synth must report an error. */
  rejected?: boolean;
}

export const SNIPPETS: Record<string, Snippet> = {
  register: {
    title: 'A register with a load enable',
    code: `/// A byte of storage: it keeps its value unless load is true.
module register(in clk: clock, in load: bool, in d: uint<8>, out q: uint<8>) {
    reg value: uint<8> = 0;

    if load {
        value := d;
    }
    q = value;
}
`,
    tests: `test "loads only when told to" {
    set d = 0x5a;
    step;
    expect q == 0;
    set load = true;
    step;
    expect q == 0x5a;
    set load = false, d = 0xff;
    step 3;
    expect q == 0x5a;
}
`,
  },
  counter: {
    title: 'A counter in Weft',
    code: `/// A 4-bit counter: one flip-flop per bit, and an adder in front of them.
module counter(in clk: clock, in enable: bool, out count: uint<4>) {
    reg value: uint<4> = 0;

    if enable {
        value := value +% 1;
    }
    count = value;
}
`,
    tests: `test "counts and wraps" {
    set enable = true;
    for i in 0..15 {
        expect count == i;
        step;
    }
    expect count == 15;
    step;
    expect count == 0;
}

test "each bit runs at half the speed of the one below" {
    set enable = true;
    step 2;
    expect !count[0] && count[1];
    step 2;
    expect !count[1] && count[2];
    step 4;
    expect !count[2] && count[3];
}
`,
  },
  ripple: {
    title: 'Trying to write a ripple counter',
    rejected: true,
    code: `/// A ripple counter clocks each flip-flop from the one before it.
module ripple(in clk: clock, out q0: bool @clk, out q1: bool @from_a) {
    reg a: bool @clk = false;
    domain from_a { clock: a }
    reg b: bool @from_a = false;

    a := !a;
    b := !b;
    q0 = a;
    q1 = b;
}
`,
  },
  shift: {
    title: 'A shift register',
    code: `/// Serial in, parallel out: every clock the byte moves up one place and si enters at the bottom.
module shift(in clk: clock, in si: bool, out q: uint<8>, out so: bool) {
    reg word: uint<8> = 0;

    word := concat(word[6:0], si);
    q = word;
    so = word[7];
}
`,
    tests: `test "four bits in, in order" {
    set si = true;
    step;
    set si = false;
    step;
    set si = true;
    step;
    set si = true;
    step;
    expect q == 0b1011;
}

test "a bit reaches the far end after eight clocks" {
    set si = true;
    step;
    set si = false;
    step 6;
    expect !so;
    step;
    expect so;
    step;
    expect !so;
}
`,
  },
  lfsr: {
    title: 'An LFSR in Weft',
    code: `/// An 8-bit linear-feedback shift register with taps at bits 7, 5, 4 and 3.
module lfsr(in clk: clock, out q: uint<8>, out bit_out: bool) {
    reg state: uint<8> = 1;

    let feedback = state[7] ^ state[5] ^ state[4] ^ state[3];
    state := concat(state[6:0], feedback);
    q = state;
    bit_out = state[7];
}
`,
    tests: `test "visits every non-zero state before it repeats" {
    for i in 0..254 {
        step;
        expect q != 1 && q != 0;
    }
    step;
    expect q == 1;
}
`,
  },
};
