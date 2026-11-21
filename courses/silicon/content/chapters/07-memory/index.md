---
number: 7
title: 'Memory: latches, flip-flops and SRAM'
summary: 'Two inverters in a loop hold a bit; a clock keeps state orderly; six transistors make a cache cell, and one makes DRAM.'
duration: 75 minutes
prerequisites: [speed-power]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: What is the difference between a latch and a flip-flop?
options:
  - text: A latch passes its input through while its clock is high and holds when it is low; a flip-flop samples its input only at the clock’s edge.
    correct: true
    why: 'A latch is level-sensitive (transparent for half the cycle); a flip-flop, usually two latches back to back, is edge-triggered. Flip-flops make it easy to reason about a design as one step per clock cycle.'
  - text: A latch holds one bit and a flip-flop holds several.
    why: 'Both hold one bit; a register is a row of flip-flops.'
  - text: A flip-flop needs a clock and a latch does not.
    why: 'The clocked latches used in logic have an enable (a clock) too; what differs is when they listen to their input.'
```

```answer
id: memory/check-sram
title: Transistors in a cache
prompt: 'An SRAM of 1 MiB (2²⁰ bytes) uses six-transistor cells. How many millions of transistors are in its cells? (One decimal place.)'
answer: 50.3
tolerance: 0.1
why: '2²⁰ bytes × 8 bits × 6 transistors = 50 331 648, about 50.3 million, before counting the decoders, sense amplifiers and write drivers around the array.'
```
:::

Here are two inverters, each driving the other's input. Call the nodes X and Y. The square shows every possible pair of voltages; click anywhere in it to start the pair there and watch where it goes.

::latch-loop

Almost every starting point ends in one of two corners: X high and Y low, or X low and Y high. Those are the only places where each inverter's output agrees with the other's input, so once there, the loop holds itself in place for as long as the power is on. It remembers one bit. Start very near the middle, though, on the dashed diagonal, and the pair hesitates before falling; start exactly on it and, in this ideal model, it never decides. This chapter is about using that loop to store state, and about the hesitation.

## A loop that remembers

Each inverter's curve is drawn in the square: inverter 1 gives X as a function of Y (blue), inverter 2 gives Y as a function of X (red). The loop is consistent only where the two curves cross. They cross three times: at the two corners, which are **stable** (a small disturbance is pushed back), and at the middle, the **balance point**, which is not (a small disturbance is amplified until the loop falls into a corner).

What makes the corners stable is gain. Near the middle each inverter turns a small change into a bigger one, and around the loop the change is multiplied twice; near the corners the curves are flat, so a disturbance there is squeezed out. Lower the gain below about 2 in the widget and the loop's decisions become sluggish; with no gain at all there would be no memory. This is positive feedback, the opposite of the negative feedback in a thermostat.

How long does the loop take to decide? Near the balance point, the difference between X and Y grows exponentially, multiplying by $e$ every $\tau/(g-1)$, where $g$ is the inverter's gain and $\tau$ its time constant. So the time to settle grows with the logarithm of how close to the middle the loop starts: every factor of ten closer adds the same $\tau \ln 10/(g - 1)$. The right-hand plot shows it as a straight line on a logarithmic axis.

:::key
Two inverters in a loop have two stable states and one unstable balance point between them. That is a stored bit. Starting near the balance point, the loop eventually falls one way or the other, but the time it takes is unbounded: it grows with the logarithm of the starting distance from the middle.
:::

## Latches and flip-flops

A memory that cannot be written is not much use. A **D latch** adds a way in: a switch (a multiplexer of transistors) that, while its clock input is high, connects the loop's node to an input D, so that the node follows D; when the clock goes low, the switch disconnects D and closes the loop, and the latch holds the last value it saw. The latch is **transparent** while its clock is high.

Transparency is awkward. If a latch's output feeds logic that feeds back to its own input, a value can race round the loop several times while the clock is high. The fix is to put two latches back to back with opposite clocks: the first (the master) is transparent while the clock is low, the second (the slave) while it is high. At the moment the clock rises, the master closes, holding whatever D was just before the edge, and the slave opens to pass that value out. That pair is a **D flip-flop**: it samples its input at the clock's rising edge and holds the result for a whole cycle. A row of flip-flops sharing a clock is a **register**.

Registers make **synchronous design** possible. All the state of a design lives in flip-flops clocked together. Between them is combinational logic, gates with no loops, which computes each register's next value from the current state and the inputs. At every clock edge, all the registers take their next values at once. The clock period must be long enough for the slowest path through the logic to settle before the next edge; chapter 12 checks exactly that.

:::software[One step per clock]
A synchronous design is a state machine with an update function: `state = next(state, inputs)`, once per clock edge, all fields at once, as in a double-buffered game loop or a reducer that returns a new state rather than mutating the old one. The combinational logic is the pure function `next`; the flip-flops are the variables. Part III describes hardware in exactly these terms.
:::

## Setup, hold and metastability

A flip-flop samples its input at the edge, but not in an instant. The data must be steady for a short **setup time** before the edge and a short **hold time** after it, so that the master latch closes on a clean value. Drag the moment D changes in the widget below, and watch what happens inside the window.

::flip-flop-timing

Change D inside the window and the master latch closes while its loop is somewhere near its balance point: the loop of the first widget, started near the middle. The output hangs between 0 and 1 and takes longer to settle, or even goes the wrong way. This is **metastability**. Within a synchronous design it is prevented by timing: every path is checked so that data always arrives before the setup time (chapter 12).

But some inputs cannot be timed: a button press, a packet arriving from another chip, a signal from a part of the chip running on a different clock. Sooner or later one of them changes inside the window. The defence is a **synchroniser**: two or more flip-flops in a row, so that a first flip-flop that goes metastable has a whole extra clock cycle to resolve before anything uses its output. Because the settling time is logarithmic, the chance of still being undecided falls exponentially with the time allowed. In the widget, at 4 GHz, a single flip-flop sampling a signal that toggles at 100 MHz fails about once an hour; with two in a row, the expected time between failures exceeds the age of the universe.

```answer
id: memory/mtbf
title: One flip-flop or two?
prompt: 'Use the widget. Set the clock to 4 GHz and the input to 100 MHz. Roughly how many minutes, on average, between failures of a single flip-flop? (Within ten minutes is fine.)'
answer: 54
tolerance: 10
unit: minutes
why: 'About 3 200 seconds, under an hour. The resolution time available is the clock period minus the clock-to-Q delay and the setup time, 195 ps, only about 24 time constants of the latch. A second flip-flop adds a whole period, 250 ps more, and multiplies the time between failures by e^(250/8) ≈ 4 × 10¹³.'
```

## SRAM: a cell of six transistors

A flip-flop holds a bit with about twenty transistors, and it is needed wherever logic computes. For storing many bits, as in a processor's caches, the loop is cut to the bone: the **six-transistor SRAM cell**. Two cross-coupled inverters (four transistors) hold the bit as Q and its complement Q̄; two **access transistors**, controlled by a **word line**, connect Q and Q̄ to a pair of **bitlines**. Cells are tiled in a grid: each row shares a word line, each column a pair of bitlines.

**To read** a row, both bitlines of every column are first charged to $V_{DD}$ and left floating; then the word line rises. On the side storing 0, the access transistor and the cell's pull-down form a path from the bitline to ground, and the bitline slowly sinks. A **sense amplifier** at the bottom of the column, itself a pair of cross-coupled inverters released at the right moment, turns the first few tens of millivolts of difference into a full 0 or 1.

**To write**, drivers force one bitline to 0 and the other to 1, and the word line rises. The access transistor on the 0 side must overpower the cell's pull-up and drag Q low enough for the loop to flip.

The two operations pull in opposite directions. During a read, current flowing in through the access transistor raises the node holding 0 a little. If the pull-down is too weak relative to the access transistor (a low **cell ratio**), that bump can reach the other inverter's switching point and flip the cell: the read destroys the data. During a write, the access transistor must beat the pull-up, so the pull-up must be weak. Real transistors also vary randomly, a few tens of millivolts in threshold from one to the next (chapter 2's dopant counting is one cause), and among billions of cells some are unlucky. Try it:

::sram-lab

```answer
id: memory/cell-ratio
title: Sizing for variation
prompt: 'In the widget, set the threshold variation to 250 mV and read the stored 0. What is the smallest cell ratio (to one decimal place) at which the read no longer upsets the cell?'
answer: 1.6
tolerance: 0.05
why: 'With 250 mV of worst-case variation, the cell needs a pull-down 1.6 times as strong as the access transistor. Without variation, even a ratio of 0.2 survives in this model. Real SRAM designers size for many standard deviations of variation, because a cache has billions of cells and every one must work.'
```

:::scale[Where the transistors are]
A processor with 32 MB of on-chip cache holds $32 \times 2^{20} \times 8 \approx 2.7 \times 10^8$ bits of SRAM: 1.6 billion transistors in the cells alone. In many processors, cache takes up more area than the cores' logic. The SRAM cell is often the first structure a new process is demonstrated with, and its area, a few hundredths of a square micrometre in the mid-2020s, is a standard measure of a process's density.
:::

## DRAM: one transistor and a capacitor

Main memory needs billions more bits than any cache, at a much lower cost per bit. In 1966 Robert Dennard at IBM saw that a bit could be stored as charge on a capacitor, with a single transistor as its door.:cite[dennard1968] A **DRAM** cell is just that: one access transistor connecting a capacitor to a bitline, under a word line. A charged capacitor is a 1; an empty one is a 0.

Reading it is delicate. The bitline is precharged to half the supply; when the word line rises, the cell's charge is shared with the bitline, whose capacitance is many times larger, and the bitline moves by only

$$
\Delta V = \left(V_\text{cell} - \tfrac{V_{DD}}{2}\right)\frac{C_s}{C_s + C_{BL}},
$$

a few tens of millivolts, which a sense amplifier must resolve. Sharing the charge destroys it, so every read is followed by writing the value back. And the capacitor leaks: through the transistor's subthreshold current and through its junctions. So every cell must be read and rewritten, **refreshed**, every few tens of milliseconds; standard DRAM refreshes every row within 64 ms.

::dram-cell

:::fab[Capacitors standing on end]
A useful DRAM capacitor needs some ten femtofarads, but the cell around it measures only a few tens of nanometres across. The capacitors are therefore built upwards, as tall, thin cylinders of metal coated with a high-permittivity dielectric, many times taller than they are wide. Etching and filling millions of such holes uniformly across a wafer is one of the hardest steps in all of chipmaking (chapter 15).
:::

Neither SRAM nor DRAM survives a power cut. **Flash memory**, in solid-state drives and phones, traps charge in an insulated layer inside a transistor's gate stack, where it stays for years; the stored charge shifts the transistor's threshold, which is read as the bit. Modern flash stacks its cells vertically, in strings more than two hundred layers tall.

:::history{year=1970 title="The 1103" people="Intel"}
Intel's 1103 of 1970 was the first commercially successful DRAM chip: 1 024 bits, three transistors per cell. By 1972 it was the best-selling semiconductor memory chip in the world, and magnetic-core memory, which had stored computers' data since the 1950s, began to disappear. The one-transistor cell took over a few years later.
:::

## Summary

- Two inverters in a loop are bistable: two stable states and an unstable balance point. Near the balance point, the time to decide grows with the logarithm of the distance.
- A D latch adds a switch to write the loop; two latches back to back make an edge-triggered D flip-flop. Synchronous design keeps all state in flip-flops on one clock, with combinational logic between.
- Data must be stable for a setup time before and a hold time after the edge, or the flip-flop may go metastable; signals from other clock domains pass through synchronisers.
- A 6T SRAM cell is two inverters and two access transistors; reading and writing pull its sizing in opposite directions, and variation sets the margins.
- A DRAM cell is one transistor and one capacitor, read by charge sharing, rewritten after every read and refreshed every 64 ms.
