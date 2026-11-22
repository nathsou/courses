---
number: 17
title: 'Yield, test and packaging'
summary: 'Defects and yield, the cost of a good die, scan test for stuck-at faults, and the package that connects a die to the world.'
duration: 70 minutes
prerequisites: [process-flow]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: package/check-yield
title: A simple yield model
prompt: 'Defects land at random, 0.1 per cm² on average. What fraction of dies of area 2 cm² have no defect at all, in per cent? (Use Poisson’s formula, Y = e^(−AD).)'
answer: 82
tolerance: 0.5
unit: '%'
why: 'e^(−2 × 0.1) = e^(−0.2) ≈ 0.819. Double the die area and the yield is squared: 67 %.'
```

```quiz
q: Why do chips include scan chains, which link all their flip-flops into long shift registers in test mode?
options:
  - text: So the tester can set every flip-flop directly and read every flip-flop directly, testing the logic between them as if it had no state.
    correct: true
    why: 'Without scan, reaching a particular internal state can take thousands of cycles of carefully chosen inputs, and many faults would show only deep inside. With scan, each test is one vector: shift a state in, clock once, shift the result out.'
  - text: To speed the chip up when it is running normally.
    why: 'Scan costs a little speed and area (a multiplexer in front of every flip-flop); it is paid for by testability.'
  - text: To store the test results on the chip.
    why: 'The results are shifted out to the tester, which compares them with the expected values.'
