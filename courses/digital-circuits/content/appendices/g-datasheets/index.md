---
number: G
title: Device datasheets
summary: "One datasheet for every device of Part VI, in the style of the originals: the virtual vPROM, vPLA and vCPLD-32, the GAL22V10, and the real iCE40 HX1K and HX8K with the boards the course builds for."
duration: Look things up
prerequisites: []
---

A datasheet is the page a manufacturer writes so that you can use a chip without asking anyone. This appendix has one for each virtual device of [Part VI](/chapters/programmable-logic/): the vPROM, the vPLA, the GAL22V10 and the vCPLD-32, which are models of the course, and the iCE40 HX1K and HX8K, which are real chips, with the two boards the course builds for. They follow the layout of the real ones (features, block diagram, pins, programming, timing), and every number in them is read from the models, or from synth’s database of the iCE40. The tables that quote the code are checked by tests against the code, and so are the drawings, which are drawn from the models rather than beside them.

Three things that a real datasheet would have are missing, on purpose, and the datasheets say so where it matters.

- **Electrical ratings.** The models are logic: 0, 1, X and Z. A virtual chip has no supply current, no output drive strength and no maximum voltage; the parts with ratings that can be exceeded are the analog engine’s (Appendix C).
- **Delays, for the fuse devices.** The vPROM, vPLA and GAL22V10 evaluate at zero delay. The vCPLD-32 and the iCE40 have timing models, and the tables give them.
- **A package, for the virtual parts.** The vPROM, vPLA and vCPLD-32 have named signals, drawn as a functional symbol. The GAL22V10 and the iCE40 are real parts; for the iCE40’s packages and pins, see Lattice’s datasheet.

Every device has a studio link: the datasheet tells you what a bit does, the studio lets you set one and watch.

## vPROM

*A 32 × 8 fuse-programmable read-only memory, after the bipolar PROMs of the 1970s.*

### Features

- Five address lines, eight data outputs: 32 words of 8 bits.
- One fuse for every stored bit: 256 in all, at the crossing of a word line and a bit line.
- **One-time programmable.** A blown fuse cannot be repaired: programming can only turn zeros into ones, and asking for a one to become a zero again is an error.
- A virgin device reads all zeros; blowing a fuse makes its bit read 1.
- Any function of five inputs and up to eight outputs is a table in it, and the device is the same size whether the function is simple or not: this is the reason PLAs exist (Chapter 25).

::package-drawing{device="prom" n="G.1" caption="The functional symbol. Address lines are named A4 (most significant) to A0, data outputs D7 (column 0, most significant) to D0. The model has no package and no supply pins."}

::block-diagram{device="prom" n="G.2" caption="Block diagram. The decoder selects one word line; every intact fuse on it reads as the virgin value, every blown fuse as the opposite."}

### Characteristics

| Parameter | Value |
|---|---|
| Address lines | 5 |
| Data outputs | 8 |
| Words | 32 |
| Fuses | 256 |
| A virgin fuse reads | 0 |
| A blown fuse reads | 1 |
| Largest device the model allows | 16 address lines, 32 outputs |
| Largest device the Studio builds | 6 address lines, 16 outputs |
| Timing | not modelled (zero delay) |

### Conventions

- The fuse of word *w*, column *c* is number *w* × 8 + *c*. Column 0 is the leftmost bit, D7, so the word is the binary number read left to right across the row, as in a printed fuse map.
- The address is the binary number A4 … A0. In equations the leftmost input is the most significant bit, as in a truth table.
- The Studio sizes the device to the design it is given: N address lines and M outputs for a function of N inputs and M outputs (up to the limits above). A design with more inputs is refused, with the explanation that a PROM needs 2ⁿ words for *n* inputs.

### Programming

