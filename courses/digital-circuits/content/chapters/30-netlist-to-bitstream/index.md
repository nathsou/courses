---
number: 30
title: From netlist to bitstream
summary: How a counter becomes six logic cells in chosen tiles of a real iCE40, wired through chosen switches, and 706 set bits, by way of synthesis, LUT mapping, packing, placement by annealing, routing by negotiation and timing analysis, all in synth.
duration: About 2 hours
prerequisites: [describing-hardware, inside-an-fpga]
---

Chapter 29 ended with a counter: eight word-level cells, which synth turned into a dozen AND gates and four flip-flops, in a netlist that has no place and no wires. Chapter 28 ended with a chip: the iCE40 HX1K, 1,280 logic cells, a few hundred thousand switches, and 175,872 bits of configuration. Between them lies a translation that nobody does by hand, and it is the same job a compiler does, with a stranger last step. The program is the counter; the machine is a fabric of LUTs and wires; and the output is a file of bits.

A hardware compiler has more stages than a software one, because a chip has *geography*: it is not enough to say what each piece computes, the tool must say which cell of which tile holds it and which of thousands of switches connect it to its neighbours. Each stage is a well-known problem with a well-known algorithm, and synth, the toolchain the course uses, runs them all, in your browser.

1. **Synthesis** turns the netlist into a graph of two-input ANDs and inverters, and simplifies it.
2. :term[Technology mapping]{id=technology-mapping} cuts the graph into pieces that each fit one LUT.
3. :term[Packing]{id=packing} groups the LUTs and flip-flops into tiles.
4. **Placement** decides which tile each group goes in.
5. **Routing** chooses the wires between them.
6. **Timing analysis** finds the slowest path, and so the fastest clock.
7. **Bitstream generation** writes every decision down as bits.

```quiz
q: 'On the Go Board, the counter’s enable comes from a button, through the two flip-flops of a synchroniser (Chapter 17), and its clear is tied to 0. After synthesis it is 9 AND gates and 6 flip-flops: 15 pieces of logic. How many of the HX1K’s 1,280 logic cells will it use?'
options:
  - text: 15, one for each gate and flip-flop.
    why: 'That is what a fabric of two-input gates would need. A LUT can hold a whole cone of gates, and a cell has a flip-flop of its own.'
  - text: '10.'
    why: 'Better, but the answer depends on how many gates a LUT can absorb, which is far more than one.'
  - text: '6.'
    correct: true
    why: 'Each of the four bits of the count is one cell: the LUT that computes its next value and the flip-flop that holds it. The enable goes to the flip-flops’ own clock-enable pins, and the clear, tied to 0, vanishes. The two flip-flops of the synchroniser take a cell each. The rest of this chapter is how synth found that.'
  - text: 1, since it is only one tile of eight.
    why: 'A tile has eight cells, but a cell is a LUT and a flip-flop: the count is of cells. And these six cannot all share a tile, as you will see.'
```

Here is the whole flow, on the counter, in the studio. synth builds it when the figure appears: the Source is the Weft of Chapter 29 and the top module that puts it on the board; Steps lists what each stage made of it and how long it took; Chip shows where the cells went; Timing has the critical path; Bits is the file; and Board runs the configured chip.

::fpga-studio{n="30.1" design="counter" views="source,steps,chip,timing,bits,board" caption="The counter on the Go Board’s HX1K, built by synth in your browser (a quarter of a second, most of it placement). Steps has the size after every stage, Timing the critical path, and the replays of placement and routing are Figures 30.3 and 30.4 below. On the Board, hold the button and step the clock: the count comes from the configured chip, decoded from its bits, not from the source. Edit the source and press Build again to see the stages change."}

:::lab[Follow the counter through the tools]
Use Figure 30.1. Open Steps.

1. **Sizes.** Read down the stages. As written, the design is seven word-level cells: an adder, two multiplexers, an AND, a NOT and two registers (the count, and the synchroniser’s two bits). Lowered to gates, the adder first becomes a carry chain; the optimiser then takes it back out, because a 4-bit increment fits in LUTs, and leaves 9 AND gates and 6 flip-flops. Mapped to the iCE40, that is 4 LUTs, 4 flip-flops with a clock enable (`SB_DFFE`) and 2 without (`SB_DFF`), packed into 6 logic cells, with 6 pads and 8 nets to route.
2. **Cells.** On the Chip, the four cells of the count share a tile; the synchroniser’s two are in the next tile. Click one of each and compare: the count’s flip-flops have a clock enable, and the synchroniser’s do not, and a tile’s eight cells have only one enable between them.
3. **Time.** Open Timing: 1.94 ns, 514 MHz, twenty times the board’s 25 MHz. The critical path has no LUT on it at all. It runs from the second flip-flop of the synchroniser, 0.64 ns after the clock edge, over 1.3 ns of wires to the clock-enable pin of the counter’s tile.
4. **Run.** On the Board, hold the button and step the clock. The count starts two clocks after the button, the time the synchroniser takes, and the LEDs are lit by the chip decoded from its bits: the last section of this chapter is about that.
:::

## Synthesis: a graph of ANDs

The netlist Chapter 29 produced is made of cells of many kinds: AND, OR, XOR, multiplexers, adders, comparisons. A tool that wants to optimise it would need a rule for every combination. So the first step is to throw away the kinds. Chapter 11 showed that NAND alone is enough for any function; the tools use its cousin, the two-input **AND with optional inversion on every edge**. Everything else is built from it: an OR is an AND with three inversions (De Morgan again), an XOR is three ANDs, a multiplexer is three. The result is an :term[and-inverter graph]{id=aig}, or AIG: a directed graph whose nodes are two-input ANDs and whose edges may carry a bubble.

