---
number: 5
title: 'CMOS logic: the inverter and its family'
summary: 'Complementary pairs, the voltage transfer curve, noise margins, and gates built from switches in series and parallel.'
duration: 60 minutes
prerequisites: [mosfet]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: A CMOS inverter sits with its input at 0 V, its output steady at V_DD. How much current flows from the supply through it?
options:
  - text: Almost none, only leakage.
    correct: true
    why: 'With the input low, the nMOS is off, so there is no path from V_DD to ground; the pMOS is on but carries no current because nothing draws any. A CMOS gate draws current only while it switches (and a little leakage).'
  - text: A steady current set by the pMOS.
    why: 'The pMOS is on, but current needs a complete path, and the nMOS below it is off.'
  - text: Half the on-current, because the two transistors share it.
    why: 'That is what happens only during the brief moment when the input is near the middle and both transistors are partly on.'
```

```answer
id: cmos/check-nand3
title: Counting transistors
prompt: How many transistors does a static CMOS three-input NAND gate use?
answer: 6
why: 'Three nMOS in series pull the output down only when all three inputs are 1; three pMOS in parallel pull it up when any input is 0. One nMOS and one pMOS per input.'
```
:::

Two transistors, one of each kind, make the most important circuit in digital electronics. Drag the input below from 0 to the supply voltage.

::inverter-lab

When the input is low, the pMOS is on and the nMOS off: the output is connected to the supply, and sits at $V_{DD}$. When the input is high, the roles swap and the output sits at ground. In between there is a narrow region where both conduct and the output swings steeply from high to low. Look at the current: it is zero at both ends and spikes only in the middle. This circuit, the **CMOS inverter**, turns a 0 into a 1 and a 1 into a 0, and while it holds either value it draws essentially no power.

## Two switches, opposite

Chapter 4 ended with two kinds of transistor. Seen as switches:

- an **nMOS** transistor conducts when its gate is high (at $V_{DD}$, logic 1) and is open when it is low;
- a **pMOS** transistor conducts when its gate is low (logic 0) and is open when it is high.

The nMOS is good at pulling a node down to ground: with its source at ground, its gate-source voltage stays large all the way. It is poor at pulling up: as its source rises towards $V_{DD}$, its gate-source voltage shrinks, and it stops one threshold short. The pMOS is the mirror image. So CMOS uses each for what it does well: nMOS transistors between the output and ground, pMOS transistors between the supply and the output. "CMOS" stands for complementary MOS.

Before CMOS, logic chips were made of nMOS transistors alone, with a resistor-like transistor as the pull-up. Whenever such a gate's output was low, current flowed through the pull-up into the pulled-down nMOS, all the time. By the late 1970s chips with tens of thousands of gates were drawing watts doing nothing at all.

:::history{year=1963 title="Nanowatt logic" people="Frank Wanlass, Chih-Tang Sah"}
At Fairchild Semiconductor in 1963, Frank Wanlass and Chih-Tang Sah presented a logic gate made of a p-channel and an n-channel MOS transistor in series, which in either state drew only nanowatts.:cite[wanlass1963] It was slower and harder to make than its rivals, and for fifteen years it was used mostly where power mattered above all, in watches and early calculators. When chips grew to hundreds of thousands of transistors, it became the only way to keep them cool, and through the 1980s CMOS took over nearly everything.
:::

## The transfer curve

The **voltage transfer curve**, output against input, is the inverter's character sheet. Three features matter.

**The switching threshold** $V_M$ is where the curve crosses the diagonal, $V_{out} = V_{in}$. There both transistors are in saturation and carry the same current. Because holes are less mobile, a pMOS of the same width as the nMOS is weaker, and $V_M$ sits below the middle: try a width ratio of 1. The course's standard inverter makes its pMOS 2.5 times wider, which centres $V_M$ at $V_{DD}/2$.

**The gain** is the steepness in the middle. A small change of input there makes a much larger change of output, because both transistors are in saturation, behaving as current sources fighting over the output node.

**The noise margins** come from the two points where the slope is exactly −1, called $V_{IL}$ and $V_{IH}$. Any input below $V_{IL}$ is treated as a clean 0, any input above $V_{IH}$ as a clean 1. The **noise margins** are how far a gate's output can be corrupted, by coupling from neighbouring wires, by voltage drops on the supply, before the next gate misreads it:

$$
NM_L = V_{IL} - V_{OL}, \qquad NM_H = V_{OH} - V_{IH},
$$

where $V_{OL}$ and $V_{OH}$ are the outputs at those points. For the course's inverter at 1 V, both are about 0.44 V.

:::key
Gain is what makes digital logic digital. Each gate takes a slightly corrupted 0 or 1 and puts out a clean one, because its transfer curve is flat near the rails and steep in the middle. Noise does not accumulate along a chain of gates, however long; it is removed at every stage.
:::

:::software[Re-quantised at every step]
A long chain of analogue amplifiers adds noise at every stage, like copying a tape of a tape. A chain of logic gates does not, because each gate re-quantises: anything within the noise margin snaps back to an exact 0 or 1. It is the same reason a file can be copied a billion times without degrading, and why software can treat a bit as a bit, never thinking about the volts underneath.
:::

```answer
id: cmos/weak-pmos
title: An unbalanced inverter
prompt: 'Use the widget at V_DD = 1.0 V. Set the pMOS to the same width as the nMOS (ratio 1.0). What is the switching threshold V_M, in volts? (Two decimal places.)'
answer: 0.47
tolerance: 0.01
unit: V
why: 'About 0.47 V. The weaker pMOS needs more help, a lower input, to match the nMOS, so the curve shifts to the left. The noise margin for a low input shrinks and the one for a high input grows.'
```

## Gates from switches

An inverter has one input. Put several transistors in each half and you get gates with more inputs. The rule is simple: build a **pull-down network** of nMOS transistors that conducts exactly when the output should be 0, and a **pull-up network** of pMOS transistors that conducts exactly when it should be 1. For every input combination exactly one of the two networks conducts, so the output is always driven, and there is never a path straight from supply to ground.

Transistors in **series** conduct only if all of them do: AND. Transistors in **parallel** conduct if any does: OR. A two-input NAND gate, whose output is 0 only when both inputs are 1, has two nMOS in series in its pull-down. Its pull-up must conduct whenever the pull-down does not: when either input is 0. That is two pMOS in parallel. The pull-up is always the **dual** of the pull-down: series and parallel swapped. Because nMOS conduct on 1 and pMOS on 0, the dual conducts exactly when the original does not.

Write the pull-down for each target below. The pull-up is derived and drawn for you; toggle the inputs to watch which transistors conduct.

::gate-builder

```quiz
q: Can a single static CMOS stage (one pull-up and one pull-down network, as above) compute AND, Y = A·B?
options:
  - text: No; a static CMOS stage can only invert.
    correct: true
    why: 'Raising any input can only turn nMOS on and pMOS off, which can only pull the output down. So the output of a single stage never rises when an input rises: it is an inverting (more precisely, negative unate) function. AND is built as NAND followed by an inverter, which is why libraries are full of NAND, NOR, AOI and OAI gates.'
  - text: Yes, with two pMOS in series in the pull-down network.
    why: 'pMOS transistors pass a 0 poorly: a pMOS pulling down stops one threshold above ground. Static CMOS keeps nMOS in the pull-down and pMOS in the pull-up for exactly that reason.'
  - text: Yes, with the nMOS in parallel and the pMOS in series.
    why: 'That is a NOR gate, whose output is ¬(A + B), not A·B.'
