---
number: 31
title: CPUs on a chip
summary: Octet, drawn in Chapter 22, is described in about 240 lines of Weft, fitted by synth on an iCE40 HX8K in 539 logic cells, and runs your assembly from the block RAMs of its bitstream; an RV32I core takes 3,568 cells, more than half of them one array of registers.
duration: About 3 hours
prerequisites: [control, describing-hardware, netlist-to-bitstream]
---

Chapter 22 ended with a computer you could pull apart. Octet was 3,604 gates, drawn, with a control unit whose equations fitted on one screen, and it ran every program of Chapter 23 as the interpreter said it should, cycle for cycle. Chapters 28 to 30 built the other half of the story: a chip that is nothing but memory, thousands of small lookup tables and the wires between them, and the tools that turn a description into the bits that fill it.

This chapter puts one on the other. Octet is written once more, as text, in Weft. synth fits it on a real chip, an iCE40 HX8K, and the board on the screen runs it, not from the source but from the *bits*: you write assembly, the assembler makes bytes, the bytes go into the block RAMs of the bitstream, and the chip decoded from that bitstream runs your program. Then the same is done for a real instruction set, RV32I, where something surprising happens. The core is nearly seven times the size of Octet, and more than half of it is one array of registers.

## Octet, described

Everything in the drawn Octet has a line of text in the described one, and most of it has the same name. The ALU is Chapter 21’s module and the control logic Chapter 22’s, unchanged, in their own files; `octet.weft` is the rest of the machine.

| In Chapters 21 and 22 | In Weft |
|---|---|
| Registers PC, SP, IR, MAR, A, B, T, R0 to R3 and the four flags: parts with a load line | A `reg` for each, and a `:=` that says when it loads |
| A bus with seven tri-state drivers | Seven ANDs and an OR |
| The ALU part | `octet_alu`, Chapter 21’s module (`octet-alu.weft`) |
| The hardwired control unit and its 24 lines | `octet_decode`, Chapter 22’s module (`octet-decode.weft`) |
| The 256-byte RAM part | `mem ram`, a block RAM |
| The devices in the top 16 addresses | A `match` on the address, and a register for each device |

The bus is the interesting one. An FPGA has no tri-state drivers inside it (its wires are driven by multiplexers and buffers, so that no configuration the tools write can make two outputs fight), and a bus of drivers is not what Chapter 22 needed anyway. What it needed was that *at most one* of the seven output-enable lines is on in any cycle, which Chapter 22’s exhaustive test showed: no term of the control unit has two of them. Then the bus is the OR of seven values, each gated by its own enable, and a gated value is 0 when its enable is off:

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
/// Gate a byte with an enable: the AND that stands in for a tri-state driver.
fn drive(enable: bool, x: uint<8>) -> uint<8> {
    if enable { x } else { 0 }
}
```

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    let bus_without_memory: uint<8> = drive(control.oe_rd, r[rd])
        | drive(control.oe_rs, r[rs])
        | drive(control.oe_pc, pc)
        | drive(control.oe_sp, sp)
        | drive(control.oe_alu, alu.y)
        | drive(control.oe_t, t);
```

(The bus without the memory is a name of its own for a reason that comes two subsections down; the full bus ORs in the memory’s byte.) Registers are the other half of the datapath, and each is a few lines: what it becomes at the next clock edge. The program counter can be loaded from the bus, or counted, or left alone; the :term[register file]{id=register-file} is four registers written by a loop; the flags load together when the control unit says `ld_flags`. `rst` is the board’s reset button, and it is a synchronous one, an ordinary condition of the next-value logic:

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    if rst {
        pc := 0;
    } else if control.pc_ld {
        pc := bus;
    } else if control.pc_inc {
        pc := pc +% 1;
    }
```

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    for i in 0..4 {
        if rst {
            r[i] := 0;
        } else if control.we_r && rd == i {
            r[i] := bus;
        }
    }
```

One thing in the file has no part in Chapter 22’s drawing. The reset button, the switches and the buttons are pins of the chip, and they change whenever a finger moves, with no regard for the clock. Weft does not let such a value reach a register directly (Chapter 29): the ports are declared `@async`, and the design passes them through two flip-flops first, the synchroniser of Chapter 17.

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    let rst = sync(rst_button);
    reg inputs_meta: uint<12> = 0;
    reg inputs: uint<12> = 0;
    inputs_meta := unsafe_cross(concat(btn, sw));
    inputs := inputs_meta;
```

`sync` takes one bit, because synchronising the bits of a *number* separately is a classic bug: they can arrive in different cycles. Here each switch and button is a signal of its own, so the twelve are passed through two registers together, with `unsafe_cross` to say that the crossing is deliberate.

The ALU is Chapter 21’s module, a `match` over its operation code, and the whole subtlety of Octet’s flags is in two lines of it. Subtraction is addition of the complement with a carry in, and the exact sum, nine bits wide, keeps the carry out. Chapter 14 noted that the carry out of A + ¬B + 1 means *no* borrow, and that some processors, x86 among them, invert it into a borrow flag. Octet’s C is a borrow, so it is the carry out XORed with whether we subtracted. Overflow is the signs rule of Chapter 14: the operands (with B complemented for a subtraction) have the same sign and the result has another.

```weft from="content/chapters/21-datapath/designs/octet-alu.weft"
    // C is the carry out of an addition, the borrow (its inverse) after a subtraction, and the bit shifted out by SHR.
    c = if arithmetic { wide[8] ^ subtract } else if op == 6 { a[0] } else { false };
    // V: both operands (B inverted for a subtraction) have the same sign, and the result has the other one.
    v = arithmetic && a[7] == (b[7] ^ subtract) && result[7] != a[7];