The counter on the Go Board becomes 9 AND nodes in synth’s graph, and the ALU of the RV32I core 1,770. The flip-flops are not part of it, and neither are the carry chains and memories that will go to the chip’s hard blocks: a register’s output is an *input* of the graph, and its next value an *output*, so the graph is purely combinational and a timing path always runs from a register (or a pin) to a register (or a pin).

The graph is simplified as it is built, and again afterwards, by rules any programmer will recognise as compiler optimisations.

- **Structural hashing**: an AND of the same two operands is built once, however many times the design asks for it, the hardware version of common-subexpression elimination. Constants propagate as the graph is built: `x & 1` is `x`, `x & !x` is 0.
- **Rewriting**: for every node, the function of each small cut below it (four inputs or fewer) is looked up in a library of the best small structures for it, and the node’s cone is replaced when a structure needs fewer nodes, counting as free the nodes the graph already has. This is peephole optimisation, done on functions rather than on instructions.
- **SAT sweeping**: random simulation finds nodes that might compute the same function, and a SAT solver proves it or finds an input that tells them apart. Proved twins are merged.
- **Balancing**: a chain of ANDs, `(((a·b)·c)·d)·e`, is a tree, `((a·b)·(c·d))·e`, in which the operands that arrive early are combined first. The same nodes, half as deep.

On the ALU these steps take the graph from 1,770 AND nodes to 1,526. And synth does one more thing that a software compiler rarely does: it keeps several versions of the same logic, from different steps, side by side in the graph (559 such *structural choices* on the ALU), and lets the mapper choose among them, node by node, the one that maps best.:cite[mishchenko2007]

## Technology mapping: cutting the graph into LUTs

The ALU’s graph has 1,526 nodes of two inputs each. The chip has LUTs of four. To turn one into the other, we pick a set of nodes whose *cones* (everything between them and the nodes below) each depend on at most four other nodes, and give each cone a LUT that holds its truth table. The choice is made with cuts.

A :term[cut]{id=cut} of a node is a set of at most four nodes, its leaves, such that every path from the inputs to the node passes through one of them. If a node has a cut with leaves {a, b, c, d}, it is a function of those four alone, and one LUT can replace everything between. A node has many cuts. The counter’s `wrapped`, an AND of five signals (the enable and the four bits of the count), has no cut of four leaves that reaches all five inputs, so the best it can do is a cut such as {enable, v3, n}, where n is the AND of the other three: two LUTs.

```quiz
q: 'An 8-input parity, `a ^ b ^ c ^ d ^ e ^ f ^ g ^ h`, is 21 AND nodes in synth’s graph. How many 4-input LUTs does synth cover it with?'
options:
  - text: 21, one for each node.
    why: 'That is what K = 2 would give if each LUT covered a single node. But a LUT can cover a whole cone: one 2-input LUT already covers a complete XOR of three nodes.'
  - text: 7, one for each XOR.
    why: 'Seven 2-input XORs need seven 2-input LUTs. A 4-input LUT is wide enough to hold the XOR of four signals, which is three XORs.'
  - text: '3.'
    correct: true
    why: 'A 4-input LUT holds any function of four inputs, including the parity of four, so three LUTs suffice. synth’s three come out three levels deep, in a chain, because the expression was written as a chain and XORs are not rebalanced; two LUTs of four inputs and a third that combines them would be two levels deep.'
  - text: 1, because parity is one function.
    why: 'Only if the LUT had eight inputs. A LUT4 can see four signals.'
```

The mapper works in two passes. First it labels every node with the fewest LUT levels it can be reached in: an input has label 0, and any other node has 1 plus the smallest, over its cuts, of the largest label among the cut’s leaves. The label of an output is the depth of the best possible mapping, so this pass finds the **fastest** cover. Then it recovers area: nodes off the critical path do not need the fastest cut, so it picks cuts that share the most logic, until the count stops falling. On the ALU, synth’s first cover has 563 LUTs, and six rounds of recovery bring it to 523 without adding a level.

The figure runs a small mapper written for this chapter, on the same plan as synth’s, on four small functions. Change K to two, three, four, and see the trade: bigger LUTs, fewer LUTs and fewer levels.

::cut-mapper{n="30.2" caption="Pick a function and set K to 4. Click a node to see all its cuts (the leaves, the truth table the LUT would hold, and the levels each would need). The mapper’s choice is marked. Then turn Balance on for the 8-input AND, and see the depth fall from 3 levels of LUTs to 2. Compare K = 3 and K = 4 for the carry of the 4-bit adder: 4 LUTs four levels deep, against 3 LUTs three deep. That is the argument for the LUT4."}

:::lab[Cover the graph]
Use Figure 30.2.

1. Choose *8-input AND* and K = 4: a chain of seven ANDs, mapped to three LUTs, three levels deep. Turn on Balance: the same seven nodes, but now three LUTs two levels deep. Balancing before mapping made the *mapped* circuit faster, because the mapper is optimal only for the graph it is given.
2. Choose *Parity of 8 bits* and set K = 2, 3 and 4: the LUT count goes 7, 5, 3 and the depth 3, 3, 2. Three inputs save two LUTs and no level; four save two more and a level. For this function four is where a LUT starts to pay.
3. Choose *4-way multiplexer*. With K = 2 it needs 9 LUTs, one per node; with K = 3, three, one for each 2:1 multiplexer. Click the top node of any function and compare its cuts with the mapper’s choice: is it always the one with the fewest leaves?
:::

