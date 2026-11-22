---
number: 8
title: 'From a specification to RTL'
summary: 'Hardware described as registers and the logic between them, simulated cycle by cycle.'
duration: 75 minutes
prerequisites: [memory]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: 'A design has two registers, a and b, and the two lines `a <= b` and `b <= a`. What happens at each clock edge?'
options:
  - text: The registers swap their values.
    correct: true
    why: 'Every register computes its next value from the current values, and all of them update together at the edge. There is no order between the lines: both read the old values.'
  - text: Both end up holding b’s old value, because the first line runs first.
    why: 'That is how two assignments in a program behave. RTL lines are not executed in sequence; each describes hardware that exists all the time.'
  - text: It is an error, because a and b depend on each other.
    why: 'A loop through registers is fine; it is a loop of purely combinational logic, with no register in it, that would be an error.'
```

```quiz
q: 'In register-transfer level design, what does the combinational logic between registers compute?'
options:
  - text: Each register’s value for the next clock cycle, from the current register values and the inputs.
    correct: true
    why: 'That is the whole model: state in registers, and a pure function from (state, inputs) to the next state and the outputs.'
  - text: The order in which the registers are updated.
    why: 'All registers update at the same clock edge; the logic computes what they update to.'
  - text: The clock frequency.
    why: 'The clock frequency is limited by how long that logic takes to settle (chapter 12), but the logic does not compute it.'
```
:::

Part III follows one small design from an idea to a layout: a counter for one digit of a digital clock. It counts 0, 1, 2, … 9 and back to 0, one step per clock cycle while its input `en` is 1, and raises an output `tc` in the cycle it wraps, to tell the next digit to count. Here it is, described in the course's hardware description language and simulated. Change the inputs by clicking the cells, or change the design.

::rtl-playground{id="rtl/opening" title="One digit of a clock"}

Try setting `rst` to 1 in some cycle, or `en` to 0 for a few. Then try changing the 9 on the last line to 5 and watch it wrap sooner. Nothing in this description says how many transistors it will take, where they will go or how fast they must switch. It says what the circuit does in every clock cycle, and the rest of Part III turns that into geometry.

## The flow

A chip is designed in stages, each turning one description into a more concrete one and checking it against the last. The names vary between companies, but the shape does not:

1. **Specification**: what the chip must do, in prose, tables and models.
2. **Architecture**: how it will do it: the blocks, the memories, the buses, the clocks.
3. **RTL**: each block described as registers and the logic between them, in a hardware description language (this chapter).
4. **Verification**: showing that the RTL does what the specification says, by simulation and by proof (chapter 9). It takes more effort than writing the RTL.
5. **Synthesis**: turning RTL into a netlist of gates from a cell library (chapter 10).
6. **Physical design**: placing every cell and routing every wire (chapter 11).
7. **Sign-off**: checking timing, power, the manufacturing rules and the match between layout and netlist (chapter 12).
8. **Tape-out**: sending the layout to the fab, as a file describing a few dozen layers of polygons (Part IV takes it from there).

Each stage is done with software tools, a field called electronic design automation (EDA), and the chapters of this part build simple versions of the main ones. They run on the clock digit throughout.

:::software[A compiler pipeline]
The flow is a compiler's pipeline in hardware's terms: RTL is the source language, synthesis is compilation and optimisation, the standard-cell netlist is the object code, placement and routing are linking and loading into a physical address space, and sign-off is the test suite and the linter that can block a release. The big differences: the "executable" cannot be patched after shipping, and a release costs millions.
:::

## Register-transfer level

Chapter 7 ended with synchronous design: all state in flip-flops sharing one clock, combinational logic between them. **Register-transfer level** (RTL) description writes exactly that down. It names the registers, and for each one gives an expression for its next value; it names the outputs and gives an expression for each. Here is the clock digit again:

```hdl caption="The decade counter, the running design of Part III."
// One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
input en
input rst
reg q: 4 = 0
output tc = en && q == 9      // terminal count: the next digit counts
output digit: 4 = q
q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
```

`reg q: 4 = 0` declares four flip-flops holding a number from 0 to 15, starting at 0. The last line gives their next value: 0 when resetting; otherwise the same value when not enabled; otherwise 0 after 9; otherwise one more. `tc` and `digit` are outputs computed from the current value. Every line describes hardware, and all of it is there all the time:

::rtl-blocks

The `?:` operators become **multiplexers**, `q + 1` an incrementer (a chain of half adders), `q == 9` a comparator, `&&` an AND gate. Press the clock a few times. The register changes only at the edge; in between, the whole of the logic settles to a new D value, ready for the next edge. That is the model every RTL designer keeps in mind: each clock cycle, every register's next value is a function of the current state and the inputs, computed in parallel by dedicated hardware.

:::key
RTL describes a synchronous circuit as registers and the combinational logic that computes each register's next value. It is not a program run line by line: every line is a piece of hardware, they all operate at once, and the only notion of time is the clock edge.
:::

## The course's HDL

Industrial hardware is written in SystemVerilog or VHDL, large languages with decades of history. This course uses a small language of its own, with the same core: one implicit clock, and these statements, one per line.

| Statement | Meaning |
| --- | --- |
| `input en`, `input a: 8` | An input, 1 bit or 8 bits wide. |
| `reg q: 4 = 0` | A register of 4 flip-flops, 0 at power-on. |
| `q <= expr` | The register's value after the next clock edge. Without it, the register keeps its value. |
| `wire w: 5 = expr` | A named piece of combinational logic. |
| `output y = expr` | Combinational logic visible outside the design. |
| `assert expr` | A condition that must hold in every cycle (chapter 9). |

Expressions use the operators of C and Verilog: `+ - *`, bitwise `& | ^ ~`, shifts `<< >>`, comparisons `== != < <= > >=`, logical `&& || !`, the choice `c ? a : b`, bit selection `q[3]` and `q[3:1]`, and concatenation `{a, b}`. Values are unsigned. Arithmetic is done in the width of the signal being assigned, so `wire s: 5 = a + b` keeps the carry of two 4-bit numbers and `q + 1` in a 4-bit register wraps from 15 to 0. Appendix A has the details.

:::history{year=1984 title="Describing hardware in text" people="Phil Moorby, Prabhu Goel"}
Until the 1980s, digital chips were designed as schematics, drawn gate by gate. In 1980 Carver Mead and Lynn Conway's textbook taught a generation that chip design could be learned like programming, with simple rules.:cite[mead1980] Text descriptions followed. Verilog was created at Gateway Design Automation in 1984 as a language for simulation; VHDL came out of a United States Department of Defense programme and became an IEEE standard in 1987. Only when synthesis tools arrived at the end of the decade (chapter 10) did it become normal to write the description first and let software produce the gates.
:::

## Designing with registers

The exercises below are checked by proof, not by a few tests: the checker explores every state your design can reach, with every input, and compares its outputs with a reference design's (chapter 9 explains how). When a check fails, it shows the shortest input sequence that exposes the difference, as a waveform.

```rtl
id: rtl/mod6
title: The tens of seconds
prompt: 'The tens-of-seconds digit of a clock counts 0 to 5, not 0 to 9. Change the counter so that it wraps after 5, with `tc` high in the cycles where it is enabled and showing 5.'
code: |
  // One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
