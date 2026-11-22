---
number: 3
title: 'The p–n junction'
summary: 'Where p-type meets n-type: a depletion region, a built-in field, and the diode’s exponential current.'
duration: 60 minutes
prerequisites: [doping]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: junction/check-1
title: Built-in potential
prompt: 'A junction has $10^{17}$ acceptors per cm³ on one side and $10^{17}$ donors on the other. With $k_\mathrm{B}T/q = 0.0259$ V and $n_i = 10^{10}$ cm⁻³, what is its built-in potential, in volts?'
answer: 0.834
tolerance: 0.01
unit: V
why: '$V_{bi} = (k_\mathrm{B}T/q)\ln(N_A N_D / n_i^2) = 0.0259 \times \ln(10^{14}) = 0.0259 \times 32.2 \approx 0.83$ V.'
```

```answer
id: junction/check-2
title: An exponential
prompt: 'A silicon diode at room temperature passes 1 mA at 0.65 V. Roughly how much current, in mA, does it pass at 0.77 V?'
answer: 100
tolerance: 15
unit: mA
why: 'The current rises tenfold every 60 mV at room temperature. 0.12 V is two decades: 1 mA × 100 = 100 mA.'
```
:::

Put a piece of p-type silicon against a piece of n-type, in a single crystal so that nothing but the doping changes from one side to the other. Here is what you get. The top panel shows fixed electric charge, the middle one the electric field, the bottom one the energy bands. Try different doping on each side, then drag the voltage.

::junction-lab

A thin slice around the junction has emptied of carriers, leaving bare ions: negative on the p side, positive on the n side. Between them is a strong electric field, and across them the bands step down from p to n. Forward voltage shrinks that step; reverse voltage makes it taller and widens the empty slice. This structure, the **p–n junction**, is the simplest semiconductor device, and the one inside every transistor. This chapter explains why it forms and why it lets current through in only one direction.

## Joining p to n

Imagine the two pieces brought together at the instant of contact. The n side is full of free electrons, about $10^{16}$ per cm³ in the default setting; the p side has almost none ($10^4$). The p side is full of holes; the n side has almost none. Steep concentration gradients mean diffusion (chapter 2): electrons pour from n into p, and holes from p into n.

Two things follow. Electrons arriving in the p side meet a crowd of holes and recombine; holes arriving in the n side do the same with electrons. And every carrier that leaves exposes the fixed dopant ion it came from: each electron leaving the n side uncovers a positive donor ion, each hole leaving the p side uncovers a negative acceptor ion. A layer of positive charge builds up on the n side of the junction and a layer of negative charge on the p side.

Those two layers of charge make an electric field, pointing from n to p. The field pushes electrons back towards n and holes back towards p: drift, opposing the diffusion. Within a fraction of a nanosecond the field grows just strong enough for drift to cancel diffusion exactly, for electrons and for holes separately, and the net flow stops. What remains is the **depletion region**, almost empty of mobile carriers, holding the fixed charge, and a voltage across it, the **built-in potential**.

```order
id: junction/order-formation
title: How a junction forms
prompt: Put these in the order they happen when p-type and n-type silicon are first joined.
steps:
  - Electrons diffuse from the n side into the p side, and holes from the p side into the n side.
  - The carriers that cross recombine with the majority carriers on the other side.
  - Fixed donor ions are left uncovered on the n side, and acceptor ions on the p side.
  - The charged layers create an electric field pointing from n to p.
  - The field’s drift current grows until it cancels diffusion, and the net flow stops.
