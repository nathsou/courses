---
number: 11
title: Why computers are electronic
summary: 'Inertia, friction, gain, wiring and manufacture: the limits ledger, settled.'
duration: 60 minutes
prerequisites: [computing-with-anything]
---

:::check
```answer
id: why-electronic/check-1
title: Pushing a rod
prompt: 'Sound (and so a push) travels through steel at about 5 000 metres per second. How many microseconds does a push take to travel along a 1 m steel rod?'
answer: 200
why: '1 / 5 000 s = 0.0002 s = 200 µs. An electrical signal in a 1 m wire takes about 5 ns: forty thousand times less.'
```
:::

Every machine in this course ended with an entry in the limits ledger: what it could hold, how fast it worked, what went wrong. Here is one switching element from each of them, and from the electrical machines that replaced them, on scales where every step is a factor of ten.

::switch-race

Between Pascal's sautoir and a transistor in a chip there are ten powers of ten in speed, about fourteen in energy and six in size. This chapter is about where those factors come from. Each section takes one limit.

## The bridge: relays and valves

The machines that replaced gears did not appear from nowhere. The **relay**, an electromagnet that pulls a switch contact, had been switching telephone calls since the 1890s. Zuse's Z3 of 1941 was built from some 2 600 of them; in the United States, Howard Aiken's Harvard Mark I (1944) combined relays with rotating counter wheels driven by a long shaft, a calculator still half made of gears. A relay switches in about ten milliseconds, a hundred times faster than a lever and a weight, and electricity, not a linkage, carries its result to the next relay.

The **vacuum valve** (tube) switches with no moving parts at all: electrons crossing a vacuum, steered by the voltage on a grid. Colossus, at Bletchley Park in 1944, used about 2 400 of them to break German teleprinter ciphers; ENIAC, finished in Philadelphia in 1945 to compute the artillery tables that the differential analysers could not produce fast enough, used about 17 500, and did 5 000 ten-digit additions a second. A valve switches in about a microsecond.

The **transistor** (1947) did the same in a crystal of germanium or silicon, with no heater and no vacuum; the **integrated circuit** (1958–1959) put many transistors and their wires on one chip. Since then, transistors have shrunk about a thousandfold, and the number on a chip has grown from a handful to tens of billions.

## Inertia

To switch, a mechanical part must move: a mass m pushed a distance d by a force F. Starting from rest, that takes

> t = √(2md / F)

A lever of 20 grams, moved 2 centimetres by a force of a few newtons, takes a few hundredths of a second: about the time of a Pascaline's carry. An electrical switch moves electrons, whose mass is negligible: what limits it is how fast charge can flow in and out of the next switch's input.

But look at how t depends on size. Shrink a part by a factor s: its mass falls as s³, the distance it must move as s, and the force its material can safely carry (stress times cross-section) as s². So t ∝ √(s³ · s / s²) = s. **A mechanical part switches faster in proportion as it shrinks.**

::shrink-lab

```answer
id: why-electronic/shrink
title: How small for a nanosecond?
prompt: 'In the model above, a steel part of size 1 cm switches in about 130 µs, and the time is proportional to size. About how large (in nanometres) must the part be to switch in 1 ns? Round to the nearest ten.'
answer: 80
tolerance: 6
why: '130 µs is 130 000 ns, so the part must be 130 000 times smaller than 1 cm: about 77 nm. Mechanics at that scale is MEMS and NEMS research, not brass.'
```

So inertia alone does not doom mechanical computing: tiny mechanical switches could be fast. The next limits are what stop them.

## Energy, friction and wear

Every mechanical switch rubs. Friction turns some of each motion's energy into heat, and wears the surfaces, so that parts loosen and timing drifts; Babbage's machines needed oil and adjustment, and the Z1 jammed. The energy per switch in the switch race fell from millijoules (lifting a sautoir) to about a tenth of a femtojoule (charging a transistor's gate), and most of that fall came from shrinking.

Is there a floor? In 1961 Rolf Landauer showed that erasing one bit of information must turn at least kT ln 2 of energy into heat, about 3 × 10⁻²¹ joules at room temperature.:cite[landauer1961] Today's transistors use some ten thousand times more than that; a lifted sautoir used about a billion billion times more. Reversible logic, mechanical (Merkle's rods) or electronic, avoids erasing bits and so could in principle go below it, but friction is exactly the kind of irreversibility that makes it hard.

## Gain and fan-out

An element in a big machine must drive several others, and must hand on a signal at least as strong as the one it received; otherwise every stage loses a little and the signal dies after a few stages. Chapter 8's integrators could not even turn the next shaft until the torque amplifier gave them gain, and the gain came from a motor and a pair of capstans.

In mechanical machines, gain is expensive: a crank, a motor, a weight to lift. In electrical ones it is built into the switch. A relay's few milliwatts of coil current can switch a contact carrying watts; a valve or a transistor controls a large current with a small voltage, and every gate in a chip restores its output to a clean 0 or 1, ready to drive the inputs of four or five more gates. Gain is what makes a machine of a billion parts possible at all.

## Wiring

