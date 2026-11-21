---
number: 2
title: 'Doping: electrons and holes to order'
summary: 'One impurity atom in a million changes everything: donors, acceptors, the mass-action law, drift and diffusion.'
duration: 60 minutes
prerequisites: [bands]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: doping/check-1
title: Minority carriers
prompt: 'Silicon at 300 K is doped with $10^{16}$ phosphorus atoms per cm³. Take $n_i = 10^{10}$ per cm³. How many holes are there per cm³?'
answer: 10000
tolerance: 500
why: 'Almost every phosphorus atom gives up an electron, so n ≈ 10¹⁶. The mass-action law n p = n_i² then gives p = 10²⁰ / 10¹⁶ = 10⁴ per cm³: adding electrons has removed holes.'
```

```quiz
q: Which of these atoms, put in place of a silicon atom, makes silicon n-type?
options:
  - text: Arsenic, which has five valence electrons.
    correct: true
    why: 'Four of arsenic’s five valence electrons make the four bonds; the fifth is barely held and is freed at room temperature. Arsenic is a donor.'
  - text: Boron, which has three valence electrons.
    why: 'Boron is one electron short of four bonds. It takes one from a neighbouring bond, leaving a hole: boron is an acceptor, and makes silicon p-type.'
  - text: Germanium, which has four valence electrons.
    why: 'Germanium bonds exactly as silicon does. It changes the band gap slightly (which is useful) but adds no carrier.'
