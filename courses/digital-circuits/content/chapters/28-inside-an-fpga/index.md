---
number: 28
title: Inside an FPGA
summary: A sea of tiny memories that can each be any function, wires that can be joined in thousands of ways, and one long string of bits that says which. Program a logic cell of a real chip by hand, then watch the tools do the rest.
duration: About 2 hours
prerequisites: [cplds, building-blocks]
---

How many transistors does it take to be *any* logic gate? A 4-input NAND gate takes eight. A circuit that can be a NAND, or an XOR, or one of 65,536 other functions of four inputs, takes a memory of sixteen bits, and a bit of the static RAM of Chapter 20 is six transistors: 96 transistors before we have counted the multiplexer that reads the memory, or a single wire to bring the inputs in. That is more than twelve times the cost of the gate it might turn out to be.

Now do it a few thousand times, and add the wires. Every wire on the chip must be able to reach many others, and every choice of connection is a switch, and every switch is a bit of memory as well. Most of the chip is memory and switches that will never be used by any one design. Anyone who counted transistors in the early 1980s would have called this a waste, and would have been right, for the transistors of the time.

:::history{year=1985 title="The XC2064, and a bet on Moore’s law" people="Ross Freeman, Bernard Vonderschmitt, Jim Barnett, Xilinx"}
Ross Freeman was a director of engineering at the chip maker Zilog when he had the idea, and left to found Xilinx in 1984 with Bernard Vonderschmitt and James Barnett.:cite[ethw-fpga] The idea was a chip full of small configurable logic blocks in a sea of configurable wiring, all set by bits in a memory on the chip. Colleagues found it an outrageous use of silicon. Freeman’s answer was that Moore’s law would keep making transistors cheaper, and that a chip built from them would cost less than the months of design and the mask sets of a custom one.:cite[spectrum-fpga] The priority date of his patent is 12 March 1984; it was granted in 1989.:cite[freeman-patent]

The first product, the XC2064 of 1985, was an 8 × 8 array of 64 configurable logic blocks, each a small lookup function of four inputs with storage, and its configuration lived in SRAM that had to be loaded every time the power came on.:cite[ethw-fpga] Freeman died in 1989, aged 41, and was inducted into the National Inventors Hall of Fame in 2009.
:::

That bet paid off so thoroughly that the chip inside a router, a radio base station or a scanner in a hospital may well be an FPGA, a **field-programmable gate array**: a chip made once, in millions, and given its function afterwards by whoever buys it. Chapters 25 to 27 followed the family up to its fixed-function cousins. This chapter opens the FPGA itself, a real one, the Lattice iCE40 that the rest of the course builds for, and by its end you will have programmed one of its logic cells bit by bit.

## A lookup table is a tiny memory

The unit of logic in an :term[FPGA]{id=fpga} is the :term[lookup table]{id=lut}, or LUT, which Chapter 13 introduced as a multiplexer whose data inputs are stored constants. Here is the same idea as a memory. A LUT with *k* inputs holds 2ᵏ bits. The inputs are the address, the stored bit at that address is the output, and the truth table you would write on paper is what is stored. Nothing is computed: the answer is looked up.

```quiz
q: 'A 4-input LUT stores 16 bits. How many different functions of its four inputs can it be programmed to compute?'
options:
  - text: 16, one for each bit.
    why: 'Each bit is an *entry* of the truth table, not a function. Choose every bit independently, and the choices multiply.'
  - text: 256, because 16 × 16.
    why: 'The bits are chosen independently, so the number of combinations is 2 × 2 × … × 2 sixteen times, not 16 × 16.'
  - text: 65,536, because each of the 16 bits can be 0 or 1 independently.
    correct: true
    why: 'Sixteen independent bits are 2¹⁶ = 65,536 patterns, and each pattern is a different truth table, so a different function. That is every function of four inputs there is: a LUT4 can be any of them.'
  - text: About 4 billion.
    why: 'That is 2³², the number of patterns of 32 bits. A LUT4 has only 16 stored bits.'
```

::lut-explorer{n="28.1" caption="Flip the four inputs at the bottom to walk down the tree: each input chooses between the two halves of what is left, and one stored bit reaches the output. Click a stored bit to change the function, or type one (I0 ^ I1, or a & (b | c)) and see the 16 bits it becomes. Try parity and then majority. Which stored bits does the input I3 decide between?"}

The picture on the right of the LUT is the multiplexer tree that reads the memory: 15 two-way multiplexers, the first rank chosen by I0, the next by I1, and so on. It is the same tree as the 8:1 multiplexer of Chapter 13, one rank deeper. A LUT is a function in the sense a programmer means it: `table[index]`, with the index made of the four input bits. The synthesis tools of Chapter 30 do what a compiler does with a function that has a finite domain: they replace the code by its table.

