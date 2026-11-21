---
number: 4
title: 'The MOSFET: a switch made of a field'
summary: 'A gate over a thin oxide draws a channel of electrons out of p-type silicon: threshold, square law and subthreshold slope.'
duration: 75 minutes
prerequisites: [junction]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: An n-channel MOSFET is built in p-type silicon. When it is on, what carries the current between its source and drain?
options:
  - text: Electrons, in a thin layer at the silicon surface under the gate.
    correct: true
    why: 'A positive gate voltage pushes holes away and draws electrons to the surface, until they outnumber the holes there: an n-type layer, the channel, inside p-type silicon. That is called inversion.'
  - text: Holes, which the p-type silicon already has in plenty.
    why: 'The source and drain are n-type; holes cannot flow out of them, and their junctions with the p-type body block hole flow between them. Only an electron layer connects them.'
  - text: Electrons flowing through the gate oxide.
    why: 'The oxide is an insulator, and the gate draws almost no current. That is the point of the device: it is controlled by a field, not by a current.'
```

```answer
id: mosfet/check-2
title: Turning it off
prompt: 'A transistor below threshold has a subthreshold swing of 70 mV per decade. By how many millivolts must the gate voltage fall to cut its current by a factor of 100 000?'
answer: 350
tolerance: 5
unit: mV
why: 'A factor of 100 000 is five decades, and each decade costs 70 mV: 5 × 70 = 350 mV.'
```
:::

Here is the device that every chapter after this one is built from. Drag the gate voltage up from zero and watch a channel of electrons appear beneath the gate; then drag the drain voltage and watch current flow through it.

::mosfet-lab

With the gate at zero, the drain current is a few picoamps: the switch is off. At one volt on the gate it is around 90 microamps, seven orders of magnitude more: the switch is on. The gate itself draws no current at all; it acts through an electric field across a layer of glass a few nanometres thick. This is the **metal–oxide–semiconductor field-effect transistor**, the MOSFET, and nearly every transistor ever made is one. This chapter takes it apart.

## A switch with no moving parts

The idea is old. Put a conductor close to a thin slab of semiconductor, separated by an insulator, and charge the conductor. Charge of the opposite sign must gather in the semiconductor's surface, and if that charge consists of mobile carriers, the slab conducts better. A voltage on one electrode would control a current through another, without any current flowing into the control.

:::history{year=1925 title="An idea before its time" people="Julius Edgar Lilienfeld"}
The physicist Julius Lilienfeld, who had moved from Leipzig to the United States, filed patents in 1925 and 1926 for "a method and apparatus for controlling electric currents" that described exactly this: a field-effect transistor.:cite[lilienfeld1930] Nobody could make one work. After the war William Shockley tried at Bell Labs, and measured an effect more than a thousand times smaller than he had calculated. John Bardeen explained why: electrons trapped in **surface states**, broken bonds at the surface of the crystal, soaked up the induced charge before it could conduct. Studying those surfaces led Bardeen and Walter Brattain to the point-contact transistor in 1947; the field-effect transistor waited another twelve years.:cite[riordan1997]
:::

What fixed it was oxide. In the late 1950s Mohamed Atalla at Bell Labs found that a layer of silicon dioxide grown on silicon by heating it in oxygen ties up nearly all the broken surface bonds. In 1959 he and Dawon Kahng built a field-effect transistor with a thermally grown oxide under an aluminium gate, and it worked.:cite[kahng1960] The device you just used is its descendant.

## The MOS capacitor

Strip the transistor down to its middle: a gate electrode, a thin oxide and p-type silicon, with no source or drain. This **MOS capacitor** is where everything happens. Explore it below. The curve on the right is the number of electrons per square centimetre at the silicon surface, on a logarithmic scale.

::mos-cap-lab

As the gate voltage rises, the silicon passes through four regimes.

1. **Accumulation.** A negative gate attracts holes, the majority carriers of p-type silicon, which pile up in a thin layer at the surface.
2. **Depletion.** A positive gate pushes the holes away from the surface, leaving behind the fixed negative charge of ionised acceptors: a depletion region, as in a junction. Its width grows as the square root of the band bending at the surface.
3. **Weak inversion.** As the surface bends further, the few minority electrons start to gather at the surface. Their number grows exponentially with the band bending: the Boltzmann factor once more.
4. **Strong inversion.** When the surface's band bending reaches twice the Fermi potential $\phi_F = (k_\mathrm{B}T/q)\ln(N_A/n_i)$, there are as many electrons per cm³ at the surface as there are holes deep in the bulk. The surface has become n-type: an **inversion layer**. From here on the depletion region stops growing, and every extra volt on the gate adds an equal amount of electron charge to the layer, like charging a capacitor.

The gate voltage at which strong inversion begins is the **threshold voltage**, $V_T$.

```order
id: mosfet/order-regimes
title: Raising the gate voltage
prompt: Put the states of p-type silicon under a gate in order, from the most negative gate voltage to the most positive.
steps:
  - Holes pile up at the surface (accumulation).
  - The bands are flat and the surface is like the bulk (flat band).
  - Holes are pushed away, leaving a layer of fixed negative ions (depletion).
  - A few electrons gather at the surface, growing exponentially with the gate voltage (weak inversion).
  - Electrons outnumber the bulk’s holes at the surface, and their charge grows linearly with the gate voltage (strong inversion).