```
:::

In chapter 1, carriers in silicon came only from broken bonds, and there were very few of them. Here is the same flattened crystal, with a choice: replace a handful of silicon atoms with phosphorus or with boron, and watch what the newcomers do at room temperature.

::bond-lattice{choose=true doping="n" title="Silicon with impurities"}

With phosphorus, five atoms bring five extra electrons that roam freely, while the few holes made by broken bonds soon meet one of the many electrons and vanish. With boron, five holes wander away from their boron atoms, and free electrons become rare. Either way the crystal now has many more carriers than pure silicon, of one kind, put there on purpose. This is **doping**, and it is how every region of every transistor gets its character.

## Donors: an extra electron

Phosphorus sits one column to the right of silicon in the periodic table: it has five valence electrons. Put a phosphorus atom where a silicon atom would be, and four of its electrons form the four bonds with its neighbours. The fifth has no bond to join. It is still attracted to the phosphorus nucleus, but weakly, because the crystal around it screens the attraction, and it takes only about 0.045 eV to set it free, less than two $k_\mathrm{B}T$ at room temperature. At room temperature, essentially every phosphorus atom has lost its fifth electron. The atom left behind is a fixed positive ion, part of the crystal, which cannot move.

An atom that gives an electron to the conduction band is a **donor**. Phosphorus, arsenic and antimony are donors in silicon; silicon doped with them is **n-type**, because its mobile charges are mostly negative.

In the band picture, the donor's loosely bound electron sits at an energy level just below the conduction band, inside the gap. Lifting it into the conduction band costs 0.045 eV instead of 1.12.

## Acceptors: a missing electron

Boron, one column to the left, has three valence electrons, one too few to make four bonds. One bond around each boron atom is short of an electron: a hole. An electron from a neighbouring bond can hop in (it costs about 0.045 eV again), completing the boron's four bonds and moving the hole away. The boron atom, now holding an extra electron, is a fixed negative ion, and the hole wanders off through the crystal.

An atom that takes an electron from the valence band is an **acceptor**. Boron is the acceptor used almost everywhere in silicon; silicon doped with it is **p-type**, its mobile charges mostly positive.

:::key
Doping replaces a few silicon atoms with atoms that have one valence electron more (donors: n-type) or one fewer (acceptors: p-type). At room temperature almost every dopant atom is ionised: each donor contributes one free electron and becomes a fixed positive ion; each acceptor contributes one hole and becomes a fixed negative ion.
:::

:::history{year=1940 title="Positive and negative silicon" people="Jack Scaff, Henry Theuerer, Russell Ohl"}
In the late 1930s Bell Labs needed better crystal detectors for microwave radar, and its metallurgists set out to purify silicon. Jack Scaff and Henry Theuerer found that ingots of melted and refrozen silicon came out of two kinds, which they called p-type and n-type after the sign of the voltage each produced. The difference was traced to minute traces of impurities from the columns either side of silicon: boron and aluminium in one kind, phosphorus in the other.:cite[riordan1997] The same work produced, by accident, the first p–n junction: chapter 3.
:::

## How many of each: the mass-action law

Doping adds carriers of one kind. Surprisingly, it also removes carriers of the other kind. Why?

Two processes run all the time in any piece of silicon. **Generation**: heat breaks bonds, making electron–hole pairs at a rate that depends only on the temperature and the material. **Recombination**: a free electron meets a hole and falls back into the bond, at a rate proportional to how often they meet, which is proportional to the number of electrons times the number of holes. In equilibrium the two balance:

$$
\text{generation}(T) = r \cdot n \cdot p.
$$

The left side does not depend on doping, so neither does the product $n p$. In pure silicon $n = p = n_i$, so in any silicon in equilibrium,

$$
n\,p = n_i^2.
$$

This is the **mass-action law**. Flood silicon with electrons from donors, and holes meet electrons so often that they become scarce. In n-type silicon, electrons are the **majority carriers** and holes the **minority carriers**; in p-type, the other way round.

To find both numbers, add **charge neutrality**: a piece of silicon as a whole carries no charge, so the positive charges (holes and ionised donors, $N_D$ per cm³) balance the negative ones (electrons and ionised acceptors, $N_A$):

$$
p + N_D = n + N_A.
$$

With $N_D = 10^{16}$ and no acceptors, $n \approx 10^{16}$ and $p = n_i^2 / n = 10^4$ per cm³. When both kinds of dopant are present, they cancel: silicon with $3 \times 10^{16}$ donors and $10^{16}$ acceptors behaves as n-type with $2 \times 10^{16}$. This is **compensation**, and chip-making uses it all the time: a region can be made n-type and later turned p-type by adding more acceptors on top.

::doping-lab

```answer
id: doping/compensation
title: Compensation
prompt: 'A region of silicon contains $5 \times 10^{17}$ donors per cm³. An implant then adds $2 \times 10^{18}$ acceptors per cm³ to it. What type is it now, and how many majority carriers per cm³ does it have? Give the number.'
answer: 1.5e18
tolerance: 1e16
why: 'Acceptors outnumber donors by 2 × 10¹⁸ − 5 × 10¹⁷ = 1.5 × 10¹⁸ per cm³: the region is now p-type, with about 1.5 × 10¹⁸ holes per cm³. This is how a transistor’s p-type source and drain are made inside an n-type well (chapter 16).'
```

```answer
id: doping/resistivity
title: A thousand times more conductive
prompt: Use the widget. Pure silicon at 300 K has a resistivity of about 3 × 10⁵ Ω·cm. What is the resistivity, in Ω·cm, of silicon with 10¹⁶ donors per cm³? (Two significant figures.)
answer: 0.53
tolerance: 0.04
unit: Ω·cm
why: 'About 0.53 Ω·cm: more than half a million times lower, from replacing one atom in five million.'
```

## Where the Fermi level goes

In pure silicon the Fermi level sits near the middle of the gap. Doping moves it. Since the number of electrons is $n_i$ times the Boltzmann factor for the Fermi level's height above mid-gap,

$$
n = n_i\, e^{(E_F - E_i)/k_\mathrm{B}T}, \qquad E_F - E_i = k_\mathrm{B}T \ln\frac{n}{n_i}.
$$

Every factor of ten in $n$ raises the Fermi level by $k_\mathrm{B}T \ln 10 = 0.060$ eV at room temperature. For $10^{16}$ donors it sits 0.36 eV above mid-gap, 0.2 eV below the conduction band; in p-type silicon it sits as far below. Move the sliders in the widget above and watch it. The Fermi level will matter in the next chapter, because when two pieces of silicon touch, their Fermi levels must line up.

## Moving charge, 1: drift

Free electrons in silicon at room temperature are not at rest. They rush about at a **thermal velocity** of about $10^7$ cm/s (100 km/s), colliding with the vibrating lattice and with ionised dopants every few tenths of a picosecond, and bouncing off in random directions. With no field, all this motion averages to nothing.

Apply an electric field $E$, and between collisions each electron is accelerated a little towards the positive side. The result is a slow average **drift velocity** superimposed on the frantic random motion, proportional to the field:

$$
v_\text{drift} = \mu E.
$$

The constant $\mu$ is the **mobility**. In pure silicon at room temperature, electrons have $\mu_n \approx 1400$ cm²/V·s and holes, whose motion is a relay of hops between bonds, $\mu_p \approx 470$. Mobility falls with doping, because ionised dopant atoms are extra obstacles: at $10^{18}$ per cm³, electron mobility is below 300. The widget above uses these values.

The current density carried by drift is the charge per carrier times the number of carriers times their velocity, summed over electrons and holes:

$$
J = q\,(n \mu_n + p \mu_p)\,E = \frac{E}{\rho}, \qquad \rho = \frac{1}{q\,(n \mu_n + p \mu_p)}.
$$

That is Ohm's law, with the resistivity $\rho$ computed from the carrier numbers.

```answer
id: doping/drift-speed
title: How fast is a current?
prompt: 'An electron in lightly doped silicon has a mobility of 1400 cm²/V·s. What is its drift velocity, in km/s, in a field of 1000 V/cm (1 volt across 10 µm)?'
answer: 14
tolerance: 0.5
unit: km/s
why: 'v = μE = 1400 × 1000 = 1.4 × 10⁶ cm/s = 14 km/s. Fast, but well below the 100 km/s of random thermal motion. At much higher fields the drift velocity stops growing near 10⁷ cm/s, the saturation velocity, a limit that matters in short transistors (chapter 6).'
```

## Moving charge, 2: diffusion

There is a second way for carriers to move, with no field at all. Release a crowd of electrons in one corner and their random motion spreads them out, simply because there are more of them to wander out of a crowded region than into it. The flow is proportional to how steeply the concentration changes, its gradient:

$$
J_\text{diff} = q D_n \frac{dn}{dx} \quad\text{(electrons)}.
$$

$D$ is the **diffusion coefficient**. Diffusion and drift are both the random walk, seen two ways, so their constants are linked by Einstein's relation:

$$
D = \mu \frac{k_\mathrm{B}T}{q},
$$

which gives electrons in pure silicon $D_n \approx 36$ cm²/s. In time $t$, a crowd starting at one point spreads by about $\sqrt{2Dt}$: 0.27 µm in 10 picoseconds.

Try both below. Start with the electrons bunched on the left and no voltage, and watch them diffuse. Then close the ends, apply a voltage, and wait: the electrons pile up towards the positive end, but not all the way, because diffusion pushes back against the crowding. They settle into an exponential profile, $n \propto e^{qVx/Lk_\mathrm{B}T}$, in which the drift current and the diffusion current cancel exactly at every point.

::drift-diffusion

:::key
Carriers move by **drift** (pushed by a field, $v = \mu E$) and by **diffusion** (spreading down a concentration gradient). In equilibrium, wherever there is a gradient there is a field that holds it, and the two currents cancel. That balance is exactly what builds the electric field inside a p–n junction, in the next chapter.
:::

:::know[How do we know what carriers there are?]
In 1879 Edwin Hall found that a magnetic field across a current-carrying strip pushes the moving charges to one side, producing a small voltage across the strip. Its sign tells whether the carriers are negative or positive, and its size tells how many there are per cm³. Holes are not a theorist's convenience: in p-type silicon the Hall voltage has the opposite sign, exactly as for positive particles. Hall measurements are still how doping is calibrated. In the fab, a faster tool is the **four-point probe**: four needles in a row, current through the outer two, voltage across the inner two, which gives the resistivity of a layer without the contacts' resistance getting in the way.:cite[sze2007]
:::

## Temperature, again

The question at the end of chapter 1 has an answer now. In doped silicon the carriers come from dopants, and dopants need only about 0.045 eV to ionise. Doped silicon therefore has three temperature regimes:

1. **Freeze-out**, at low temperature: the extra electrons fall back to their donor atoms and conduction fades. In moderately doped silicon it begins below about 100 K and is nearly complete at a few tens of kelvin. Very heavily doped regions, like a transistor's source and drain, never freeze out.
2. **The extrinsic range**, covering room temperature: the carriers are the dopants' and their number hardly changes with temperature. This is where chips are designed to work.
3. **The intrinsic range**, when hot: $n_i$ grows past the doping, and the silicon behaves as if pure again, with equal numbers of electrons and holes. Set the widget's doping to $10^{15}$ and the temperature to 600 K to see it happen.

So silicon chips do work in liquid nitrogen, and even at 4 K, where they control the qubits of quantum computers. In a transistor the carriers that matter come from dopants and from the gate's field (chapter 4), not from broken bonds.

:::fab[What a wafer is doped with]
A typical wafer arrives at the fab lightly doped with boron throughout, about $10^{15}$ per cm³, about 10 Ω·cm. Everything else is added locally, region by region: wells around $10^{17}$, transistor channels tuned with careful amounts, and sources and drains above $10^{20}$, where one atom in a few hundred is a dopant. The usual way in is ion implantation, firing dopant ions into the surface at chosen energies through openings in a mask (chapter 15).
:::

:::scale[Counting dopants one by one]
In chapter 1 we fitted about 240 000 silicon atoms into the channel of a modern transistor. Dope that channel at $10^{18}$ per cm³ (one atom in fifty thousand) and it holds, on average, about five dopant atoms. Whether a particular transistor gets three or seven is a matter of chance, and its threshold voltage (chapter 4) changes with it. This **random dopant fluctuation** is one reason today's transistors leave their channels essentially undoped and set their threshold another way.
:::

## Summary

- Donors (phosphorus, arsenic) give an electron each: n-type. Acceptors (boron) take one, making a hole: p-type. At room temperature essentially all are ionised.
- Generation and recombination balance to give the mass-action law $n p = n_i^2$; with charge neutrality it fixes both $n$ and $p$. Opposite dopants compensate.
- The Fermi level rises towards the conduction band in n-type silicon and falls towards the valence band in p-type: $E_F - E_i = k_\mathrm{B}T \ln(n/n_i)$.
- Carriers drift in a field ($v = \mu E$) and diffuse down gradients ($J = qD\,dn/dx$), with $D = \mu k_\mathrm{B}T/q$. In equilibrium the two balance.