:::programmer[A LUT is a memoised function]
Any pure function of four bits is a lookup in a 16-entry array. Hardware does not run the function, and it does not run the same time whatever the function is: `XOR`, `AND` and a hundred-gate monster all take the same 0.45 ns in an iCE40 HX, because they are all the same read of the same memory. That is why FPGA timing is dominated not by the logic but by how many LUTs there are on a path, and by the wires between them.
:::

Sixteen bits is a choice, not a law. Each extra input doubles the memory. It also lets one LUT do more, so that a function needs fewer LUTs and fewer levels of them, until the LUT is bigger than most of the functions it is asked to hold. Experiments from 1990 onwards, beginning with Jonathan Rose and his colleagues at Toronto, found that four inputs gave the smallest chip,:cite[rose1990] and four it stayed for fifteen years, until Xilinx moved to six with the Virtex-5 in 2006.:cite[xilinx-wp284] Chapter 30 shows the trade on a small example: the same eight-input parity needs seven 2-input LUTs, but only three 4-input ones.

:::history{year=2006 title="Six inputs" people="Xilinx, Altera"}
For years a LUT had four inputs. As transistors shrank, the wires between LUTs mattered more and more next to the LUTs themselves, so the FPGA makers made the LUTs bigger, to have fewer of them on a path. Altera’s Stratix II of 2004 split the difference with an *adaptive* LUT of eight inputs that can act as one large function or as two smaller ones.:cite[electronicdesign-alm] In May 2006 Xilinx announced the Virtex-5, on a 65 nm process, with a six-input LUT of 64 bits as its logic element, which can also be split into two smaller functions that share inputs.:cite[eetimes-virtex5] A six-input LUT needs four times the memory of a four-input one, and holds any function of six inputs that would otherwise need up to seven 4-input LUTs and three levels of them.
:::

## The logic cell

A LUT computes; it does not remember. Most designs are synchronous (Chapter 17), so each LUT is paired with a flip-flop that can catch its output on a clock edge. The pair is the :term[logic cell]{id=logic-cell}, and its third part is a piece of logic that does one job better than a LUT: carrying. A ripple-carry adder is a chain of full adders (Chapter 14) in which each stage waits for the one before, and passing a carry through a LUT and a wire per bit is expensive. So the cell has a **dedicated carry path**, running straight from each cell to the next, and a multiplexer that picks whether the cell’s output is the LUT or the flip-flop.

The logic cell of the iCE40 is described by 20 bits: 16 for the LUT and four flags. The flags say whether the cell’s carry logic is in use, whether the output comes from the flip-flop, and, for the flip-flop’s reset, whether it sets the flip-flop to 1 rather than 0 and whether it acts at once rather than at the next clock edge. A few more bits belong to the tile and serve all its cells: which clock edge they use, and how the carry chain enters the tile.:cite[prjicestorm] The carry output of every cell is the majority of its two operand inputs and the carry that arrives, MAJ(I1, I2, carry in), which is exactly the carry of a full adder, and the LUT, fed the same inputs, makes the sum.

::circuit{src="28-inside-an-fpga/circuits/logic-cell.json" n="28.2" title="A logic cell in miniature" mode="logic" speed=1e-6 caption="The four toggles on the left are the stored bits of a LUT with two inputs, and A and B choose which of them reaches the output: the bits are a truth table, read in the order A + 2B. As drawn it is an XOR. Set the bits to 1000 and it is an AND, to 1110 an OR. Then turn on Use flip-flop: the output now changes only when you press Clock, and the LUT’s answer waits in the flip-flop."}

:::lab[Make the cell into things]
Use Figure 28.2.

1. Set the four bits to make an AND (only bit 3 set), an OR (bits 1, 2 and 3), a NAND and an XNOR. In each case check all four settings of A and B. Nothing about the circuit changed except four stored bits: this is what “programmable” means.
2. Turn on Use flip-flop, set A to 1 and B to 0 with the XOR table, and look at Out: still 0. Press Clock. The LUT’s answer has been waiting at the flip-flop’s input, and now it is out. Change A and note that Out does not follow until the next press.
3. With the flip-flop on and the XOR table, set B to 1 and press Clock; then set A to 1 and press again. The output gives 0 (1 XOR 1). Every synchronous design in the course is a network of exactly this: a LUT, then a register.
:::

The cell also explains a rule that the tools of Chapter 30 will follow. Eight logic cells sit together in a **tile**, and the eight share one clock, one clock-enable pin and one set/reset pin, which cuts the routing that each cell would otherwise need. Two flip-flops that need different clocks or different enables cannot share a tile. The carry chain runs up a column of tiles, cell after cell: in an iCE40 HX a carry takes 0.13 ns to cross from one cell to the next (0.2 ns more from the top of a tile to the next), against 0.45 ns to pass through a LUT and about 0.6 ns to reach a cell of the next tile by the shortest wire. So a 32-bit carry chain takes about 4.6 ns, where 32 LUTs and their wires would take about 33. synth, the toolchain the course uses from Chapter 29 on, fits a 32-bit adder in exactly 32 logic cells on one chain, and with registers at both ends it runs at 156 MHz, a period of 6.4 ns.

