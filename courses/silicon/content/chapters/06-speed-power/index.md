---
number: 6
title: 'Delay, power and scaling'
summary: 'RC delay, sizing a chain of gates, dynamic and leakage power, and the end of Dennard scaling.'
duration: 70 minutes
prerequisites: [cmos]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: speed-power/check-energy
title: The cost of a bit flip
prompt: 'A gate’s output node has 2 fF of capacitance and the supply is 0.8 V. How much energy, in femtojoules, is drawn from the supply each time the node goes from 0 to 1 and back to 0?'
answer: 1.28
tolerance: 0.02
unit: fJ
why: 'E = C·V² = 2 × 10⁻¹⁵ × 0.64 = 1.28 × 10⁻¹⁵ J. Half of it is stored on the capacitor and dumped to ground on the way down; the other half is lost as heat in the pull-up on the way up.'
```

```quiz
q: Dennard’s scaling rules shrink every length and the supply voltage by the same factor each generation. What happens to the power drawn per square millimetre of chip?
options:
  - text: It stays the same.
    correct: true
    why: 'Each transistor draws C·V²·f, which falls by 0.7 × 0.7² ÷ 0.7 = 0.49, and twice as many fit in each square millimetre: 0.49 × 2 ≈ 1.'
  - text: It doubles, because there are twice as many transistors.
    why: 'There are twice as many, but each one draws half the power, because its capacitance and voltage both fall.'
  - text: It halves, because each transistor draws half as much.
    why: 'Each draws about half as much, but twice as many share each square millimetre.'