| Step | What the model does |
|---|---|
| Plan | Compares the words wanted with the words stored and lists the fuses to blow, one programming pulse each. Refuses, naming the address and the output, if a bit would have to change from 1 back to 0. |
| Apply | Blows the fuses. A pulse on a fuse that is already blown does nothing. |
| Verify | Reads every word and reports the addresses where the stored word differs from the expected one. |

A programmed device is described by a **fuse map**, a JSON document. This is the map of a two-address-line, three-output device holding the words 1, 2, 5 and 7:

```json
{
  "device": "vPROM",
  "version": 1,
  "addressBits": 2,
  "width": 3,
  "words": 4,
  "blownReads": 1,
  "inputs": ["A1", "A0"],
  "outputs": ["D2", "D1", "D0"],
  "fuses": ["001", "010", "101", "111"],
  "data": [1, 2, 5, 7],
  "blown": 7
}
```

::device-studio{device="prom" example="seven-segment" views="source,chip,bits" n="G.3" caption="The vPROM in the Device Studio, programmed as a BCD to seven-segment decoder. Open the Bits view, click a fuse to blow it, and read the word it changes."}

## vPLA

*An 8-input, 16-term, 8-output field-programmable logic array, after the Signetics 82S100 and scaled down.*

### Features

- Eight inputs, each available true and complemented; sixteen product terms; eight outputs.
- A programmable AND plane and a programmable OR plane: a product term is shared by every output that wants it.
- A polarity fuse on every output: active high, or inverted.
- 392 fuses in all: 256 in the AND plane, 128 in the OR plane and 8 for polarity.
- One-time programmable, like the vPROM: a fuse that is blown cannot be restored.
- A virgin device has every fuse intact, so every product term contains both a signal and its complement, is therefore 0, and every output reads 0 (active high).

::package-drawing{device="pla" n="G.4" caption="The functional symbol. Input and output names are I0 to I7 and O0 to O7 unless the design names them."}

::block-diagram{device="pla" n="G.5" caption="Block diagram. An intact AND fuse connects a literal to the term’s AND gate; an intact OR fuse connects the term to the output’s OR gate; the polarity fuse is in front of an exclusive-or."}

### Characteristics

| Parameter | Value |
|---|---|
| Inputs | 8 |
| Product terms | 16 |
| Outputs | 8 |
| AND-plane fuses | 256 |
| OR-plane fuses | 128 |
| Polarity fuses | 8 |
| Total fuses | 392 |
| Timing | not modelled: every path is the same delay in a real PLA, and the vPLA does not give it a number |

### Fuse conventions

| Plane | Fuse | Intact | Blown |
|---|---|---|---|
| AND | one per term and input, true form | the input is in the term | the input is not in the term |
| AND | one per term and input, complement | the complement is in the term | the complement is not in the term |
| OR | one per term and output | the term is in the output’s sum | the term is not in the sum |
| Polarity | one per output | the output is the sum (active high) | the output is the inverted sum |

A term with both forms of an input connected is the constant 0; a term with nothing connected is the constant 1. The fuse map lists each term as a pattern of one character per input: `1` (true form), `0` (complement), `-` (input not connected) or `x` (both connected: the term is 0).

Fuse numbers: the AND fuse of term *t*, input *i*, true form is (*t* × 8 + *i*) × 2, and the complement is the next one; the OR fuse of term *t*, output *o* is *t* × 8 + *o*; the polarity fuse of output *o* is *o*.

::device-studio{device="pla" example="full-adder" views="source,chip,logic,bits" n="G.6" caption="The vPLA in the Device Studio, programmed as a full adder. The product terms are shared by the two outputs where they can be."}

## GAL22V10

*A faithful model of the Lattice GAL22V10 and the Microchip ATF22V10: its pins, its 5,892-fuse map and its output macrocells. The JEDEC file it writes is the file a real programmer accepts.*

### Features