why: Diffusion starts everything; the charge it leaves behind builds the field that stops it. The result is an equilibrium, not a stalemate. Diffusion and drift still run, in equal and opposite amounts.
```

## The built-in potential

How big is the step? The cleanest way to see it is through the Fermi level. In equilibrium nothing flows, which means an electron gains nothing by moving from one side to the other, and that requires the Fermi level to be the same everywhere. On the p side it sits $k_\mathrm{B}T \ln(N_A/n_i)$ below mid-gap; on the n side, $k_\mathrm{B}T \ln(N_D/n_i)$ above. For the two to line up, the whole band structure of the n side must drop by the sum. That drop is the built-in potential:

$$
V_{bi} = \frac{k_\mathrm{B}T}{q}\,\ln\frac{N_A N_D}{n_i^2}.
$$

For $10^{16}$ on both sides it is 0.71 V. It depends on the doping only through a logarithm: a thousand times more doping on each side adds only $2 \times 0.0259 \times \ln 1000 = 0.36$ V. Its upper limit is roughly the band gap, 1.12 V, reached when both sides are so heavily doped that their Fermi levels sit at the band edges.

You cannot measure $V_{bi}$ by touching a voltmeter to the two ends. The contacts between the metal probes and the silicon have built-in potentials too, and around the loop they cancel exactly: if they did not, a junction at rest would drive a current for ever.

## Inside the depletion region

The shapes in the widget follow from one equation of electrostatics, Gauss's law in one dimension (Poisson's equation): the field changes, along $x$, in proportion to the charge density there,

$$
\frac{dE}{dx} = \frac{\rho}{\varepsilon_\mathrm{Si}},
$$

where $\varepsilon_\mathrm{Si} = 11.7\,\varepsilon_0$ is silicon's permittivity. In the depletion region the charge density is constant on each side ($-qN_A$ and $+qN_D$), so the field is a pair of straight lines meeting at a peak at the junction: a triangle. The potential, the integral of the field, is two parabolas. Outside the depletion region there is no charge and no field.

The triangle's area is the voltage across the region, $V_{bi} - V$. Its two halves hold equal and opposite charge, which fixes how far it extends into each side, and together these give the width:

$$
W = \sqrt{\frac{2\varepsilon_\mathrm{Si}\,(V_{bi} - V)}{q}\left(\frac{1}{N_A} + \frac{1}{N_D}\right)}.
$$

For $10^{16}$ on both sides, $W = 0.43$ µm at zero bias, half on each side.

```quiz
q: A junction has 10¹⁹ acceptors per cm³ on its p side and 10¹⁵ donors on its n side. Where is its depletion region?
options:
  - text: Almost entirely in the n side.
    correct: true
    why: 'The two sides must hold equal charge, so the region extends N_A/N_D = 10 000 times further into the lightly doped side. Such one-sided junctions are common: the heavily doped source of a transistor against a lightly doped body. Try it in the widget.'
  - text: Almost entirely in the p side.
    why: 'The p side, heavily doped, packs the charge it must hold into a very thin layer. It is the lightly doped side that needs depth.'
  - text: Equally in both, because the charges must balance.
    why: 'The charges balance, but charge is doping times depth: the side with ten thousand times less doping needs ten thousand times the depth.'
```

:::scale[Narrow junctions, enormous fields]
The junctions in a modern transistor are heavily doped, $10^{19}$ per cm³ and more. Set both sliders there. The depletion region shrinks to about 17 nm, and the peak field reaches 1.3 million volts per centimetre, all from a built-in potential of about one volt. Fields that strong would tear air apart (air breaks down near 30 000 V/cm); in silicon, only somewhat larger ones let electrons tunnel straight through the gap, which is how a Zener diode works.
:::

```answer
id: junction/reverse-width
title: Widening the region
prompt: 'A junction has $V_{bi} = 0.7$ V. What reverse voltage (enter it as a negative number of volts) doubles its depletion width compared with zero bias?'
answer: -2.1
tolerance: 0.02
unit: V
hints:
  - The width grows as the square root of the total voltage across the region, $V_{bi} - V$.
  - 'To double the width, $V_{bi} - V$ must become four times $V_{bi}$.'