:::history{year=1994 title="FlowMap" people="Jason Cong, Yuzheng Ding"}
In 1994 Jason Cong and Yuzheng Ding showed that mapping a network to LUTs for the fewest levels has an efficient exact solution. Their FlowMap labels each node with the least depth it can have, using a maximum-flow computation to find the cut that gives it, and covers the network from the outputs. It was the first delay-optimal algorithm for LUT-based FPGAs, and won the IEEE Circuits and Systems Society’s best paper award of 1995.:cite[cong1994] Modern mappers, such as ABC inside Yosys and synth’s, follow the same plan: label for depth, then recover area. They reach the same labels without the max-flow, by keeping a few of the best cuts of every node, *priority cuts*, which is exact whenever the best cut is among them, and almost always is.:cite[mishchenko2007]
:::

:::hood[The truth table of a cut]
synth’s mapper (`crates/synth-logic/src/lutmap.rs`) builds the cuts of a node from those of its two fanins, and with each cut goes the truth table the LUT will hold. Merging two cuts computes it:

```rust
for ca in &self.cuts[na] {
    for cb in &self.cuts[nb] {
        let Some(mut c) = Cut::merge(ca, cb, k) else { continue }; // more than k leaves: not a cut
        let mask = truth_mask(c.len as usize);
        // Each fanin's table over the merged leaves, inverted if its edge is.
        let ta = xor(expand(ca.truth, ca.leaves(), c.leaves()), if a.is_compl() { mask } else { zero });
        let tb = xor(expand(cb.truth, cb.leaves(), c.leaves()), if b.is_compl() { mask } else { zero });
        c.truth = and(and(ta, tb), mask);
        add(&mut cand, c);
    }
}
```

The new node’s leaves are the union of its fanins’ leaves, if there are at most `k`. Each fanin’s table is re-expressed over the combined leaves (`expand` repeats it over the variables it did not depend on), an inverted edge complements it, and since the node is an AND, its table is the bitwise AND of the two. A table over four leaves is a 16-bit number, so the mapper never simulates anything: one `and` is all the logic there is. `add` drops a cut whose leaves contain another cut’s, as dominated, and only the best few are kept, ordered by depth, then area flow.
:::

**Carry chains.** One kind of logic is not left to the mapper. An adder is a chain of full adders, and its structure is recognised in the graph, so that the carry can be sent through the cell’s dedicated carry path of Chapter 28. On a 32-bit adder the difference is large: with the chain it is 32 cells, and the carry crosses them in about 4.6 ns, where a ripple through LUTs and wires would take about 33 (Chapter 28). Short adders go the other way: the counter’s 4-bit increment is put on a chain when it is lowered, and taken off again by the optimiser, because each of its four sums fits in one LUT with all the bits below it. **Block RAM** is inferred in the same spirit: a Weft memory that is read on a clock edge is left out of the graph and given a block of the chip.

## Packing: cells into tiles

The mapped circuit is now a netlist of the iCE40’s primitives: LUTs (`SB_LUT4`), flip-flops of several kinds (`SB_DFF`, `SB_DFFE` with an enable, `SB_DFFESR` with an enable and a reset, …) and carries (`SB_CARRY`). **Packing** turns them into the cells the chip has: each LUT with the flip-flop it feeds and the carry beside it becomes one logic cell (`ICESTORM_LC`); a flip-flop with no LUT before it gets one that passes its input through; every port gets a pad; and the clock is promoted to one of the global networks.

Two rules of Chapter 28 constrain what follows. The eight cells of a tile share their clock, enable and reset, so cells whose flip-flops differ in any of them cannot share a tile. And a carry chain must sit in one column, cell after cell, so a long chain becomes a rigid vertical block that is moved as one. synth leaves the choice of tiles to the placer, which only considers legal ones: the counter’s cells end up in two tiles, as Figure 30.1 showed, and the ALU’s 653 cells (588 LUTs, and 64 more cells that only carry) in 104 tiles of the HX8K, about six cells a tile. Placement moves *units*: a logic cell, a whole carry chain, a pad or a block RAM.

## Placement: simulated annealing

Now every unit must go on a site of its own kind: logic cells in logic tiles, pads on pads, RAMs in RAM columns. The ways to do it are astronomical in number, and what makes one better than another is the length of the wires: a cell far from what it talks to needs a long route, which is slow and uses scarce wires. So the tool estimates each net’s length as the **half-perimeter of its bounding box**, the smallest rectangle containing every cell on it, and tries to make the sum small. A timing term is added, so that nets on the critical path are shortened first.

The algorithm that has done this for chips for forty years is borrowed from a metal-working trade. To make a crystal without flaws, a metallurgist heats the metal and cools it slowly, so that the atoms can shake out of a bad arrangement before they freeze. The computer version, :term[simulated annealing]{id=simulated-annealing}, does the same with blocks. Start with a random placement and a high *temperature* T. Repeat: pick a unit and a random new site, and compute the change Δ in cost. If Δ ≤ 0, the move improves things: do it. If Δ > 0, the move makes things worse, and it is still done with probability e^(−Δ/T). Then cool a little. At high T almost every move is accepted, and the units wander; as T falls, worse moves are accepted less and less; at T = 0 only improvements are.

```quiz
q: 'Why does the annealer sometimes accept a move that makes the placement worse, instead of taking only improvements?'
options:
  - text: To make the run slower, so the result is better.
    why: 'The random moves are not padding. They have a purpose, and it is not to waste time.'
  - text: 'So that it can climb out of a local minimum: an arrangement that no single move improves, but that is far from the best.'
    correct: true
    why: 'A greedy placer stops at the first arrangement none of whose neighbours is better, and a random start makes that a poor one. Accepting an occasional worse move lets the units move over a hill to a better valley. The probability e^(−Δ/T) shrinks as T falls, so the search settles.'
  - text: 'Because the cost function is noisy, and a worse move may in fact be better.'
    why: 'The cost is computed exactly for each move. The randomness is in which moves are tried and which worse ones are accepted, on purpose.'
```