```

Notice what is *not* there: no adder to instantiate, no carry chain to draw. `a + addend + …` is a few words of hardware, and synth finds the carry chain in it by itself.

### Memory that answers a cycle late

Chapter 22’s RAM was a part whose data outputs showed the byte at its address at once, whenever the address changed. The :term[block RAM]{id=block-ram} of an FPGA does not: it takes its address at a clock edge, and the byte appears *after* that edge. That is a :term[synchronous read]{id=synchronous-read}. Octet’s fetch is `MAR ← PC` in one cycle and `IR ← M[MAR]` in the next, and every other instruction reads memory the same way, one cycle after MAR has been loaded.

```quiz
q: 'MAR is loaded at one clock edge, and Octet uses the byte M[MAR] in the very next cycle. A block RAM samples its address at a clock edge and shows the byte after that edge. If MAR is simply wired to the RAM’s address, when does the byte arrive, and what is the way to keep the ISA’s cycle counts (4 to 8 an instruction)?'
options:
  - text: 'On time; nothing needs to change.'
    why: 'The RAM sees MAR only at the edge after MAR has changed, so its byte is one cycle behind what the control unit expects: the instruction register would load the byte of the previous address.'
  - text: 'One cycle late; add a wait cycle after every load of MAR.'
    why: 'That works, and real cores do it. But it changes the table: every instruction that reads memory takes a cycle more (the fetch alone is one), and Octet would no longer be the machine that the interpreter, Chapter 22 and Chapter 23 count.'
  - text: 'One cycle late; give the RAM the value that MAR is about to have, so that the byte is ready when MAR has it.'
    correct: true
    why: 'The RAM’s address is the value at MAR’s input, not MAR’s output. The RAM then plays the part of the register: it holds the address inside, and shows its byte exactly one cycle after the load, which is where Chapter 22’s memory had it.'
  - text: 'One cycle early; nothing needs to change.'
    why: 'A synchronous read is never early: the data appears after the edge that takes the address.'
```

Figure 31.1 shows the two behaviours with the same four words. The upper memory is Chapter 22’s: change the address and the word follows at once. The lower has a register in front of the address, which is what a block RAM has inside: change the address and nothing happens until the clock.

::circuit{src="31-cpus-on-a-chip/circuits/memory-read.json" n="31.1" title="Two ways to read a memory" mode="logic" speed=1e-6 traces="in_A0,in_A1,in_CLK,oa1,ob1" window=1e-5 caption="Flip the address switches A0 and A1: the upper memory shows its word at once (one lamp, the word’s position is the address). The lower one keeps showing the word of the address it saw at the last clock. Press Clock and it catches up. Set address 1 and watch the two traces at the bottom: D1 of the upper memory rises with the switch, D1 of the lower only with the clock."}

Octet’s way is the third option of the question. `address` is what MAR will hold after this edge: the bus if the control unit is loading it, otherwise MAR itself. The bus without the memory’s own driver is used for it, and that is why the bus was written in two parts. In Weft the one-cycle delay is in the source, where you can see it: a read assigned to a register with `:=` is a registered read, and synth gives a memory read that way a block RAM (Chapter 29).

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    mem ram: [uint<8>; 256] init program();
    let address = if control.ld_mar { bus_without_memory } else { mar };
    reg ram_byte: uint<8> = 0;
    ram_byte := ram[address];
```

There is one instruction pair for which this is not enough, and it is the one with the most steps: `LD` and `ST` load MAR *from memory* (`MAR ← M[MAR]`, the byte after the opcode is the address) and then read at that address. The byte that has just arrived is the next address. A second read port, whose address is the first port’s output, has the answer ready in the next cycle, and a flip-flop remembers which port to listen to:

```weft from="content/chapters/31-cpus-on-a-chip/designs/octet.weft"
    reg ram_indirect: uint<8> = 0;
    ram_indirect := ram[ram_byte];
    reg indirect: bool = false;
    indirect := control.ld_mar && control.oe_mem;
```

Two read ports on one memory is two block RAMs with the same contents, one write port shared. That is what synth builds, and its report will say so.

### How we know it is Octet

The proof is the one Chapter 22 used, moved to the new machine. `octet.test.ts` runs the Weft design in synth’s simulator beside the interpreter, both with the same program and the same switches, and after **every instruction** compares everything a program can see. The interpreter runs first and says how many clock cycles each instruction takes (Chapter 22’s table, 4 to 8); the Weft machine is then clocked in those groups, and its state is read after each:

```ts from="content/chapters/31-cpus-on-a-chip/octet.test.ts"
  const run = await octet.run(image, steps.map((s) => s.cycles), { switches: SWITCHES, buttons: BUTTONS, trace: lines ? TRACED : [] });
```

```ts from="content/chapters/31-cpus-on-a-chip/octet.test.ts"
    const diff = compareStates(s.want, last, { timing: true });
```

Registers, flags, PC, SP, all 240 bytes of RAM, the LEDs, the hex register and the console must agree, *and the cycle count must be the ISA’s*, and the step counter must be back at zero. On the way, in a quarter of the programs, the 24 control lines of every cycle are compared with Chapter 22’s microprogram. The programs are every one of the 256 first bytes from random registers and flags, 100 random programs that jump, push, call, load and store, 50 more that also use the devices, and the course’s own: blink, count, multiply, Fibonacci, hello, sort and the reaction timer. Every one passes.

## Fitting Octet on an iCE40

synth takes about three seconds for Octet, and the Steps tab of Figure 31.2 below has the numbers. They are worth reading against the drawing.

| | Drawn (Chapters 21 and 22) | Described, on an iCE40 HX8K |
|---|---|---|
| Size | 3,604 elements (gates, tri-state drivers, one RAM), or 334 built from the simulator’s blocks | 539 logic cells: 409 LUTs, 155 flip-flops and 26 carry cells; 2 block RAMs |
| Share of the chip | | 7 % of the HX8K’s 7,680 cells; it would fill 42 % of the HX1K’s 1,280 |
| What you can say about speed | The simulator’s gates are 1 ns each and the tests clock it slowly | 80.6 MHz: a critical path of 12.4 ns |
| Cycles per instruction | 4 to 8 | 4 to 8: the same |
| Wires | Every one drawn | 592 nets, 6 routing iterations, no wire shared |

The elements of the drawing and the cells of the chip are not the same unit, and 3,604 against 539 is not a fair fight: a LUT holds a whole cone of gates, which is the point of Chapter 28. But it is the fair answer to a question a designer asks, *how much of the chip does my CPU take?*, and the answer is a small corner of a small FPGA.