## The wires are the chip

If the LUTs are the cities, the wires are the roads, and everything you know about cities applies: the roads are most of the land. An FPGA is a grid of tiles, and between and around them run **wire segments** of different lengths, with programmable switches where they cross. The iCE40 has three kinds.

- **Neighbour links**: the output of every logic cell can be read directly by the eight tiles around its own, and no further.
- **Span 4**: wires that reach the tile four away, and pass the three between them without touching them.
- **Span 12**: the long lines that cross twelve tiles, most of the width of a small chip.

A signal chooses its way through two kinds of programmable multiplexer.

- The :term[switch box]{id=switch-box} sits at every tile, and drives the wires that start there. Its multiplexer for each wire can choose from wires arriving at the tile from the same direction (to go straight on), from the two perpendicular directions (to turn), and from the tile’s own outputs.
- The :term[connection box]{id=connection-box} sits in front of every input pin of a logic cell, and chooses which of the wires that arrive at the tile it will read. In the iCE40 it has two stages: 32 **local tracks** per tile, each of which picks one of the wires nearby, and in front of each cell input a multiplexer that picks one of the local tracks.

A wire driven by a multiplexer has exactly one driver, and a multiplexer with *n* inputs needs only ⌈log₂(*n* + 1)⌉ configuration bits if they encode the choice: the extra one is the choice “nothing”. With such **single-driver** wiring every configuration means something and no two outputs can fight over a wire. The older way, in the XC2000 and its early successors, was a bidirectional wire joined to its neighbours by pass transistors, so that a configuration could join two outputs together. The iCE40 has both: **buffers**, which drive a wire in one direction from a choice of sources, and **routing switches**, bidirectional pass transistors between span wires, which the tools must never close in a way that joins two drivers.:cite[prjicestorm] A study of 2004 found that the move that Altera and Xilinx made to directional, single-driver wires saved about a quarter of the routing area and 9 % of the delay.:cite[lemieux2004]

Why three lengths? Every switch that a signal passes costs delay, so a wire that skips tiles skips their switches. The figure below is the fastest way across a row of iCE40 tiles, for the wires you allow, with the delays of the timing model synth uses (that of Project IceStorm, measured on the HX1K and HX8K). A neighbour link reaches the next tile in about 0.6 ns, counting the multiplexers in front of the cell that reads it, but to go further a LUT in that tile must pass the signal on, and the LUT costs another 0.45 ns. A span-4 wire reaches four tiles in 1.3 ns, and a span-12 twelve in 1.7 ns.

::wire-reach{n="28.3" caption="The distance starts at 30 tiles, with neighbour links only: thirty hops, each through a LUT, and 26.8 ns. Allow span-4 wires: nine hops and 5.0 ns. Add span-12: five hops and 4.8 ns. Now compare 11 tiles with 12: one tile further is more than twice as fast (4.3 ns against 1.7 ns), because 12 tiles is one long wire and 11 is not. The bars compare the three sets at the distance you chose."}

A long wire is faster per tile but costs a multiplexer input at every switch box that can start one, and a wire in the fabric that nothing else can use while it is carrying a signal. So a chip is built with a mix, a lot of short wires and a few long ones, and a router that must decide which net deserves the long one. That is the problem Chapter 30 calls routing.

```quiz
q: 'synth builds the 32-bit ALU of the RV32I core for an iCE40 HX8K, with registers on its inputs and its output, and finds a critical path of about 10 ns. About how much of that time is spent in the routing, the wires and their multiplexers, rather than in the logic cells?'
options:
  - text: 'About a tenth: wires are just wires.'
    why: 'On a chip a wire is a chain of switches, and each switch is a small resistor driving a capacitor. The tools count every one.'
  - text: 'A little under half.'
    correct: true
    why: 'The path is a LUT, the 32 cells of the adder’s carry chain and two more LUTs, and the hops between them take about 4.4 ns of the 10. The carry chain keeps the share down: on a path of LUTs alone, each hop to the next tile costs more than the LUT it reaches, and the wires take more than half.'
  - text: 'About nine tenths.'
    why: 'That would leave 1 ns for three LUTs and a 32-bit carry chain, which takes about 4 ns by itself.'
```

The same imbalance shows in the number of bits. A logic tile of the iCE40 has 16 rows of 54 configuration bits, 864 in all, of which the eight logic cells use 160 (16 for the table and 4 flags each), about a fifth. A handful more choose the tile’s shared clock, enable and reset, and the rest, about three quarters, are the multiplexers and switches of the routing.:cite[prjicestorm] Where the bits are is where the switches are, and where the switches are is where the area and the delay are.

