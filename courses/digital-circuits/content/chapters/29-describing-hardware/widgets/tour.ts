/**
 * The diagnostics tour: broken Weft programs, the message synth prints for each, and a fixed version. The
 * messages are synth's own: `tour.test.ts` compiles every program with the pinned synth and compares its
 * output with `tour-messages.json`, which the figure shows (so it needs no compiler to render). Run the test
 * with UPDATE_TOUR=1 to rewrite the file after changing a program or pinning another synth.
 */
import messages from './tour-messages.json';

export interface TourStop {
  id: string;
  /** What is wrong, in a few words. */
  title: string;
  broken: string;
  fixed: string;
  /** The hardware bug the check prevents, and what a looser language does instead. */
  why: string;
  /** Checked as the top module of a chip (inputs from pins), not as a module driven by a testbench. */
  chip?: boolean;
}

export const STOPS: TourStop[] = [
  {
    id: 'width',
    title: 'A sum that does not fit',
    broken: `module counter(in clk: clock, out q: uint<4>) {
    reg count: uint<4> = 0;
    count := count + 1;
    q = count;
}
`,
    fixed: `module counter(in clk: clock, out q: uint<4>) {
    reg count: uint<4> = 0;
    count := count +% 1;
    q = count;
}
`,
    why: 'In Weft, `count + 1` is the exact sum: 0 to 16, which needs five bits. Verilog would drop the fifth bit without a word. Here you choose: `+%` if wrapping round from 15 to 0 is what you mean (a counter), or a wider register if it is not (a sum that must not overflow).',
  },
  {
    id: 'literal',
    title: 'A constant too big for its wires',
    broken: `module mask(in a: uint<4>, out y: uint<4>) {
    y = 20;
}
`,
    fixed: `module mask(in a: uint<4>, out y: uint<4>) {
    y = a & 0xF;
}
`,
    why: 'Four wires hold 0 to 15. A constant that does not fit is nearly always a typo or a wrong width; a looser language keeps the low bits and carries on.',
  },
  {
    id: 'latch',
    title: 'An output not driven on every path',
    broken: `module pick(in sel: bool, in a: uint<8>, out y: uint<8>) {
    if sel {
        y = a;
    }
}
`,
    fixed: `module pick(in sel: bool, in a: uint<8>, out y: uint<8>) {
    y = 0;
    if sel {
        y = a;
    }
}
`,
    why: 'What should `y` be when `sel` is false? In Verilog the answer is "whatever it was", and to remember it the synthesiser builds a latch, a memory nobody asked for and whose timing is hard to check. A Weft wire must be driven on every path; the fix gives it a default, which the `if` overrides.',
  },
  {
    id: 'match',
    title: 'A state the machine forgets',
    broken: `enum State { Idle, Run, Done }

module fsm(in clk: clock, in go: bool, out busy: bool) {
    reg state: State = .Idle;
    match state {
        .Idle => if go { state := .Run; }
        .Run => state := .Done;
    }
    busy = state == .Run;
}
`,
    fixed: `enum State { Idle, Run, Done }

module fsm(in clk: clock, in go: bool, out busy: bool) {
    reg state: State = .Idle;
    match state {
        .Idle => if go { state := .Run; }
        .Run => state := .Done;
        .Done => state := .Idle;
    }
    busy = state == .Run;
}
`,
    why: 'Here the omission is harmless-looking: `Done` simply holds. But a forgotten state is how a machine gets stuck forever in a state you never thought about. A `match` must cover every value, so you are made to think about each one.',
  },
  {
    id: 'index',
    title: 'An index that can run off the end',
    broken: `module digits(in d: uint<4>, out segments: uint<7>) {
    let table: [uint<7>; 10] = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
    segments = table[d];
}
`,
    fixed: `module digits(in d: uint<4>, out segments: uint<7>) {
    let table: [uint<7>; 10] = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
    segments = if d < 10 { table[d] } else { 0 };
}
`,
    why: 'Four bits can say 15, and the table has ten entries. In Verilog, entry 12 is `x`, unknown, and what the chip does with it nobody knows. Weft knows the range of every value; inside `if d < 10` it knows that `d` is at most 9, so the read is safe.',
  },
  {
    id: 'condition',
    title: 'A number used as a condition',
    broken: `module zero(in x: uint<8>, out is_zero: bool) {
    is_zero = if x { false } else { true };
}
`,
    fixed: `module zero(in x: uint<8>, out is_zero: bool) {
    is_zero = x == 0;
}
`,
    why: 'In C, any number is a condition, and in Verilog `if (x)` asks whether any bit is set. In Weft a condition is a `bool`, so you write which question you mean: `x != 0`, `x.any()`, `x[0]`.',
  },
  {
    id: 'precedence',
    title: 'AND and OR without brackets',
    broken: `module alarm(in door: bool, in window: bool, in armed: bool, out ring: bool) {
    ring = armed && door || window;
}
`,
    fixed: `module alarm(in door: bool, in window: bool, in armed: bool, out ring: bool) {
    ring = armed && (door || window);
}
`,
    why: 'C binds `&&` tighter than `||`, so this rings for an open window even when the alarm is off, which is probably not what was meant. Weft refuses to guess: mixing them needs brackets, and the brackets say which you meant.',
  },
  {
    id: 'loop',
    title: 'Two gates feeding each other',
    broken: `module latch(in s: bool, in r: bool, out q: bool) {
    let q_n = !(r || q_i);
    let q_i = !(s || q_n);
    q = q_i;
}
`,
    fixed: `module latch(in clk: clock, in s: bool, in r: bool, out q: bool) {
    reg q_i: bool = false;
    if s {
        q_i := true;
    } else if r {
        q_i := false;
    }
    q = q_i;
}
`,
    why: 'Two NOR gates feeding each other are the SR latch of Chapter 16: they remember, but they also race, glitch and go metastable, and no timing tool can check them. A Weft design is synchronous: memory is a `reg`, and a loop of gates without a register in it is an error that lists the loop.',
  },
  {
    id: 'clock',
    title: 'A clock made from logic',
    broken: `module gated(in clk: clock, in en: bool, in d: uint<8>, out q: uint<8>) {
    domain slow { clock: clk && en }
    reg r: uint<8> @slow = 0;
    r := d;
    q = r;
}
`,
    fixed: `module gated(in clk: clock, in en: bool, in d: uint<8>, out q: uint<8>) {
    reg r: uint<8> = 0;
    if en {
        r := d;
    }
    q = r;
}
`,
    why: 'Gating a clock with an AND gate saves a multiplexer and costs a glitch on the clock whenever `en` changes while it is high: an extra edge, and registers loading at random. Clocks cannot be computed in Weft. The fix is a clock enable: the register holds unless `en` is set, and synthesis uses the flip-flop’s enable input.',
  },
  {
    id: 'reset',
    title: 'A register with no starting value',
    broken: `module acc(in clk: clock, in x: uint<8>, out total: uint<8>) {
    reg sum: uint<8>;
    sum := sum +% x;
    total = sum;
}
`,
    fixed: `module acc(in clk: clock, in x: uint<8>, out total: uint<8>) {
    reg sum: uint<8> = 0;
    sum := sum +% x;
    total = sum;
}
`,
    why: 'A flip-flop powers up as something. If the source does not say what, simulation says `x` and the chip says whatever it likes, and the two disagree. Every Weft register states its reset value (`= 0`) or its power-on value (`init 0`).',
  },
  {
    id: 'assign',
    title: 'A wire assigned like a register',
    broken: `module delay(in clk: clock, in d: bool, out q: bool) {
    q := d;
}
`,
    fixed: `module delay(in clk: clock, in d: bool, out q: bool) {
    reg r: bool = false;
    r := d;
    q = r;
}
`,
    why: 'In Verilog, whether a signal becomes a flip-flop depends on how it is assigned, and `=` and `<=` in the wrong places give a simulation that does not match the chip. In Weft a register is declared with `reg`: `:=` is its next value, `=` drives a wire, and swapping them is an error.',
  },
  {
    id: 'async',
    title: 'A button wired straight into a flip-flop',
    chip: true,
    broken: `module top(in clk: clock, in btn: bool, out led: bool) {
    reg on: bool = false;
    if btn {
        on := !on;
    }
    led = on;
}
`,
    fixed: `module top(in clk: clock, in btn: bool, out led: bool) {
    let pressed = rising(sync(btn));
    reg on: bool = false;
    if pressed {
        on := !on;
    }
    led = on;
}
`,
    why: 'A pin can change at any moment, including the picosecond before a clock edge, and then the flip-flop goes metastable (Chapter 17). Weft treats the inputs of the top module as asynchronous and refuses to let one reach a register until it has been through `sync`, the two-flip-flop synchroniser. (The fix also catches the press once, with `rising`, instead of toggling at every edge while it is held.)',
  },
];

export interface Message {
  /** synth's diagnostics, as it prints them. */
  text: string;
  errors: number;
}

/** synth's messages for each stop (broken and fixed), as recorded by `tour.test.ts`. */
export const MESSAGES = messages as Record<string, { broken: Message; fixed: Message }>;