The 155 flip-flops are the registers of the programmer’s model and of the datapath, counted, and the synchronisers: 88 in PC, SP, IR, MAR, A, B, T and R0 to R3, 4 flags, 3 in the step counter, the devices’ registers (LEDs, HEX, the random generator, the console byte and its strobe), one for `indirect`, and 26 in the synchronisers of the reset button, the switches and the buttons. The memory is not among them, and that is the design’s biggest decision. Read without a register, 240 bytes would be 1,920 flip-flops, more than the 1,280 cells of the whole HX1K. Read with one, synth gives it to the block RAMs, and takes nothing from the fabric at all.

The critical path, the slowest 12.4 ns, starts at the step counter, goes through the control logic and the bus, and ends after ten LUTs at the enable of the RANDOM device’s register (the test `bus != 0`, on the way to its next value). Of the 12.4 ns, 7.9 are wires. It is Chapter 30’s lesson again: to make Octet faster, change the number of LUTs between a register and a register, not what is in them.

## Your program on the chip

Octet fits, and now it must run something. The program is the RAM’s initial contents, `program()`, a table of 256 bytes at the end of `octet.weft`. Those bytes reach the chip as bits in the bitstream: each of the two block RAMs is configured as 512 words of 8 bits, and its 4,096 initial-contents bits sit in the RAM’s own part of the configuration memory, beside the fabric’s. The bits of a word are spread over the block in an order set by the way the block’s data and address pins are wired, which synth knows and IceStorm documented.

That gives two ways to change what the chip runs:

- **Fit again.** Put the new bytes in `program()` and run the whole flow: three seconds, and a new placement and routing, which may have different timing.
- **Load the bits.** The program is *data*, and nothing else in the bitstream depends on it: no LUT is computed from it, no route goes anywhere because of it. Rewrite the bits of the two RAMs, and every other bit stays. It takes milliseconds, and real tools do exactly this: IceStorm’s `icebram` replaces the contents of the block RAMs in a bitstream,:cite[icebram] and synth’s `bram_load` does the same for this figure.

Figure 31.2 does both. Write assembly in the Assembly tab, press **Load into the chip**, and the assembler’s bytes go into the bits; the board runs the chip decoded from them. **Fit again** does it the slow way, so that you can feel the difference. The Source tab has the three files, with the program that is in the chip at the end of `octet.weft`; the Chip tab the placed cells; the Board the switches, buttons, LEDs and digits. The two left digits show the program counter, the two right the HEX register, and the console line at the bottom is what the program wrote to CONSOLE.

::octet-board{n="31.2" caption="The walking light of walk.asm is in the chip. Press Run on the Board (choose 1 kHz or fast) and watch the LEDs and the program counter on the left digits. Then, in the Assembly tab, change WAIT from 8 to 2 and press Load into the chip: it is loaded in milliseconds, with four configuration bits changed, all in the two block RAMs. Press Fit again for the same program and compare the seconds. Pick Hello, world, load it and run it: the text appears under the board, and the halted lamp lights."}

:::lab[Walk, load, and find your program in the bits]
Use Figure 31.2. Wait for the fit (a few seconds after the figure first comes into view), and press Run at 1 kHz.

1. **The light.** One LED lights and walks to the left, then back. The right digits count the steps in hexadecimal, and the left digits are the program counter, and it spends most of its time between 1B and 1D, the delay loop of the subroutine `step`.
2. **The speed.** In the Assembly tab change `.equ WAIT, 8` to `.equ WAIT, 2` and press *Load into the chip*. The light is four times faster. Read the status line: how many bits changed? (Four: the byte 0xF8 becomes 0xFE, which is two bits in each of the two RAMs.)
3. **The table.** Open the Source tab and `octet.weft`, and scroll to `program()` at its end: the bytes of the program that is in the chip, sixteen to a line. They are what you just changed, and the only thing.
4. **Other programs.** Pick *Switches to LEDs* and load it: flip a switch on the Board and the LED follows; hold a button and see the number on the right digits change. Pick *Hello, world*, load it and run it: the text appears under the board, and the halted lamp lights. Press Reset to run it again.
5. **Break it.** Introduce an error in the assembly: the Load button is disabled, because nothing that does not assemble can be put in a table.
:::

:::hood[How the board runs the bits]
The board is not wired to the design. synth placed the design’s ports on pins of its own choosing, and the board drives those pins. `Chip` in the chapter’s `widgets/chip.ts` starts a simulation of the decoded bitstream, with the pins the placer chose to name its ports, and each batch of cycles is three operations of synth’s simulator: drive the inputs, step the clock, read the outputs.

```ts from="content/chapters/31-cpus-on-a-chip/widgets/chip.ts"
    const r = await tbRun(this.synth, this.id, [{ set }, ...(cycles > 0 ? [{ step: cycles, ...(trace ? { trace } : {}) }] : []), { read: this.outputs }]);
```

What runs is not the source: it is the netlist that synth’s decoder recovered from the configuration bits, as Chapter 28’s box describes, one logic cell, block RAM and pad at a time. The tests of the next section are what makes that the same machine.
:::

:::hood[Changing the program without fitting again]
`loadOctet` in `widgets/chip.ts` finds the block RAMs that hold Octet’s memory, two of them, and hands their new words to synth, which rewrites their bits in the bitstream and nothing else:

```ts from="content/chapters/31-cpus-on-a-chip/widgets/chip.ts"
  const words = octetWords(image);
  const r = await bramLoad(synth, f.bin, octetRams(f).map((at) => ({ ...at, width: 8 as const, words })));
```

In synth, every bit of every word is put where the hardware reads it. A word of a block RAM in its 8-bit mode is bits 8*a* to 8*a* + 7 of the block, and the four low bits of each group of sixteen are stored in reverse:

```rust
let l = a * width + b;
let i = (l & !15) | ((l & 1) << 3 | (l & 2) << 1 | (l & 4) >> 1 | (l & 8) >> 3);
```

Loading multiply.asm in place of the walking light changes 352 bits of the HX8K’s 131,072 block-RAM bits. Then the bitstream is encoded again, with its CRC computed afresh, and the decoder builds a new circuit from the new bits. Everything the router decided is still valid, because the program did not change what is connected to what.
:::

## Why the RV32I core is bigger