:::history{year=1983 title="Optimization by simulated annealing" people="Scott Kirkpatrick, C. Daniel Gelatt, Mario Vecchi"}
In 1983 three researchers published “Optimization by simulated annealing” in *Science*. The way a physical system cools into a low-energy state, they pointed out, is a way to search for a good solution to a problem with many variables. The acceptance rule, that a worse state is taken with probability e^(−Δ/T), is that of Nicholas Metropolis and colleagues’ simulation of atoms in 1953.:cite[metropolis1953] The paper’s examples were in the physical design of computers: placing circuit elements on chips, and wiring them.:cite[kirkpatrick1983] Annealing became the standard method for placing chips.
:::

synth’s placer follows VPR, the tool of Vaughn Betz and Jonathan Rose that became the reference for FPGA research.:cite[betz1997] The starting temperature is 20 times the standard deviation of the cost over a few hundred random moves; each temperature runs N^(4/3) moves for N units; the cooling factor depends on how many moves were accepted (0.5 if nearly all, 0.95 in the middle, 0.8 near the end); and the distance a unit may jump shrinks as acceptance falls, so late moves are local. The figure replays synth’s placement of the 32-bit ALU on the HX8K.

::fpga-studio{n="30.3" design="alu" views="place" title="Placing the ALU" subtitle="synth’s annealer on an iCE40 HX8K, replayed" caption="Press Play (or drag the scrubber) to watch the annealer. Cells jump wildly while it is hot; as the temperature falls the placement freezes into clusters, and the carry chains, which move as one, settle in columns. The chart under the chip shows the cost and the temperature: the cost hardly falls at first (the annealer is exploring), and then drops quickly in the middle."}

On the ALU the estimated wirelength falls from 20,383 for the random start to 4,689, less than a quarter, over 81 temperatures. A different seed gives a different start and a different end (4,668, or 4,933), and none of them is provably the best: annealing finds a very good placement, not the optimum. The placement takes 1.2 seconds, two thirds of the whole flow.

:::hood[The annealer’s accept rule and its cooling]
The placer is `crates/arch-ice40/src/place.rs` in synth. For every move at a temperature `temp` it applies the move, computes the change `d` of the combined cost, and keeps it if it is an improvement, or with the Metropolis probability if it is not:

```rust
fn decide(&mut self, temp: f64) -> Decision {
    let d = self.delta();
    if d == 0.0 {
        Decision::Free
    } else if d < 0.0 || self.rng.unit() < (-d / temp).exp() {
        Decision::Accepted
    } else {
        Decision::Rejected
    }
}
```

The cost is a weighted sum of the wirelength and a timing term, which weighs each connection by how critical it is, each divided by its current value so that the two count in comparable units. After each temperature the loop looks at the acceptance rate and cools by an amount that depends on it, as VPR does, and shrinks the window (`rlim`) in which units may move:

```rust
temp *= if rate > 0.96 { 0.5 } else if rate > 0.8 { 0.9 } else if rate > 0.15 { 0.95 } else { 0.8 };
rlim = (rlim * (1.0 - 0.44 + rate)).clamp(1.0, self.width.max(self.height) as f64);
iters += 1;
if temp < end || iters > 2000 {
    break;
}
```

It stops when the temperature is below half a per cent of the cost per net, and then makes one more pass at a temperature of almost zero, the “quench”, which accepts only improvements. The random numbers come from a seeded generator, so the same design and seed always give the same placement, on your laptop and in the test suite. Every temperature is recorded, with the position of every cell, and that is what the replay plays.
:::

## Routing: negotiation

With the cells in place, every net must be given a path through the switches of Chapter 28. The chip is modelled as a **routing-resource graph**: a node for every wire and pin, an edge for every switch that can connect two of them, and a delay on each node. Routing a net is finding a tree in this graph from its driver to its sinks. Routing one net is easy: it is a shortest-path search. The difficulty is that a wire carries only one signal, so two nets that want the same wire cannot both have it, and a net that takes the best route may leave another with none.

The first idea is to route the nets one by one, each on the shortest free path, and to rip up and retry when one gets stuck. This depends badly on the order: a net routed first may take the wire a critical net needed. :term[PathFinder]{id=pathfinder} is a better idea. Let every net take whatever it wants, wires shared or not, and then *negotiate*: raise the price of every wire that two nets want, so that the nets for which the wire matters least will go round, and the nets that need it most will keep it.

The price of a wire is the product of three things: its **base cost** (its delay), a **present-sharing** factor that rises with the number of nets using it now, and a **history** factor that has grown for every iteration in which it was contested. The present factor grows over the iterations, so that contested wires become steadily dearer. The history term never falls, so a wire that has been fought over stays unattractive. Only the nets on an overused wire are ripped up and routed again.

```quiz
q: 'In the first iteration of PathFinder every net is routed as if it were alone on the chip. On the 32-bit ALU, about 7,000 routing nodes of the HX8K are then in use. How many are wanted by two nets or more at the end of that iteration?'
options:
  - text: 'None: with hundreds of thousands of nodes on the chip, there is room for everyone.'
    why: 'The chip is not full, but the wires are not spread evenly: nets from the same place, going to the same place, all want the same short wires.'
  - text: 'A few per cent of them: a couple of hundred.'
    correct: true
    why: 'synth finds 232 nodes overused after the first pass, about 3 % of those in use. The number then falls through the iterations, 94, 12 and 0, as the figure shows.'
  - text: 'About half of them.'
    why: 'The shortest paths overlap, but not that much: the chip has other routes of much the same length, and the nets choose among them once the price changes.'
```

:::history{year=1995 title="PathFinder" people="Larry McMurchie, Carl Ebeling"}
Larry McMurchie and Carl Ebeling of the University of Washington presented PathFinder at the FPGA ’95 symposium in Monterey, in February 1995. It is a router that balances routability against speed by *forcing signals to negotiate for a resource*: an iterative algorithm that converges to a state in which every signal is routed, with close to the performance the placement allows.:cite[mcmurchie1995] Negotiated congestion became the basis of the router in VPR, and of many routers since.:cite[betz1997]
:::