```
:::

Here is one inverter switching, simulated with the transistor model of chapter 4. Its input rises; its nMOS turns on and drains the charge stored on everything connected to its output. Increase the fan-out, the number of gates it drives, and lower the supply voltage.

::switching-lab

More load, more delay, almost in proportion. Lower supply, less energy per switch, as the square of the voltage, but more delay, and much more as the supply approaches the threshold voltage. Those two trade-offs, between speed and capacitance and between speed and energy, run through every decision about how a chip is designed and why its transistors keep shrinking. This chapter makes them quantitative.

## Every gate charges a capacitor

A logic gate's output is wired to the inputs of the gates it drives, and each of those inputs is a transistor's gate: a capacitor, the oxide over the channel. Add the capacitance of the wires and the gate's own drain junctions (chapter 3), and every output node is a capacitor of a few femtofarads that must be charged to $V_{DD}$ or discharged to ground for the output to change.

The transistor that does it delivers a current $I$ of tens of microamps, so the time to swing a node of capacitance $C$ through about half the supply is

$$
t_{pd} \approx \frac{C \cdot V_{DD}/2}{I}.
$$

Delay is proportional to load. A useful yardstick is the **FO4 delay**, the delay of an inverter driving four copies of itself, which captures a process's speed in one number. For the course's illustrative transistors it is about 31 ps; for the fastest processes of the mid-2020s it is well under 10 ps.

Lowering $V_{DD}$ shrinks the charge to move, but shrinks the current faster: in strong inversion the current goes as $(V_{DD} - V_T)^2$ or so, and near the threshold it collapses exponentially. In the widget, dropping from 1.0 V to 0.6 V makes the gate five times slower.

:::scale[Wires are slow]
The thinnest copper wires on a modern chip are about 20 nm wide. At that size copper's resistivity is several times its bulk value, because electrons scatter off the wire's surfaces and grain boundaries, and a millimetre of such a wire has a resistance of tens of kilohms and a capacitance of a couple of hundred femtofarads. Its RC delay grows as the square of its length: a millimetre takes nanoseconds, hundreds of gate delays. So the thinnest wires are only used to connect neighbouring cells; long connections go up to thicker wires on higher layers, broken every so often by buffers.
:::

## Sizing for speed

What if a gate must drive a really big load: a long bus, a pad leading off the chip, a clock net feeding thousands of flip-flops? A small gate driving it directly would take forever. A gate big enough to drive it quickly would itself be a huge load for whatever drives it. The answer is a chain of progressively larger inverters, each a fixed factor $f$ bigger than the last.

Measure delay in units of $\tau$, the delay of an ideal inverter driving one identical inverter. A stage driving $f$ times its own input capacitance takes $f + p$ units, where $p \approx 1$ is its parasitic delay (the time to charge its own output). For $N$ stages driving a total load $H$ times the first stage's input, each stage has $f = H^{1/N}$, and the total is

$$
D = N\,\left(H^{1/N} + p\right).
$$

Too few stages and each has an enormous fan-out; too many and the parasitic delays pile up. In between is a best $N$.

::chain-sizing

```answer
id: speed-power/best-chain
title: The best chain
prompt: 'A clock buffer must drive a load 256 times the input capacitance of a minimum inverter. Use the widget: how many stages give the least delay?'
answer: 4
why: 'Four stages, each four times larger than the last: 4 × (4 + 1) = 20 τ. Three stages give 22.1 τ, five give 20.2 τ. The best stage effort with p = 1 is about 3.6, and the rule of thumb (about four per stage) is why FO4 is the yardstick of gate delay.'
```

This is the simplest case of **logical effort**, a method for sizing whole paths of gates, NANDs and NORs included, that Ivan Sutherland and Bob Sproull developed in the 1990s.:cite[sutherland1999] Its lessons hold generally: the best paths spread effort evenly, with each stage's effort around four.

## Power

A chip draws power in three ways.

**Dynamic power.** Each time a node of capacitance $C$ goes from 0 to 1, the supply delivers charge $CV_{DD}$ at voltage $V_{DD}$: energy $CV_{DD}^2$, half stored on the capacitor and half turned to heat in the pull-up. When the node falls again, the stored half is dumped to ground as heat. If a fraction $\alpha$ of nodes switch up each clock cycle, the power is

$$
P_\text{dynamic} = \alpha\, C\, V_{DD}^2\, f.
$$

The square on $V_{DD}$ makes voltage the most powerful knob: 30 % less voltage saves half the energy.

**Short-circuit power.** During each transition, for a moment both transistors are partly on, and current flows straight from supply to ground (the spike in chapter 5's widget). With fast input edges it is a small fraction of the dynamic power.

**Leakage.** A transistor that is off still conducts a little: below threshold its current falls tenfold per subthreshold swing, but never reaches zero (chapter 4), and junctions and gate oxides leak too. Leakage flows whether or not anything switches, and with billions of transistors it adds up: in many chips it is a large fraction of the total power, especially when hot, since it grows with temperature.

```answer
id: speed-power/half-voltage
title: Halving the voltage
prompt: 'A block of logic runs at a fixed clock frequency. Its supply is lowered from 1.0 V to 0.5 V and it still meets its timing. What percentage of its original dynamic power does it now draw?'
answer: 25
tolerance: 0.5
unit: '%'
why: 'Dynamic power goes as V²: (0.5)² = 0.25. This is why chips lower the voltage of blocks that are not busy (dynamic voltage and frequency scaling) and why near-threshold designs are attractive where speed matters less than energy.'
```

## Scaling, and the end of free scaling

In 1965 Gordon Moore, then at Fairchild, noticed that the number of components on the most cost-effective chips had doubled every year, and predicted that it would go on doing so for at least a decade.:cite[moore1965] In 1975 he revised the pace to a doubling every two years, and the industry organised itself around keeping it.

What made each doubling worthwhile was explained in 1974 by Robert Dennard and his colleagues at IBM.:cite[dennard1974] Shrink every length of a transistor by a factor (0.7 per generation, say), shrink its voltages by the same factor, raise its doping to match, and everything else follows: each transistor's capacitance shrinks, its delay shrinks, its power falls by half, and twice as many fit in each square millimetre, so the **power per area stays constant**. Every generation brought twice the transistors, 40 % more speed and no more heat per mm². For thirty years, chips got faster and cheaper together.

::scaling-lab

Dennard's rules depend on lowering the voltage, and the voltage depends on the threshold: a gate is fast only if $V_{DD}$ is several times $V_T$. But the subthreshold swing does not scale. It is stuck at 60 mV per decade or more at room temperature, set by $k_\mathrm{B}T/q$. Lowering $V_T$ by 0.24 V with a swing of 80 mV per decade multiplies every transistor's off-current by a thousand. By the early 2000s leakage had grown into a large share of chip power, and thresholds and supply voltages stopped falling: supplies have stayed between about 0.7 and 1 V ever since.

With the voltage stuck, each generation's doubling of transistors doubled the power per area, unless clock frequencies stopped rising. They did. Clock speeds of desktop processors climbed past 3 GHz by 2002 and then went essentially flat; the extra transistors went into more cores, bigger caches and specialised accelerators instead of faster clocks. Many chips today cannot run all their transistors at full speed at once without overheating, a situation called **dark silicon**.

:::history{year=1974 title="Design of ion-implanted MOSFETs with very small physical dimensions" people="Robert Dennard and colleagues"}
Dennard's paper, written with Fritz Gaensslen, Hwa-Nien Yu, Leo Rideout, Ernest Bassous and Andre LeBlanc at IBM, worked out how to shrink a 5 µm transistor to 1 µm and what would follow. It also laid out why the scaling must eventually stop: the subthreshold slope and the threshold voltage do not shrink with everything else. It became one of the most influential papers in the field. Dennard had also invented, in 1966, the one-transistor DRAM cell of the next chapter.
:::

:::software[The free lunch is over]
For decades, software got faster without anyone changing it: each new processor ran the same program at a higher clock rate. In 2005 Herb Sutter titled an article "The free lunch is over":cite[sutter2005]: clock rates had stopped rising, and from then on, programs would get faster only by doing work in parallel, on more cores. The concurrency in your languages, runtimes and libraries, threads, async, data-parallel kernels on GPUs, is in large part a consequence of the voltage that stopped scaling.
:::

:::fab[What "3 nm" means]
Process generations are still named in nanometres, but since the late 1990s the names have drifted away from any physical length. A "3 nm" process of the mid-2020s has a contacted gate pitch (the spacing from one transistor's gate to the next) of about 50 nm and a tightest metal pitch of a little over 20 nm; no feature of interest measures 3 nm. The name now means roughly "the density that the old trend would have reached at 3 nm".
:::

## Summary

- Every gate charges and discharges capacitance: delay $\approx CV/I$, proportional to load; lowering $V_{DD}$ slows gates sharply as it approaches $V_T$.
- Big loads are driven through chains of inverters growing by about four per stage, the simplest case of logical effort.
- Power is dynamic ($\alpha C V^2 f$), short-circuit, and leakage; voltage is the strongest lever.
- Dennard scaling kept power per area constant while transistors doubled, until the subthreshold swing stopped the voltage falling; since the mid-2000s clocks have stayed near a few GHz and extra transistors go into parallelism.