- 24-pin DIP. Twelve dedicated inputs, one of which (pin 1) is also the clock; ten input/output pins, each with an **output logic macrocell** (OLMC).
- A 44-column, 132-row AND array: 22 signals, each true and complemented. Every product term is a row of it.
- Each macrocell sums 8 to 16 product terms, in the pattern 8, 10, 12, 14, 16, 16, 14, 12, 10, 8 from pin 23 down to pin 14; its first row is the output-enable term.
- Each macrocell is programmable **registered or combinational**, and **active high or active low**.
- One asynchronous reset term (AR) for every register, one synchronous preset term (SP).
- Eight bytes of user signature.
- 5,892 fuses: 5,808 in the array, 20 macrocell configuration fuses and 64 signature fuses. Erasable and reprogrammable.

::package-drawing{device="gal22v10" n="G.7" caption="The GAL22V10, seen from above with the notch at the top. Pin 1 is at the top left; the numbers run down the left side and up the right."}

::block-diagram{device="gal22v10" n="G.8" caption="Block diagram, with one output macrocell in detail."}

### Pin descriptions

| Pin | Name | Description |
|---|---|---|
| 1 | CLK/I | The clock of every registered macrocell (rising edge), and an input to the AND array |
| 2–11 | I | Inputs to the AND array |
| 12 | GND | Ground |
| 13 | I | Input to the AND array |
| 14–23 | I/O/Q | Output macrocells. The pin is driven when the macrocell’s output-enable term is true, and otherwise is an input, whose level reaches the array through the macrocell’s feedback |
| 24 | VCC | Supply |

### The AND array

The array has 44 columns. The columns come in pairs, the true form of a signal and then its complement, and the 22 signals alternate between dedicated inputs and macrocell feedbacks. The column of a signal follows from its pin:

| Signal | Columns (true, complement) |
|---|---|
| Dedicated input, pin *p* from 1 to 11 | 4 × (*p* − 1) and the next one |
| Dedicated input, pin 13 | 42 and 43 |
| Macrocell, pin *p* from 14 to 23 | 2 + 4 × (23 − *p*) and the next one |

The 132 rows are, in order: the **AR** row (row 0); for each macrocell from pin 23 down to pin 14, its **output-enable** row and then its **product-term** rows; and the **SP** row (row 131).

| Pin | Output-enable row | First term row | Product terms |
|---|---|---|---|
| 23 | 1 | 2 | 8 |
| 22 | 10 | 11 | 10 |
| 21 | 21 | 22 | 12 |
| 20 | 34 | 35 | 14 |
| 19 | 49 | 50 | 16 |
| 18 | 66 | 67 | 16 |
| 17 | 83 | 84 | 14 |
| 16 | 98 | 99 | 12 |
| 15 | 111 | 112 | 10 |
| 14 | 122 | 123 | 8 |

The fuse at row *r*, column *c* is number 44 × *r* + *c*. **A fuse value of 0 connects the array input to the product term; 1 leaves it out.** A row of all 1s is therefore the constant 1 (nothing is required), a row with both columns of some signal at 0 is the constant 0, and a row of all 0s (the erased state) is 0 as well.

::gal-fuse-layout{n="G.9" caption="The fuse map to scale: 132 rows of 44 columns, coloured by macrocell. The bright row at the top of each group is its output-enable term; the red rows at the top and bottom are AR and SP. Below it, the 20 configuration fuses and the 64 signature fuses."}

### Macrocell configuration

After the array come 20 fuses, two for each macrocell from pin 23 down: fuse 5,808 + 2 × (23 − *p*) is **S0** of pin *p*, and the next one is **S1**.

| Fuse | Value 1 | Value 0 |
|---|---|---|
| S0 | active high: the pin is the sum (or Q) | active low: the pin is the inverse |
| S1 | combinational | registered |

Then the 64 signature fuses, fuses 5,828 to 5,891: eight bytes, most significant bit first.

### Macrocell behaviour