::fpga-studio{n="30.4" design="alu" views="route" title="Routing the ALU" subtitle="synth’s router on an iCE40 HX8K, iteration by iteration" caption="The ALU as synth routed it, and the bars of its four iterations: after the first, 232 routing nodes are wanted by two nets or more; after the second 94, the third 12, and the fourth none. Only the nets on an overused node are routed again: 696 in the first iteration, then 288, 108 and 18. Compare with the counter of Figure 30.1, whose eight nets were routed in one iteration with nothing to negotiate."}

The ALU’s first iteration leaves 232 nodes overused, and the router iterates until none is. The count is not a proof of anything, but the *shape* is the thing to notice: a fast fall, then a tail, because the last few conflicts are the hard ones, where two nets each have no good alternative. A larger, fuller design has a longer tail, and one that does not fit has a tail that never reaches zero, which synth detects and reports.

:::hood[The price of a wire]
synth’s router is `crates/synth-route/src/lib.rs`. Each net is routed by an A* search over the graph, which expands the node with the lowest cost so far plus a guess of what remains. The cost of stepping onto a node is the PathFinder price, blended with the delay of the step by the criticality `crit` of the connection being routed:

```rust
let present = 1.0 + pres_fac * h.occupancy() as f32;
let delay = graph.edge_delay[e as usize] * opts.delay_scale;
let ng = g + (1.0 - crit) * h.cost * present + crit * delay;
```

`occupancy` is how many nets use the node now, so `present` is 1 for a free wire and grows for a shared one; `h.cost` is the node’s base cost plus its history. At the end of each iteration, every node that is still overused has its history raised, and the present-sharing factor is multiplied:

```rust
for &k in &overused {
    let h = &mut st.hot[k];
    h.cost += opts.history_factor * (h.occupancy() - 1) as f32;
}
pres_fac = (pres_fac * opts.present_growth).min(1e6); // 0.5, 0.8, 1.28, …: times 1.6 each iteration
```

That is the negotiation: the first iteration has `pres_fac` = 0.5, so sharing is cheap and nets go their own way; by the tenth it is about 34, sharing is nearly forbidden, and the history has taught each net which wires are contested. A connection with criticality near 1 cares almost only about delay, one near 0 almost only about the price, so critical connections keep the fast wires and the others go round.
:::

:::history{year=1997 title="VPR" people="Vaughn Betz, Jonathan Rose"}
In 1997 Vaughn Betz and Jonathan Rose of the University of Toronto published VPR, “Versatile Place and Route”: a packing, placement and routing tool for FPGA research that could target any architecture a researcher could describe, with its source code public.:cite[betz1997] Its placer used simulated annealing, and its router PathFinder. Almost every academic study of FPGA architecture since has used it or its successor, Verilog-to-Routing; synth’s placer follows its schedule, and its router PathFinder’s.
:::

## Timing: the slowest path sets the clock

When the wires are chosen, their delays are known. :term[Static timing analysis]{id=static-timing-analysis} takes them together with the delays of the cells and finds the slowest path, without simulating a single input. It treats the circuit as a graph again, with a delay on every edge, and does two sweeps.

- **Forward:** the *arrival time* at every point is the largest, over all the edges that lead in, of the arrival at the far end plus the delay of the edge. A flip-flop starts a path when the clock ticks, after its clock-to-output delay (0.54 ns on an iCE40 HX); an input pin starts one after the input buffer’s delay.
- **The period:** the largest arrival at any end point, plus what that end point needs, is the smallest clock period the design can run at. Its inverse is the maximum clock frequency, :term[fmax]{id=fmax}. A flip-flop needs its set-up time (0.47 ns); an output pin needs its buffer.
- **Backward:** the *required time* at each point is the latest the signal may arrive without lengthening the period, and the :term[slack]{id=slack} of a connection is required minus arrival. A connection with zero slack is on the :term[critical path]{id=critical-path}; every other has slack to spare.

The counter’s critical path, in Figure 30.1’s Timing, is 1.94 ns: a launch of 0.64 ns from a flip-flop and 1.3 ns of wire to the enable pin of a tile, 514 MHz. The ALU of the RV32I core, with registers on its inputs and output, takes about 10 ns on the HX8K, 100 MHz, and a little under half of it is wire; on a path of LUTs alone, without a carry chain to keep the wires short, the wires would take more than half. That is Chapter 28’s prediction: wires are the delay.

The figure is a timing graph small enough to see whole, with the iCE40’s delays for its cells, analysed by the same two sweeps. The nets are yours to change.

::slack-explorer{n="30.5" caption="The critical path is drawn thick: FF2 → L2 → L3 → L4 → FF4, 4.76 ns. Click the net n4, which takes 1.1 ns, and drag its delay down to 0.1 ns: the period falls only from 4.76 to 4.56 ns, because the path through L1 was only 0.2 ns behind and is now critical. Then set the target clock period below the slowest path, and watch the slack of the nets go negative."}

:::lab[Chase the critical path]
Use Figure 30.5.

1. Note the critical path and the period (4.76 ns, 210 MHz). Which nets have the smallest positive slack? (n1 and n3, 0.2 ns.)
2. Speed up n4, on the critical path, from 1.1 to 0.1 ns. The period improves by 0.2 ns, not 1.0. Why? Now speed up n1 as well, to 0.1 ns: the period falls again, to 4.06 ns, and the critical path has moved to the branch that starts at FF1 (n0). *Fixing the worst path only helps until another takes over*: this is why the timing-driven placer and router give every connection a criticality, not only those on the current worst path.
3. Restore the delays and set the target clock period to 4.5 ns, below the slowest path. The worst slack is −0.26 ns, and the failing nets turn red: synth would report that timing is not met, and the design would have to be improved, or the clock slowed.
4. Restore the delays, and slow n0 to 2.5 ns. Which path is critical now, and how long is it? (FF1 → L1 → L3 → L4 → FF4, 6.16 ns.)
:::