reference: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 5
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 5 ? 0 : q + 1
solution: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 5
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 5 ? 0 : q + 1
hints:
  - Two numbers in the design encode “the last digit”. Both must change.
why: 'The same structure counts to any limit; only the comparator changes. A three-bit register would be enough here, since 5 fits in three bits; synthesis would remove the unused flip-flop anyway if its value could never matter.'
```

```rtl
id: rtl/seconds
title: Seconds from 00 to 59
prompt: 'Combine two digits into a seconds counter. `units` counts 0–9 while `en` is 1; `tens` counts 0–5, and steps only in the cycle where `units` wraps. `tc` is 1 in the cycle where the count is enabled and showing 59 (so the minutes should step). `rst` clears both. Outputs: `units` and `tens`, 4 bits each, and `tc`.'
code: |
  // Seconds, 00 to 59.
  input en
  input rst
  reg u: 4 = 0
  output units: 4 = u
  u <= rst ? 0 : !en ? u : u == 9 ? 0 : u + 1
reference: |
  input en
  input rst
  reg u: 4 = 0
  reg t: 4 = 0
  wire uc = en && u == 9
  output tc = uc && t == 5
  output units: 4 = u
  output tens: 4 = t
  u <= rst ? 0 : !en ? u : u == 9 ? 0 : u + 1
  t <= rst ? 0 : !uc ? t : t == 5 ? 0 : t + 1
solution: |
  input en
  input rst
  reg u: 4 = 0
  reg t: 4 = 0
  wire step = en && u == 9        // the units digit wraps this cycle
  output tc = step && t == 5
  output units: 4 = u
  output tens: 4 = t
  u <= rst ? 0 : !en ? u : u == 9 ? 0 : u + 1
  t <= rst ? 0 : !step ? t : t == 5 ? 0 : t + 1
hints:
  - 'Add a second register for the tens. Its “enable” is the units digit’s terminal count: en && u == 9.'
  - 'A `wire` can name that condition so that both `tens` and `tc` can use it.'
why: 'Chaining terminal counts this way is how every multi-digit counter is built, from clocks to odometers: each digit is enabled by the carry of the one below. Both registers still update at the same clock edge; the tens register simply keeps its value in most cycles.'
```

```rtl
id: rtl/press
title: Seeing a button go down
prompt: 'A button input `btn` stays 1 for as long as it is held. Make `press` 1 for exactly one cycle, the first cycle in which `btn` is 1 after being 0, and 0 otherwise. (At power-on, treat the button as having been up.)'
code: |
  input btn
  output press = btn
reference: |
  input btn
  reg was = 0
  output press = btn && !was
  was <= btn
solution: |
  input btn
  reg prev = 0          // btn, one cycle ago
  output press = btn && !prev
  prev <= btn
hints:
  - To know that the button has just gone down, the design must remember what it was in the previous cycle. Remembering takes a register.
why: 'One flip-flop that delays a signal by a cycle, and one gate comparing the delayed and current values: an edge detector. Registers are how a design sees the past; combinational logic sees only the present.'
```

:::software[Not a programming language]
An HDL looks like code, and the temptation is to read it as code. Three differences matter. Every line runs at the same time, all the time. A value is a bundle of wires of a fixed width, not a number in memory. And anything written describes hardware that must physically exist: a `*` of two 32-bit values is a multiplier of thousands of gates, there whether or not its result is needed. Good RTL designers think in circuits first and write the description second.
:::

## Summary

- A chip is designed in stages, specification to tape-out, each checked against the last, with EDA software at every step.
- RTL describes synchronous logic: registers, and the combinational logic that computes their next values and the outputs. Every line is hardware; time advances only at clock edges.
- The course's HDL has inputs, registers with `<=`, wires, outputs and assertions, with Verilog-like operators and widths.
- Simulation runs the design cycle by cycle from a stimulus; a waveform shows every signal in every cycle.