- **Combinational (S1 = 1).** The pin is the sum of the terms (inverted when active low). The feedback into the array is the pin itself, so a macrocell whose output enable is off is simply an input.
- **Registered (S1 = 0).** The sum is the register’s D input, loaded at the rising edge of pin 1. The pin is Q, inverted when active low. **The feedback is always the inverted register output**, whatever the polarity, and never the pin: in active-high mode the array therefore sees the complement of the pin. (Assemblers compensate for this.)
- **Output enable.** The pin is driven while the output-enable term is true, and floats otherwise.
- **AR.** While the AR term is true every register is reset to Q = 0, at once, without a clock. **SP.** When the SP term is true at a rising clock edge, every register is set to Q = 1 instead of loading D. AR wins over SP.
- **Power-up.** Every register is reset (Q = 0).
- **Timing.** Not modelled. A real GAL22V10 has one propagation delay for every path from a pin through the array and a macrocell to a pin (tPD), and a set-up and a clock-to-output time for registered paths; the speed grade of the part sets them (a GAL22V10-15 guarantees a tPD of at most 15 ns). The vGAL evaluates at zero delay.

### JEDEC file

The device is programmed by a JEDEC file (JESD3): the fuses, as text, with two checksums. A file of this device has these fields:

| Field | Meaning |
|---|---|
| `*QP24` | 24 pins |
| `*QF5892` | 5,892 fuses |
| `*F0` | fuses not listed are 0 |
| `*G0` | security fuse not blown |
| `*L<n> <bits>` | fuse states from decimal address *n* on: one field for each array row that is not all zeros, then the 20 configuration fuses, then the 64 signature fuses |
| `*C<hhhh>` | the fuse checksum: the 16-bit sum of the fuses read as bytes, fuse 0 in the least significant bit of the first byte |
| after the closing `*` | ETX, then four hexadecimal digits: the 16-bit sum of every character from STX to ETX |

This is the file the model writes, with the standard header, for a 3-to-8 line decoder with enables and active-low outputs (the model’s own example design). Only the beginning and the end are shown: the fields in the middle are one for each row that is not all zeros.

```text
<STX>
Device: GAL22V10 (ATF22V10)
*F0
*G0
*QP24
*QF5892
*L0924 11111111111111111111111111111111111111111111
*L0968 01110111011101111011111111111111111111111111
*L1496 11111111111111111111111111111111111111111111
   ⋮
*L5808 00000101010101010101
*L5828 0100010001000101010000110011001101010100010011110011100000000000
*C59B6
*
<ETX>BD51
```

The layout is that of galette, an open-source assembler for GAL devices, and the model’s files are checked byte for byte against galette’s for its own test cases. What the fuses *do* once programmed follows the datasheet’s description of the macrocell as galette’s source states it; it has not been compared with a physical part.

::device-studio{device="gal22v10" example="traffic-light" views="source,chip,bits" n="G.10" caption="The GAL22V10 in the Device Studio, running a traffic-light controller. Open the Bits view: hover a fuse to see the row, the column, the pin it reads and the product term it belongs to, and download the JEDEC file."}

## vCPLD-32

*A small complex programmable logic device in the style of the Xilinx XC9500 and Altera MAX 7000, scaled down so that every bit can be shown on screen.*

### Features

- Four **function blocks** of eight **macrocells**: 32 macrocells and 32 I/O pins.
- A **global interconnect matrix**: each function block sees 24 signals, chosen from the 32 pins and the 32 macrocell outputs. A full crossbar: where a signal comes from never limits fitting, only the number of signals a block reads.
- In each block, an AND array of 40 product terms (five for each macrocell) of 48 literal columns, and a **product-term allocator**: a macrocell can borrow terms from its neighbours, at most 15 in all.
- A macrocell with a D or T flip-flop, an XOR gate for polarity, and an output buffer with four enable modes.
- **Non-volatile** configuration (flash-like): the device comes up already configured, with every flip-flop at its initial value. Programming can only set bits to 1; erasing clears everything.
- Global clock (GCLK), global set/reset (GSR) and global output enable (GOE).
- An IEEE 1149.1 **JTAG** port with boundary scan and in-system programming.
- 9,024 configuration bits, and a 32-bit USERCODE.