why: The gate’s charge is balanced by charge in the silicon, and as the gate voltage rises that charge is first holes, then fixed ions, then electrons.
```

### The threshold voltage

Three contributions add up to $V_T$:

$$
V_T = V_{FB} + 2\phi_F + \frac{\sqrt{2\,\varepsilon_\mathrm{Si}\, q N_A \cdot 2\phi_F}}{C_{ox}}.
$$

- $2\phi_F$ is the band bending needed for inversion.
- The last term is the voltage across the oxide needed to hold the depletion region's charge. It is that charge divided by the oxide's capacitance per area, $C_{ox} = \varepsilon_{ox}/t_{ox}$, where $\varepsilon_{ox} = 3.9\,\varepsilon_0$ for silicon dioxide. A thinner oxide gives a larger $C_{ox}$ and a smaller term.
- $V_{FB}$, the **flat-band voltage**, accounts for the difference between the work functions of the gate material and the silicon (the energy needed to pull an electron out of each). Even with no voltage applied, the gate and the silicon exchange charge until their Fermi levels line up, as across a junction. Choosing the gate material shifts $V_T$ by up to a volt; switch the gate in the widget to see it.

In practice, chip designers want thresholds of a few tenths of a volt, the same in every transistor. The doping, the oxide and the gate material are the three knobs.

```answer
id: mosfet/cox
title: An oxide capacitor
prompt: 'What is the capacitance per area of a silicon dioxide layer 2 nm thick, in femtofarads per square micrometre? ($\varepsilon_0 = 8.854 \times 10^{-12}$ F/m; 1 fF/µm² is $10^{-3}$ F/m².)'
answer: 17.3
tolerance: 0.3
unit: fF/µm²
why: '$C_{ox} = 3.9 \times 8.854 \times 10^{-12} / (2 \times 10^{-9}) = 1.73 \times 10^{-2}$ F/m² = 17.3 fF/µm². A gate a few hundred nanometres square therefore has a capacitance of a femtofarad or so: the load that every switching event must charge.'
```

:::know[How do we know what is under the gate?]
Measure the capacitance of a MOS capacitor as its gate voltage sweeps, with a small wiggle added. In accumulation it is just $C_{ox}$, which gives the oxide thickness. In depletion it drops, because the depletion region's capacitance adds in series, and the shape of the drop gives the doping. Its position along the voltage axis gives the flat-band voltage, and so any charge trapped in the oxide. Stretches and kinks in the curve reveal traps at the interface. This **C–V measurement** has been the standard check on gate oxides since the 1960s.:cite[sze2007]
:::

## The transistor

Now add, on either side of the gate, two heavily doped n-type regions: the **source** and the **drain**. Each forms a p–n junction with the p-type **body**. With the gate below threshold, current from drain to source would have to cross two junctions back to back, one of them reverse-biased: practically nothing flows. Above threshold, the inversion layer is an n-type **channel** joining source and drain, and electrons flow from source to drain.

How much current? The channel's electron charge per area is $C_{ox}(V_{GS} - V_T)$, the gate's charge beyond what it takes to reach threshold. With a small drain voltage $V_{DS}$, the channel is a resistor whose conductance is proportional to that charge, to the electrons' mobility $\mu_n$ and to the channel's width $W$ over its length $L$. As $V_{DS}$ grows, the channel near the drain has less voltage between it and the gate, so it thins towards the drain. Integrating along the channel gives the **linear** (or triode) region:

$$
I_D = \mu_n C_{ox}\frac{W}{L}\left(V_{GS} - V_T - \tfrac{1}{2}V_{DS}\right)V_{DS}.
$$

When $V_{DS}$ reaches $V_{GS} - V_T$, the channel at the drain end thins to nothing: it **pinches off**. Beyond that, extra drain voltage falls across a short depleted region at the drain end, which the electrons cross swept by its field, and the current stops growing. This is **saturation**:

$$
I_D = \frac{1}{2}\mu_n C_{ox}\frac{W}{L}\left(V_{GS} - V_T\right)^2.
$$

This is the **square law**. In the widget's output view, each curve rises linearly from the origin, bends over and flattens; the dashed line marks the pinch-off. The flat parts are not perfectly flat: the pinched-off region grows with $V_{DS}$, shortening the effective channel a little (channel-length modulation). The widget's model also includes a slope factor $n$ of about 1.3, which accounts for the depletion charge's share of the gate's influence and divides $(V_{GS} - V_T)$; the textbook square law is the case $n = 1$.

:::key
A MOSFET is a voltage-controlled switch. Below threshold it is off; above it, a channel forms whose charge is set by the gate. At small drain voltages the channel is a resistor controlled by the gate; at large ones it pinches off at the drain and the current saturates at $\tfrac{1}{2}\mu C_{ox}(W/L)(V_{GS} - V_T)^2$. Wider transistors carry proportionally more current; longer ones, less.
:::

```quiz
q: A transistor in saturation carries 40 µA with V_GS − V_T = 0.3 V. What does the square law predict at V_GS − V_T = 0.6 V?
options:
  - text: 160 µA
    correct: true
    why: 'Doubling the overdrive quadruples the current: (0.6/0.3)² = 4. Real short-channel transistors fall somewhat short of this, because electrons in a strong field stop speeding up (velocity saturation).'
  - text: 80 µA
    why: 'That would be a linear dependence. In saturation the current goes as the square of the overdrive.'
  - text: 40 µA, because the current is saturated.
    why: '“Saturated” refers to the drain voltage: the current stops growing with V_DS. It still grows with the gate voltage.'