## Where the bits live

Every LUT bit, every flag and every routing choice is a bit of memory, and together they are the :term[bitstream]{id=bitstream}. Chapter 25 listed the ways to hold a bit. Almost all large FPGAs use the last on that list, plain SRAM, for the reason given there: it is made in the same process as the logic, so it improves whenever the logic does. What it costs is **volatility**. SRAM forgets, so the configuration lives in a separate memory, usually a flash chip on the board next to the FPGA, and is copied into the FPGA every time the power comes on. For the small iCE40 HX1K, Lattice gives 34,112 bytes; for the HX8K, 136,448.:cite[tn1248] (The files synth writes for them are 32,216 and 135,096 bytes: the HX1K’s tiles hold 175,872 configuration bits, and the block RAM’s contents come on top.) At one bit per clock of a 12 MHz SPI link, the HX1K takes about 23 ms to load, and until it has, its pins are inputs and its logic does not exist.

The smallest part of the bit is a **cell**, and the figure below is one, at transistor level, controlling one switch. Two inverters feeding each other hold a value for as long as they have power, and two access transistors, opened by the word line, let a write override them. The cell’s output, Q, is not read through anything. It is wired straight to the gate of a pass transistor in the routing, which is therefore on if the bit is 1, and off if it is 0. Every switch in the fabric is such a transistor, and the loading of a bitstream is writing them all.

::circuit{src="28-inside-an-fpga/circuits/config-bit.json" n="28.4" title="A configuration bit is a switch" mode="logic" speed=1 caption="At power-up the cell is in an arbitrary state, so first write it: set Bit line to 1 and Bit line B to 0 (a write needs both, opposite), then raise the Word line and lower it. The pass transistor on the right now conducts, and Signal out follows Signal in. Change the bit lines and the input freely: with the Word line low the cell holds. Write a 0 and the switch opens; the pull-down makes the output 0."}

The bits are not loaded one by one but in :term[frames]{id=config-frame}: a frame is a slice of the chip’s configuration memory written all at once, like a row of a RAM. The iCE40 has four banks of configuration memory, one for each quarter of the die, and the bitstream is a short program for the loader: choose a bank, here are its rows, choose the next. A CRC-16 over the whole file comes last, and the chip refuses to start if it does not match, so that a file with even a single flipped bit is caught before it becomes a circuit.

The volatility has a second consequence. SRAM is as vulnerable to a cosmic ray as any other memory, but in an FPGA a flipped bit does not corrupt some data: it *changes the circuit*. A bit in a routing multiplexer connects the wrong wire, and a bit in a LUT changes the function. The error stays until the bit is rewritten. Space and avionics designers deal with it by :term[scrubbing]{id=scrubbing}: reading the frames back continually, comparing each with what it should be and rewriting the wrong ones.:cite[seu-scrubbing] Try it on the smallest design there is, an XOR gate, which synth puts in one logic cell and three pads of an HX1K:

::upset-census{n="28.5" caption="The four tiles the gate uses, bit by bit; the filled bits are the ones set. Strike at random, and watch the counter of rays: most strikes are harmless, but not all. Click a bit to strike it yourself, and read what it controls. Then show the census, recorded by flipping each of the 1,728 bits in turn and running the decoded chip, which outlines the critical ones in red."}

The census says that 52 of the 1,728 bits, 3 %, matter: 20 of the bits that are set (the routing buffers that carry a, b and y, and the settings of the three pads); 4 entries of the truth table; the flag that would put a flip-flop, which has no clock, in front of the output; and 27 bits the design leaves at 0, which, set, change what a multiplexer selects or how a pad behaves. The percentage is small because the design is tiny, and it would be smaller still over the whole chip: most bits of the HX1K’s other 159 logic tiles control wires and cells that this design never touches. A design that fills the chip has a much larger share of critical bits, and a space mission that cannot afford the flips has three choices: scrub, triple every part of the design and vote, or use a device whose bits are not SRAM. The last leads to the chapter’s other technologies.

Notice that only 4 of the 16 bits of the LUT matter. The XOR uses two of the LUT’s four inputs, and in the iCE40 an input that nothing drives reads 0, so the cell only ever reads the four entries with the other two inputs at 0. synth writes the XOR pattern into all four quarters of the table anyway, 0110 four times, and twelve of the sixteen bits could be anything at all.