::package-drawing{device="cpld32" n="G.11" caption="The functional symbol. The model has no package: the 32 pads are IO0 to IO31, and pad i belongs to macrocell i (function block i ÷ 8). The bottom pins are the JTAG port."}

::block-diagram{device="cpld32" n="G.12" caption="Block diagram. The dashed lines are the macrocell feedbacks into the interconnect matrix."}

### Characteristics

| Parameter | Value |
|---|---|
| Function blocks | 4 |
| Macrocells per block | 8 |
| Macrocells | 32 |
| I/O pins | 32 |
| Inputs to each function block | 24 |
| Product terms per block | 40 |
| Product terms per macrocell | 5 |
| Most terms one macrocell can collect | 15 |
| Literal columns per term | 48 |
| Configuration bits | 9,024 |
| Configuration rows | 141 rows of 64 bits |

### The macrocell

The sum of a macrocell’s terms is XORed with the `xor` bit and goes either straight to the output (combinational) or into a flip-flop clocked by the rising edge of GCLK. The output, flip-flop or not, is also the macrocell’s feedback into the interconnect matrix, before the output buffer, so buried macrocells can feed back. The 16 configuration bits of a macrocell:

| Bits | Field | Meaning |
|---|---|---|
| 0 | `xor` | invert the sum |
| 1 | `reg` | 1: the output is a flip-flop; 0: combinational |
| 2 | `tff` | 1: a T flip-flop, which toggles when its input is 1; 0: a D flip-flop |
| 3 | `init` | the flip-flop’s value at power-up, and whenever GSR is 1 |
| 4, 5 | `oe` | output enable: 0 never drives the pin (an input pad, or a buried macrocell); 1 always; 2 while GOE is 1; 3 while product-term slot 4 is 1 |
| 6 to 15 | steering | two bits for each of the five term slots: 0 off, 1 to this macrocell, 2 to the macrocell above (m + 1), 3 to the one below (m − 1) |

GSR acts asynchronously on every flip-flop. A borrowed term is not passed on: steering is one hop, inside a block, with no wrap-around and no steering between blocks. A macrocell whose output enable is a product term spends its slot 4 on it.

### Configuration memory

The 9,024 bits are 141 rows of 64. The four function blocks take 2,240 bits each (35 rows, so blocks are row-aligned), and the USERCODE is in the last row.

| Bits of a block (offset from its start) | Contents |
|---|---|
| 0 to 143 | Interconnect: input *k* of the block is a 64-to-1 multiplexer, 6 bits at 6*k*, least significant first. Sources 0 to 31 are the pin levels; 32 to 63 are the macrocell outputs |
| 144 to 2,063 | AND array: the true literal of input *k* in term *t* is bit 144 + 48*t* + 2*k*, its complement the next one; 1 connects the literal |
| 2,064 to 2,103 | Term enables, one for each of the 40 terms: an enabled term with no literal is 1, a disabled term is 0 |
| 2,104 to 2,231 | The eight macrocells, 16 bits each, at 2,104 + 16*m* |
| 2,232 to 2,239 | Reserved (0) |

The bits from 8,960 to 8,991 are the USERCODE, bit *i* at 8,960 + *i*; the last 32 bits are reserved. An erased device (all zeros) is inert: no term is enabled and no pin is driven.

### Timing

Every signal in a CPLD passes through the same interconnect matrix, AND array and macrocell, so the delay of a path depends only on its kind, and not on where the fitter put the logic. That is why CPLDs were the parts of choice for glue logic with guaranteed timing. The constants are those of a “-7” part of the XC9500 and MAX 7000 class, rounded.