```

## Below threshold

Switch the plot to the logarithmic transfer view: current against gate voltage. Below $V_T$ the current does not stop. It falls exponentially, a straight line on the log scale, because the electrons at the surface in weak inversion are a Boltzmann population: every $k_\mathrm{B}T/q$ of extra band bending multiplies them by $e$. Since the gate controls the band bending through a capacitive divider (oxide in series with the depletion region), only a fraction $1/n$ of the gate's change reaches the surface. The current falls tenfold for every

$$
S = n\,\frac{k_\mathrm{B}T}{q}\ln 10 \approx n \times 60\ \mathrm{mV}
$$

of gate voltage. $S$ is the **subthreshold swing**, and no transistor that works by lifting carriers over a barrier can beat 60 mV per decade at room temperature: that limit comes from the Boltzmann distribution itself.

This matters enormously. A chip wants transistors that switch fully on and fully off within its supply voltage. Between off ($V_{GS} = 0$) and threshold, the current can only fall one decade per $S$. With $S = 77$ mV and $V_T = 0.4$ V, the off-current is about five decades below the threshold current, and the on/off ratio at 1 V is about $10^7$. Lowering the supply voltage means lowering $V_T$, which raises the off-current exponentially. This is why supply voltages stopped falling around 2005 (chapter 6).

```answer
id: mosfet/on-off
title: On against off
prompt: 'Use the widget (planar transistor). At V_DS = 1 V, how many orders of magnitude (powers of ten) separate the current at V_GS = 1 V from the current at V_GS = 0? Give a whole number.'
answer: 7
tolerance: 0.5
why: 'About 90 µA against about 8 pA: a ratio of about 1.2 × 10⁷, seven orders of magnitude.'
```

## The p-channel transistor

Swap every type: an n-type body, p-type source and drain, and a gate that must go *negative* relative to the source to pull holes into a channel. That is the **pMOS** transistor, the complement of the nMOS. Its equations are the same with signs reversed and holes' mobility in place of electrons'. Because holes are less mobile, a pMOS transistor carries less current than an nMOS of the same size; in older processes about half as much, so pMOS transistors were drawn about twice as wide. Chapter 5 puts one of each together.

## Real transistors

The square law describes long transistors well. Modern ones have channels a few tens of nanometres long, and several things change.

- **Velocity saturation.** In very strong fields, electrons stop speeding up, at about $10^7$ cm/s, as they lose energy to the lattice as fast as they gain it. The current then grows roughly linearly with $V_{GS} - V_T$, not as its square.
- **The drain's influence.** In a short channel the drain is close enough to the source to pull the barrier down itself, lowering $V_T$ as $V_{DS}$ rises and making the transistor harder to turn off.
- **Gate leakage.** Thinning the oxide raises $C_{ox}$, which gives the gate more control. But below about 2 nm, electrons tunnel straight through the oxide, and the leakage current grows roughly tenfold for every 0.2 nm thinner.

:::fab[Thinner, taller, all-around]
The industry answered each problem with a change of structure.

- **High-k metal gates** (2007). The gate dielectric became a hafnium-based oxide with about five times the permittivity of silicon dioxide, so a layer thick enough to stop tunnelling gives the capacitance of a much thinner one; and the polysilicon gate became metal, with different metals for n- and p-type transistors to set their thresholds.:cite[mistry2007]
- **FinFETs** (2011). The channel stood up into a thin vertical fin with the gate wrapped over three sides, so that the gate, not the drain, controls every part of it. Try the widget's FinFET-like setting: a slope factor near 1, about 64 mV per decade, and for the same off-current about half as much again of on-current.:cite[hisamoto2000]
- **Gate-all-around nanosheets** (2022 onwards). The fin became a stack of horizontal sheets of silicon, each a few nanometres thick, with the gate wrapped all the way round each one.
:::

:::scale[Five atomic layers]
In the early 2000s the gate oxide of a leading transistor was about 1.2 nm of silicon dioxide: about five layers of atoms. It insulated the gate from a channel with a voltage of about a volt across it, an electric field of nearly ten million volts per centimetre, billions of times a second, for years.
:::

## Summary

- A MOS structure's gate sets the charge at the silicon surface: holes (accumulation), fixed ions (depletion), then electrons (inversion), beyond the threshold voltage $V_T = V_{FB} + 2\phi_F + Q_{dep}/C_{ox}$.
- Add n⁺ source and drain and the inversion layer is a channel: a resistor at small $V_{DS}$, saturating at $\tfrac{1}{2}\mu C_{ox}(W/L)(V_{GS} - V_T)^2$ once it pinches off.
- Below threshold the current falls by ten every $n \times 60$ mV, a limit set by the Boltzmann distribution, which ties leakage to threshold voltage.
- The pMOS transistor is the complement, with holes, a negative gate and less current per width.
- Short channels brought velocity saturation, drain influence and gate leakage, and the answers: high-k metal gates, FinFETs and gate-all-around nanosheets.