## The bitstream, and running it

Everything decided so far is now written down as bits. synth’s bitstream generator (`crates/arch-ice40/src/bitgen.rs`) gives each cell its LUT table and flags, each switch on a route the bits that close it, and each pad and block RAM its settings. One detail: the router may connect a net to *any* of a LUT’s four pins, since they are interchangeable, so the table is permuted to match the pins it chose. synth permuted the inputs of all six of the counter’s cells, and of 500 of the ALU’s 653; the tables in the Bits view are the permuted ones.

The counter’s file is 32,216 bytes, because the whole chip is configured, used or not: a header, the four banks of configuration memory, the contents of the block RAMs (all zero here), and a CRC of the whole. Of its 175,872 configuration bits, 706 are set.

Now the most important step. The tools have worked on a *model* of the chip; what is loaded onto the device is the bits. So when you step the clock on the studio’s board it does not run the source, or the placed netlist. synth decodes the bitstream, as Chapter 28’s under-the-hood box describes, into a circuit of logic cells and pads, and runs *that*. The figure below runs it beside synth’s simulation of the Weft source, and compares the two after every clock. When they agree, the whole chain has preserved the meaning of the design: elaboration, graph, mapping, packing, placement, routing, bits. When they do not, something in the chain is wrong, or a bit has been changed.

::corrupt-bits{n="30.6" caption="The counter of Chapter 29, with its enable and clear, as synth built it for a bare HX1K: eight logic cells, and every square one entry of a cell’s table. The two rows on top are the count after each of twenty clocks, on the RTL simulator and on the chip decoded from these bits. Flip an entry and watch them part: a red count is a clock at which the chip disagrees. Faded entries are never read, and flipping them changes nothing. Then choose the second stimulus, which lowers the enable every third cycle, and see which flips it finds and which it loses."}

:::lab[Break the counter, one bit at a time]
Use Figure 30.6.

1. Find `value[0]`, the cell of the lowest bit of the count. Its only input is its own output, so only two of its sixteen entries are ever read, and its table is a NOT. Flip either of them: within a clock or two the chip parts from the source. Flip a faded entry: nothing happens, ever.
2. The eight tables hold 128 bits, of which 48 can be read. With the enable held high, flipping each of the 48 in turn, 38 flips are noticed within twenty clocks. The other ten are all in the three cells that read the enable, in rows where the enable is low or the clear is high: a test that never lowers the enable, or raises the clear, cannot see them.
3. Switch to *enable low every third cycle*. Now 39 are noticed, but not the same 39: some of the ten come to light, and some flips that the first stimulus found are now missed, because with the enable lowered the count no longer reaches 15 in twenty clocks, and `wrapped` is never 1. Seven flips escape both stimuli: four are in rows with the clear high, which neither raises, and the other three are read only in states that neither reaches, or change nothing that the outputs show in twenty clocks. Testing a design is an argument about which rows of which tables are reached, as in the coverage of a software test.
4. Restore, then press *Invert* on the table of `value[1]`. Now the chip counts 3, 6, 5, 4, …: wrong numbers, but definite ones, because every input of every cell is 0 or 1, and an inverted table is just another function.
:::

## One design, three chips

The same counter, as equations, goes into the devices of Chapters 26 and 27. Here is what each tool reports for the 4-bit counter with enable, clear and the `wrapped` output: the course’s fitters for the GAL and the CPLD, and synth for the iCE40, as in Figure 30.6. The tools report different quantities, and the delay models are different, so the table compares the resources and not the speeds.

| | GAL22V10 | vCPLD-32 | iCE40 HX1K |
|---|---|---|---|
| What is used | 5 of 10 macrocells, 15 product terms | 5 of 32 macrocells, 9 product terms, one function block | 8 of 1,280 logic cells, in two tiles |
| How the counter is built | Every register is a D flip-flop; the highest bit needs 5 product terms (of the 8 its macrocell has) | T flip-flops: every register needs 2 terms | 4 flip-flops, each with the LUT of its next value, and 4 more LUTs for the enable, the clear and `wrapped` |
| Configuration | 53 of 5,808 array fuses connected | 9,024 configuration bits in all | 796 of 175,872 bits set |
| Why the counter fits | Enough registers and terms | T flip-flops make counting cheap | One cell per bit, and a LUT can see all the bits below it |

The GAL’s cost rises with the bit position, because bit *k* of a counter depends on all the lower bits (2, 3, 4 and 5 product terms for the four registers). That is the limit of Chapter 26, and a 16-bit counter cannot fit at all: it needs 16 registers, and its top bit alone 17 terms. The FPGA’s cost is flat: every bit is one LUT with its flip-flop, and the LUT can see the bits below it (in a wider counter, the carry chain brings them). And when a counter grows, the FPGA has more: a 16-bit counter with an enable takes 17 logic cells of the HX1K, one per bit and one to feed its carry chain, and a 1,280-cell chip has room for seventy of them.

## Build it for real

:::real{parts="an iCE40 board (the Nandland Go Board, or an iCEstick, an Alchitry Cu or another board synth knows), a USB cable, synth and openFPGALoader"}
The same counter, on a real iCE40, through synth on the command line, and a comparison with what you saw.