| Symbol | Parameter | Value |
|---|---|---|
| tPD | Pin to pin, through combinational logic | 7.5 ns |
| tSU | Input pin set-up before the global clock edge, for a registered output | 4.5 ns |
| tH | Hold time of an input pin after the clock edge | 0 ns |
| tCO | Global clock edge to output pin | 4.5 ns |
| tPTA | Extra delay when a macrocell collects borrowed terms | 1 ns |
| tFB | Extra delay for each combinational macrocell a signal passes through on the way | 5 ns |
| tREG2REG | Register to register inside the device | 8 ns |

The highest clock frequency for register-to-register paths is 1 / tREG2REG = 125 MHz.

### JTAG

The port has four pins: **TCK** (clock), **TMS** (mode select), **TDI** (data in) and **TDO** (data out). The **TAP controller** is a 16-state machine that moves on each rising edge of TCK according to TMS; five cycles with TMS at 1 lead to Test-Logic-Reset from any state. The instruction register is 8 bits, shifted least significant bit first; Capture-IR loads `00000001` with status bits above the mandatory `01`: bit 2 says the device is in programming mode, bit 3 that a program or erase pulse is still running, bit 4 that a command was refused. Test-Logic-Reset loads IDCODE, and unassigned codes select BYPASS.

| Code | Instruction | Data register |
|---|---|---|
| `0x00` | EXTEST | boundary-scan register, 99 bits: pins driven from their latches |
| `0x01` | SAMPLE/PRELOAD | boundary-scan register, 99 bits: pins stay under the core |
| `0xC0` | ISC_DISABLE | bypass, 1 bit: leave programming mode and restart |
| `0xE9` | ISC_ENABLE | bypass, 1 bit: enter programming mode |
| `0xEA` | ISC_PROGRAM | row register, 72 bits: 64 data bits then an 8-bit address, written at Update-DR |
| `0xEC` | ISC_ERASE | bypass, 1 bit: bulk erase |
| `0xEE` | ISC_VERIFY | row register, 72 bits: read back |
| `0xFC` | HIGHZ | bypass, 1 bit: every pin off |
| `0xFD` | USERCODE | 32 bits: the user code |
| `0xFE` | IDCODE | 32 bits |
| `0xFF` | BYPASS | 1 bit |

**IDCODE** is 32 bits, least significant first with the least significant bit always 1: version in bits 31–28, part number in 27–12, manufacturer in 11–1. The vCPLD-32 has version 1, part number `0xC032` and manufacturer `0x0FF`, a code that belongs to no real vendor, so its IDCODE is `0x1C0321FF`.

**Boundary-scan register.** 99 cells: three for each of the 32 I/O pins (`3·io`: the input, capturing the level on the pin; `3·io + 1`: the output data, capturing the macrocell’s output and latching what EXTEST drives; `3·io + 2`: the control, capturing whether the output enable is true) and one input cell each for GCLK, GSR and GOE (cells 96, 97, 98). Cell 0 is nearest TDO.

**Programming.** In programming mode every output buffer is off and the flip-flops ignore the clock. The sequence is: ISC_ENABLE; ISC_ERASE (the device is busy for 8 TCK cycles in Run-Test/Idle, and commands during that time are refused); ISC_PROGRAM, then for each row a 72-bit scan (programming can only set bits, so erase first; each row keeps the device busy for 3 Run-Test/Idle cycles); ISC_VERIFY (an address is latched at one Update-DR and the row is captured at the next Capture-DR, so reading *N* rows takes *N* + 1 scans); ISC_DISABLE, which restarts the device from its new configuration.

::device-studio{device="cpld32" example="counter" views="source,chip,bits,jtag" n="G.13" caption="The vCPLD-32 in the Device Studio, running a 4-bit counter. The JTAG view drives the port by hand or plays a whole programming sequence, clock by clock."}

## iCE40 HX1K and HX8K

