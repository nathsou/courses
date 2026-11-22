---
number: 12
title: 'Timing and sign-off'
summary: 'Static timing analysis, setup and hold, and checking the layout against the design rules and the netlist before tape-out.'
duration: 80 minutes
prerequisites: [physical-design]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: signoff/check-fmax
title: From slack to frequency
prompt: 'At a clock period of 1 ns, the worst setup slack in a design is +600 ps (and nothing else limits it). What is the highest clock frequency it can run at, in GHz?'
answer: 2.5
tolerance: 0.01
unit: GHz
why: 'The slowest path needs 1 000 − 600 = 400 ps, so the period can shrink to 400 ps: 1/0.4 ns = 2.5 GHz.'
```

```quiz
q: A design fails a hold check by 30 ps. Does running it at a slower clock fix the failure?
options:
  - text: No; a hold check compares the earliest arrival with the same clock edge, so the period does not enter it.
    correct: true
    why: 'A hold violation means new data races through a short path and corrupts the value a flip-flop is capturing at the same edge. The period is irrelevant: the fix is to add delay to the short path (or reduce the skew). This is why hold violations found in silicon are so feared.'
  - text: Yes; a slower clock gives every path more time.
    why: 'More time helps the slow paths (setup). A hold failure is a path that is too fast, and slowing the clock does not slow the path.'
  - text: Yes, but only if the clock is slowed by at least 30 ps.
    why: 'The clock period does not appear in the hold check at all.'