RV32I is the base instruction set of RISC-V: 40 instructions, 32 registers of 32 bits, 32-bit addresses and 4-byte instructions. It is a *real* instruction set, one that compilers target and that Linux runs on, and the reference core of this course, `content/designs/rv32i.weft`, is about 150 lines of Weft, with the ALU of Chapter 29 and its register file in their own files. Each instruction takes two cycles: one to fetch, one to execute.

:::history{year=2011 title="An instruction set that anybody may use" people="Andrew Waterman, Yunsup Lee, David Patterson, Krste Asanović"}
In 2010 a group at Berkeley wanted an instruction set for teaching and research, and the popular ones were either encumbered by licences or too complicated to teach. They wrote their own, and called it RISC-V, the fifth RISC design from Berkeley. The first public specification is the technical report *The RISC-V Instruction Set Manual, Volume I: Base User-Level ISA* of May 2011, by Andrew Waterman, Yunsup Lee, David Patterson and Krste Asanović.:cite[riscv-2011] The point was less the instructions than the licence: anyone may implement the instruction set without asking, which is why a graduate student’s core, a company’s microcontroller and a soft core on an FPGA can all be RISC-V. The RV32I of this chapter is the base set of that manual, in the version ratified in 2019.
:::

Fitted on the same HX8K, the core is another size altogether. Before you look, guess.

```quiz
q: 'Octet took 539 logic cells. RV32I has registers and an ALU four times as wide, 32 registers instead of 4, and more instructions. About how many cells does the RV32I core need?'
options:
  - text: 'About 1,500: three times Octet.'
    why: 'That would be about right for a datapath four times as wide with slightly more control. It is what the core needs if you take out one thing, which is the point of the next few paragraphs.'
  - text: 'About 3,600: nearly seven times Octet.'
    correct: true
    why: '3,568 cells with the ROM and devices around it. The wider datapath and the decoder of a bigger instruction set account for about 1,500 of them. The other 2,100 are the register file.'
  - text: 'About 15,000: thirty times Octet.'
    why: 'That would not fit the HX8K, which has 7,680 cells. The core uses 46 % of it.'
```

::cell-budget{n="31.3" caption="Three fits on one scale, the whole HX8K. Octet is the small bar. RV32I with the register file made of flip-flops is nearly seven times as big, and 1,100 of its 3,568 cells hold a flip-flop. The same core with the registers in block RAM is 1,467 cells, faster (59.5 MHz against 42.0) and fitted in about four seconds instead of twenty. Hover a segment for its size."}

The reference design’s register file is `reg x: [uint<32>; 32]` in `regfile.weft`: 32 registers of 32 bits, 1,024 flip-flops as written, 992 once synth has noticed that x0 is never written. And it is read *combinationally*, at any of its 32 registers, so there is a 32-to-1 multiplexer for each of the 32 bits of each of the two read ports: 32 bits × 2 ports × 31 two-way multiplexers is almost 2,000 of them. Moving the register file into block RAM saves 2,101 logic cells, 59 % of the core, and because everything in the core reads the register file, its multiplexers are also much of the core’s wiring, and so of its delay: 42.0 MHz against 59.5.

Why does synth not do something better by itself? Because flip-flops read combinationally are what the source asks for. A Weft memory read combinationally is flip-flops on the iCE40, which has no small RAMs in its fabric; a memory read through a register is a block RAM (Chapter 29). The tools respect the difference, as a compiler respects your choice of a linked list. A 32-word, 32-bit register file with two read ports and one write port is four block RAMs (two 16-bit halves of a word, and each read port needs its own copy).

The price is the one Octet paid for its memory, and it is a pipeline’s price. The block RAM answers a cycle after it gets the address. The core has a cycle to spare: it is fetching in one cycle and executing in the next, and in the fetch cycle the instruction word is arriving, with its two register numbers in bits 19 to 15 and 24 to 20. So the core reads the registers *while it fetches*, from the arriving word instead of from its own instruction register, and the values are ready in the execute cycle. In `rv32i.weft` that is a compile-time choice, a parameter of the module:

```weft from="content/designs/rv32i.weft"
    if REGISTERS_IN_BRAM {
        // A block RAM answers a cycle after it gets an address. The core has a cycle to spare: while it fetches,
        // the instruction word is arriving, so the registers are read from that word, and are ready to execute.
        mem x: [uint<32>; 32] init [0; 32];
        reg rs1_read: uint<32> = 0;
        reg rs2_read: uint<32> = 0;
        rs1_read := x[instruction[19:15]];
        rs2_read := x[instruction[24:20]];
```

The tests run 25 random chains of dependent instructions on both forms of the core and on the interpreter, and the walking light cycle by cycle on both, and all agree. The result is Figure 31.3’s third bar: 1,467 cells, 4 block RAMs, 59.5 MHz.

::rv32-board{n="31.4" caption="The RV32I core on the board, with the walking light as its program in a ROM of logic. Press Fit (about twenty seconds: this is the flip-flop register file, and the work happens in the background), then Run on the Board. The left digits are the program counter, the right ones count the steps. Now choose Block RAM and press Fit again, and compare: under half of the cells, in about five seconds. Edit the program (the constant WAIT, or a shift of 2 instead of 1) and fit again."}

:::lab[Two cores, one program]
Use Figure 31.4.

1. Fit with the register file in **flip-flops**. Read the status line: 3,568 cells (46 % of the device) and 42.0 MHz. In the Steps tab, read the log: the first placement did not route (one wire was still wanted by two nets), and synth placed again with more weight on wirelength. Larger designs make the router’s job harder, and a tool must know when to start again.
2. Run the walking light. It takes 40 cycles a step (Octet took about 125), because each RV32I instruction takes two cycles and there are 20 of them in a step.
3. Choose **Block RAM** and fit again: 1,467 cells and 4 block RAMs. Run the same program: the LEDs do the same, cycle by cycle, though the core is less than half the size.
4. The core has no reset button. Why does Octet’s `rst` work, and what would you add to the core to have one? (A synchronous reset on `pc` and `execute`, as for Octet’s registers, and a synchroniser for the button.)
:::