1. Take the counter of Chapter 29 (`counter.weft`) and add a top module that slows it down so that the count is visible. On the Go Board, whose clock is 25 MHz, a 23-bit divider makes a tick about three times a second:

   ```weft title="top.weft"
   /// The counter on the Go Board's LEDs, three counts a second.
   module top(in clk: clock, out led: uint<4>) {
       // 25 MHz / 2^23: a tick about three times a second.
       reg div: uint<23> = 0;
       div := div +% 1;
       inst c = counter(clk: clk, enable: div == 0, clear: false);
       led = c.count;
   }
   ```

2. Build it for the board and program it:

   ```sh
   synth build counter.weft top.weft --top top --board go-board -o top.bin
   synth prog top.bin --board go-board
   ```

   `--board` gives synth the chip (an HX1K in its VQ100 package) and the board’s pins, in which `clk` and `led` are already named. The four LEDs count in binary, about three times a second. (On another board, use its id from `synth init --list`, and the divider for its clock.)

3. Now read synth’s log as you read the studio’s steps, and match each stage of this chapter to a line:

   | This chapter | synth’s log |
   |---|---|
   | Elaboration and synthesis | `lowered: … AND nodes, … flip-flops, … carry chains`, then `optimised: … -> … AND nodes` |
   | LUT mapping (priority cuts, depth first, then area) | `first mapping: … LUTs, delay … LUT levels`, the rounds of recovery, and the count of `SB_LUT4`, `SB_DFF…` and `SB_CARRY` cells |
   | Packing | `packed: … ICESTORM_LC, … SB_GB, … SB_IO` |
   | Placement | `placement: … units, … nets, wirelength … -> … in … temperature steps` |
   | Routing | `routing: … nets, … wires used, … iterations` |
   | Timing analysis | `clock clk: … ns, … MHz (target 25.0 MHz met)`, and the critical path, cell by cell |
   | Bitstream | `top.bin`, which `synth unpack top.bin top.asc` turns into IceStorm’s text format |
   | Running the bits | `synth prog` runs openFPGALoader, which writes them to the board’s flash; the chip loads them at power-up |

   The divider is a 23-bit counter, so this design is larger than Figure 30.1’s: about 36 logic cells, with a carry chain for the divider, and it runs at around 180 MHz, seven times the board’s clock.

4. Build it again with `--seed 2`, `--seed 3` and so on, and `--tries 1` (by default synth places with four seeds and keeps the best), and read the frequency each time. It moves by several per cent with each seed: the counter of Figure 30.1 ranges from about 390 to 590 MHz over five seeds. That is the variation randomness in placement gives, and the reason timing must be checked on the final run.

If you have the open-source flow installed, build the same design with it (`yosys` with `synth_ice40`, `nextpnr-ice40`, `icepack`; synth can write the Verilog it needs with `synth elab --verilog`) and compare the counts. The stages are the same, and the numbers will be close but not equal: different mappers, placers and routers make different choices, and that is the point.
:::

:::history{year=2015 title="Project IceStorm" people="Clifford Wolf, Mathias Lasser"}
For most of the history of FPGAs, the bitstream was a secret: the vendor’s own software was the only way to turn a design into one, and the tools could be neither studied nor improved. In 2015 Clifford Wolf and Mathias Lasser published Project IceStorm, a reverse-engineered documentation of the bitstream of the Lattice iCE40, with tools to read and write it.:cite[icestorm-eetimes] That made the iCE40 the first FPGA family with a documented bitstream and a free toolchain: Yosys, Wolf’s synthesis suite (described in 2013),:cite[wolf2013] for synthesis and mapping; IceStorm for the bitstream; and, from 2018, nextpnr, a portable place-and-route tool by David Shah and others.:cite[shah2019] The same approach has since been applied to other families: a design can now be traced, with open tools and an open format, all the way to the wires and switches of a real chip. synth’s database of the iCE40, every tile, wire, switch and bit of this chapter, is built from IceStorm’s.
:::

## Exercises

```quiz
q: 'The technology mapper of this chapter is “depth-optimal”. What does that guarantee?'
options:
  - text: 'That the circuit uses the fewest LUTs possible.'
    why: 'Area is recovered afterwards, and only without lengthening the deepest path. Depth comes first.'
  - text: 'That for the graph it is given, no cover has fewer levels of LUTs on any output.'
    correct: true
    why: 'The labelling gives the least depth each node can have. But only for the graph as given: balance the graph first (Figure 30.2, the 8-input AND) and the optimum for it may be lower.'
  - text: 'That the circuit is the fastest possible on the chip.'
    why: 'Levels of LUTs are only part of the delay. The wires between them, and the placement, matter as much: nearly half of the ALU’s critical path is wire.'
```

```quiz
q: 'A placement puts two blocks that share a net at opposite corners of the chip. Which stage is most likely to complain?'
options:
  - text: 'Packing, because they are in different tiles.'
    why: 'Packing happens before there is any geography. It decides which cells share a tile, not where the tiles go.'
  - text: 'The router or the timing analysis: a long net is slow, and needs the scarce long wires.'
    correct: true
    why: 'A net across the chip needs several long wires, competing with other long nets, and its delay is on some path. The placer avoids it by minimising wirelength and by weighting critical connections more; if it fails, the router or the timing report shows it.'
  - text: 'The bitstream generator, because the bits are too far apart.'
    why: 'Bits have no geography. A route across the chip is just more select bits set.'
```

```quiz
q: 'PathFinder’s history factor never decreases. What would go wrong if it were forgotten at the end of every iteration?'
options:
  - text: 'Nothing: the present-sharing factor already makes contested wires expensive.'
    why: 'The present-sharing factor looks only at the current iteration. A wire that was contested and then abandoned looks free again.'
  - text: 'Two nets could keep swapping a wire, each leaving it when it is crowded and returning when it is free, and never settle.'
    correct: true
    why: 'This is the oscillation the history term prevents: a wire that has been contested many times stays dear, so nets that once fought over it look for another way, and the negotiation converges.'
  - text: 'The router would run out of memory.'
    why: 'The history costs one number per node, and forgetting it would save memory rather than cost it.'
```