```

```quiz
q: A NAND2 and a NOR2 are built with the same transistor sizes. Which is slower to pull its output high, and why?
options:
  - text: The NOR2, because its two pMOS are in series and pMOS are already the weaker kind.
    correct: true
    why: 'Two transistors in series pass about half the current of one. In a NOR the series stack is in the pull-up, made of slow pMOS; in a NAND it is in the pull-down, made of fast nMOS. That is why designers prefer NAND-based logic, and why gates with long stacks are made with wider transistors.'
  - text: The NAND2, because its two nMOS are in series.
    why: 'The NAND’s series stack is in the pull-down. Its pull-up is two pMOS in parallel, which is strong.'
  - text: Neither; both have four transistors.
    why: 'Transistor count is the same, but where the series stack sits differs, and that sets the speed.'
```

## Compound gates

Nothing limits the networks to a single AND or OR. The pull-down $A\cdot B + C$ (two nMOS in series, in parallel with a third) gives $Y = \overline{A\cdot B + C}$: an **AND-OR-INVERT** gate, AOI21, in six transistors. Building the same function from a NAND2 and a NOR2 would take eight transistors and two gate delays. Compound gates like AOI21, OAI21 and AOI22 are where much of a chip's logic ends up after synthesis (chapter 10).

The cost is in the stacks. Every transistor in a series chain adds resistance, and a stack of four is slow, so in practice gates have at most three or four inputs and the transistors in long stacks are made wider. The widget counts the stacks for you.

:::fab[A standard-cell library]
Chip designers do not draw gates transistor by transistor. A foundry and its partners supply a **standard-cell library**: hundreds of gates (inverters, NANDs, NORs, AOIs, OAIs, multiplexers, adders, flip-flops), each in several strengths, each drawn once as a layout of fixed height so that cells abut in rows and share their supply rails. The library comes with measured timing, power and area for every cell. Chapters 10 and 11 build a design out of such a library.
:::

## Summary

- An nMOS conducts on 1 and pulls down well; a pMOS conducts on 0 and pulls up well. CMOS puts nMOS between output and ground and pMOS between supply and output.
- The inverter's transfer curve has a switching threshold $V_M$ (centred by making the pMOS wider), a steep middle, and noise margins from its slope −1 points. Gain restores logic levels at every gate.
- A static CMOS gate is a pull-down network of nMOS and its dual pull-up network of pMOS: series is AND, parallel is OR, and the gate inverts. It draws power only while switching.
- Compound gates (AOI, OAI) compute more per stage; series stacks make them slower.