why: '$V_{bi} - V = 4 V_{bi}$ gives $V = -3 V_{bi} = -2.1$ V. Check it in the widget with 10¹⁶ on both sides.'
```

## A one-way valve

Now connect a battery. Since the depletion region has almost no carriers, it has by far the highest resistance in the circuit, and practically all the applied voltage $V$ appears across it. That voltage changes the height of the step, from $V_{bi}$ to $V_{bi} - V$.

**Reverse bias** ($V < 0$: the n side made positive) makes the step taller. Majority carriers face a higher barrier and essentially none cross. The only current is from minority carriers, the rare electrons on the p side and holes on the n side, which wander into the depletion region and are swept across by its field, which helps them. There are very few of them, so the current is tiny and almost independent of the voltage: the **saturation current**, $I_s$.

**Forward bias** ($V > 0$) lowers the step. The majority carriers on each side have a spread of energies (the Boltzmann distribution again), and the fraction energetic enough to climb a barrier of height $q(V_{bi} - V)$ is proportional to $e^{-q(V_{bi} - V)/k_\mathrm{B}T}$. Every $k_\mathrm{B}T/q = 25.9$ mV of forward voltage multiplies the number that cross by $e$. Electrons crossing into the p side and holes into the n side become minority carriers there, diffuse away from the junction and recombine; a steady current flows. Put the two directions together and you get **Shockley's diode equation**:

$$
I = I_s\left(e^{qV/k_\mathrm{B}T} - 1\right).
$$

::diode-curve

On the logarithmic scale the forward current is a straight line rising tenfold every $(k_\mathrm{B}T/q)\ln 10 = 59.5$ mV at room temperature, from femtoamps to milliamps over about 0.7 V. On the linear scale this looks like a "turn-on voltage" near 0.6–0.7 V, but nothing special happens there: the exponential has merely become big enough to see. The saturation current is proportional to $n_i^2$, so it is extraordinarily sensitive to temperature: warm the junction from 300 K to 350 K and watch $I_s$ grow more than a thousandfold.

:::key
A p–n junction is a valve. Forward bias lowers the barrier, and the current grows exponentially, ten times every 60 mV. Reverse bias raises it, and only a tiny saturation current of minority carriers flows. The exponential, $e^{qV/k_\mathrm{B}T}$, is the Boltzmann factor for climbing the barrier, and it will reappear in the transistor below threshold.
:::

:::history{year=1940 title="The crack in the rod" people="Russell Ohl"}
On 23 February 1940, Russell Ohl at Bell Labs was testing a rod of purified silicon that behaved strangely: its resistance changed when a lamp on the bench was switched on. Shone on with a flashlight, the rod produced about half a volt, more than any known photocell. The rod had a crack near its middle, and the metallurgists found that it had frozen with p-type silicon on one side of the crack and n-type on the other.:cite[riordan1997] Ohl had found the p–n junction, and the photovoltaic effect at it: light breaks bonds near the junction, and its field sweeps the electrons and holes apart. Every solar cell is such a junction. In 1949 William Shockley published the theory of the junction and of the junction transistor, including the equation above.:cite[shockley1949]
:::

:::know[How do we know the doping inside?]
A reverse-biased junction is a capacitor: two layers of charge separated by the depletion width, with capacitance $C = \varepsilon_\mathrm{Si} A / W$ for area $A$. As the reverse voltage grows, $W$ grows and $C$ falls, in a way that depends on the doping at the edge of the depletion region. Measure $C$ against $V$ and plot $1/C^2$: for uniform doping it is a straight line whose slope gives the doping. Sweeping the voltage moves the edge of the depletion region through the silicon, so the same measurement maps doping against depth. The widget gives the capacitance per square micrometre.:cite[sze2007]
:::

## Junctions inside a chip

Chips contain few diodes used as diodes, but junctions are everywhere:

- **Every transistor contains two.** The source and drain of an n-channel transistor (chapter 4) are heavily doped n-type regions sitting in p-type silicon. Kept at zero or reverse bias, these junctions isolate the transistor's terminals from the silicon underneath, and from each other until the gate opens a channel.
- **Their capacitance slows the circuit.** Each reverse-biased junction is a small capacitor that must be charged and discharged every time the transistor switches: part of the load in chapter 6.
- **Their leakage wastes power.** The saturation current of billions of junctions, growing steeply with temperature, is one of the ways a chip draws current while doing nothing.
- **Wells isolate whole regions.** A region of n-type silicon (an **n-well**) inside the p-type wafer, its junction kept reverse-biased, holds the p-channel transistors of chapter 5.

Push a reverse-biased junction too far and it breaks down: the field becomes strong enough for carriers to knock new electron–hole pairs out of bonds (avalanche), or for electrons to tunnel across. Breakdown is not damage in itself, and some diodes are designed to work there, but chips must keep their junctions below it.

## Summary

- At a p–n junction, diffusion uncovers fixed ions; their field grows until drift cancels diffusion. The carrier-free depletion region holds the built-in potential $V_{bi} = (k_\mathrm{B}T/q)\ln(N_A N_D/n_i^2)$, about 0.7–1 V.
- Poisson's equation makes the field a triangle and the potential two parabolas; the width is $W = \sqrt{2\varepsilon(V_{bi} - V)/q \cdot (1/N_A + 1/N_D)}$, mostly in the lighter-doped side.
- Forward bias lowers the barrier: $I = I_s(e^{qV/k_\mathrm{B}T} - 1)$, ten times more current every 60 mV. Reverse bias leaves a tiny saturation current.
- Junctions isolate every transistor's terminals, and add capacitance and leakage.
