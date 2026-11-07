---
number: 10
title: Computing with anything
summary: 'Marbles, water, air and rods: what any material needs in order to compute.'
duration: 55 minutes
prerequisites: [z1]
---

:::check
```answer
id: computing-with-anything/check-1
title: Counting marbles
prompt: 'A column of five toggles counts marbles in binary, the top toggle being the 1s bit. All start at 0. After 13 marbles, what do the toggles show, read from the bottom (16s) to the top (1s)?'
answer: ['01101', '1101']
why: '13 = 8 + 4 + 1 = 01101 in five bits.'
```
:::

Gears, drums, wheels, plates and pins: every machine in this course so far has been made of metal parts that push each other. But nothing in the idea of computing says what a computer must be made of. Here is one made of marbles. Drop some in.

::marble-counter

Each toggle is a flap with two positions. A marble that finds a toggle at 0 flips it to 1 and rolls away; one that finds it at 1 flips it to 0 and falls to the next toggle. That is binary counting with a ripple carry, the Pascaline's carry once more, done by gravity and plastic. Toy marble computers built on exactly this principle have been sold since the 1960s, and they can add and multiply.

```answer
id: computing-with-anything/carry-through
title: A long carry
prompt: 'Starting from all zeros, how many toggles does the 16th marble flip?'
answer: 5
why: 'After 15 marbles the toggles read 01111. The 16th flips the four 1s to 0 (each passing the marble on) and the fifth toggle from 0 to 1: five flips, giving 10000.'
```

## What a computer needs

If marbles can count, what can't compute? Looking back over the machines in this course, every working computer has had the same handful of ingredients, whatever it was made of:

1. **State.** Something that holds a value and keeps it: a wheel's position, a plate's, a toggle's, a column of water.
2. **Switching.** One signal must be able to control another: a pin that catches a plate, a toggle that sends a marble left or right, a lever that lifts a pawl.
3. **Composition.** The output of one element must be able to drive the inputs of others, often several (**fan-out**), so that small elements can build large machines.
4. **Gain**, or signal restoration. Every element loses a little, to friction or leakage or slip; something must top the signal back up at each stage, or errors grow until the signal is lost. In a digital machine, each element must also snap its output back to a clean 0 or 1.
5. **Repeatability.** The machine must be able to compute again: it must reset, and its energy must come from a supply, not from its own parts.

| Substrate | State | Switching | Composition, fan-out | Gain | Repeatable |
|---|---|---|---|---|---|
| Gears and wheels | positions | pawls, pins | shafts, limited by friction | the crank or motor, everywhere | yes |
| Marbles | toggle positions | toggles | a marble goes one way at a time: no fan-out without more marbles | gravity, per marble | yes, with a lift |
| Dominoes | standing or fallen | a falling domino tips the next | a line can split | each domino's own energy | no: set them up again by hand |
| Water | levels, flows | valves, floats | pipes split and join | a pump | yes |
| Fluid jets | which wall a jet clings to | control jets | a jet can drive several controls | the supply pressure | yes |
| Relays | contact open or closed | an electromagnet moves a contact | one coil current can drive many contacts | the power supply | yes |

## Water

:::history{year=1949 title="The MONIAC" people="Bill Phillips"}
In 1949 Bill Phillips, a New Zealand engineer turned economics student at the London School of Economics, built a machine of perspex tanks and pipes in which coloured water stood for money: tanks for stocks (savings, taxes, foreign balances), pipes and valves for flows (spending, investment, imports), with floats and slotted plastic curves to make one flow depend on another. Turn a valve to raise taxes and you could watch the water level in "national income" fall. About a dozen were built, for universities and central banks.:cite[phillips1950]
:::

A tank is an integrator: its level is the sum over time of inflow minus outflow. A drain whose outflow grows with the level gives a level that settles, just as an electrical capacitor charging through a resistor, or a cooling cup of tea, settles.

::water-tank