*Two members of the Lattice iCE40 HX family, the real FPGAs of Chapters 28 to 31. This is not Lattice’s datasheet:cite[ds1040] but the parts of it the course uses, with the numbers of synth’s chip database, which is built from Project IceStorm’s documentation of the bitstream:cite[prjicestorm] and checked by the tests of this appendix.*

### Features

- A grid of **tiles**, ringed by I/O tiles. A **logic tile** holds 8 logic cells; two **block RAM tiles**, one above the other, hold one 4-Kbit RAM; an **I/O tile** holds two pads.
- Each **logic cell** is a 4-input LUT, a D flip-flop with optional enable and set or reset, and carry logic, with a dedicated carry chain up the column.
- Routing of **neighbour links**, **span-4** and **span-12** wires, and in each logic tile 32 **local tracks** in front of the cells’ input multiplexers. Buffers drive a wire from a choice of sources; routing switches join span wires in both directions.
- Eight **global networks** for clocks and other busy nets, fed by dedicated pads or from the fabric.
- **SRAM configuration**, loaded at power-up from flash or over SPI, in four banks, and checked by a CRC.

::floor-plan{n="G.14" caption="The two dies to scale, as synth reads them from its chip database. The HX1K has 160 logic tiles and two columns of block RAM; the HX8K has 960 logic tiles, also with two RAM columns. The I/O tiles ring both."}

### Sizes

| | iCE40 HX1K | iCE40 HX8K |
|---|---|---|
| Tiles, with the I/O ring (columns × rows) | 14 × 18 | 34 × 34 |
| Logic tiles | 160 | 960 |
| Logic cells | 1,280 | 7,680 |
| Block RAMs (4 Kbit each) | 16 | 32 |
| Block RAM (Kbit) | 64 | 128 |
| User pads in the course’s packages | 72 (VQ100) | 206 (CT256), 95 (CB132) |
| Global networks | 8 | 8 |
| Configuration bits in the tiles | 175,872 | 909,312 |
| Bitstream file (bytes, as synth and `icepack` write it) | 32,216 | 135,096 |

### The logic cell

A logic cell has 20 configuration bits in its tile: the 16 bits of its truth table and four flags.

| Bits | Field | Meaning |
|---|---|---|
| 16 of them, in the order of the tile’s wiring | LUT | truth table: entry *r* is the output when I0 + 2·I1 + 4·I2 + 8·I3 = *r* |
| 8 | CarryEnable | the cell’s carry logic is in use: the carry out is MAJ(I1, I2, carry in) |
| 9 | DffEnable | the cell’s output is the flip-flop; otherwise the LUT |
| 18 | Set_NoReset | the tile’s set/reset pin sets the flip-flop to 1 rather than resetting it |
| 19 | AsyncSetReset | the set or reset acts at once, rather than at the next clock edge |

An input that nothing drives reads 0, so a LUT that uses two of its inputs reads only four entries of its table (Chapter 28). The eight cells of a tile share one clock (with a tile bit, `NegClk`, for the falling edge), one clock-enable and one set/reset; a carry chain runs from cell 0 to cell 7 of a tile and into cell 0 of the tile above. A cell’s inputs are interchangeable, except those that the carry logic uses, so the router may move a connection to another input and permute the truth table to match.

### Block RAM

A block RAM, `SB_RAM40_4K`, holds 4,096 bits, with one read port and one write port, each with its own clock. Its read and write widths are set in its configuration:

| Mode | Organisation |
|---|---|
| 0 | 256 × 16 |
| 1 | 512 × 8 |
| 2 | 1,024 × 4 |
| 3 | 2,048 × 2 |

Reads are synchronous: the word appears after the clock edge that takes the address, and a read in the cycle of a write to the same word gets the old word. The initial contents are part of the bitstream; in its 8-, 4- and 2-bit modes the bits of a word are spread over the block, and in every mode the four low bits of each group of sixteen are stored in reverse, which synth’s `bram_load` and IceStorm’s `icebram` take care of (Chapter 31).