Which of the two CPUs is the better one? On the jobs of Chapter 23 the answer depends on what you count. Multiplying 13 by 11 by shift and add takes Octet 60 instructions and 329 cycles; RV32I does it in 29 instructions, which is 58 cycles on the core of this chapter. At the clock rates of the fits, that is 4.1 µs on Octet at 80.6 MHz, 1.4 µs on the flip-flop RV32I at 42.0 MHz, and 1.0 µs with the register file in block RAM at 59.5 MHz. Octet’s program is 49 bytes and RV32I’s is 64. For Fibonacci the sums are 29 bytes and 474 cycles against 104 bytes and 192 cycles. The wider machine does more per instruction, and the narrower clocks faster and costs a seventh of the cells: the engineering trade of Chapter 23, with prices in cells.

## Soft cores, and hard ones

A CPU written in a hardware description language and then loaded into an FPGA is a :term[soft core]{id=soft-core}. Everything in this chapter has been one. The alternative is a :term[hard core]{id=hard-core}: a processor built into the silicon of the chip, fixed like any other circuit, beside the FPGA fabric. Both are sold in volume, and the choice is the one you can now see the numbers for.

:::history{year=2000 title="The processor becomes a file" people="Altera, Xilinx"}
On 12 June 2000 Altera introduced Nios, calling it the industry’s first general-purpose RISC processor core optimised for programmable logic: a 16-bit instruction set, a five-stage pipeline, and a size of about 1,000 logic cells, about twice Octet’s 539.:cite[altera-nios-2000] Xilinx followed in 2002 with MicroBlaze, a 32-bit RISC core with a Harvard architecture and 32 general-purpose registers, delivered with its Embedded Development Kit.:cite[amd-microblaze] Until then, an embedded system on an FPGA had meant a separate processor chip beside it, or one of the few FPGAs with a processor in the silicon. Now the processor was a block of the design, configured with the rest, and a designer could change it as easily as any other block: add an instruction, drop a multiplier, or put four of them on one chip. The instruction sets were the vendors’ own, and so were the tools, which is a large part of why the open RISC-V cores of the last decade matter.
:::

| | What it is | Size and speed |
|---|---|---|
| **MicroBlaze**, Xilinx (2002) | 32-bit RISC soft core, Harvard architecture, 32 registers, in the vendor’s tools | A single-issue pipeline, configurable |
| **Nios II**, Altera (2004) | The 32-bit successor to Nios: three soft cores, all code compatible, one for the smallest size, one for speed, one between:cite[altera-niosii-2004] | Chosen by the designer |
| **PicoRV32**, Clifford Wolf | An RV32IMC core written for *small size*, open source (ISC licence) | 761 to 2,019 LUTs on Xilinx 7-series, about 4 cycles per instruction, 416 to 769 MHz there:cite[picorv32] |
| **VexRiscv**, Charles Papon | A 32-bit RISC-V core written in SpinalHDL, assembled from plugins, with pipelines from 2 to 5 or more stages:cite[vexriscv] | Chosen by the designer when the core is generated |
| **Zynq-7000**, Xilinx (2011) | A hard dual-core ARM Cortex-A9 processing system, hardwired, beside an FPGA fabric: the processor boots on its own and then configures the fabric:cite[amd-zynq7000] | The processor runs at silicon speed; the fabric is a co-processor |

PicoRV32’s numbers are the interesting ones next to this chapter’s. At 761 to 2,019 LUTs (of six inputs, on Xilinx’s chips) it is about the size of our core with its registers in block RAM, which has 1,290 LUTs of four, and it spends cycles to save cells: about four clock cycles per instruction, where our core takes two. A designer who has a few thousand LUTs and a UART to fit picks the small slow core. One who wants a Linux prompt picks a pipelined one with caches, and one who wants a processor that is just *there* picks a hard core.

The economics are the ones of Chapter 28, with this chapter’s figures. A soft core costs area and speed: our RV32I is 3,568 cells and 42 MHz, and the same core made of fixed gates would be, by the ratios Kuon and Rose measured for logic, about 35 times smaller and three to five times faster.:cite[kuon-rose] In exchange it costs nothing to change, and there can be as many of them as the chip has room for.

## FPGAs and ASICs

A CPU goes into an FPGA when the number of chips is small, when the design will change, when a mistake must be fixable in the field, or when the job is one that a general CPU does badly. It goes into an ASIC, a chip made to order, when the number is large enough to pay for the masks. Chapter 32 puts figures on that trade. The FPGA’s price is the one Chapter 28 measured, some 35 times the area for the same logic, and what it buys is that a design is a file.

:::history{year=2014 title="An FPGA in every server" people="Andrew Putnam, Doug Burger and colleagues, Microsoft"}
The last case has a famous example. In a paper at ISCA 2014, a team at Microsoft described Catapult: a bed of 1,632 servers, each with a Stratix V FPGA on a PCIe card, the FPGAs wired to each other in groups of 48 servers as a 6 × 8 torus. They ran a piece of the Bing search engine, the ranking of candidate documents, in the FPGAs. With the FPGAs, each server’s ranking throughput was 95 % higher at the same latency, or, at the same throughput, the tail latency was 29 % lower; the FPGA cards added 10 % to the power of a server.:cite[putnam2014] The argument of the paper is that a chip made to order cannot follow software that changes faster than a chip can be made, and that ordinary CPUs no longer speed up at their old rate. A piece of a search engine became wires.
:::

:::hood[How we know the chip runs what the source says]
The claim of the last two sections is that the configured chip and the source agree. No test looks inside the fabric to see what it *should* do: each one runs the chip decoded from the bitstream and compares it with the interpreter. The chapter’s `octet-fpga.test.ts` fits Octet on the HX8K, runs the walking light from the bits, and after every instruction compares the LEDs with the interpreter’s:

```ts from="content/chapters/31-cpus-on-a-chip/octet-fpga.test.ts"
    const cycles = ref.step();
    out = await chip.run(cycles, { sw: 0, btn: 0, rst_button: 0 }, true);
```

Two other programs (multiply and hello) are then loaded into the bitstream’s block RAMs and run the same way to their `HLT`, and `rv32-fpga.test.ts` fits both RV32I cores and runs the walking light from their bits.
:::

## Build it for real