A wire carries a signal round corners, over long distances and to many places at once, for almost no force, at about half the speed of light. A mechanical signal must be pushed: through rods and levers and bearings, each one adding friction, play and mass, at no more than the speed of sound in the material. Look at any photograph of Difference Engine No. 2 and most of what you see is the machinery for getting motion from where it is made to where it is needed. Babbage spent years on the layout of his engines for this reason, and the Analytical Engine's racks carried one number at a time.

```answer
id: why-electronic/wire
title: How much faster is a wire?
prompt: 'A push travels through steel at about 5 000 m/s; a signal along a wire at about 2 × 10⁸ m/s. By what factor is the wire faster? (Give a whole number.)'
answer: 40000
tolerance: 1
why: '2 × 10⁸ / 5 × 10³ = 40 000. In the time a push crosses a 25 cm Pascaline, a wire’s signal could cross ten kilometres.'
```

## Manufacture

Joseph Clement's workshop spent ten years making the parts of Difference Engine No. 1, each turned, filed and checked by hand to make thousands of figure wheels as alike as possible, and it was never finished. The Science Museum's Difference Engine No. 2 has about 8 000 parts.

A processor chip has tens of billions of transistors and is made by printing: patterns projected onto a silicon wafer, layer after layer, every transistor made at once with every other, hundreds of chips per wafer. The cost of a transistor fell, between the 1960s and today, by a factor of about a billion. Nothing like that has ever happened to gears. If one fact settles the question, it is this one: electronic switches can be *printed*, in astronomical numbers, identical, already wired together.

:::key
Mechanical computing lost to electronics not because a part that moves must be slow (a small enough part is fast) but because of everything else at once: friction and wear, gain that costs a motor, signals that must be pushed through linkages, and parts that must be made one by one. Electrons win on every count together, and they get better as they get smaller, so the advantage has grown for seventy years.
:::

## The ledger, collected

::ledger-table

```quiz
q: 'Which of these machines from the course would still be in daily use if electronic computers had never been invented?'
options:
  - text: 'Probably all of the electromechanical calculators, tide predictors and differential analysers: they were in daily use until electronic machines replaced them in the 1960s and 1970s.'
    correct: true
    why: 'Mechanical calculators, the Curta, tide predictors and slide rules were all still working professional tools around 1970. Their limits were real, but nothing better existed.'
  - text: Only the Analytical Engine, once someone had built it.
    why: It was never built, and the precision manufacturing it needed arrived at about the same time as relays.
  - text: None; mechanical computing had already been abandoned before electronics.
    why: Mechanical calculators sold in their millions into the 1970s.
```

## What is still mechanical

Mechanical computing never disappeared completely. Mechanical watches still keep time with a balance wheel and an escapement. The phone you may be reading this on contains tiny moving mechanical structures, MEMS accelerometers and gyroscopes, etched in silicon by the same printing methods as its transistors; they sense, though, rather than compute. Researchers build nanomechanical switches for places where electronics leak or fail, and design reversible mechanical logic with energy budgets near Landauer's limit.

And the ideas survived intact. Here is what the mechanical machines in this course invented, and where it lives now:

| Mechanical idea | Machine | Where it lives now |
|---|---|---|
| Ripple carry | Pascaline, 1642 | the simplest adder in every arithmetic textbook and many small chips |
| Complement subtraction | Pascaline; Curta | two's complement, in every processor |
| Shift-and-add multiplication, Booth's trick | stepped drum; Curta | hardware multipliers |
| Pipelining | Difference Engine No. 2 | every processor since the 1980s |
| Carry lookahead | Analytical Engine's anticipating carriage | every fast adder |
| Store, mill and bus | Analytical Engine | memory, processor and bus |
| Microcode | Analytical Engine's barrels | complex instructions in x86 processors |
| Conditional branch on a flag | the run-up lever | every conditional jump |
| Analog integration | integrators, differential analysers | analog computers, control systems, today's analog AI accelerators |
| Binary floating point, hidden bit | Z1 | IEEE 754, in every processor |

:::ledger{machine="Electronic computers"}
**Relays (Z3, 1941):** about 0.8 s per addition. **Valves (ENIAC, 1945):** 5 000 additions a second; 17 500 valves, 150 kilowatts, frequent valve failures. **Transistors in a chip today:** billions of additions a second per core, about a tenth of a femtojoule per switch, tens of billions of switches printed at once. **What made the difference:** speed with no inertia to overcome, gain in every switch, signals carried by wires, and manufacture by printing.
:::

## Summary

- **Inertia:** a mechanical switch takes √(2md/F) to move, and that time shrinks in proportion to its size; inertia alone does not rule out fast mechanical computing.
- **Friction and wear** cost energy and reliability; **Landauer's limit**, kT ln 2 per erased bit, is far below anything mechanical has reached.
- **Gain** is built into every electronic switch; in a mechanical machine it costs a motor.
- **Wires** carry signals fast and far for no force; linkages must push.
- **Manufacture by printing** made transistors cheap, identical and plentiful in a way that machined parts never were.
- Every idea in the mechanical machines survives, in the electronic machines that replaced them.
