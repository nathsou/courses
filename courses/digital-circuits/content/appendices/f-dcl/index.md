---
number: F
title: Weft reference
summary: "The part of Weft the course uses, in one place: lexical structure, types and ranges, exact and wrapping arithmetic, registers, memories, instances and generics, clock domains, the top module, the course’s tests, the standard library, and what each construct becomes."
duration: Look things up
prerequisites: []
---

This appendix is the reference for **Weft**, the hardware language of the synth toolchain, which the course uses from [Chapter 29](/chapters/describing-hardware/) on. Chapter 29 teaches it; this page is what you keep open while you write it. The full specification is synth’s own, `docs/WEFT.md` in its repository:cite[synth-weft]; this page covers what the course’s designs use, with the rules that catch people out. It is checked: every `weft` block on the page is a whole program that synth compiles without a warning, in synth’s format, and the tests after it pass. When the language changes and this page does not, a test fails.

Two conventions. *Compile-time* means the value is known when the compiler runs (a number, a `const`, a generic parameter, a loop variable): it costs no hardware. *Hardware* means the value is a wire that changes while the circuit runs.

## A module at a glance

```weft
/// A 4-bit counter with enable and synchronous clear.
module counter(
    in  clk: clock,
    in  enable: bool,
    in  clear: bool,
    out count: uint<4>,
    out wrapped: bool,
) {
    reg value: uint<4> = 0;

    if clear {
        value := 0;
    } else if enable {
        value := value +% 1;
    }
    count = value;
    wrapped = enable && value == 15;
}
```

```tests
test "counts while enabled, and clear wins" {
    set enable = true, clear = false;
    step 3;
    expect count == 3;
    set clear = true;
    step;
    expect count == 0;
}
```

Everything in it is one of five things. **Ports** say which way a signal goes (`in`, `out`) and its type. A **register**, `reg value: uint<4> = 0;`, is flip-flops with a power-up value. `:=` says what a register becomes at the next clock edge; `=` drives a wire, continuously. **Conditions** are `if` statements and expressions over `bool`. And **arithmetic** is exact unless you ask it to wrap: `value + 1` would be a 5-bit number, so the counter writes `value +% 1`.

::snippet-playground{id="glance" n="F.1" tab="run" caption="The counter in a playground. Set enable and press Step clock: count goes up at each edge. Change `+%` to `+` and read synth’s message: a 5-bit sum does not fit a 4-bit register. Then open the Circuit tab to see the four flip-flops and the logic of the next value."}

## Lexical structure

- **Comments**: `//` to the end of the line, `/* … */`, and `///` for a doc comment, which attaches to the next item, port or declaration (the editor shows it on hover).
- **Names**: ASCII letters, digits and `_`, not starting with a digit. By convention `snake_case` for values, modules and functions, `CamelCase` for structs, enums and their variants, `UPPER_CASE` for constants and generic parameters.
- **Keywords**: `async bool clock const default domain else enum extern fn for if in index init inout inst int let match mem module out reg sint string struct true false type uint undef var wire`. `index` is one of them, so a port cannot be called `index`.
- **Integer literals**: `42`, `0x2A`, `0b101010`, `0o52`, with `_` between digits (`1_000_000`). A literal has no type of its own: it takes the one its place expects. Binary and hexadecimal literals also have a *natural width*, their number of digits (times 4 for hexadecimal), which `concat` uses.
- **Statements** end with `;`. A file may hold any number of items, in any order, and the files of a design share one namespace.

## Types and ranges

| Type | Values | Width |
|---|---|---|
| `bool` | `false`, `true` | 1 |
| `uint<N>` | 0 to 2^N − 1 | N |
| `sint<N>` | −2^(N−1) to 2^(N−1) − 1, two’s complement | N |
| `index<N>` | 0 to N − 1: a valid index into N things | the bits needed for N − 1 |
| `[T; N]` | N elements of type T | N × the width of T |
| `struct` | one value per field | the sum of the fields |
| `enum` | one of the variants | chosen by the compiler, or declared |
| `clock` | a clock, for ports only | |

`bool` is not a number: conditions need `bool`, and there is no conversion between `bool` and integers except `b.bits()` (a `uint<1>`). Every integer expression has a **range**, which is its type: `x + 1` for `x: uint<8>` is the range 1 to 256, which needs nine bits. Arithmetic never loses a bit by accident.