```answer
id: computing-with-anything/tank
title: Where it settles
prompt: 'Water flows in at 9 litres per minute. The drain lets out k × level litres per minute, with k = 1.5. At what level does the tank stop rising or falling?'
answer: 6
why: 'At balance, inflow = outflow: 9 = 1.5 × level, so the level is 6. Phillips’s machine found the balance of an economy the same way, by letting the water settle.'
```

## Air

In 1959 engineers at the US Army's Harry Diamond Laboratories showed that a jet of fluid could be switched by a weaker jet, with no moving parts at all: **fluidics**. A jet blown into a chamber clings to whichever wall it is nearest (the Coandă effect) and stays there, until a puff from a control port pushes it to the other wall, where it stays in turn. That is a flip-flop: one bit, held in a flow.

::fluidic-flip-flop

Fluidic gates were slow (thousands of operations a second at best) and bulky, but they worked where electronics would not: in extreme heat, under radiation, in an explosive atmosphere. Fluidic logic controlled industrial machines, and fluidic elements are still used in some medical devices and sprinkler controls. Small fluidic computers were demonstrated in the 1960s; none could compete with transistors.

:::question
A fluidic gate has gain: a small control jet switches a large supply jet, which can then drive several other gates. Where does the energy for that come from? (Compare it with the torque amplifier of chapter 8.)
:::

## Rods, at the scale of molecules

In 1992 Eric Drexler designed, on paper, a computer made of molecular-scale rods: stiff rods sliding in channels, with knobs that block or allow the motion of rods crossing them, a nanometre-scale descendant of Zuse's plates and pins. Because a rod a few nanometres long has almost no mass, it could move fast: Drexler's estimates gave switching times of a tenth of a nanosecond or so.:cite[drexler1992] Ralph Merkle showed how to make such mechanical logic **reversible**, so that in principle almost no energy is lost per operation.:cite[merkle1993] Nobody has built rod logic; it needs manufacturing with atomic precision. But it shows that mechanical computing is not slow because it is mechanical: it was slow because its parts were big. Chapter 11 makes that precise.

:::modern[The billiard-ball computer]
In 1982 Edward Fredkin and Tommaso Toffoli described a "billiard-ball computer": perfectly elastic balls bouncing off each other and off fixed mirrors, whose collisions compute logic functions without losing any energy. It cannot be built (the slightest error grows with every collision), but it made a point that reversible-computing research still pursues: the energy a computation must cost is not fixed by the logic, only by how much information it throws away (Landauer's principle, chapter 11).
:::

```quiz
q: 'A domino run can compute: falling dominoes can make AND and OR gates. Which ingredient from the list does it lack that makes it useless as a general computer?'
options:
  - text: 'Repeatability: each domino falls once, and the whole machine must be set up again by hand to compute again.'
    correct: true
    why: The energy comes from the dominoes themselves, stored when they were stood up, and spent in one go.
  - text: 'Switching: one domino cannot control another.'
    why: A falling domino tips the next; with the right layout, two lines can be made to meet in an AND or an OR.
  - text: 'State: dominoes cannot hold a value.'
    why: A standing or fallen domino is a bit; the trouble is that it can only change one way.
```

:::ledger{machine="Other substrates"}
**Marbles:** binary state and switching by toggles; gravity gives gain per marble; slow (a few operations a second) and serial. **Water (MONIAC, 1949):** analog integration with tanks and valves; slow (seconds to minutes), accuracy a few percent, leaks. **Fluidics (1959 on):** digital logic with no moving parts; thousands of operations a second; works where electronics fail. **Rod logic (designed 1992):** mechanical logic at molecular scale; perhaps a tenth of a nanosecond per switch on paper; never built.
:::

## Summary

- Anything that has **state**, **switching**, **composition**, **gain** and **repeatability** can compute.
- **Marbles** count in binary with ripple carry; **water** integrates (the MONIAC modelled an economy); **fluid jets** make flip-flops with no moving parts.
- **Rod logic** suggests mechanical computing could be fast if its parts were tiny.
- So why are real computers made of electrons? Chapter 11.