:::history{year=1988 title="Actel and the antifuse" people="Actel, Amr Mohsen, Esmat Hamdy"}
An SRAM FPGA needs its configuration reloaded at every power-up, and can be upset by a cosmic ray. Actel, founded in 1985 by Amr Mohsen and Esmat Hamdy, shipped its first FPGAs, the ACT 1010 and ACT 1020, in 1988, and built them on a different idea.:cite[eejournal-actel] Instead of memory cells and pass transistors, its wiring was made of **antifuses** (Chapter 25): a thin insulator between two layers of metal that a programming voltage punches through, leaving a permanent link that Actel called a “programmable low-impedance circuit element”.:cite[actel-act1] The link is a piece of wire and much smaller than a transistor switch, so the chip was fast and dense, it worked the moment it was powered, and a particle could not flip it. The price was that it could be programmed only once, and the process was less standard. Antifuse FPGAs are still made, for space and defence.

Flash-based FPGAs are a third kind: they keep a floating-gate cell (Chapter 25) at each switch, so they are instant-on and reprogrammable, at the cost of a slower and bulkier switch than SRAM.
:::

## Everything else on the die

A fabric of LUTs and wires is universal: an FPGA with nothing else could be anything. It would also be wasteful, in the way that building every multiplication out of adders is wasteful, and the box below puts a number on how wasteful. So the fabric is joined by :term[hard blocks]{id=hard-block}, ordinary custom circuits placed in columns among the tiles, for the jobs that most designs need.

:::history{year=2007 title="How much does programmability cost?" people="Ian Kuon, Jonathan Rose"}
In 2006 two researchers at the University of Toronto, Ian Kuon and Jonathan Rose, set out to measure what the flexibility of an FPGA costs. They built the same benchmark circuits for a 90 nm FPGA and, with a standard synthesis flow, as standard-cell chips in the same 90 nm process, and compared them. For circuits that use only the FPGA’s general logic, the FPGA needed on average 35 times the area, ran 3.4 to 4.6 times slower and used about 14 times the dynamic power. When the circuits could use the hard multipliers and block RAMs, the area gap fell, to as little as 18 times on some benchmarks.:cite[kuon-rose]

The numbers say what the plan of Chapter 32 will keep in view: an FPGA is a bargain when you make few of a thing, or need to change it, and a bad one at a million units.
:::

- **Block RAM.** A LUT is a 16-bit memory, and a register file of 32 × 32 bits made of them would take 64 LUTs and many wires. Dedicated RAM columns hold thousands of bits at a small cost. The iCE40 has 4 Kbit blocks that can be 256 words of 16 bits, or 512 × 8, 1,024 × 4 or 2,048 × 2, with one read port and one write port: 16 of them on the HX1K, 32 on the HX8K. The Xilinx Virtex of 1998 was the first Xilinx family to have them, with 4,096 bits each.:cite[wiki-virtex]
- **Multipliers and DSP slices.** synth builds a 16-bit multiplier (the low half of the product) from 295 logic cells, nearly a quarter of an HX1K. The iCE40 HX has no multipliers; its UltraPlus cousins have eight DSP blocks that multiply 16 by 16 bits and accumulate. The Virtex-II of 2000 added hard 18 × 18 multipliers, and later families made a slice that multiplies and accumulates.:cite[wiki-virtex]
- **Transceivers and processors.** The Virtex-II Pro of 2002 put one to four PowerPC processor cores and multi-gigabit serial transceivers into the fabric.:cite[hpcwire-v2pro] Today’s largest FPGAs carry whole ARM processors.
- **I/O blocks.** The pads at the edge are logic too, but different logic. An iCE40 pad has six bits that choose its input and output paths (straight through, or through a flip-flop at the pin) and what enables its output, and one for a pull-up; larger chips add its voltage standard, its drive strength and a delay line right at the pin.
- **Clocks.** A clock must reach thousands of flip-flops at the same instant, and cannot go through ordinary routing. **Clock networks** are trees of dedicated wires with buffers, reaching every tile with small skew. The iCE40 has 8 of them, each driven by a dedicated pad or from the fabric, with buffers that carry them up and down every column (on the HX1K, 8 bits in each tile of four rows switch those buffers on), and a tile chooses one network for all its flip-flops. A :term[PLL]{id=pll} (phase-locked loop) makes new clocks from an old one by multiplying and dividing its frequency, to turn a board’s 12 MHz oscillator into, say, 48 MHz for the fabric; the HX8K has two.

So an FPGA is a fabric, and columns of hard blocks in it, in the proportions that the market of the year wants. A chip for signal processing has more multipliers; a chip for networking has more transceivers. The iCE40 HX takes the frugal road: columns of RAM, and no multipliers.

## Configure one by hand

Now do it. The widget below borrows the XOR gate of Figure 28.5: synth has placed it on an HX1K, routed pad a and pad b into one logic cell and the cell’s output to pad y, and written the rest of the bitstream. The truth table is yours. It starts empty, sixteen zeros, and the goal is to make y the XOR of a and b. Every time you change an entry, the widget flips the bit of the tile that holds it, and synth decodes the whole edited bitstream back into cells and runs them for the four input pairs, so “not yet” means that the bits do not do it, whatever you meant.