:::real{parts="an iCE40 board (the Nandland Go Board for Octet; an iCEBreaker, with an UP5K and a USB–UART bridge, for the RISC-V core), a USB cable, synth and openFPGALoader; for the RISC-V core, the open-source tools Yosys, nextpnr-ice40 and Project IceStorm, and a RISC-V compiler (riscv32-unknown-elf-gcc)"}
First Octet on a real chip with synth; then a RISC-V CPU that you can talk to over a serial port.

1. **Octet on the Go Board.** Take the three files of Figure 31.2’s Source tab (`octet-alu.weft`, `octet-decode.weft` and `octet.weft`, with your program at its end) and add a top module for the board. The Go Board has four LEDs and four buttons; this one uses SW1 as the reset button and shows the low four bits of LEDS:

   ```weft title="top.weft"
   /// Octet on the Nandland Go Board: SW1 is the reset button, and the four LEDs show the low four bits of LEDS.
   module top(in clk: clock, in sw1: bool, out led: uint<4>) {
       inst cpu = octet(clk: clk, rst_button: sw1, btn: 0, sw: 0);
       led = cpu.led[3:0];
   }
   ```

   Build it and program the board:

   ```sh
   synth build octet-alu.weft octet-decode.weft octet.weft top.weft --top top --board go-board -o octet.bin
   synth prog octet.bin --board go-board
   ```

   On the HX1K it is about 480 logic cells (the outputs the board does not show, and their logic, are gone) and 2 of the 16 block RAMs, and it would run at about 70 MHz, nearly three times the board’s 25 MHz clock. At 25 MHz the walking light is a blur, because a step takes 5 µs: nest one or two more delay loops in `walk.asm`, put the new bytes in `program()`, and build again, and it walks.

2. **A RISC-V core you can talk to.** The core is **PicoRV32**, and the design around it, **PicoSoC**, comes with the core: the CPU, a little RAM, a UART, and a controller that reads the program from the board’s flash memory.:cite[picosoc] Get the source and go to the SoC:

   ```sh
   git clone https://github.com/YosysHQ/picorv32
   cd picorv32/picosoc
   ```

   Before building, read the files. `icebreaker.v` is the top module: its ports are the board’s pins, and `icebreaker.pcf` says which pin is which. `picosoc.v` is the CPU with its memory and peripherals. `simpleuart.v` is the UART of Chapter 24, and `picorv32.v` is the core, a Verilog file many times as long as this chapter’s `rv32i.weft`, because it has the multiplier, compressed instructions, interrupts and options that ours leaves out.

3. Build and load everything, with the board plugged in: `make icebprog`. The Makefile runs the flow of Chapter 30 with the open-source tools: Yosys (`synth_ice40 -dsp -top icebreaker`) writes a netlist, `nextpnr-ice40 --freq 13 --up5k --package sg48` places and routes it, `icetime` reports the timing, and `icepack` writes the bitstream. The firmware, C in `firmware.c` and assembly in `start.s`, is compiled by the RISC-V compiler. Then `iceprog` writes the bitstream to the board’s flash, and the firmware one megabyte further on (`iceprog -o 1M`).

4. Open the board’s second serial port (on Linux usually `/dev/ttyUSB1`) in a terminal at 115,200 baud: `picocom -b 115200 /dev/ttyUSB1`. The firmware divides the 12 MHz clock by 104, which is 115,385 baud, near enough. Press the board’s reset: a banner in ASCII art, *PicoSoC*, appears, with a menu. Press `e` and what you type is echoed back: a RISC-V core on a chip you can hold is reading characters from a UART and writing them again. Press `9` for the firmware’s benchmark.

5. Read the flow’s reports as you read synth’s: how many `SB_LUT4` and `SB_DFF` cells did Yosys list, how many block RAMs, and what maximum frequency did nextpnr report? Compare with Figure 31.3. Then change the program, not the chip: edit the banner in `firmware.c` and run `make icebprog_fw`. Only the firmware is written to the flash, with no place and route: the same idea as *Load into the chip* in Figure 31.2, on real hardware.
:::

## Exercises

Two programs for the board. Each is checked, as in Chapter 24, on the reference interpreter, and each also runs on the chip in Figure 31.2: paste your solution into the editor there and press *Load into the chip*.

```asm
id: chip/echo
title: The LEDs, or their inverse
isa: octet
prompt: |
  Show the switches on the LEDs, and keep showing them: the program never stops. While **BTN0** is held, show the *inverse* of the switches. Only BTN0 counts: the other buttons, and the comparator bit of BUTTONS, must not matter.
hints:
  - 'BUTTONS is a byte, and BTN0 is its lowest bit. Mask it with AND, and Z tells you whether it is set.'
  - 'NOT inverts a register. Read the switches into a register, decide, invert or not, and store.'
explain: |
  A loop that reads both devices every time round, masks the button byte to bit 0 (AND with 1, which sets Z), inverts the switches when it is not zero and stores them. Without the mask, BTN1 to BTN3 would also invert. On the board, hold a button and watch: the loop takes about 40 cycles, so the LEDs follow within a few milliseconds at 1 kHz.
start: |2
  ; LEDS <- SWITCHES, or NOT SWITCHES while BTN0 is held. Forever.
  loop:   JMP  loop
tests:
  - { name: "BTN0 up: the switches", setup: { switches: 0x5a, buttons: 0 }, expect: { leds: 0x5a, halted: false }, maxSteps: 80 }
  - { name: "BTN0 down: their inverse", setup: { switches: 0x5a, buttons: 1 }, expect: { leds: 0xa5, halted: false }, maxSteps: 80 }
  - { name: "only BTN1: not the inverse", setup: { switches: 0x0f, buttons: 2 }, expect: { leds: 0x0f, halted: false }, maxSteps: 80 }
  - { name: "all four buttons", setup: { switches: 0xc3, buttons: 15 }, expect: { leds: 0x3c, halted: false }, maxSteps: 80 }
solution: |2
  loop:   LD   R0, [SWITCHES]
          LD   R1, [BUTTONS]
          LDI  R2, 1
          AND  R1, R2
          JZ   show
          NOT  R0
  show:   ST   [LEDS], R0
          JMP  loop
```

