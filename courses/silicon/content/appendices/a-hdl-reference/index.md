---
number: A
title: 'The course’s hardware description language'
summary: 'Every construct of the small HDL used in Part III, and how it maps to hardware.'
---

The HDL of Part III is a deliberately small register-transfer language. It has the core of Verilog and VHDL (registers, combinational logic, a single clock, assertions) and nothing else: no modules, no loops, no separate testbench language. Designs written in it are simulated, proved, synthesised, placed, timed and tested by the course's own tools, all in your browser.

::rtl-playground{id="appendix/playground" title="A design to experiment with"}

## Statements

One statement per line (or several, separated by semicolons). Comments run from `//` to the end of the line. A statement can continue onto the next line inside parentheses or braces.

| Statement | Meaning |
| --- | --- |
| `input name` | A one-bit input, set by the outside world in every cycle. |
| `input name: w` | An input of `w` bits, 1 to 32. |
| `reg name: w = v` | A register of `w` flip-flops with power-on value `v` (default 0). |
| `name <= expr` | The register's value after the next clock edge. At most one per register; a register without one keeps its value for ever. |
| `wire name: w = expr` | A named piece of combinational logic. |
| `output name: w = expr` | Combinational logic visible outside the design. |
| `assert expr` | Must be non-zero in every cycle. Checked in simulation; proved by the exercises' checker. |
| `assume expr` | Inputs the environment promises: a proof considers only input values for which it holds. |

Every name must be declared exactly once, before or after its use. Wires and outputs may read each other, but not in a loop: a loop of combinational logic with no register in it is an error, reported with the names on the loop.

## Values and widths

Values are unsigned whole numbers of up to 32 bits. Literals are decimal (`9`), binary (`0b1001`) or hexadecimal (`0x9`), and may contain `_` for readability. A decimal literal is as wide as it needs to be; a binary or hexadecimal one is as wide as its digits.

Widths follow Verilog's rules in simplified form. Each operator has a **self-determined** width:

- `+ - * & | ^ ~` and unary `-`: the larger of their operands' widths;
- `<< >>`: the width of the left operand;
- `== != < <= > >=`, `&& || !`: one bit;
- `c ? a : b`: the larger of `a` and `b`;
- `x[i]`: one bit; `x[h:l]`: `h − l + 1` bits; `{a, b, …}`: the sum of the parts.

Arithmetic, bitwise and `?:` operators are then **extended to their context**: when an expression is assigned to a wire, output or register, those operators are computed at the declared width (or their own width, if larger). So `wire s: 5 = a + b` with 4-bit `a` and `b` keeps the carry, while `q <= q + 1` with a 4-bit `q` wraps from 15 to 0. Comparisons compare their operands at the larger of their two widths. Anything wider than its destination is truncated to its low bits.

## Operators

From the loosest binding to the tightest:

| Operators | Meaning |
| --- | --- |
| `c ? a : b` | a if c is non-zero, else b (groups to the right) |
| `\|\|` | logical or (1 or 0) |
| `&&` | logical and |
| `\|` | bitwise or |
| `^` | bitwise exclusive or |
| `&` | bitwise and |
| `==` `!=` | equal, not equal |
| `<` `<=` `>` `>=` | unsigned comparison |
| `<<` `>>` | shift left, shift right (zeros shifted in) |
| `+` `-` | addition, subtraction (modulo 2^width) |
| `*` | multiplication (low bits) |
| `~` `!` `-` | bitwise not, logical not, negation (prefix) |
| `x[i]` `x[h:l]` | bit and slice selection (constant indices) |
| `{a, b}` | concatenation, `a` in the high bits |

## Time

There is one clock, implicit. In each cycle, the inputs take their values; every wire and output is computed from the inputs and the registers' current values; assertions are checked; and at the end of the cycle every register takes the value of its `<=` expression, all at once. The order of the lines never matters.

The course's simulator works exactly this way, one cycle at a time. Its proofs explore the reachable register values breadth-first from power-on, with every combination of input values (at most 12 input bits in all), up to 200 000 states; equivalence checks explore pairs of states of two designs the same way.

## How each construct becomes hardware

| Construct | Hardware |
| --- | --- |
| `reg q: 4` | four D flip-flops, clocked together |
| `a + b`, `a - b` | a ripple-carry adder of full adders (XOR, AND, OR) |
| `a == b` | XNOR (or inverter) per bit, then an AND tree |
| `a < b` | a subtractor whose final borrow is the answer |
| `c ? a : b` | a column of two-input multiplexers |
| `a * b` | an array of AND gates and adders |
| `a << s` with variable `s` | a barrel shifter: one layer of multiplexers per bit of `s` |
| constants | wires to 0 or 1, usually optimised away |

Chapter 10 takes a design through these steps and onto the cell library.

## Differences from Verilog

- No `module`, `always`, `begin`/`end` or blocking assignments: each register gets one next-value expression.
- One clock and no asynchronous reset; a reset is an ordinary input used in the next-value expression.
- No signed arithmetic, no `x` or `z` values, no delays: every value is a definite number.
- `assert` and `assume` are statements of the language, like SystemVerilog's immediate assertions, and are checked in every cycle.