```parsons
title: 'A design becomes a bitstream'
prompt: 'Put the stages of the toolchain in the order in which they run.'
lines:
  - 'Synthesis: the netlist becomes a graph of ANDs and inverters, simplified and balanced.'
  - 'Technology mapping: the graph is cut into LUTs of at most four inputs.'
  - 'Packing: the LUTs and flip-flops are grouped into tiles of eight cells.'
  - 'Placement: every tile and pad is given a place on the chip, by annealing.'
  - 'Routing: every net is given a path through the switches, by negotiation.'
  - 'Timing analysis: the slowest path, and so the fastest clock, is found.'
  - 'Bitstream generation: the LUT tables, routing selects and flags are written as bits.'
distractors:
  - 'Placement: each LUT is given a truth table.'
  - 'Routing: the flip-flops are given their initial values.'
```

```bug
title: 'Reading a timing report'
prompt: 'A designer reads the report of a fitted design and reasons about it. Click the first line that is wrong.'
lines:
  - 'The report says the critical path is 8.0 ns, so fmax is 125 MHz.'
  - 'The path goes through four LUTs of 0.5 ns each (2.0 ns), and the flip-flops’ clock-to-output and set-up take 0.5 ns in all.'
  - 'The remaining 5.5 ns is in nets, so the wires are more than two thirds of the delay.'
  - 'Making the LUTs twice as fast, 0.25 ns each, would therefore make the design about twice as fast overall.'
wrong: 3
why: 'Halving 2.0 ns of logic saves 1.0 ns, and the path becomes 7.0 ns: a gain of 14 %, not 100 %. It is the nets that dominate. (And if the wires were sped up instead, another path might take over, as Figure 30.5 showed.)'
notes:
  '0': 'Correct: 1000 ÷ 8.0 = 125 MHz.'
  '1': 'Four LUTs of 0.5 ns is 2.0 ns, and 2.0 + 0.5 = 2.5 ns of the path is not wire.'
  '2': 'Correct: 8.0 − 2.5 = 5.5 ns of wire, 69 %.'
```

:::challenge[Fmax by hand]
A path starts at a flip-flop (clock-to-output 0.3 ns), goes over a net of 0.4 ns to a LUT (0.5 ns), over a net of 0.9 ns to a second LUT (0.5 ns), over a net of 0.4 ns to a third LUT (0.5 ns), and over a last net of 0.4 ns to a flip-flop whose set-up time is 0.2 ns. What is the period, and the fmax? If the mapper could merge the second and third LUTs into one (the two of them depend on only four signals in all), and the net between them disappears, what is the new fmax?

*Answer.* 0.3 + 0.4 + 0.5 + 0.9 + 0.5 + 0.4 + 0.5 + 0.4 + 0.2 = 4.1 ns, and 1000 ÷ 4.1 = 244 MHz. With the merge, the net between the second and third LUTs (0.4 ns) and one LUT (0.5 ns) vanish, and the merged LUT still takes 0.5 ns: 0.3 + 0.4 + 0.5 + 0.9 + 0.5 + 0.4 + 0.2 = 3.2 ns, 312.5 MHz. A quarter faster, from one fewer LUT in the path: this is why the mapper minimises depth first, and why a LUT’s delay does not depend on what it holds.
:::

Two more on the tools’ own numbers.

```quiz
q: 'synth places the ALU with three different seeds and gets wirelengths of 4,689, 4,668 and 4,933, from random starts between about 20,000 and 22,000. What does that say about simulated annealing?'
options:
  - text: 'That it is broken: a correct placer would always give the same answer.'
    why: 'Each seed is a different random start and a different sequence of moves. Annealing is a search, and two searches end in different places; for the same seed, synth always gives the same placement.'
  - text: 'That it finds very good placements, but not a provable optimum, and that the result depends a little on luck.'
    correct: true
    why: 'All three cut the wirelength to under a quarter of the start, and they differ by about 5 %. That is why synth, by default, places with four seeds and keeps the best timed.'
  - text: 'That the seed with the shortest wirelength will have the highest clock frequency.'
    why: 'Wirelength is only an estimate, and the cost also weighs timing. The fastest design is found by routing and timing each placement, which is what synth does with its tries.'
```

```quiz
q: 'The counter of Figure 30.1 sets 706 of the HX1K’s 175,872 configuration bits. Its bitstream file is 32,216 bytes. Why is the file not about a hundred bytes?'
options:
  - text: 'Because the file is compressed badly.'
    why: 'The iCE40’s format is not compressed at all, and that is not the reason the file is large.'
  - text: 'Because every configuration bit of the chip is written, 0 or 1, and the chip starts from nothing at every power-up.'
    correct: true
    why: 'The configuration memory is SRAM (Chapter 28): it holds nothing until it is loaded, so the file must say what every bit is, used or not. 175,872 bits are 21,984 bytes, and the block RAMs’ contents, 8,192 bytes more, account for most of the rest.'
  - text: 'Because the routing of six cells needs thousands of switches.'
    why: 'The counter’s eight nets use 45 wires. Most of the file is bits that are 0.'
```

## What’s next

You have followed a design the whole way, from a netlist through a graph of ANDs, LUTs, logic cells, a placement, a routing and a timing report to the bits that a chip runs. Every step was one of a few classic algorithms, the same on the 32-bit ALU as on the counter, only slower. Chapter 31 uses all of it at once. It puts the Octet processor you built, and an RV32I core, a real instruction set that real compilers target, onto an iCE40; it runs programs on the chip decoded from its bits, in the browser; and it sends the same bitstreams to a real board, where the LEDs blink and the UART prints.