```weft
/// An enum with an encoding of its own, and a struct.
enum Opcode: uint<7> { Load = 0x03, Store = 0x23, Op = 0x33 }

struct Pixel { r: uint<5>, g: uint<6>, b: uint<5> }

module decode(in op: uint<7>, in pixel: uint<16>, out is_memory: bool, out grey: uint<6>) {
    let p: Pixel = from_bits(pixel);
    is_memory = op == Opcode.Load.bits() || op == Opcode.Store.bits();
    grey = p.g;
}
```

An enum without an encoding (`enum State { Idle, Busy, Done }`) has no bits you can see: the compiler chooses them, and may choose one-hot. A variant is written `State.Idle`, or `.Idle` where the type is known.

## Expressions

From the strongest binding to the weakest: `.field`, `.method()`, `[i]`, `[hi:lo]`, calls; `**` (compile-time only); unary `-`, `!`, `~`; `*`, `*%`, `/`, `%`; `+`, `-`, `+%`, `-%`; `<<`, `>>`; `&`; `^`; `|`; comparisons; `&&`; `||`. Three rules differ from C and Verilog, and synth enforces all three:

- Bitwise operators bind tighter than comparisons: `a & mask == 0` is `(a & mask) == 0`.
- Comparisons do not chain: `a < b < c` is an error.
- Mixing `&&` with `||`, or two of `&`, `|` and `^`, needs parentheses.

**Exact and wrapping arithmetic.** `+`, `-` and `*` compute the mathematical result, in as many bits as it needs: with `x: uint<8>`, `x + 1` is `uint<9>` and `x - 1` is signed, because it can be −1. To get the result modulo the size of a type, use `+%`, `-%` and `*%`: `x +% 1` is a `uint<8>` again. A value converts implicitly to a type only when its range fits; otherwise convert it: `uint<8>(y)` (an error if `y` might not fit), `y.trunc(8)` (the low eight bits), `s.bits()` and `u.as_sint()` to reinterpret. Division and remainder take a constant divisor.

```weft
module arithmetic(
    in  x: uint<8>,
    in  y: uint<8>,
    out sum: uint<9>,
    out low: uint<8>,
    out diff: sint<9>,
    out pair: uint<16>,
) {
    sum = x + y;
    low = x +% y;
    diff = x - y;
    pair = concat(x, y);
}
```

```tests
test "exact, wrapping and joined" {
    set x = 200, y = 100;
    expect sum == 300;
    expect low == 44;
    expect diff == 100;
    expect pair == 0xc864;
}
```

**Bits.** `x[3]` is one bit (a `bool`), `x[7:4]` a slice, `x[i +: 4]` four bits from a position that may vary; `concat(a, b)` joins values, the first one most significant. Shifts keep the width of what they shift (`>>` fills with the sign bit of a `sint`). Unsigned values have `.any()`, `.all()`, `.parity()`, `.reverse()` and `.replicate(k)`.

**`if` and `match`** are expressions as well as statements. A `match` must cover every value: list them, or end with `_ =>`. Patterns may be several values joined by `|`, and binary patterns may have don’t-care bits, `0b1?0`.

```weft
module flags(in op: uint<3>, in a: uint<8>, out y: uint<8>, out zero: bool) {
    y = match op {
        0 | 1 => a,
        2 => ~a,
        0b1?? => a >> 1,
        _ => 0,
    };
    zero = if y == 0 { true } else { false };
}
```

## Modules

A module body is a set of declarations and statements, and the order of declarations does not matter: a name is visible throughout its module.

| In a module body | Meaning |
|---|---|
| `let name = expr;` | A named wire, its type inferred (or given: `let w: uint<8> = …;`) |
| `wire name: T;` | A wire assigned later, with `=`, typically in the branches of a compile-time `if` |
| `reg name: T = v;` | A register with power-up value `v` |
| `mem name: [T; N] init …;` | A memory (below) |
| `inst name = module(port: value, …);` | An instance of another module; its outputs are `name.port` |
| `target = expr;` | Drive an output port or a `wire` |
| `target := expr;` | The next value of a register, or a write to a memory |
| `if c { … } else { … }`, `for i in 0..N { … }` | Conditional and unrolled statements |

The rules that make a Weft design mean one thing:

- **Every wire and output is driven on every path.** An `if` that drives a wire in one branch must drive it in the other: there are no latches.
- **A register keeps its value when it is not assigned.** `if enable { value := value +% 1; }` needs no `else`.
- **The last assignment wins.** Two assignments to the same target in the same cycle are allowed, and the later one in the text takes effect, which is how a default followed by special cases is written.
- **A module with one output is a function call**: `let r = alu(…);`. A module with several outputs is an `inst`, read as `name.port`. Module calls go in a `let`, not inside a larger expression.

