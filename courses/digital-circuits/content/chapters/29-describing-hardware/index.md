---
number: 29
title: Describing hardware
summary: Weft, the hardware language of the synth toolchain. You write what a circuit is, in text, and a compiler builds the gates, from types and registers to instances, state machines and clock domains.
duration: About 2 hours
prerequisites: [state-machines, inside-an-fpga]
---

By the end of Chapter 28 you could configure an FPGA by hand: fill in the truth table of a LUT, set the switches of a routing box, clock the chip and watch it work. It is the best way to understand what is inside, and the worst way to use one. The RV32I core that Chapter 31 puts on a chip needs a few thousand LUTs, each with sixteen truth-table bits, and a routing choice for every wire between them. Nobody fills in tens of thousands of bits by hand, or draws a few thousand boxes and joins them with wires.

What we want is what programmers have had since the 1950s: a **language**. Write what the circuit should be, in text that can be read, searched, compared, reviewed, tested and reused, and let a program produce the bits. From here to the end of the course that language is **Weft**, and the program is **synth**, an open FPGA toolchain that takes Weft (or Verilog) all the way to an iCE40 bitstream. Every figure in this part of the course runs synth itself, compiled to WebAssembly, in your browser. A hardware language looks like software and is not software, and the main thing to learn is where the resemblance stops. We start with the language; the history is at the end, for those who want it.

## A first module

Here is a counter. Read it as you would read a function, then run it. On a wide screen the code is on the left and the simulator beside it: set `enable` and `clear` with the switches, step the clock, and read the outputs. The *Circuit* tab draws the gates synth built.

::weft-playground{src="designs/counter.weft" n="29.1" caption="The counter of this section. Set enable to 1 and press Step clock: count goes up by one at each edge and wrapped lights on the step from 15. Then open the Tests tab, press Run tests, read a test, and try to break one by editing the code."}

A **module** is a circuit with a name, inputs and outputs: `counter` has a `clock` input, two `bool` inputs, and two outputs, `count` (a four-bit unsigned number) and `wrapped` (one bit). What is inside the braces is the circuit itself.

- `reg value: uint<4> = 0;` declares a register: four flip-flops that hold 0 after a reset (and at power-up).
- `value := …` says what the register holds after the next clock edge. Inside `if clear` it is 0; inside `else if enable` it is `value +% 1`, the value plus one, wrapping from 15 to 0. On the path where neither is true there is no `:=`, and a register with nothing assigned keeps its value.
- `count = value;` connects an output to something inside. So does `wrapped = enable && value == 15;`, an AND gate fed by a comparison.

Statements end with a semicolon, as in C or Rust. Weft itself has no tests. The course gives each design a few in a small test language of its own, which drives synth's simulator (the *Tests* tab, and the section on tests below), and keeps them out of the design.

:::note[In industry: the same counter in Verilog and VHDL]
You will meet Verilog and VHDL in any job that involves chips. synth compiles Verilog too. Here is the counter above in both: the same structure of a port list, a register, a clocked update and two output assignments.

```verilog title="counter.v"
// A 4-bit counter with enable and synchronous clear.
module counter (
  input  wire       clk,
  input  wire       enable,
  input  wire       clear,
  output wire [3:0] count,
  output wire       wrapped
);
  reg [3:0] value = 4'd0;

  always @(posedge clk) begin
    if (clear)       value <= 4'd0;
    else if (enable) value <= value + 4'd1;
  end

  assign count   = value;
  assign wrapped = enable && (value == 4'd15);
endmodule
```

```vhdl title="counter.vhd"
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity counter is
  port (
    clk     : in  std_logic;
    enable  : in  std_logic;
    clear   : in  std_logic;
    count   : out std_logic_vector(3 downto 0);
    wrapped : out std_logic
  );
end entity;

architecture rtl of counter is
  signal value : unsigned(3 downto 0) := (others => '0');
begin
  process (clk)
  begin
    if rising_edge(clk) then
      if clear = '1' then
        value <= (others => '0');
      elsif enable = '1' then
        value <= value + 1;
      end if;
    end if;
  end process;

  count   <= std_logic_vector(value);
  wrapped <= '1' when enable = '1' and value = 15 else '0';
end architecture;
```

Three differences matter. In Verilog, whether `value` is a flip-flop depends on *how* it is assigned: `<=` (a non-blocking assignment) inside a clocked block makes one, `=` in a combinational block does not, and mixing them up is a classic bug. In Weft a register is declared as one (`reg`), and only a register can take `:=`. Second, in Verilog `value + 4'd1` silently loses its carry when it is stored in four bits; in Weft `value + 1` is the exact sum, 1 to 16, which does not fit four bits, so you must say that you want it to wrap (`+%`). And VHDL needs a conversion (`std_logic_vector(value)`) where the other two just say what they mean.
:::

## A circuit, not a program

Everything in Weft that looks like software is a trap for a software engineer, so let us take the traps one by one.

### Declarations have no order

The lines inside a module are **not executed**. They describe *one* circuit, all of it at once, like the wires of a schematic. A name can be used before the line that declares it, and this module, with its lines back to front, is correct:

```weft
module full_adder(in a: bool, in b: bool, in carry_in: bool, out sum: bool, out carry_out: bool) {
    carry_out = generate || (propagate && carry_in);
    sum = propagate ^ carry_in;
    let propagate = a ^ b;
    let generate = a && b;
}
```

```tests
test "one and one and one" {
    set a = true, b = true, carry_in = true;
    expect sum && carry_out;
    set carry_in = false;
    expect !sum && carry_out;
}
```

`propagate` is used two lines above the line that defines it, and nobody minds. A schematic has no “above”: a wire is connected at both ends whether you drew the source first or the load. The compiler works out an evaluation order itself. What it insists on is that the wiring makes sense: if a value depends on itself through nothing but gates, there is no order to find, and the compiler reports the loop (two cross-coupled NOR gates, in the tour below). A loop through a `reg` is fine, because a register breaks the loop at the clock edge.

There is one kind of order in a Weft module, and it is a deliberate one: when several assignments to the *same* signal apply in a cycle, **the last one wins**. That is how a default is written:

```weft
module pick(in sel: bool, in a: uint<8>, out y: uint<8>) {
    y = 0;
    if sel {
        y = a;
    }
}
```

`y = 0` holds unless `sel` is true, and then the later `y = a` overrides it. The order of the two lines decides which assignment has priority, not when anything happens: both describe the same multiplexer, built once. (The only place in this chapter where things happen in sequence is a test, which drives a simulation step by step.)

### `let` is a wire