::lut-by-hand{n="28.6" caption="Read which of the LUT’s inputs synth routed a and b to, then set the entries of the table where exactly one of them is 1 (or type a ^ b and press Write it). Watch the bits light up in the tile on the right: the sixteen entries of the table are spread over two rows of its configuration memory. Then try the other goals, and set an entry in a greyed row: the chip does not notice."}

:::lab[Read the bits]
Use Figure 28.6.

1. With the table empty, y is 0 for every input pair: a LUT of zeros is a constant 0. The wires are all there, but they carry nothing that matters.
2. Find the two inputs that carry a and b, and set the one entry where a is 1 and b is 0. The chip now computes a AND NOT b: one bit of memory, one function.
3. Make y = a XOR b with as few bits as you can. Two set bits are enough, the two entries in white rows where a and b differ. synth, which does not know that the other two inputs will stay unconnected, wrote eight: the same pattern in every quarter of the table.
4. Look at where the table’s bits are in the tile: 16 bits in two of its rows, in an order that has little to do with the order of the entries. A tool that writes bitstreams needs a map of every one of them; Project IceStorm made that map for the iCE40 by experiment.:cite[prjicestorm]
5. Make each of the other goals. Count the bits the AND needs (one) and the NAND (three). Nothing about the chip changed but the table: this is what “programmable” means.
:::

One XOR gate is hardly a design, and the routing was done for you. To see how far it scales, here is the counter of Chapter 29, built by synth for the Nandland Go Board, a small board with an HX1K, four LEDs and four buttons. Chapter 30 takes the stages of that build one at a time.

::fpga-studio{n="28.7" design="counter" views="chip,bits,steps" caption="The 4-bit counter as synth placed and routed it on the Go Board’s HX1K. Click a cell on the chip to read its table and its flip-flop, then open Bits: it lists the tiles that hold any set bit, and opens on the selected cell’s tile. Steps shows what each stage of the flow made of the design. How many of the 1,280 logic cells does it use, and in how many tiles?"}

:::lab[Read a design’s bits]
Use Figure 28.7.

1. Read the utilisation in the bar at the top: **6 of the 1,280 logic cells**, and 6 of the 72 pads (the clock, the button and four LEDs). Four of the cells hold the count, one bit each; the other two are the two flip-flops that synchronise the button (Chapter 17).
2. On the chip, the six cells are in two tiles, though one tile holds eight. The four cells of the count share a clock enable, the synchronised button, and the eight cells of a tile have only one enable between them, so the two synchroniser flip-flops, which have none, must go to another tile.
3. Click the cells of the count and read their tables. One is `0x00FF`: the NOT of input I3, which is its own output, fed back, a flip-flop that toggles on every clock it is enabled. Another is an XOR of two inputs: that bit toggles when the bit below it is 1. Where did the counter’s `enable` go? Not into a LUT: the flip-flops of the tile take it on their clock-enable pin, so the multiplexer of Chapter 29’s gate count has disappeared into the cell.
4. Open Bits. The design sets **706** of the HX1K’s 175,872 configuration bits, 0.4 %; 108 of them are in the counter’s two tiles. Most of the rest are in four rows of the die (4, 5, 12 and 13), where every logic tile has eight set: they switch on the column buffers that carry the eight clock networks up and down the columns, and synth sets them whether or not a network is in use.
:::

## Under the hood

:::hood[Decoding a bitstream into a circuit]
When Figures 28.5 and 28.6 run the chip, they do not run the design that was written: they run what the bits say. synth’s `decode` (in `crates/arch-ice40/src/decode.rs`) reads a configuration back into a netlist of cells. It starts with the switches: for every programmable connection of every tile, it reads that switch’s bits and, if they select the connection, joins the two wires into one net, with a union-find:

```rust
let on = sw.bits.iter().enumerate().all(|(k, b)| {
    cfg.tile_bit(x, y, b.col as usize, b.row as usize) == (p.pattern >> k & 1 != 0)
});
if on {
    uf.union(src, dst); // the two wires are now one net
}
```

Then the cells. A logic cell with any bit set, or whose output reaches a wire, becomes an `ICESTORM_LC` whose truth table is read from its bits, through the fixed permutation that the tile’s layout imposes:

```rust
/// LUT truth table bit `i` is LC configuration bit `LUT_PERM[i]`.
const LUT_PERM: [usize; 16] = [4, 14, 15, 5, 6, 16, 17, 7, 3, 13, 12, 2, 1, 11, 10, 0];
let mut init = 0u64;
for (i, &p) in LUT_PERM.iter().enumerate() {
    if lc.bits[p] {
        init |= 1 << i;
    }
}
```