### Routing

A logic cell’s output reaches the local tracks of the eight tiles around its own; to go further it takes a **span-4** wire, which crosses four tiles, or a **span-12**, which crosses twelve, through an output driver. A span-12 can feed a span-4. At the destination, a **local track** picks one of the wires nearby, and each cell input has a multiplexer that picks one of its tile’s local tracks. Every configuration bit of a tile that is not a logic cell’s or the tile’s own controls belongs to a buffer or a switch of this routing: about three quarters of the 864 bits of a logic tile (16 rows of 54).

### Timing model

The delays synth uses for the HX parts, from Project IceStorm’s timing database (the router uses them as costs, and timing analysis to find the critical path); Chapter 28 combines them into Figure 28.3.

| Element | Delay |
|---|---|
| LUT, any input to output | 0.45 ns |
| LUT, input I3 when it comes from the carry | 0.32 ns |
| Carry, carry in to carry out | 0.13 ns |
| Flip-flop, clock to output | 0.54 ns |
| Flip-flop set-up | 0.47 ns |
| Output driver onto a span-4 wire, onto a span-12 | 0.37 ns, 0.54 ns |
| Span-4 wire, over its four tiles | 0.32 ns |
| Span-12 wire, over its twelve tiles | 0.54 ns |
| Span-12 to span-4 | 0.45 ns |
| Local track | 0.33 ns |
| Cell input multiplexer | 0.26 ns |

The **critical path** is the slowest path from a start (a flip-flop, an input pad, a RAM output) to an end (a flip-flop, an output pad, a RAM input); the clock period cannot be shorter than it, and *f*max = 1000 / period, in MHz. synth reports it cell by cell, with the delay of each step.

### The bitstream file

The configuration memory is four banks, one for each quarter of the die. The file is a short program for the chip’s loader: a preamble, the commands that choose a bank and give its rows of bits, the contents of the block RAMs in the same way, and a CRC-16 over the whole, which the chip checks before it starts. It is byte for byte what Project IceStorm’s `icepack` writes, so the bitstreams of the figures program real boards.

::block-diagram{device="fpga" n="G.15" caption="The die and one logic tile. Everything shaded in copper is configuration memory."}

::fpga-studio{design="counter" views="chip,bits,steps" n="G.16" caption="The 4-bit counter on the Go Board’s HX1K, in the FPGA studio. Open Bits to see the configuration bits of every tile it uses, and click a cell on the chip to read its table and its flip-flop."}

## The boards

The figures build for two boards, with synth’s pin files for them:

| | Nandland Go Board | Alchitry Cu |
|---|---|---|
| FPGA | iCE40 HX1K, VQ100 | iCE40 HX8K, CB132 |
| Clock | 25 MHz, on `clk` | 100 MHz, on `clk` |
| LEDs | 4, on `led[0]` to `led[3]` | 8, on `led[0]` to `led[7]` |
| A button | `sw1` (also named `btn`) | `sw1` (also named `btn`) |
| Serial port to the computer | `rx` and `tx` | `rx` and `tx` |
| With synth | `synth build … --board go-board`, `synth prog --board go-board` | `--board alchitry-cu` |

A top module whose ports have those names is wired to the board; any other port must be constrained in a file of your own, `set_io name pin`. In the browser, the boards of Chapters 28 to 31 drive the pins of the chip decoded from its bitstream; Chapter 31’s board, for the two CPUs, has eight LEDs, eight switches, four buttons and four seven-segment digits, on the pins the placer chose. A segment is lit by a 1, bit 0 is segment a and bit 6 is segment g:

::board-diagram{part="segments" n="G.17" caption="The patterns of the sixteen hexadecimal digits, as Octet’s and the RV32I board’s `digit` functions write them."}