**Generics and loops.** `module divider<N: int = 4>(…)` takes a compile-time parameter, given as `divider<N: 10>(…)`. `for i in 0..N { … }` is unrolled when the compiler runs; so is an `if` on a compile-time condition, which may hold declarations (that is how Chapter 31’s RV32I core chooses its register file). Functions, `fn name(args) -> T { … }`, are expanded where they are called.

```weft
/// Counts presses, of any of N buttons, already synchronised.
module presses<N: int = 4>(in clk: clock, in buttons: uint<N>, out count: uint<8>) {
    reg last: uint<N> = 0;
    reg total: uint<8> = 0;
    last := buttons;
    for i in 0..N {
        if buttons[i] && !last[i] {
            total := total +% 1;
        }
    }
    count = total;
}
```

## Memories

```weft
/// A register file: two read ports, one write port. The reads are registered, so this is block RAM.
module regs(
    in  clk: clock,
    in  write: bool,
    in  waddr: uint<5>,
    in  wdata: uint<32>,
    in  raddr: uint<5>,
    out rdata: uint<32>,
) {
    mem x: [uint<32>; 32] init [0; 32];
    reg q: uint<32> = 0;
    q := x[raddr];
    if write {
        x[waddr] := wdata;
    }
    rdata = q;
}
```

```tests
test "a word written is read a cycle after its address" {
    set write = true, waddr = 3, wdata = 33;
    step;
    set write = false, raddr = 3;
    step;
    expect rdata == 33;
}

test "a read in the cycle of a write sees the old word" {
    set write = true, waddr = 5, wdata = 7, raddr = 5;
    step;
    expect rdata == 0;
    step;
    expect rdata == 7;
}
```

A memory has no reset: its words start at the `init` contents (a constant array, often computed by a function, or `hex_file("…")`), or at 0. `m[i] := v` writes at the next clock edge. **How a memory is read decides what it becomes.** A read assigned to a register, `q := m[a]`, answers one cycle later, and synth gives the memory a block RAM, one per read port. A read used directly in logic answers at once, and on an iCE40, which has no small RAMs in its fabric, that is flip-flops: Chapter 31’s register file is the example of both. A read in the cycle of a write to the same word sees the old contents.

::snippet-playground{id="memory" n="F.2" tab="tests" caption="The register file above. Press Run tests: the second test shows that a read in the cycle of a write sees the old word. Change its first expectation to 7 and read the failure and the waveform."}

## Clocks and clock domains

A port of type `clock` is a clock, and a module with one clock port puts every register in that clock’s domain. Every value has a timing tag, and synth checks that values cross from one clock’s domain to another, or in from outside, only through something that makes the crossing safe:

- `sync(x)`: a two-flip-flop synchroniser (Chapter 17), for one `bool`. Synchronising the bits of a number separately is the classic bug, so `sync` refuses numbers.
- `reset_sync(x)`: a reset that asserts at once and releases on the clock.
- `unsafe_cross(x)`: a crossing that you declare safe, for values that are stable when they are read, and for building synchronisers yourself (Chapter 31 synchronises its switches with it, each switch a signal of its own).
- `@clk` after a port or a register puts it in a named clock’s domain; `@async` on a port says that the module synchronises it itself.

## The top module

The top module’s ports are the chip’s pins. Its non-clock inputs are **asynchronous** unless annotated, because a pin knows nothing of the chip’s clock, so an input must be synchronised before it reaches a register:

```weft
/// The counter of Chapter 29 on a board: the button enables it, and the LEDs show the count.
module board(in clk: clock, in btn: bool, out led: uint<4>) {
    let enable = sync(btn);
    reg value: uint<4> = 0;
    if enable {
        value := value +% 1;
    }
    led = value;
}
```

A board’s constraint file names the pins (`set_io led[0] 56`), and `synth build … --board go-board` uses the board’s own. In the course’s tests, the testbench drives the inputs between clock edges, as if they were synchronous.

## Tests

Tests are not part of Weft: they are the course’s, written in their own small language and run by synth’s simulator. A test block names the module it tests by the playground or exercise it belongs to.