The four flags become the cell’s other parameters (carry enable, flip-flop enable, set rather than reset, asynchronous reset), and the pads named in the pin constraints become the netlist’s ports. synth’s simulator then runs that netlist as it would run any design, evaluating each table as `table[I0 + 2·I1 + 4·I2 + 8·I3]` with an unconnected input at 0. That is why, in Figure 28.5, only four of the XOR’s table bits are critical, and why the greyed rows of Figure 28.6 are never read. A configuration can be wrong in every way a real chip can, two drivers on a net or a loop through LUTs included, and the decoded netlist is wrong in the same way.
:::

## Build it for real

:::real{parts="an iCE40 board (the Nandland Go Board, an iCEstick, an Alchitry Cu or any board with an iCE40 HX1K or HX8K), a USB cable, synth and openFPGALoader"}
Blink the LEDs of an iCE40, and then find a LUT in its bitstream.

1. Start a project for your board. `synth init --list` lists the boards it knows; for the Go Board:

   ```sh
   synth init --board go-board blink && cd blink
   ```

   It writes the board’s pins, a `synth.toml` and a design that counts on the four LEDs:

   ```weft title="top.weft"
   module top<CLK_HZ: int = 25_000_000, W: int = bits_for(CLK_HZ) + 1>(
       in  clk: clock,
       out led: uint<4>,
   ) {
       reg count: uint<W> = 0;
       count := count +% 1;
       led = count[W - 1:W - 4];
   }
   ```

2. Build it and program the board (`synth prog` runs openFPGALoader):

   ```sh
   synth build
   synth prog
   ```

   The LEDs count. Read what `synth build` reported: the 26-bit counter came out as 26 flip-flops (`SB_DFF`), a carry chain of 24 `SB_CARRY` cells and 26 `SB_LUT4`, packed into 27 logic cells, about 2 % of the HX1K’s 1,280, and it would run at about 177 MHz where the board’s clock is 25.

3. Now find a LUT. `synth unpack build/top.bin top.asc` writes the bitstream in Project IceStorm’s text format: one section per tile, and a `.logic_tile` section is 16 rows of 54 bits, the tile of Figure 28.6. IceStorm’s documentation says where the 16 table bits of each of the tile’s eight cells are among them;:cite[prjicestorm] use it to read out the table of one cell of the counter. It is an XOR: the sum bit of a full adder, with the carry arriving on input I3, on real silicon.

The chip of this chapter’s figures is not a model: it is the same HX1K, the same bitstream format and the same timing data, and the bitstream that Figure 28.7 shows would program the board.:cite[ds1040]
:::

## Exercises

```quiz
q: 'A tile of the iCE40 has 8 logic cells, each with 20 configuration bits. One tile has eight AND cells and another has eight XOR cells, wired in the same way, and the tools write each table over its two used inputs and repeat it over the other two. Which of the tile’s bits can differ?'
options:
  - text: All 160 cell bits.
    why: 'Four of a cell’s 20 bits are flags, which say how the cell is used (flip-flop or not, carry or not), and the wiring is in other bits again. Both tiles use the cells the same way.'
  - text: 'Only the truth-table bits: 96 of them, since an AND table (0x8888) and an XOR table (0x6666) differ in three places out of every four.'
    correct: true
    why: 'A cell’s table is the only thing that says *what* it computes. The two tables, written over two used inputs and repeated over the others, are 1000 and 0110 repeated, which differ in 12 of 16 places, and 8 × 12 = 96.'
  - text: Only 8, one per cell.
    why: 'The tables 1000 and 0110 differ in three of their four places, not one.'
```

```quiz
q: 'An FPGA’s configuration is in SRAM, loaded from a flash chip at power-up. What happens to the pins of the FPGA while it is loading?'
options:
  - text: 'They are inputs (high impedance) until the configuration has arrived and the chip enters user mode.'
    correct: true
    why: 'Until the bitstream has been loaded, no pad has been told to be an output, and no flip-flop has an initial value. Boards must be designed to be safe with the FPGA’s pins floating for tens of milliseconds, which is why they have pull-up and pull-down resistors on lines like chip-selects.'
  - text: They all output 0.
    why: 'An output pad is itself a configuration bit (pad direction); that bit has not yet been loaded, so the pad does not drive anything.'
  - text: They keep whatever the previous configuration set.
    why: 'The memory is SRAM, and is empty at power-up, so there is no previous configuration.'
```