```asm
id: chip/nibble-sum
title: Add the two halves of the switches
isa: octet
prompt: |
  Show on the hex display the sum of the two four-bit halves of the switches: for 0x3A it is 3 + 0xA = 0x0D. Keep doing it: the program never stops.
hints:
  - 'The low half is the byte ANDed with 0x0F. Octet has no way to shift by four in one instruction: SHR four times.'
  - 'Copy the switches with MOV before you destroy them.'
explain: |
  Two nibbles, each in a register: `AND` with 0x0F for the low one, four `SHR`s for the high one, then `ADD`. The largest sum is 15 + 15 = 30, which fits in the byte the hex display takes (0x1E).
start: |2
  ; HEX <- (SWITCHES >> 4) + (SWITCHES & 0x0F). Forever.
  loop:   JMP  loop
tests:
  - { name: "none", setup: { switches: 0x00 }, expect: { hex: 0x00, halted: false }, maxSteps: 80 }
  - { name: "all", setup: { switches: 0xff }, expect: { hex: 0x1e, halted: false }, maxSteps: 80 }
  - { name: "3A", setup: { switches: 0x3a }, expect: { hex: 0x0d, halted: false }, maxSteps: 80 }
  - { name: "91", setup: { switches: 0x91 }, expect: { hex: 0x0a, halted: false }, maxSteps: 80 }
solution: |2
  loop:   LD   R0, [SWITCHES]
          MOV  R1, R0
          LDI  R2, 0x0F
          AND  R0, R2
          SHR  R1
          SHR  R1
          SHR  R1
          SHR  R1
          ADD  R0, R1
          ST   [HEX], R0
          JMP  loop
```

```quiz
q: 'Octet’s memory is 240 bytes. Read without a register (`ram_byte = ram[address]` instead of `:=`), could it have been fitted on the Go Board’s HX1K, which has 1,280 logic cells?'
options:
  - text: 'Yes: the HX1K has 16 block RAMs, and synth would use them.'
    why: 'A block RAM answers a cycle after its address; a read without a register must answer at once, and the iCE40 has no RAM that does. synth reports that the memory becomes flip-flops.'
  - text: 'No: 240 × 8 = 1,920 flip-flops, and each takes a logic cell of its own, so more cells than the whole chip has, before any of the multiplexers.'
    correct: true
    why: 'A logic cell has one flip-flop, and the HX1K has 1,280 cells. Read through a register, the memory is two block RAMs and costs no logic cells at all.'
  - text: 'Yes, because block RAM is only an optimisation and the design is the same.'
    why: 'The design is the same in behaviour; its cost is not. That the same memory can be either, depending on how it is read, is the point of Chapter 29’s remark on registered reads.'
```

```quiz
q: 'Octet at 80.6 MHz runs ADD (6 cycles) and JMP (5 cycles) in turn, in a loop of just those two. About how many times a second does the loop go round?'
options:
  - text: 'About 80 million: the clock rate.'
    why: 'The clock rate is the number of cycles a second, not of instructions.'
  - text: 'About 7.3 million.'
    correct: true
    why: 'The loop takes 6 + 5 = 11 cycles, and 80.6 million ÷ 11 is 7.33 million times a second (14.7 million instructions a second). This is the CPI and the clock of Chapter 23’s iron law, at the clock rate of this fit.'
  - text: 'About 730,000.'
    why: 'That is what 80.6 MHz would give if each cycle took ten times longer. Check the sum: 80.6 million ÷ 11.'
```

```quiz
q: 'A design keeps its data in a Weft `mem`, and reads three different words of it in the same cycle, each through a register. What does synth build on an iCE40?'
options:
  - text: 'One block RAM: a block RAM can be read at any number of addresses at once.'
    why: 'An iCE40 block RAM has one read port and one write port.'
  - text: 'Three block RAMs with the same contents, one for each read, sharing the write.'
    correct: true
    why: 'Each read port needs its own copy of the memory, as Octet’s second port did: two reads, two block RAMs. A memory larger than one block needs that many blocks for every copy.'
  - text: 'Flip-flops, since a block RAM cannot be read three times.'
    why: 'Flip-flops are what a read *without* a register needs. Registered reads stay in block RAM, one copy per read.'
```

```parsons
title: 'From assembly to a running chip, without a new fit'
prompt: 'Put the steps of Load into the chip in order.'
lines:
  - 'The assembler turns each instruction into one or two bytes.'
  - 'The bytes become the initial contents of the RAM: 240 words.'
  - 'Each word is written into the configuration bits of every block RAM the design uses.'
  - 'The CRC of the bitstream is computed again, and the file is complete.'
  - 'The bitstream is decoded into a netlist of logic cells, block RAMs and pads, as it always is.'
  - 'The clock runs, and the CPU fetches its first byte from address 0.'
distractors:
  - 'The router finds a new path for every net.'
  - 'The LUT truth tables of the control unit are recomputed from the program.'
```

```bug
title: 'What must the tools redo?'
prompt: 'A student changes `.equ WAIT, 8` to `.equ WAIT, 20` in walk.asm and reasons about what the tools have to redo to run it on a chip that has been fitted already. Click the first line that is wrong.'
lines:
  - 'The assembler turns `LDI R2, 0 - WAIT` into a different second byte: 0xF8 becomes 0xEC.'
  - 'That byte is part of the RAM’s initial contents, which are bits of the two block RAMs in the bitstream.'
  - 'So the control unit’s LUTs no longer match the program, and the design must be mapped and routed again.'
  - 'Only those RAM bits change, so loading the program is enough; the placement and the routes stay as they are.'
wrong: 2
why: 'The control unit does not depend on the program: it decodes whatever bytes the RAM gives it. The program is data, in the RAM, and only the RAM’s bits change. The design’s LUTs, its placement and its routing stay valid, which is why the load takes milliseconds.'
notes:
  '0': 'Correct: 0 − 20 is 256 − 20 = 236 = 0xEC, and 0 − 8 is 0xF8.'
  '1': 'Correct: the program is the initial contents of the RAM, and synth writes those into the block RAMs’ bits.'
```

:::challenge[Add an instruction to the Weft core]
Every one of the 256 first bytes of Octet is an instruction, but one opcode has room: `HLT`, opcode 0, ignores the low four bits of its byte, so 0x01 to 0x0F all halt. Give four of them a new meaning, **`DEC Rd`**, which subtracts one from a register and sets the flags as `SUB Rd, 1` would: the encoding is `0000 dd01` (0x01 for R0, 0x05 for R1, 0x09 for R2, 0x0D for R3), and every other byte with opcode 0 must still halt. The assembler does not know the new instruction, so write it with `.byte`.