| In a test | Meaning |
|---|---|
| `test "name" { … }` | A test, which starts from power-up |
| `set a = 1, b = true;` | Drive inputs |
| `step;`, `step 10;` | One clock cycle, or ten |
| `expect y == 3;` | Fail, showing the values read, unless the condition holds |
| `for i in 0..8 { … }` | A loop, unrolled |
| `test "name" <N: 8> { … }` | A test of the module with a generic parameter set |

A failing `expect` shows what each signal in it was, and a waveform of the inputs and outputs up to the failure.

## The standard library

Always available, and written in Weft:

| Module or function | What it is |
|---|---|
| `sync(x)` | Two-flip-flop synchroniser for one asynchronous `bool` (`sync<STAGES: 3>` for more) |
| `reset_sync(x)` | A reset asserted at once and released synchronously |
| `power_on_reset<CYCLES>()` | High for the first cycles after configuration |
| `rising(x)`, `falling(x)` | A one-cycle pulse when `x` rises, or falls |
| `divider<N>()` | `tick` high once every N cycles |
| `count_ones(x)`, `priority(x)`, `onehot_to_index(x)` | Counting bits; the lowest set bit; a one-hot value as an index |

```weft
/// Counts the presses of a button: synchronised, then a pulse on each rising edge.
module press_counter(in clk: clock, in btn: bool, out presses: uint<8>) {
    let pressed = rising(sync(btn));
    reg count: uint<8> = 0;
    if pressed {
        count := count +% 1;
    }
    presses = count;
}
```

::snippet-playground{id="std-presses" n="F.3" tab="tests" caption="The press counter. Run the tests: a press is counted three cycles after the button goes down (two in the synchroniser, one in rising). Change the test to expect it a cycle earlier and read the failure."}

## What each construct becomes

| Construct | Hardware (what synth builds on an iCE40) |
|---|---|
| `reg x: uint<N> = v;` | N flip-flops, with their power-up value |
| `if c { x := a; }` | the flip-flops’ clock enable, where synth can use it; otherwise a multiplexer |
| `if … else if …` | a chain of multiplexers, rebuilt as a tree where the conditions allow (Chapter 29) |
| `match s { … }` | a multiplexer tree on the bits of `s` |
| `a + b`, `a +% b` | an adder: LUTs for a few bits, the carry chain for more |
| `a == b`, `a < b` | comparators: XORs and an AND tree, or a carry chain |
| `a * b` | an array of adders: there are no multipliers on an iCE40 HX |
| `mem` read through a register | a block RAM (4,096 bits) per read port and per 4,096 bits |
| `mem` read directly, or `[T; N]` registers | flip-flops and a multiplexer per read |
| `inst` | the module’s hardware, flattened into the design |
| `sync(x)` | two flip-flops, marked so the tools leave them alone |
| `let`, `fn`, `for`, generics | nothing of their own: names, copies and constants |

## Messages

synth reports every independent mistake of a run, each with the line, a label under the code it points at, and usually a help line saying what to write instead. The kinds you will meet most are the ones Chapter 29’s tour shows: a width that does not fit (use `+%` or a conversion), a wire not driven on every path, `&&` and `||` mixed without parentheses, an asynchronous input reaching a register, a `match` that misses values, an index that may be out of range, and a name used twice. In the editor of every playground, hover the red underline to read the message, and press `Shift-Alt-F` to format the file as synth does.

## Coming from Verilog or VHDL

| Verilog | Weft |
|---|---|
| `assign y = a & b;` | `y = a & b;` |
| `wire [7:0] w = a + b;` | `let w = a +% b;` (or `a + b`, nine bits) |
| `reg [7:0] r; always @(posedge clk) r <= d;` | `reg r: uint<8> = 0;` and `r := d;` |
| `always @* case (s) … endcase` | `match s { … }` |
| `always @(posedge clk) if (en) r <= d;` | `if en { r := d; }` |
| `parameter W = 8` | `<W: int = 8>` |
| `generate for` | `for i in 0..W { … }` |
| `initial r = 0;` | the `= 0` in `reg r: uint<8> = 0;` |
| `$readmemh("f.hex", m)` | `mem m: [uint<8>; 256] init hex_file("f.hex");` |
| `wire [15:0] y = a * b;` (widens silently, or not) | `let y = a * b;`, exactly sixteen bits |
| a latch from an incomplete `if` | not expressible: every wire is driven on every path |
| a button wired straight to logic | refused: `sync(btn)` first |

The differences that matter are in the last three rows. Where Verilog lets a width mismatch, a missing branch or an unsynchronised input through and leaves synthesis or the bench to find it, Weft refuses to compile it, with a message that says what to write.