```quiz
q: 'A cosmic ray flips a bit in the configuration memory of an SRAM FPGA that runs a design in which nothing has changed since the last power-up. The chip is not scrubbed. When is the error corrected?'
options:
  - text: At the next clock cycle, because the flip-flops are re-loaded.
    why: 'The flip-flops hold data, not configuration. The bit that flipped is in the configuration memory, which is read by nothing during operation.'
  - text: 'When the configuration is rewritten: at the next power-up, or by a scrubber that reads the frames back and rewrites the wrong one.'
    correct: true
    why: 'The configuration bits are never rewritten during operation, so an upset stays until something writes it again. A scrubber compares each frame with a stored copy or a checksum, and rewrites it, often while the design runs.'
  - text: 'Never: the design is permanently damaged.'
    why: 'The silicon is fine: the flip is a state, not damage. A rewrite fixes it.'
```

```parsons
title: 'What happens when an SRAM FPGA is powered on'
prompt: 'Put the steps in the order they happen.'
lines:
  - 'The supply rises and the configuration SRAM powers up in arbitrary states; every pad is an input.'
  - 'The FPGA reads its bitstream from the flash chip and writes the rows of each bank into its configuration memory.'
  - 'The CRC at the end of the bitstream is checked against what arrived.'
  - 'The flip-flops are set to their initial values from the configuration.'
  - 'The chip enters user mode: pads set to output start driving, and the design runs.'
distractors:
  - 'The flash chip writes the design into the LUTs by running the synthesis tool.'
  - 'The FPGA compiles the source of the design into routing.'
```

```bug
title: 'Sizing a LUT'
prompt: 'A designer wants to know how many 4-input LUTs are needed to hold a 5-input function in the worst case, and writes down a chain of reasoning. Click the first line that is wrong.'
lines:
  - 'A 4-input LUT holds any function of 4 inputs.'
  - 'A 5-input function f(a, b, c, d, e) can be split on e: f = e ? f1(a, b, c, d) : f0(a, b, c, d).'
  - 'Each of f0 and f1 is a function of 4 inputs, so each fits in one LUT4: 2 LUTs.'
  - 'The choice between them, by e, is a multiplexer, which a LUT cannot do, so a fixed multiplexer is needed in front of the output.'
  - 'So a 5-input function needs at most 2 LUT4s and a multiplexer.'
wrong: 3
why: 'A multiplexer *is* a function (of three inputs: f0, f1 and e), so it fits in a LUT4. The worst case is three LUT4s. FPGA makers of the LUT4 era built the multiplexer in for exactly this reason: a dedicated one combines two LUT4s into a LUT5.'
notes:
  '0': 'True: 2¹⁶ tables.'
  '1': 'This is Shannon expansion, the identity of Chapter 11.'
  '2': 'Correct: with e removed, each half depends on four inputs.'
```

:::challenge[A LUT6 in LUT4s]
A LUT6 holds 64 bits. Show that any function of six inputs can be built from at most seven LUT4s, and compare the number of stored bits. How many levels of LUTs, and therefore of wire, does the LUT4 version have?

*Answer.* Split on two inputs, e and f: the function is a 4:1 multiplexer, selected by e and f, of four functions of the remaining four inputs. Each is one LUT4: four LUT4s. A 4:1 multiplexer has six inputs and is itself three 2:1 multiplexers, each a function of three inputs, so three LUT4s (Figure 30.2 finds it). Total: 4 + 3 = 7 LUT4s, or 112 stored bits against the LUT6’s 64, and three levels of LUTs where the LUT6 has one. The LUT6 is smaller in bits and faster: that is the argument for six inputs. Its cost is that a function of only four inputs wastes three quarters of a LUT6’s memory, unless the cell can be split into two smaller functions, as the adaptive LUTs of Altera and the LUT6 of Xilinx can.
:::

```quiz
q: 'In Figure 28.6 synth routed a and b to two of the LUT’s four inputs and left the other two unconnected. How many of the 16 entries of the table can change what the chip does?'
options:
  - text: All 16.
    why: 'An unconnected input of an iCE40 LUT reads 0, so every entry with one of those inputs at 1 is never selected. The greyed rows of the widget are those entries.'
  - text: '4: the entries with both unconnected inputs at 0.'
    correct: true
    why: 'Two inputs that vary select among 2² = 4 entries; the other two inputs are stuck at 0 and fix the rest of the address. That is also why the census of Figure 28.5 finds 4 critical table bits, not 16.'
  - text: '8: the entries synth set.'
    why: 'synth set eight because it repeats the XOR over the unused inputs, but four of those eight, and four of the zeros, are never read.'
```

## What’s next

You now know what an FPGA is made of, and how a design *lives* in one: a few dozen LUT tables, a few hundred routing choices and a handful of flags, packed into a bitstream. Nobody sets those by hand except once, to see how. A design of any size is written as text, and Chapter 29 introduces the language, Weft, in which the rest of the course describes hardware. Chapter 30 then takes the compiled result through the tools that decide which cell, which wire and which bit, for a design too large to configure by hand: synth’s flow, which turned the 6-cell counter into 706 set bits, and can do the same to the thousand-cell register file of a CPU.