`let propagate = a ^ b;` gives a name to a value, once. There is no reassigning a `let`: a name is one wire, driven by one thing. If you have met :term[SSA]{id=ssa} form in [SSA to Silicon](../../../compiler-backends/#/ch/ssa), you know the idea: every value has exactly one definition and any number of uses. A `let` is SSA already. And the question SSA asks about a name that has different definitions on different paths has an answer here: the φ-function of SSA is a **multiplexer**, and `if c { a } else { b }` is how you write it. (A `wire` is the other kind of combinational signal: declared with its type, then driven by assignments such as `y = …;`, defaults and all, like the outputs above.)

### `reg` and `:=`: the only state

A `reg` is the only way to hold a value (with `mem`, its large cousin, below). Everything else is a wire, which has a value only while something drives it. A register changes at one moment only, the clock edge, and all the registers change together. That has a consequence that software does not prepare you for. First a question.

```quiz
q: 'Two registers start with `first = 1` and `second = 2`. In the module, `first := second;` and then `second := first;`. What do they hold after one clock edge?'
options:
  - text: first = 2 and second = 2, because first takes second’s value, and then second takes first’s new value.
    why: 'That is what two assignments in a row would do in a program. But `:=` lines are not in a row. They all describe the value after the same edge.'
  - text: first = 2 and second = 1. They swap, at every edge.
    correct: true
    why: 'Reading a register always gives its current value, never its next one. So each takes the other’s old value at the edge. You do not need a temporary variable to swap two registers.'
  - text: first = 1 and second = 2. Each is a copy of the other, so nothing changes.
    why: 'Nothing would change if they held the same value. They do not: each is fed by the other, and the edge moves the values across.'
```

Software swaps two variables with a temporary, because assignments happen one after another. In hardware the two flip-flops are cross-wired, and a swap costs no logic at all. Try it on the module below: two registers that load from the inputs, then swap on every edge.

::snippet-playground{id="swap" n="29.2" tab="run" caption="Set load to 1, a_in to 3 and b_in to 9, step the clock once, then set load to 0 and step again: a and b trade places at every edge. Open the Circuit tab: eight flip-flops, each fed by a multiplexer that picks between the load value and the other register, and no other logic between the two registers."}

This is the **two-phase update**: first every register’s next value is calculated from the current state, then all of them are committed together. It is what makes synchronous design work (Chapter 17): everything settles between edges, and the edge takes a photograph of the settled values.

:::programmer[`:=` is a photograph, not an assignment]
The closest thing in software is *double buffering*: compute the whole next frame from the current one, then swap the buffers. `reg` is the current buffer, `:=` fills the other, and the clock edge is the swap. A cellular automaton such as Life is written the same way, because if cells updated in place the result would depend on the order you visited them.
:::

## Types and widths

Weft is strictly typed, in a way that goes further than most software languages. A signal’s **range** is part of its type, and the compiler checks it at every operator and every assignment.

| Type | What it is | Notes |
|---|---|---|
| `bool` | one wire, `true` or `false` | the type of conditions; not a number |
| `uint<N>` | N wires, an unsigned number | 0 to 2ᴺ − 1 |
| `sint<N>` | N wires, two’s complement | −2ᴺ⁻¹ to 2ᴺ⁻¹ − 1 |
| `index<N>` | a number from 0 to N − 1 | the type of a safe index; wraps modulo N with `+%` |
| `[T; N]` | N values of type T | indexed by anything whose range fits |
| `struct` | named fields, side by side | the wires of the fields, first field on top |
| `enum` | a set of names | the compiler picks the encoding |
| `clock` | a clock signal | it cannot be computed with |

The surprise is that **arithmetic is exact**. `a + b` on two `uint<8>` values is not an 8-bit sum that may overflow: it is a number from 0 to 510, and its type says so. Adding a `uint<8>` to a `sint<8>` gives something from −128 to 382, a `sint<10>`, and is always right, because nothing is ever reinterpreted. A value moves into a narrower signal only if its whole range fits; when it does not, you say what you mean: `+%` to wrap at the width of the operands, `.trunc(n)` to keep the low *n* bits, a slice `x[hi:lo]`. Converting is never silent, and the conversions that keep every value (`uint<4>` into `uint<8>`, `uint<8>` into `sint<9>`) are free in hardware, because the same wires just get a wider meaning. Here is a module with several kinds of type in it.

```weft
struct Sample { valid: bool, value: sint<12> }

enum Mode { Idle, Run, Hold }

module scale(in sample: uint<13>, in run: bool, out y: sint<14>) {
    let s: Sample = from_bits(sample);
    let mode = if run { Mode.Run } else { Mode.Idle };
    y = if s.valid && mode == .Run { s.value + s.value } else { 0 };
}
```

`s.value + s.value` is a `sint<13>` (−4,096 to 4,094), and it goes into a `sint<14>` without a word, because it fits. `from_bits` rebuilds the struct from the thirteen bits of the input: the top-level ports of a design are wires on pins, so they are plain numbers. None of this costs gates beyond the adder and the multiplexer: slices, concatenations and conversions are only *wiring*. Bit fields such as those of a RISC-V instruction are cut with slices, and sign extension is a conversion:

```weft
module fields(in instruction: uint<32>, out opcode: uint<7>, out rd: uint<5>, out imm: sint<32>) {
    opcode = instruction[6:0];
    rd = instruction[11:7];
    imm = instruction[31:20].as_sint();
}
```

```tests
test "decodes addi x5, x0, -2" {
    set instruction = 0xffe00293;
    expect opcode == 0x13 && rd == 5 && imm == -2;
}
```

`instruction[31:20]` is a `uint<12>`; `.as_sint()` reads the same twelve wires as a `sint<12>`, and the assignment to a `sint<32>` extends the sign (which copies the top wire twenty more times, at no cost). Integer literals take the type that the context expects: `value := 0` makes a four-bit zero because `value` is four bits, and a literal that does not fit is an error.

### Mistakes that cannot be written

Why the strictness? Because a hardware bug costs far more than a software bug, and many of the common ones are things a compiler can see. A looser language accepts some of them in silence, and then a chip is made that does not work. Weft takes them out of the language, or turns them into an error that names the *hardware* problem and suggests a fix. The figure below cycles through twelve. The messages on the right are synth's own, word for word.

::diagnostics-tour{n="29.3" caption="Step through the twelve programs with the numbered buttons. On each one, read the message, then press Show the fix. Which of them would Verilog’s grammar have accepted? (All twelve; simulators and synthesis tools warn about some of them, and a separate program, a linter, about more, when a team runs one.)"}

The last stop is worth a second look, because it is the one that only matters on a real chip. The inputs of a design’s **top** module come from pins, and a pin can change at any moment, so Weft treats them as asynchronous until they have been through `sync`, the two-flip-flop synchroniser of Chapter 17. The playgrounds in this chapter drive their modules from a simulated testbench, in step with the clock, as a module inside a bigger design would be driven; Chapter 31 puts designs on a board, and there every button goes through `sync`.

:::hood[Where synth’s messages come from]
synth is written in Rust, and the Weft compiler is one of its crates, `synth-weft`. It parses the source into a syntax tree, then *elaborates* it: generics are bound, `for` loops unrolled and functions inlined, every expression gets its type and range, and the result is synth's word-level **RTL**, a list of cells such as `add`, `mux`, `eq` and `dff` on whole bit vectors. The checks of the tour happen during elaboration, which is when the compiler knows what everything is: the range of `count + 1`, the paths on which an output is assigned, the clock that each value changes with.

A message names the hardware problem (`does not fit register`, `not assigned on every path`, `an asynchronous value reaches register`), points at the source, and ends with one or two `help:` lines that can be pasted into the code. The width message of the first stop, for example, suggests both fixes, `count +% 1` and `(count + 1).trunc(4)`, because the compiler cannot know whether the counter is meant to wrap. In the playgrounds the same messages appear as you type: the editor sends the text to synth (running in a Web Worker) a moment after each pause.
:::

## `if` and `match`: priority, or a tree?

Chapter 13’s multiplexer picks one of several inputs by a selector. Weft has two ways to write a choice.

- **`if c { a } else { b }`** is an expression, and `else` is mandatory: a value must exist in every case. It is a 2-way multiplexer. An `else if` chain is a *priority chain*: the first condition that is true wins.
- **`match x { p => e, … }`** compares one value with several patterns. Together the arms must cover every value (or end with `_`, “everything else”), and an arm that can never be reached is an error, so the compiler checks that you have thought of every case.

Both are written in order, and both mean “the first that matches”. Whether the hardware has to *respect* that order is another question. When the conditions really can overlap, priority is what you want. A fixed-priority arbiter, where the lowest-numbered request wins, is exactly that:

```weft
/// A fixed-priority arbiter: the lowest-numbered request wins.
module arbiter(in req: uint<4>, out grant: uint<3>) {
    grant = if req[0] {
        1
    } else if req[1] {
        2
    } else if req[2] {
        3
    } else if req[3] {
        4
    } else {
        0
    };
}
```

```tests
test "the lowest request wins" {
    set req = 0b0000;
    expect grant == 0;
    set req = 0b1010;
    expect grant == 2;
    set req = 0b1100;
    expect grant == 3;
    set req = 0b0001;
    expect grant == 1;
}
```

But when you choose by the value of a selector, the conditions cannot overlap: `sel == 2` and `sel == 5` are never both true.

```quiz
q: 'You choose one of 16 inputs of 8 bits with a 4-bit selector, first as a chain of 15 `else if sel == …`, then as a `match` with 16 arms. After synthesis, which is faster, in the sense of a shorter path of gates from the selector to the answer?'
options:
  - text: 'The match: a chain makes the last input wait for fifteen multiplexers.'
    why: 'That is what the source describes, and what a naive compiler would build. But synth can see something the chain does not say.'
  - text: They are the same.
    correct: true
    why: 'synth notices that the comparisons are all against the same selector, so no two of them can be true at once, and the order cannot matter. It rebuilds the chain as a tree that looks at the selector one bit at a time: the same circuit as the match, with a depth that grows with the logarithm of the number of inputs.'
  - text: The chain, because each comparison is simple.
    why: 'Simple or not, a chain of fifteen has fifteen steps, unless the compiler can restructure it. synth can, and does; then the two are identical.'
```

Here is synth's answer, measured. The figure writes the same choice three ways, for 2, 4, 8 and 16 inputs: as a chain on the selector, as a `match`, and as a chain on *request bits*, which can all be set at once.

::if-vs-match{n="29.4" caption="Slide the number of choices up to 16. The chain on sel and the match become the same tree: 8 AND gates deep and 104 LUTs at 16 inputs. The chain on request bits cannot be rebuilt, because its conditions overlap: at 16 it is 20 gates deep and 152 LUTs. The longest path sets the clock rate (Chapter 15), so the priority chain is the slow one."}

So the difference between `if` and `match` is not speed. A `match` says what you mean when you choose by a value, and the compiler holds you to it: every case covered, no arm unreachable. A chain says that the order matters; when it does not, a good synthesiser finds out, and when it does, as for the arbiter, the chain is the right circuit and its depth is the price of priority.

## What synth builds

Every construct in Weft becomes a definite piece of hardware, and synth shows its work. The playground below has a *Cost* tab: what synth made of the design at each step of synthesis, from the word-level cells as written, through the AND gates of the optimised gate network (Chapter 30 explains why everything becomes AND gates and inverters), to the cells of an iCE40 FPGA, its 4-input LUTs and flip-flops. The *Circuit* tab draws the gates, on the bench of the earlier chapters, and runs them.

First, a prediction. The ALU of the RV32I core has a 32-bit adder in it.

```quiz
q: 'How many logic cells of an iCE40 FPGA (each a 4-input LUT, a flip-flop and a little carry logic, Chapter 28) does a 32-bit `a +% b` take, with both operands variable?'
options:
  - text: One. It is one operator.
    why: 'One cell has a 4-input LUT: it can compute one bit of something from four inputs. A 32-bit sum has 32 output bits.'
  - text: 'About 32: one per bit, with the carry passed from cell to cell on the chip’s dedicated carry chain.'
    correct: true
    why: 'Each bit of a sum is a XOR of three things, its two operand bits and the carry in, which one LUT computes; the carry out is computed by the cell’s carry logic and passed straight up a dedicated wire to the next cell. synth maps the adder to 32 LUTs and 31 carry cells. Built from plain gates instead, the same adder is five gates per bit (Chapter 14).'
  - text: 'About 160: five gates per bit, one LUT per gate.'
    why: 'Five gates per bit is the full adder of Chapter 14. A LUT is not a gate, though: it computes any function of four inputs, so it swallows several gates at once.'
  - text: About 1,000.
    why: 'An adder is one of the cheapest things on an FPGA, because the chip has a carry chain built for it.'
```

::weft-playground{src="designs/counter.weft" n="29.5" title="The counter, and what it costs" tab="cost" cost=true caption="Edit the code. Change uint<4> to uint<8> everywhere (and 15 to 255) and watch the register grow from four flip-flops to eight. Change +% 1 to +% 3, then to *% 3. Delete the clear and see the logic shrink. Open the Circuit tab to see the gates."}

:::lab[Count the cost]
Use the playground above, with its *Cost* tab open. Before each change, predict what it will say; then make the change.

1. Read the counts for the original counter. As written it is eight word-level cells: an adder, an equality test, two multiplexers (one for each `if`), two ANDs and a NOT for the conditions, and the register. After optimisation the gate network has 12 AND gates and 4 flip-flops, and on the iCE40 it takes 7 LUTs and 4 flip-flops with enable and reset. synth found the enable and the clear itself, and gave them to the flip-flops’ own enable and reset inputs.
2. Widen the counter to 8 bits (`uint<8>` in each place, and `== 255`). You get 8 flip-flops, and now a carry chain appears (6 carry cells): an 8-bit increment is long enough for synth to put it on the chip’s carry logic, where 4 bits were not. 13 LUTs in all.
3. Change `+% 1` to `+% 3`. One more LUT: a carry now starts at two bits.
4. Change it to `*% 3`. Everything disappears: no flip-flops, no gates. The register starts at 0, and 0 × 3 is 0, so `value` can never be anything but 0, and synth replaced it with a constant. An optimiser is a merciless reader.
5. Remove the clear (delete the `if clear` branch, so that the `if enable` is first). The 4 flip-flops lose their reset input, and 7 LUTs become 5.

What you write says *what* the circuit does. What it costs follows from that, and now you can read the bill.
:::

Here is a design of another size: the ALU of the RV32I core, which Chapter 31 runs. It is too big to draw gate by gate, but synth still counts every cell.

::weft-playground{src="designs/alu.weft" n="29.6" title="An ALU, counted" tab="cost" cost=true circuit=false caption="Read the counts: 588 LUTs and 95 carry cells. Then delete the arm 1 => rs1_value << shift, replacing it with 1 => sum, and watch the left shifter go: a shifter by a variable amount is one of the most expensive things in the ALU."}

Its eight functions are all computed **all the time**. A `match` on `f3` does not run the arm that is chosen: it builds all eight circuits and a multiplexer that selects one of their results. In software a branch you do not take costs nothing. In hardware every arm is silicon, used or not, and the choice is made by wires.

:::deeper[Why is a ripple-carry adder twice as deep as it is wide?]
Built from gates, each bit of an adder passes the carry through two of them: the AND that combines it with the propagate signal, then the OR that merges the two possible sources (`generate || (propagate && carry_in)` in the full adder above). A carry that starts at bit 0 and ends at bit 31 goes through about two gates per bit. A carry-lookahead adder computes the carries of groups of bits in parallel, so that its depth grows with log *n* instead of *n*, at the cost of more gates. An FPGA takes a third way: its carry chain is a dedicated wire with one fast multiplexer per bit, so a ripple of 32 bits costs about as much time as a few LUTs.
:::

## Instances, generics and loops

A module is a component, and an **instance** places one inside another. `inst name = module(port: value, …);` connects the inputs, and the outputs are read as `name.port`. Nothing runs when you instantiate a module: you have drawn a box on the schematic, and wired it up. A module with one output can also be used like a function in a `let`, which makes an instance and gives its output. Weft’s standard library has a few ready-made boxes: `sync` (the synchroniser), `rising` and `falling` (edge detectors: one-cycle pulses), `divider` (a pulse every *N* cycles), `power_on_reset` and `reset_sync`. This module turns a bouncing button into a single clean pulse, using a debouncer of its own and two of them:

```weft
/// Holds `clean` until `raw` has been stable for STABLE cycles (Chapter 4's switch bounce).
module debounce<STABLE: int>(in raw: bool, out clean: bool) {
    reg level: bool = false;
    reg count: index<STABLE> = 0;
    if raw == level {
        count := 0;
    } else if count == STABLE - 1 {
        level := raw;
        count := 0;
    } else {
        count := count +% 1;
    }
    clean = level;
}

module button_pulse<STABLE: int = 4>(in clk: clock, in raw: bool, out pressed: bool) {
    let clean = debounce<STABLE: STABLE>(raw: raw);
    let edge = rising(clean);
    pressed = edge;
}
```

```tests
test "one pulse per press" {
    step 3;
    expect !pressed;
    set raw = true;
    step 3;
    expect !pressed;    // still bouncing, as far as the debouncer knows
    step;
    expect pressed;     // stable for four cycles: one pulse
    step;
    expect !pressed;
    step 10;
    expect !pressed;
}
```

The angle brackets are a **generic**: a number that the module takes at compile time, here how many clock cycles the button must be stable for. Generics can appear in types too (`uint<WIDTH>`, `index<STABLE>`), so a single description serves for every width. Each distinct set of generic arguments makes its own copy of the hardware: `debounce<STABLE: 4>` and `debounce<STABLE: 1_000_000>` are different circuits. Notice also that `debounce` has no clock port: a module without one runs in the clock domain of whoever instantiates it, which is what most modules want.

The same machinery gives loops, and this is where the software habit is most dangerous.

```weft
module delay<STAGES: int = 3>(in clk: clock, in d: bool, out q: bool) {
    reg stages: [bool; STAGES] = [false; STAGES];

    stages[0] := d;
    for i in 1..STAGES {
        stages[i] := stages[i - 1];
    }
    q = stages[STAGES - 1];
}
```

```tests
test "arrives after STAGES edges" {
    set d = true;
    step 2;
    expect !q;
    step;
    expect q;
}
```

:::key
A `for` loop in Weft is **not** a repetition in time. It is unrolled by the compiler, before anything runs, into as many copies of the hardware as there are iterations. The bounds must be known at compile time, and `i` is a constant in each copy.
:::

`delay<STAGES: 3>` is a shift register of three flip-flops with no gates between them, and `delay<STAGES: 8>` has eight. The loop writes out `stages[1] := stages[0];`, `stages[2] := stages[1];` and so on for you. Nothing happens once per iteration: every copy exists, and every copy works at once. The course plays the same trick when it draws synth's gates on the bench: synth keeps a 32-bit `+` as a carry chain, and this loop of `src/lib/weft/gates.ts` turns it into the full adders of Chapter 14, one copy per *bit*:

```ts
for (let k = 0; k < w; k++) {
  const a = input(i, k, n.path);
  const b = input(i, w + k, n.path);
  const ab = gate('xor', a, b, n.path, 'carry');
  const s = net(i, k);
  const sid = `carry${i}/s${k}`;
  nb.add('xor', sid, { A: ab, B: c, Y: s }, { inputs: 2, ...gateParams });
  note(sid, { role: 'carry', name: n.name, path: n.path, bit: k });
  const g1 = gate('and', a, b, n.path, 'carry');
  const g2 = gate('and', ab, c, n.path, 'carry');
  c = k === w - 1 && n.outs.length > w ? net(i, w) : nb.net();
```

Two XORs, two ANDs and an OR per iteration: the loop is in the program, and the gates are in the circuit.

## Memories

A register array is a collection of flip-flops: `reg x: [uint<32>; 32]` is 1,024 of them (992 in the RV32I register file, as the challenge below explains), with a 32-way multiplexer for each read. That suits 32 words and not 32,000. For a large store you want the chip’s RAM (Chapter 20 opened one up, and Chapter 28 met the block RAMs of an FPGA), and Weft has a separate construct for it:

```weft
module rom(in clk: clock, in address: uint<3>, out data: uint<8>) {
    mem table: [uint<8>; 8] init [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07];
    reg q: uint<8> init 0;
    q := table[address];
    data = q;
}
```

```tests
test "answers one cycle later" {
    set address = 2;
    expect data == 0;
    step;
    expect data == 0x5B;
    set address = 7;
    expect data == 0x5B;
    step;
    expect data == 0x07;
}
```

The eight values are the seven-segment patterns of Chapter 13 for the digits 0 to 7. The important part is the test. A block RAM answers *one clock edge after* it is given an address, and Weft makes you write that delay: the read `table[address]` goes into a register, `q := …`, and synth maps the register and the memory together onto a block RAM with a registered read port. A memory is written with `table[address] := data;` under whatever condition enables the write. If a memory is read directly in logic, without the register, synth has to build it from flip-flops instead, and warns when the memory is big.

## State machines

Chapter 19 drew a traffic light as a state diagram, chose an encoding for its states, and derived the next-state gates by hand. Weft turns each step into a line of text.

- The **states** are an `enum`: `enum Light { Red, RedAmber, Green, Amber }`. You never see the numbers: the compiler picks a binary encoding. Only `==`, `!=` and `match` apply to an enum, so you cannot do arithmetic on a state by accident. (When the encoding matters, it can be given: `enum Light: uint<4> { Red = 1, RedAmber = 2, Green = 4, Amber = 8 }` is one-hot.)
- The **state register** is a `reg` of that type.
- The **transitions** are a `match` on the state: one arm for each state, and the compiler tells you if you forget one.
- The **outputs** are functions of the state: `red = state == .Red || state == .RedAmber;`.

::weft-playground{src="designs/traffic-light.weft" n="29.7" tab="run" caption="Hold tick at 1 and press Step clock: red, red with amber, green, amber, red again, the British sequence. Set tick to 0 and the light waits. Then give the enum the one-hot encoding of the text and open the Circuit tab: two flip-flops become four."}

The compiled machine is small: two flip-flops (four states fit in two bits), three AND gates after optimisation, and three LUTs on the iCE40. The `if tick` around the `match` becomes the flip-flops’ enable. It is the machine of Chapter 19: state register, next-state logic and output logic.

## Tests

Hardware is tested in simulation before it is built, because a fault in silicon cannot be patched. Weft has no testbench constructs of its own (that is a deliberate choice of the language: it describes hardware, and nothing else). The course’s figures drive synth's simulator with a small test language instead, which you have seen under each design:

- `test "name" { … }` is one test. It starts from power-up: every register at its reset value, every input at 0.
- `set input = value, …;` changes inputs, and the logic settles at once;
- `step;` gives the clock one rising edge, `step n;` gives it *n*;
- `expect condition;` checks that something is true now, about outputs, or about registers by name (`expect value == 9;`);
- `for i in 0..n { … }` repeats statements, and `test "…" <PERIOD: 3> { … }` sets a generic of the module under test.

Tests never become hardware. When an `expect` fails, the playground shows the values it read and a waveform of the steps before it, so you see how the design got there. Below is a decade counter (one digit of a decimal counter) with two bugs and two tests that catch them. Your job is to fix the design, not the tests.

::snippet-playground{id="fix-the-test" n="29.8" tab="tests" caption="Press Run tests. Two tests fail, and each shows a waveform. Fix the module until both pass, then read the waveform of the first test before you fix it: where does the count go wrong?"}

::::hints
:::hint[Hint 1: read the waveform]
The first test steps nine times and expects a carry, then once more and expects 0. Look at what `digit` does in the waveform after it reaches 9.
:::
:::hint[Hint 2: the wrap]
The counter wraps when `value == 10`. But a digit that counts 0 to 9 has ten values, and the last one is 9, so it must wrap *from* 9.
:::
:::hint[Hint 3: the carry]
The second test holds `enable` at false with the count at 9. Should `carry` be true then? A carry means “the next digit should count on the next edge”, and that depends on both `enable` and the value.
:::
::::

:::details[Show the fixed module]
```weft
/// One decimal digit of a counter: counts 0 to 9, then wraps to 0 and reports a carry for the next digit.
module decade(in clk: clock, in enable: bool, out digit: uint<4>, out carry: bool) {
    reg value: uint<4> = 0;

    if enable {
        value := if value == 9 { 0 } else { value +% 1 };
    }
    digit = value;
    carry = enable && value == 9;
}
```

Two changes: `value == 10` becomes `value == 9`, and `carry` becomes `enable && value == 9`. The first bug is an off-by-one, an old friend from software. The second only shows when the enable is *held* low: the carry is right whenever the counter is running.
:::

## Under the hood

You have seen what each construct becomes. Here is synth doing it, one stage after another.

:::hood[From source to cells to gates]
synth's front end turns the source into **word-level RTL**: cells such as `add`, `mux`, `eq` and `dff`, on signals that are whole bit vectors, with every name from the source kept. This is the counter after synth's RTL optimisations, as synth prints it:

```rtl
$n6 = not clear @$unary0
$n7 = and $n6, enable @$binary1
$n10 = add value, 4'd1 @$binary4
$n11 = eq value, 4'd15 @$binary5
$n12 = and enable, $n11 @$binary6
$n13 = mux clear ? 4'd0 : value @$mux7
$n14 = mux $n7 ? $n10 : $n13 @$mux8
value = dff $n14, clk: posedge clk, init: 4'd0 @value
```

Every line is one cell. `$n13` is the `if clear` (zero, or the value held), `$n14` the `else if enable` (the sum, or `$n13`), with its condition `$n7`, “not clear and enable”, computed by the two cells above it. There is no `if`, no order and no `:=`: only cells, and a `dff` cell whose input `$n14` is the next value. The register that holds when nothing is assigned is the multiplexer arm `value` in `$n13`: holding is a wire from the flip-flop’s output back to its input.

**Lowering** expands each cell into the and-inverter graph of Chapter 30: AND gates, inverters on their inputs, flip-flops, and carry chains for the adders long enough to deserve one; then the graph is optimised. On the way, synth recognises that the feedback `value` arm is a flip-flop that does not load (an *enable*) and that `clear` forces a constant (a *synchronous reset*), and hands both to the flip-flop instead of building multiplexers. **Simulation**, in the playgrounds, runs on the RTL itself: synth's simulator compiles the cells into a program that evaluates only the logic that each change reaches, and steps all the registers together at each edge, sampling every next value first and committing them after. That two-phase update is why the swap of Figure 29.2 works.
:::

## Build it for real

:::real{parts="iCE40 FPGA board (optional)"}
There is nothing to wire up in this chapter: synth runs in your browser, and the *Circuit* tabs are the gates it built. To build a design on a real chip, the same synth (installed from its releases, or built from source) turns a Weft file into an iCE40 bitstream and programs a board over USB: `synth build` and `synth prog`, in Chapter 31. A design that passes its tests here can run on your desk, and you never write Verilog to do it.
:::

## Exercises

```quiz
q: 'The lines inside the counter module are shuffled: `count = value;` comes first, the `if clear …` block second, `reg value: uint<4> = 0;` last. Does it still compile, and is it the same circuit?'
options:
  - text: No. The `reg` must come first, then the `if`, then the outputs, as a variable is declared before it is used.
    why: 'That is the rule of a program, and a Weft module is not a program. `count = value` may use `value` before its declaration, just like the `propagate` of the full adder above.'
  - text: 'Yes: declarations have no order, and the circuit is exactly the same.'
    correct: true
    why: 'Declarations are visible throughout the module, and the lines are all facts about one circuit. The order that does matter is between assignments to the *same* signal (the last applicable one wins), and shuffling these three lines does not change that.'
  - text: Only if the outputs come before the register, because a wire has to exist before a register can be attached to it.
    why: 'A wire is neither before nor after: a circuit has no “before”. The compiler sorts the evaluation order out on its own.'
```

Which of these four modules compile?

```weft error title="A"
module a(in x: uint<4>, in y: uint<4>, out s: uint<4>) {
    s = x + y;
}
```

```weft title="B"
module b(in clk: clock, in d: uint<4>, out q: uint<4>) {
    reg r: uint<4> = 0;
    r := d;
    q = r;
}
```

```weft error title="C"
module c(in sel: bool, in x: uint<4>, out y: uint<4>) {
    if sel {
        y = x;
    }
}
```

```weft error title="D"
module d(in x: bool, out y: bool) {
    let t = !u;
    let u = !t;
    y = t;
}
```

```quiz
q: 'Which of the modules A, B, C and D compile?'
options:
  - text: Only B.
    correct: true
    why: 'A puts a sum of 0 to 30 into four bits: `x +% y` if it should wrap, or a wider output. C leaves `y` unassigned when `sel` is false: a latch, which Weft will not build (give `y` a default first). D is two inverters feeding each other with no register between them: a combinational loop.'
  - text: B and D, because names can be used before they are declared.
    why: 'They can, but D is not about order. `t` depends on `u`, and `u` on `t`, and no evaluation order exists. A register between them is what would have made the loop legal.'
  - text: B and C, because a missing `else` just means “keep the old value”.
    why: 'For a register it does: a register holds when nothing is assigned. `y` is a wire, and a wire that holds a value is a latch. The compiler’s message for C says so, and suggests a default.'
  - text: All four.
    why: 'A, C and D are each rejected by a different check. The tour above has the message for each.'
```

What does this module become in hardware?

```weft
module decode(in op: uint<2>, in a: uint<8>, in b: uint<8>, out y: uint<8>) {
    y = match op {
        0 => a +% b,
        1 => a -% b,
        2 => a & b,
        3 => a | b,
    };
}
```

```quiz
q: 'What does the `match` in `decode` become in hardware?'
options:
  - text: A program that computes only the selected operation and skips the others.
    why: 'Hardware has no “skip”. There is nothing to run: all the circuits exist at all times.'
  - text: A multiplexer that chooses among four results, each computed all the time by its own adder, subtractor, AND or OR circuit.
    correct: true
    why: 'All four arms are built, and all four compute at every moment. The selector `op` picks which result reaches `y`. That is why the ALU in the playground costs the sum of its eight operations, and why a design with a lot of operations is big.'
  - text: A lookup table with four entries.
    why: 'A lookup table would hold constants. Here the four entries are results computed from `a` and `b`, so each one needs its own circuit, and only the choice is a multiplexer.'
  - text: Nothing at all until `op` changes.
    why: 'Hardware does not wait for changes to start working. The four circuits and the multiplexer are always there, and `y` always shows the selected result.'
```

:::challenge[How many flip-flops?]
The register file of the RV32I core is declared as `reg x: [uint<32>; 32] = [0; 32];`, which suggests 32 × 32 = 1,024 flip-flops. synth builds 992. Where did 32 flip-flops go? Read `content/designs/regfile.weft` again: when is `x[0]` written?

*Answer.* Never: the write is guarded by `rd_address != 0`. A register that is reset to 0 and never assigned can never be anything but 0, so synth replaces it with a constant and builds flip-flops only for `x[1]` to `x[31]`: 31 × 32 = 992. This is exactly what the RISC-V specification asks for (register `x0` is hard-wired to zero), and what you would have to remember to do by hand in a schematic. It is also step 4 of the lab above, on a larger scale.
:::

Now write a module from scratch. The traffic light of the last section waits for a `tick`, and the tick has to come from somewhere: a counter that counts to a period, and pulses when it wraps. Write `tick_gen`. The tests are already in the playground.

::snippet-playground{id="tick-gen" n="29.9" tab="tests" circuit=false caption="Replace the placeholder with a counter that counts from 0 to PERIOD - 1 and pulses tick on its last count, then press Run tests. index<PERIOD> is a number that is always below PERIOD, and +% on it wraps at PERIOD. (The tests set PERIOD to 5 and to 3.)"}

:::details[Show a solution]
```weft
/// Pulses `tick` for one cycle in every PERIOD cycles: the heartbeat that the traffic light waits for.
module tick_gen<PERIOD: int>(out tick: bool) {
    reg count: index<PERIOD> = 0;

    count := count +% 1;
    tick = count == PERIOD - 1;
}
```

`index<PERIOD>` is exactly wide enough for PERIOD values, and `+%` on it wraps at PERIOD, not at a power of two, so there is no comparison to write for the wrap. This is the standard library’s `divider`. Wired to the `tick` input of `traffic_light`, `tick_gen<PERIOD: 25_000_000>` on a 25 MHz clock gives the light a step once a second.
:::

Two modules to write, in the editor and with synth's diagnostics as you type. Each is checked against hidden tests, and then against a reference design on synth's simulator, for every input (or, for a clocked design, every short sequence of inputs and thousands of random ones); a mismatch comes back as a table of inputs, expected outputs and what your design gave.

```hdl
id: 29-describing-hardware/priority-encoder
title: Which request wins?
top: priority_encoder
prompt: |
  Eight devices share a resource and each has a request line. Write a **priority encoder**: `req` is the eight request lines, and the outputs are `valid` (true when any request is set) and `highest`, the number (0 to 7) of the **highest-numbered** request that is set. When no request is set, `valid` is false and `highest` is 0.

  The arbiter earlier in the chapter picked the *lowest* request and returned a code from 1; this one picks the highest and returns the line’s own number.
hints:
  - 'A chain of `else if` is exactly a priority chain: test `req[7]` first, then `req[6]`, and so on. The last `else` is the case where only request 0 is set or none is.'
  - '`valid` needs no chain: `req.any()` is true when at least one bit of `req` is set.'
explain: |
  The `if` chain makes request 7 the first multiplexer’s select and request 0 the last branch: the priority is in the order of the tests. It is the right circuit here, because the conditions overlap and one of them has to win, and synth cannot turn it into a tree as it could for a choice by a selector.
height: 9
start: |
  /// The highest-numbered request that is set, and whether there is one.
  module priority_encoder(in req: uint<8>, out valid: bool, out highest: uint<3>) {
      valid = false;
      highest = 0;
  }
reference: |
  module priority_encoder(in req: uint<8>, out valid: bool, out highest: uint<3>) {
      valid = req.any();
      highest = if req[7] {
          7
      } else if req[6] {
          6
      } else if req[5] {
          5
      } else if req[4] {
          4
      } else if req[3] {
          3
      } else if req[2] {
          2
      } else if req[1] {
          1
      } else {
          0
      };
  }
tests: |
  test "the highest request wins" {
      set req = 0b0010_0110;
      expect valid && highest == 5;
      set req = 0b1000_0001;
      expect highest == 7;
  }

  test "no request: not valid, highest 0" {
      set req = 0;
      expect !valid && highest == 0;
  }

  test "request 0 alone is valid" {
      set req = 1;
      expect valid && highest == 0;
  }
equivalence: { exhaustiveBits: 8 }
solution: |
  /// The highest-numbered request that is set, and whether there is one.
  module priority_encoder(in req: uint<8>, out valid: bool, out highest: uint<3>) {
      valid = req.any();
      highest = if req[7] {
          7
      } else if req[6] {
          6
      } else if req[5] {
          5
      } else if req[4] {
          4
      } else if req[3] {
          3
      } else if req[2] {
          2
      } else if req[1] {
          1
      } else {
          0
      };
  }
```

```hdl
id: 29-describing-hardware/saturating-counter
title: A counter that stops
top: sat_counter
prompt: |
  The module in the editor is an up/down counter that *wraps*: counting up from 15 gives 0, counting down from 0 gives 15. A volume control must not do that. Make it **saturate**: at 15 it stays at 15 when told to count up, and at 0 it stays at 0 when told to count down.

  Ports: `clear` (synchronous; it beats everything), `en` (count when true, hold when false) and `up` (true counts up, false counts down). Outputs: `count`, and two flags, `at_top` (count is 15) and `at_bottom` (count is 0). Keep the ports as they are.
hints:
  - 'A register holds when nothing is assigned to it, so saturating is *not* assigning: `if value < 15 { value := value + 1; }`.'
  - 'Inside `if value < 15`, Weft knows that `value` is at most 14, so `value + 1` (at most 15) fits four bits, and no `+%` is needed. The same goes for `if value > 0 { value := value - 1; }`.'
explain: |
  The two comparisons are two more conditions on the register’s enable, and nothing else: a register that is not assigned holds, so the saturation costs no multiplexer. Notice also that `value + 1` needed no `%` inside the `if`: the compiler narrowed the range of `value` there, and knew the sum fits. The check ran the design from power-up through every input sequence of three cycles and then through random ones, against a reference that saturates.
height: 12
start: |
  /// A 4-bit up/down counter. It wraps at both ends: make it saturate.
  module sat_counter(
      in  clk: clock,
      in  clear: bool,
      in  en: bool,
      in  up: bool,
      out count: uint<4>,
      out at_top: bool,
      out at_bottom: bool,
  ) {
      reg value: uint<4> = 0;

      if clear {
          value := 0;
      } else if en {
          value := if up { value +% 1 } else { value -% 1 };
      }
      count = value;
      at_top = value == 15;
      at_bottom = value == 0;
  }
reference: |
  module sat_counter(
      in  clk: clock,
      in  clear: bool,
      in  en: bool,
      in  up: bool,
      out count: uint<4>,
      out at_top: bool,
      out at_bottom: bool,
  ) {
      reg value: uint<4> = 0;

      if clear {
          value := 0;
      } else if en {
          if up {
              if value < 15 {
                  value := value + 1;
              }
          } else if value > 0 {
              value := value - 1;
          }
      }
      count = value;
      at_top = value == 15;
      at_bottom = value == 0;
  }
tests: |
  test "counts up and stops at 15" {
      set en = true, up = true;
      step 15;
      expect count == 15 && at_top;
      step 3;
      expect count == 15;
  }

  test "counts down and stops at 0" {
      set en = true, up = true;
      step 5;
      set up = false;
      step 9;
      expect count == 0 && at_bottom;
  }

  test "clear wins, and en low holds" {
      set en = true, up = true;
      step 4;
      set en = false;
      step 3;
      expect count == 4;
      set en = true, clear = true;
      step;
      expect count == 0;
  }
solution: |
  /// A 4-bit up/down counter that saturates at both ends.
  module sat_counter(
      in  clk: clock,
      in  clear: bool,
      in  en: bool,
      in  up: bool,
      out count: uint<4>,
      out at_top: bool,
      out at_bottom: bool,
  ) {
      reg value: uint<4> = 0;

      if clear {
          value := 0;
      } else if en {
          if up {
              if value < 15 {
                  value := value + 1;
              }
          } else if value > 0 {
              value := value - 1;
          }
      }
      count = value;
      at_top = value == 15;
      at_bottom = value == 0;
  }
```

## Optional background: why we stopped drawing

A schematic is a picture of a :term[netlist]{id=netlist}, a list of components and the wires between them. For a dozen gates it is the clearest description there is, and it stops working long before a computer is on the page. The numbers below are not from a textbook: they are what synth builds.

- A 32-bit adder, written as `a +% b`, is about **150 gates** when built from gates, and **32 LUTs** on an FPGA’s carry chain.
- The ALU of the RV32I core, thirty-odd lines of Weft, becomes **1,526 AND gates** in synth's gate network, and **588 LUTs** and 95 carry cells on an iCE40.
- The 32-entry register file of the same core becomes **992 flip-flops** and about 4,000 AND gates.

To draw the ALU you would place over a thousand boxes and route thousands of wires, and the picture would say less than the thirty lines. It would have to be redrawn for a 64-bit version, and could be neither searched nor compared with last week’s. Text has all of these properties for free, and it can be **parameterised**: one description, any width. A schematic is a photograph of one particular circuit.

### Equations for programmable chips

The first people to need a language were programming PALs (Chapter 26), chips whose function is a set of sum-of-products equations blown into fuses. Drawing the fuse map by hand was hopeless, so within a few years every maker of programmable logic had a program that read the equations as text and produced the fuse pattern. Here is one bit of a counter, a flip-flop that toggles when `EN` is high, in three of them (the dialects vary a little between tool versions).

```text title="PALASM"
Q0 := /Q0 * EN + Q0 * /EN
```

```text title="ABEL"
Q0 := Q0 $ EN;
```

```text title="CUPL"
Q0.D = Q0 $ EN;
```

In each, `:=` or `.D` means “the value after the clock edge”, and `$` is exclusive-or (PALASM writes out the AND–OR form). Already the equation *is* the circuit. But these languages describe a **device**: the pins are numbered, the flip-flops are the chip’s macrocells, and a design that needs more product terms than the chip has is an error. You cannot name a sub-circuit and use it twice.

:::history{year=1983 title="Equations for fuses: PALASM, ABEL and CUPL" people="John Birkner, Russell de Pina, Bob Osann"}
In the early 1980s, programming a PAL meant writing its equations in a text file and running them through a compiler.

The first was PALASM, from Monolithic Memories, the company that had introduced the PAL in 1978. It was written by John Birkner, the PAL’s co-inventor, as a FORTRAN IV program, and Monolithic Memories gave the source away.:cite[wiki-palasm] Two commercial languages followed in 1983. ABEL, from Data I/O, a maker of chip programmers, grew from a compiler that Russell de Pina had written there in 1981, and offered equations, truth tables and state-machine descriptions in one language.:cite[wiki-abel,holley-abel] CUPL, from Assisted Technology, named the target chip at compile time, so the same equations could be compiled for more than one device.:cite[cupl-1983]

All three were tied to PAL-sized chips and designs of a few dozen equations. They taught a generation of engineers to write hardware as text.
:::

### Verilog and VHDL

The next step came from two directions at once, and neither began with programmable logic.

**Verilog** began with a start-up, Gateway Design Automation, founded by Prabhu Goel. In December 1983 its engineer Phil Moorby and Chi-Lai Huang specified a language for logic simulation, fault simulation and synthesis; Moorby wrote the simulator in 1984, and it was on sale by early 1985.:cite[flake2020] Its expressions borrow C’s operators, and its blocks are marked `begin … end`. **VHDL** began with the US Department of Defense, whose VHSIC programme for advanced chips needed one language in which its contractors could describe their designs. It was specified from 1983 by Intermetrics, IBM and Texas Instruments, and is modelled on Ada: strongly typed, verbose, precise.:cite[wiki-vhdl]

:::history{year=1984 title="Verilog" people="Phil Moorby, Prabhu Goel, Chi-Lai Huang"}
Verilog was a simulator’s language first. Phil Moorby, who had joined Gateway Design Automation by 1983, set out to create a language that could support logic simulation, fault simulation for test and logic synthesis. He specified it in December of that year with Chi-Lai Huang, and wrote the simulator in 1984.

By early 1985 the product was on sale, and a faster simulator, Verilog-XL, followed in 1987. Cadence bought Gateway in 1990, and the next year the language was opened to the public through Open Verilog International, which took it to the IEEE. It became IEEE Standard 1364 in 1995.:cite[flake2020]
:::

:::history{year=1987 title="VHDL" people="US Department of Defense (VHSIC programme), Intermetrics, IBM, Texas Instruments"}
The VHSIC programme (1980–1990) was the Pentagon’s effort to advance very-fast integrated circuits. In June 1981 a workshop at Woods Hole, Massachusetts, began the work of defining a hardware description language for it.

In July 1983 the contract went to a team of Intermetrics (language expertise), Texas Instruments (chip design) and IBM (system design). They released version 7.2 in August 1985, and after public review the IEEE adopted the language as Standard 1076 in December 1987.:cite[wiki-vhdl,ieee1076-1987] The name is a nested acronym: VHSIC Hardware Description Language.
:::

Notice what both languages were for: writing down what a chip does, running it, and checking it before anyone paid for silicon. Turning the same text into gates came later.

### Synthesis

Turning a description into gates is called :term[logic synthesis]{id=logic-synthesis}, and it changed what a hardware language was for. Instead of describing a circuit that somebody had already designed, the designer describes *behaviour at the register-transfer level*: which registers there are, and what is computed between them in each clock cycle. A program chooses the gates. That level of description is called :term[RTL]{id=register-transfer-level} for short (not to be confused with the resistor–transistor logic of Chapter 8), and it is what nearly every chip is designed in now. Chapter 30 follows the tool through its stages.

:::history{year=1987 title="Logic synthesis becomes a product" people="Aart de Geus, David Gregory, Bill Krieger"}
Synthesis started as research. A team at General Electric, led by Aart de Geus, built a rule-based system called SOCRATES that turned a description of logic into optimised gates.:cite[ethw-degeus] In 1986 de Geus and two other GE engineers, David Gregory and Bill Krieger, founded a company, Optimal Solutions, to sell the idea; it was renamed Synopsys in 1987.

Its early years were small: revenue was \$130,000 in 1987 and \$976,000 in 1988, when it chose Verilog as an input language for its synthesis tool, first called Logic Compiler and soon renamed Design Compiler. By 1992 Synopsys, then a \$50 million company, had more than three quarters of the synthesis market.:cite[fundinguniverse-synopsys] After that, the description was the design and the gates were an output, like machine code from a compiler.
:::

The examples in this chapter follow the same route on a small scale: we describe hardware in Weft, synth builds the gates, and every time we ask “what does that become?” we count them.

## What’s next

We now have a language and know what it builds: modules and ports, wires that are `let` and state that is `reg`, defaults that later assignments override, choices as `if` and `match`, hierarchy and generics, block RAM as `mem`, state machines as enums, and tests that check a design before anything is built. Above all, synth shows its work: every line has a cost, and the cost has a name.

What we have *not* followed yet is the rest of synth's road to a chip. The word-level cells of this chapter become an and-inverter graph, the graph is cut into 4-input LUTs, the LUTs are packed into logic cells, placed on the iCE40’s fabric by simulated annealing, routed through the switches of Chapter 28, timed, and turned into a bitstream. Chapter 30 follows a design through each of those steps; then, in Chapter 31, the computer of Part V and an RV32I core go onto the chip, and run.