You do not need a new module or a new register. Change only `octet_decode` (Chapter 22’s file): it already sequences the unary group in two steps (A ← Rd, then Rd ← ALU), and the ALU already has a subtraction and a way of feeding it a constant 1 (that is how INC is done). Check it with synth on your own machine: `synth sim` runs the design, and the Build it for real box puts it on a board.

:::details[The five changes]
```diff
-    let hlt = op == 0;
+    let hlt = op == 0 && sub != 1;
+    let dec = op == 0 && sub == 1;
...
-    let unary = op == 14;
+    let unary = op == 14 || dec;
...
     } else if not {
         7
+    } else if dec {
+        1
     } else {
         0
     };
...
-    bsel_1 = in_alu && inc;
+    bsel_1 = in_alu && (inc || dec);
```
`dec` is one more line of decoding, a member of the unary group, and it asks the ALU for a subtraction (code 1) with the constant 1. `hlt` must give up the encodings that `dec` takes. Everything else, the sequencer, the flags, the register write, is the machinery INC already uses.
:::
:::

:::challenge[The same job, in fewer cells]
The RV32I core of Figure 31.4 with the register file in block RAM is 1,467 cells, and its ALU alone, with its barrel shifter for `sll`, `srl` and `sra`, is about 650 of them (Chapter 30). Rewrite the shifter in Weft so that it shifts by one bit each cycle, and takes as many cycles as the shift amount. How many cells do you save, and what does it do to a program that shifts by 31 every time? (The core’s designers made the same choice in PicoRV32: its “small” variants have no barrel shifter.)
:::

An exercise in adding a device to Octet’s board.

```hdl
id: 31-cpus-on-a-chip/countdown-timer
title: A timer for Octet’s board
top: countdown
prompt: |
  The devices of Octet’s board sit at the top of the address space: the LEDs at 0xF8, the switches at 0xF9, and so on to RANDOM at 0xFD. Addresses 0xFE and 0xFF read 0 and ignore writes, so there is room for one more. Write the device that would go at 0xFE: a **countdown timer**.

  A program writes a number *n* to it: the timer then holds *n* and reads back as *n*. Every cycle in which `tick` is true (the board would send one every millisecond) it counts down by one, and it stops at 0, where `done` is true. The inputs are `clk`, `rst` (synchronous: the timer reads 0 afterwards and beats everything), `write` (true in the cycle when the program writes; `data` is the byte, and a write beats a tick) and `tick`. The outputs are `value`, the byte the program reads, and `done`.
hints:
  - 'It is a register with four cases in a chain: `rst`, then `write`, then `tick` with the value not yet 0, then hold. The chain is the priority.'
  - '`done` is a comparison of the register with 0, and it is true from the moment the register is 0, including at power-up.'
  - 'Counting down needs `-%`: `left - 1` is exact arithmetic, and can be −1.'
explain: |
  This is how Octet’s own devices are built: `reg hex` with an `if` that loads the bus when a write addresses it. The difference is the clocked behaviour, the `tick` and the stop at 0, which the board’s devices did not need. To finish the job on the real design you would add the register to `octet`, route `write_device && mar[3:0] == 14` to `write`, and add `14 => timer_value` to the `match` that answers reads (`device_out`). The Octet code that the tests of this chapter run is unchanged; you have written the part that would go into it.
height: 12
start: |
  /// A countdown timer: write n, and it counts down to 0 on every tick.
  module countdown(in clk: clock, in rst: bool, in write: bool, in data: uint<8>, in tick: bool, out value: uint<8>, out done: bool) {
      reg left: uint<8> = 0;

      if rst {
          left := 0;
      } else if write {
          left := data;
      }
      value = left;
      done = false;
  }
reference: |
  module countdown(in clk: clock, in rst: bool, in write: bool, in data: uint<8>, in tick: bool, out value: uint<8>, out done: bool) {
      reg left: uint<8> = 0;

      if rst {
          left := 0;
      } else if write {
          left := data;
      } else if tick && left != 0 {
          left := left -% 1;
      }
      value = left;
      done = left == 0;
  }
tests: |
  test "reads back what was written" {
      set rst = false, write = true, data = 5, tick = false;
      step;
      set write = false;
      expect value == 5;
      expect !done;
      step 4;
      expect value == 5;
  }

  test "counts down on ticks only" {
      set rst = false, write = true, data = 3, tick = false;
      step;
      set write = false, tick = true;
      step;
      expect value == 2;
      set tick = false;
      step 3;
      expect value == 2;
  }

  test "stops at zero and says done" {
      set rst = false, write = true, data = 2, tick = false;
      step;
      set write = false, tick = true;
      step 5;
      expect value == 0;
      expect done;
  }

  test "a write beats a tick, and reset beats a write" {
      set rst = false, write = true, data = 9, tick = true;
      step;
      expect value == 9;
      set rst = true;
      step;
      expect value == 0;
  }
solution: |
  /// A countdown timer: write n, and it counts down to 0 on every tick.
  module countdown(in clk: clock, in rst: bool, in write: bool, in data: uint<8>, in tick: bool, out value: uint<8>, out done: bool) {
      reg left: uint<8> = 0;

      if rst {
          left := 0;
      } else if write {
          left := data;
      } else if tick && left != 0 {
          left := left -% 1;
      }
      value = left;
      done = left == 0;
  }
```

## What’s next

You have built the whole chain: a machine drawn from gates in Chapters 21 and 22, the same machine described in a few hundred lines of Weft and fitted into 539 cells of a real chip, a program turned into bytes and then into bits and run from a bitstream, and a real instruction set that more than doubled in size because of one array. And you have seen where the next number comes from: the block RAM that gave one design its memory and another its registers.

Chapter 32 steps back and asks where those cells come from. The iCE40’s tiles are made of millions of transistors, and the transistors from a story that begins with a single one in 1947 and goes through the integrated circuit, Moore’s law, and the fabs that make everything in this course: how a chip like the one you have been configuring is actually made, and what it costs.