```
:::

Every wafer that comes out of the fab carries some defects: a speck of dust that landed during an exposure, a particle shed by a machine, a pattern that printed slightly wrong. Here is a 300 mm wafer with defects scattered across it at random. A die with a defect inside it fails. Make the dies bigger and watch the fraction that work fall; then let the defects cluster.

::wafer-map{mode="yield"}

The fraction of good dies is the **yield**, and it ends the arithmetic of chipmaking: a wafer costs the same however many of its dies work, so the cost of a good die is the cost of the wafer divided by the number of good dies on it. Big dies are expensive twice over: fewer fit on a wafer, and a larger share of them catch a defect. This chapter covers how yield is modelled and improved, how every die is tested before it ships, and how the good ones are packaged.

## Defects and yield

If defects land independently at random, with an average density $D$ per unit area, the number landing on a die of area $A$ follows a Poisson distribution, and the chance that it gets none is

$$
Y = e^{-AD}.
$$

Real defects cluster: a scratch, a bad region near the wafer's edge, one lot of wafers worse than the next. Clustering wastes defects on dies that already have one, so real yields are better than the Poisson formula predicts for large dies. Murphy's model of 1964 and the negative binomial model, with a clustering parameter, account for it; the widget shows both beside the measured count.:cite[murphy1964]

A new process starts with poor yields and improves as engineers find and eliminate the sources of defects, a **yield ramp** that can take a year or more; a mature leading process has defect densities around 0.1 per cm² or lower. Defects are found by inspecting wafers optically and with electron beams after many steps, and by testing.

```answer
id: package/cost
title: The cost of a good die
prompt: 'Use the widget with the defect density at 0.20 per cm² and the wafer cost at $17 000. Read the Poisson yield for a 15 mm × 15 mm die. With 261 whole dies on the wafer, what does each good die cost, in dollars? (Use the Poisson yield, to the nearest dollar.)'
answer: 102
tolerance: 2
unit: $
why: 'The Poisson yield for 2.25 cm² at 0.2 per cm² is e^(−0.45) ≈ 64 %, so about 166 good dies: $17 000 / 166 ≈ $102. A 10 mm × 10 mm die costs about $33 on the same wafer: 2.25 times the area for about three times the cost.'
```

This arithmetic explains **chiplets**. A very large processor built as one die of 6 cm² would yield $e^{-0.6} \approx 55\,\%$ at 0.1 defects per cm²; split into four dies of 1.5 cm², each yields $e^{-0.15} \approx 86\,\%$, and the bad ones are thrown away individually. If the pieces can be connected well enough (below), several small dies are cheaper than one big one, and different chiplets can even be made in different processes.

## Test

Every die must be tested, because the defects that kill it are invisible. Testing happens twice: on the wafer, before it is cut (**wafer sort**), through a **probe card** whose needles touch every pad of a die at once; and again after packaging (**final test**). An automatic test equipment rack applies patterns and compares the responses, millions of dies a day.

What patterns? Testing a design's function, as verification does, would take forever and would not target defects. Manufacturing test uses **fault models** instead. The oldest and still the most used is the **stuck-at** model: a defect makes some wire behave as if tied permanently to 0 or to 1. A test vector **detects** a fault if the faulty circuit's outputs differ from the good circuit's for that vector. Fault coverage, the fraction of modelled faults detected by a test set, is the number every test engineer is judged by; for large chips the target is typically well above 99 %.

The trouble is state. A fault deep inside a circuit with thousands of flip-flops may show itself only after a long, specific sequence of inputs. The fix is **scan design**: in test mode, every flip-flop is linked into a long shift register, so the tester can shift in any state, apply one clock, and shift out the result. IBM made this standard practice in the 1970s.:cite[eichelberger1977] With scan, the logic between flip-flops can be tested as if it were purely combinational, and **automatic test-pattern generation** (ATPG), descended from Roth's D-algorithm of 1966 and now driven by SAT solvers, finds vectors for every fault that has one.:cite[roth1966] Here is the decade counter's netlist, with all four flip-flops scanned:

::scan-test

Some faults may turn out to have no test at all: logic whose effect never reaches an output, usually a sign of redundancy left by synthesis. Beyond stuck-at faults, tests target **transition faults** (a wire that switches too slowly, caught by tests clocked at full speed), **bridges** between neighbouring wires, and memories, which test themselves with built-in self-test engines that march patterns through every cell. Dies are also sorted by speed, **binned**, the fastest sold for more; and some, destined for cars, servers and aircraft, are run hot for hours (**burn-in**) to weed out the ones that would fail early.

:::software[Coverage that means something]
Code coverage tells a software team which lines ran, not whether a bug there would have been noticed. Fault coverage is stricter: a fault counts as covered only if the test's outputs would actually change. Software calls the same idea mutation testing: inject small faults into the program and check that the test suite fails. Chip test engineers have been doing it, at enormous scale, since the 1960s.
:::

## Packaging

Good dies must be connected to the outside world, protected from it, and cooled. The wafer is thinned by grinding its back, then cut into dies with a diamond saw or a laser. Each good die is then mounted in a **package**.

- **Wire bonding**, the classic method: the die sits face up on a lead frame or substrate, and a machine stitches fine gold or copper wires from the pads around its edge to the package, several wires a second.
- **Flip chip**: the die's face is covered with solder bumps, the die is turned over onto a substrate, and the bumps are melted to connect hundreds or thousands of points at once, over its whole face, with short low-inductance paths. IBM introduced it in the 1960s (as "controlled collapse chip connection", C4); it is now standard for anything large or fast.
- The **substrate**, a small printed circuit board of many fine layers, spreads the connections out to the larger balls of a ball-grid array, which is soldered to the system's board. A metal lid spreads heat to a heat sink or cold plate; a large processor dissipates hundreds of watts through a few square centimetres.

As transistors stopped getting cheaper per generation as quickly as before, packaging became a place to gain performance. **2.5D** packages put several dies side by side on a silicon **interposer**, with thousands of fine wires between them: processors beside stacks of high-bandwidth memory, whose own dies are stacked and connected vertically by **through-silicon vias**. **3D** stacking bonds dies face to face, with copper pads fused directly (**hybrid bonding**) at pitches of a few micrometres: a cache die on top of a processor die, for example.

::io-density

## From sand to silicon

That is the whole journey. A quartz pebble, reduced, purified to eleven nines and grown into a crystal; sliced, polished, oxidised, coated, exposed through masks drawn from a layout; etched, implanted, annealed, polished, wired in copper; probed, cut, tested, packaged and tested again. The layout came from a netlist, the netlist from RTL, the RTL from a specification, checked at every step by simulation and by proof. And every gate in it is a pair of switches made of a field, working because a few impurity atoms per million change what a crystal of silicon does with its electrons, and because, by Boltzmann's factor, heat breaks so very few of its bonds.

:::history{year=1964 title="The cost of a die" people="B. T. Murphy"}
In 1964, when an integrated circuit had a few dozen components, B. T. Murphy at Bell Labs worked out how yield and cost per die depend on die size, and showed that for any defect density there is a die size that minimises the cost per circuit.:cite[murphy1964] A year later Gordon Moore's famous paper made a similar argument about the number of components per chip that minimises the cost per component, and observed that it was doubling every year (chapter 6).
:::

## Summary

- Random defects make yield fall exponentially with die area ($Y = e^{-AD}$ for independent defects; clustering helps). The cost of a good die is the wafer cost over the number of good dies, which favours small dies and chiplets.
- Every die is tested on the wafer and again after packaging. The stuck-at fault model and scan design make test generation tractable; fault coverage measures a test set.
- Dies are thinned, diced and packaged by wire bonding or flip chip on a substrate; advanced packages join chiplets on interposers and stack dies with through-silicon vias and hybrid bonding.