```
:::

The counter is synthesised, placed and routed. Will it work at the speed we want? Here is its netlist again, with the latest time, after a clock edge, at which each wire settles. Lower the clock period until something fails, and look at the red path.

::sta-lab

At 300 ps everything meets timing. Somewhere below 250 ps the critical path, from the flip-flop q[0] through a chain of ANDs, an XOR and a multiplexer to the flip-flop q[3], stops settling in time. Click cells on that path to make them bigger and faster, and try to reach 240 ps. Then move the clock skew slider: a late clock at one flip-flop gives some paths more time and takes it from others, and pushed far enough it breaks a check that no clock period can repair.

## Static timing analysis

Simulation can check timing only for the input sequences it is given. **Static timing analysis** (STA) checks every path, without any inputs at all, by treating the netlist as a graph.

1. Every path starts at a **launch point**: a flip-flop's output (whose data appears a clock-to-Q delay after the edge) or a primary input (at its specified arrival time).
2. **Arrival times** propagate forwards: a cell's output arrives at the latest of its inputs' arrival times plus the cell's delay. One pass over the netlist in topological order computes them all.
3. Every path ends at a **capture point**: a flip-flop's input, which must settle a setup time before the next clock edge, or a primary output, by its specified required time. That gives each end point a **required time**.
4. The **slack** is required time minus arrival time. Negative slack is a timing violation. Propagating required times backwards gives every net a slack too, and the path through the most negative slacks is the **critical path**.

STA is linear in the size of the netlist, needs no test vectors, and covers every path. Its weakness is the other side of that: it assumes every path can actually be exercised, and some cannot (a **false path**, logically impossible to sensitise). Designers tell the tool which paths to ignore, carefully, since a wrong exception hides a real failure.

Cell delays come from the library. In this course each cell has an intrinsic delay plus 4 ps for every unit of load it drives, divided by its size. A real library gives each cell's delay as a table, indexed by the input transition time and the output load, measured by circuit simulation of the cell at each of several **corners**: slow transistors at low voltage and high temperature, fast transistors at high voltage and low temperature, and others. A design is signed off only when it meets timing at every corner, with margins for variation across the die.

```answer
id: signoff/fmax
title: The counter's top speed
prompt: 'Use the widget with every cell at size ×1 and no skew. What is the shortest clock period, in picoseconds, at which every end point has non-negative slack?'
answer: 247
tolerance: 0.5
unit: ps
why: '247 ps, about 4.05 GHz with the course’s illustrative library. The worst path runs from q[0] through six cells to the D input of q[3]: 40 ps clock-to-Q, about 182 ps of logic, and 25 ps of setup.'
```

### Setup and hold

The **setup check** asks whether the slowest path is fast enough: data launched at one clock edge must arrive before the next edge, minus the setup time. The fix for a failure is to speed up the path or slow down the clock.

The **hold check** asks whether the fastest path is slow enough: data launched at an edge must not reach the next flip-flop before that flip-flop has finished capturing its previous value at the same edge, a hold time after it. The fix is to add delay to the short path, often by inserting buffers. The clock period does not appear in the hold check at all, so a hold failure found in silicon cannot be fixed by slowing the clock; the chip simply does not work.

**Clock skew** enters both checks. If the capturing flip-flop's clock arrives late, a path into it gains time for setup but must stay stable longer for hold; if the launching flip-flop's clock arrives late, the path loses setup time. Skew can be useful (some tools deliberately skew clocks to borrow time between stages), but it is mostly a hazard. Set the widget's skew to +80 ps and the inputs, which arrive right at the clock edge, race into q[1] before its late clock edge has captured.

:::key
STA computes the latest arrival time (for setup) and the earliest (for hold) at every end point by passing through the netlist once in each direction, with no test vectors. Slack is required minus arrival; the critical path is the chain of worst slacks. Setup failures are fixed by speed or a slower clock; hold failures only by adding delay.
:::

## Timing closure

On a real chip, the first timing report after placement typically shows thousands of failing paths, and **timing closure** is the long process of fixing them: upsizing cells on critical paths (as you just did), inserting buffers to split heavy loads, swapping cells for faster variants with lower thresholds (which leak more, chapter 4), restructuring logic, moving cells closer together, and adjusting the clock tree. Each fix can break something else: in the widget, upsizing a cell makes it faster but loads the cell driving it. Late changes are made as small, surgical edits to the netlist, called **engineering change orders**, each checked again by equivalence checking and STA.

## Physical verification

Before the layout goes to the fab it must pass two more checks.

**Design-rule checking** (DRC) compares every polygon against the fab's **design rules**: minimum widths, minimum spacings, how far one layer must extend beyond or enclose another, and many more. The rules encode what the fab can reliably manufacture. A line drawn thinner than the minimum may print broken; two shapes drawn closer than the minimum may print merged. A leading-edge process has thousands of rules, many depending on the surroundings.

**Layout versus schematic** (LVS) extracts a circuit from the polygons, recognising a transistor wherever poly crosses active, following conductors through contacts and vias, and compares it with the netlist. A layout can satisfy every design rule and still be the wrong circuit: a missing contact, a wire touching the wrong one.

Here is the inverter of chapter 5, drawn in the five basic layers: the **n-well** where the pMOS lives, **active** (the regions where transistors and their sources and drains go), **poly** (the gate), **contacts**, and **metal 1**. Its rules are a simplified version of Mead and Conway's, in units of λ.:cite[mead1980] Four errors have crept in. Fix them.

::layout-editor

:::software[A linter that can stop the release]
DRC is a linter with no warnings, only errors: a single violation blocks tape-out (or needs an explicit waiver, negotiated with the fab). LVS is like checking that a binary was really built from the source it claims, a reproducible build for hardware. STA is worst-case execution-time analysis, done for every path, at every corner, on every change.
:::

## Sign-off and tape-out

The last checks are run on the layout itself. **Parasitic extraction** computes the resistance and capacitance of every wire from its geometry, and STA is rerun with those values. **Power analysis** checks that the supply grid delivers current without too much voltage drop, and that no wire carries so much current that its atoms are slowly pushed along by the electrons (**electromigration**) until it breaks. Further rules check that the metal density is uniform enough for polishing (chapter 15) and that long wires connected to gates do not collect enough charge during plasma etching to damage the gate oxide (**antenna rules**).

When everything passes, the layout is **taped out**: written to a file of polygons, layer by layer, and sent to the fab. The name survives from the days when the file went on magnetic tape; the file format most widely used for decades, GDSII, dates from the late 1970s. A modern chip's layout runs to many billions of polygons. At the fab the file is turned into masks, one per patterning step, after more processing of its own (chapter 14).

:::history{year=1971 title="Drawn by hand" people="Federico Faggin and colleagues"}
The Intel 4004, the first commercial microprocessor, had about 2 300 transistors. Its layout was drawn by hand, at hundreds of times its final size, and checked by eye; the masks were made from patterns cut by hand in rubylith film. Within a decade designs of tens of thousands of transistors made that impossible, and design-rule checking, extraction and layout tools became the first great industry of electronic design automation.
:::

## Summary

- STA checks every path without vectors: arrival times forwards, required times backwards, slack between them, at every process, voltage and temperature corner.
- The setup check (slow paths) is fixed by speed or a slower clock; the hold check (fast paths) only by adding delay. Skew shifts time between paths.
- Timing closure sizes, buffers and restructures until every path meets timing.
- DRC checks the polygons against the fab's rules; LVS checks that they form the intended circuit; extraction, power and reliability checks follow. Then the layout is taped out as a file of polygons.
