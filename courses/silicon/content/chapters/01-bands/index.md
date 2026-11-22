---
number: 1
title: 'Why silicon: atoms, bonds and bands'
summary: A crystal held together by shared electrons, the band gap, and why a semiconductor conducts a little, and more when warm.
duration: 60 minutes
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: bands/check-1
title: Room-temperature energy
prompt: 'Thermal energy at temperature $T$ is of the order of $k_\mathrm{B}T$. Silicon’s band gap is 1.12 eV. At 300 K, how many times $k_\mathrm{B}T$ is that? (Round to the nearest whole number.)'
answer: 43
tolerance: 1
why: '$k_\mathrm{B}T$ at 300 K is 0.0259 eV, and 1.12 / 0.0259 ≈ 43. Breaking a bond costs about 43 times the typical thermal kick, which is why so few bonds are broken.'
```

```quiz
q: Warm a piece of pure silicon from 20 °C to 80 °C. What happens to its electrical resistance?
options:
  - text: It falls, by a large factor.
    correct: true
    why: 'Heat breaks bonds and frees carriers; their number grows exponentially with temperature (it doubles about every 9 K), which swamps the small loss of mobility.'
  - text: It rises a little, as a copper wire’s does.
    why: 'A metal’s resistance rises because its electrons scatter more off the vibrating lattice, but a metal’s number of free electrons is fixed. A semiconductor’s is not.'
  - text: It stays the same.
    why: 'Only if the number of carriers did not depend on temperature, and in a pure semiconductor it depends on it exponentially.'
```
:::

Here is a crystal of silicon, flattened into two dimensions so that every atom and every bond can be seen. Each line joining two atoms is one electron; each pair of lines is a bond, two electrons shared by two atoms. Drag the temperature up and watch.

::bond-lattice

At very low temperature nothing moves: every electron is locked in a bond, and the crystal is an insulator. As it warms, bonds start to break. Each break makes two things that can carry a current: a free **electron**, which wanders off, and the gap it leaves behind, a **hole**, which wanders too. Switch on the voltage and the electrons drift to the right while the holes drift to the left.

That is the whole of this chapter in one picture. Everything that follows explains why the bonds break so rarely (in real silicon at room temperature, about one bond in ten trillion), why a hole moves, and why that rarity, and the ability to change it, is what makes silicon the material of every chip.

## Conductors, insulators and something in between

Materials span an enormous range of electrical resistivity, the resistance of a 1 cm cube measured between opposite faces. Copper's is about $1.7 \times 10^{-6}\ \Omega\cdot$cm. Fused quartz, the purest glass, is above $10^{16}\ \Omega\cdot$cm: more than twenty orders of magnitude worse. Pure silicon at room temperature is in between, at about $3 \times 10^{5}\ \Omega\cdot$cm.

Being in between is not what makes silicon useful. Two other properties are:

1. **Its conductivity rises steeply with temperature.** A copper wire conducts a little *less* when warm. Pure silicon conducts about twice as well for every 9 °C it warms.
2. **Tiny amounts of impurity change its conductivity enormously.** One phosphorus atom for every five million silicon atoms lowers its resistivity by a factor of more than half a million. That is the subject of the next chapter, and the reason a transistor is possible.

Both properties have the same root: in a semiconductor, the number of charge carriers is not fixed. In a metal, every atom contributes an electron or two to a common sea, about $10^{23}$ per cm³, whatever the temperature. In a semiconductor, carriers must be created, and the cost of creating one is the central number of this chapter.

## The silicon crystal

A silicon atom has fourteen electrons. Ten are held tightly close to the nucleus and take no part in chemistry; the outer four, the **valence electrons**, do all the work. Silicon sits in the same column of the periodic table as carbon, and like carbon in diamond, each silicon atom in a crystal shares one electron with each of four neighbours, arranged at the corners of a tetrahedron around it. Each shared pair is a **covalent bond**.

The pattern repeats perfectly through the whole crystal, a structure called **diamond cubic**. Its cubic unit cell, 0.543 nm on a side, contains eight atoms, so a cubic centimetre of silicon holds

$$
\frac{8}{(0.543 \times 10^{-7}\ \mathrm{cm})^3} \approx 5.0 \times 10^{22}\ \text{atoms}.
$$

The flattened lattice above keeps what matters: every atom has four neighbours and every bond holds two electrons. In a perfect crystal at absolute zero all $4 \times 5.0 \times 10^{22}$ valence electrons per cm³ are in bonds, and none is free to move. The crystal does not conduct at all.

:::scale[How many atoms in a transistor?]
A transistor in a 2026 chip conducts through a channel of silicon a few nanometres thick and some tens of nanometres long and wide. A box 6 nm × 50 nm × 16 nm holds 4 800 nm³, or about 240 000 atoms. A cubic centimetre holds as many atoms as two hundred billion billion such boxes.
:::

## Breaking a bond

Atoms in a solid are never still. At temperature $T$ they vibrate, and the vibrations trade energy with the electrons in random amounts whose typical size is $k_\mathrm{B}T$, where $k_\mathrm{B} = 8.617 \times 10^{-5}$ eV/K is Boltzmann's constant. At room temperature (300 K) that is

$$
k_\mathrm{B}T = 0.0259\ \mathrm{eV}.
$$

An **electronvolt** (eV) is the energy an electron gains by falling through one volt: $1.602 \times 10^{-19}$ J. It is the natural unit for everything in this course.

To pull an electron out of a bond and set it free takes at least 1.12 eV, about 43 times $k_\mathrm{B}T$. Larger thermal kicks are not impossible, only rare: the chance of one at least $E$ big falls off as $e^{-E/k_\mathrm{B}T}$, the **Boltzmann factor**. Every extra $k_\mathrm{B}T$ of cost divides the chance by $e \approx 2.7$. Forty-three of them make it very small indeed, which is why so few bonds are broken. (Why the exponent ends up being half the gap, $E_g/2k_\mathrm{B}T$, comes below.)

### Holes

When a bond breaks, the freed electron moves through the crystal, pushed by any electric field and jostled by the lattice. But the bond it left is now missing an electron, and that has consequences of its own.

An electron in a neighbouring bond can hop into the gap without needing to be freed: it moves from one bond to another, which costs almost nothing. The gap is then in the neighbour's bond. Another hop moves it again. The **hole** wanders through the crystal like a bubble in water, and since it is a place where an electron is missing, the region around it carries a net charge of $+q$ (one electronic charge, positive). In an electric field, bond electrons hop preferentially towards the positive side, so the hole moves towards the negative side: exactly as a positive particle would.

Go back to the lattice and switch on the voltage. Electrons drift right, towards the + side; holes drift left. Both motions carry a current in the same direction, because moving a negative charge right is the same, as far as current goes, as moving a positive charge left.

:::key
A semiconductor has two kinds of mobile charge: free electrons (negative) and holes (positive). A hole is not a particle but the absence of an electron in a bond; it moves because bond electrons hop into it, and it behaves in every way that matters like a positive carrier.
:::

```quiz
q: In pure silicon, how do the numbers of free electrons and holes compare?
options:
  - text: They are equal, because each broken bond makes one of each.
    correct: true
    why: 'Every thermal break creates an electron–hole pair, and when an electron falls back into a hole both disappear together. In a pure crystal the two numbers stay equal; that number is called n_i, the intrinsic carrier concentration.'
  - text: There are more electrons, because holes are not real.
    why: 'Holes are as real as bubbles: they carry charge and current. Each broken bond makes one free electron and one hole.'
  - text: There are more holes, because each hole can move without breaking a bond.
    why: 'Easy movement does not create more of them. Holes and free electrons are made in pairs and destroyed in pairs.'
```

## Bands and the gap

The bond picture explains a lot, but to compute anything we need the picture physicists use, in which each electron's state has an energy and the states form **bands**.

An isolated atom's electrons occupy sharp energy levels. Bring two identical atoms close and each level splits in two, because the electrons can now be shared; bring $N$ atoms together and each level splits into $N$ closely spaced levels. With $5 \times 10^{22}$ atoms in every cubic centimetre, the levels crowd so closely that they form continuous ranges of allowed energy: bands. Between the bands are ranges with no allowed states at all.

::levels-to-bands

In silicon, the states of the electrons in bonds form the **valence band**, which at absolute zero is completely full. Above it, separated by the **band gap** $E_g$, lies the **conduction band**, the states of electrons free to move through the crystal, which at absolute zero is completely empty. A full band cannot carry current (there is no empty state for an electron to move into, as on a fully booked train nobody can change seats) and an empty one has no electrons to carry it. Breaking a bond is lifting an electron across the gap from the valence band into the conduction band. The empty state it leaves in the valence band is the hole.

This picture also sorts materials:

- In a **metal**, the highest occupied band is only partly full. Electrons can move into nearby empty states for no cost at all, so metals conduct at any temperature.
- In an **insulator**, the gap is wide: about 9 eV for silicon dioxide. Essentially no electron ever crosses.
- In a **semiconductor**, the gap is narrow enough that a few electrons cross at room temperature: 0.66 eV for germanium, 1.12 eV for silicon, 1.42 eV for gallium arsenide.

:::history{year=1931 title="Semiconductors explained" people="Alan Herries Wilson"}
In 1928 Felix Bloch showed that electrons in a perfectly periodic crystal move in bands of allowed energy. Three years later Alan Wilson, working in Heisenberg's institute in Leipzig, used the idea to explain why some solids are metals and others insulators, and why a few, with a small gap, conduct weakly and more so when heated.:cite[wilson1931] Many physicists still suspected that semiconduction was an effect of dirt, and the materials of the 1930s were too impure to settle it. Proof needed the ultrapure crystals that were grown only after the war, for transistors.
:::

### Counting the carriers

How many electrons are in the conduction band? Two things decide: how many states are available there, and how likely each is to be occupied.

The likelihood comes from the **Fermi–Dirac distribution**. A state of energy $E$ is occupied with probability

$$
f(E) = \frac{1}{1 + e^{(E - E_F)/k_\mathrm{B}T}},
$$

where $E_F$, the **Fermi level**, is the energy at which the probability is exactly one half. Far above $E_F$, $f(E)$ falls off as $e^{-(E - E_F)/k_\mathrm{B}T}$: the Boltzmann factor again. In a pure semiconductor there are as many holes as free electrons, which puts the Fermi level very near the middle of the gap. The conduction band then starts $E_g/2$ above $E_F$, and the chance that a state at its edge is occupied is about $e^{-E_g/2k_\mathrm{B}T}$. That is where the half comes from.

The number of available states is summarised by an **effective density of states**, $N_c$ for the conduction band and $N_v$ for the valence band, both close to $3 \times 10^{19}$ per cm³ for silicon at 300 K. Put the two together and the number of free electrons per cm³ in a pure crystal, which equals the number of holes, is

$$
n_i = \sqrt{N_c N_v}\; e^{-E_g / 2 k_\mathrm{B} T}.
$$

$n_i$ is the **intrinsic carrier concentration**. For silicon at 300 K, $e^{-E_g/2k_\mathrm{B}T} = e^{-21.7} \approx 3.6 \times 10^{-10}$, and $n_i \approx 1.0 \times 10^{10}$ per cm³: one free electron for every $5 \times 10^{12}$ atoms.

Explore the formula below. The left panel shows $f(E)$ on a logarithmic scale, so that you can see how thin the tail is by the time it reaches the conduction band. The right panel shows $n_i$ for each material against temperature, across eighty orders of magnitude.

::gap-explorer

```answer
id: bands/ge-vs-si
title: Germanium against silicon
prompt: Use the widget. At 300 K, roughly how many times more free electrons does pure germanium have than pure silicon? (Within a factor of two is fine.)
answer: 2100
tolerance: 1100
why: 'Germanium has n_i ≈ 2 × 10¹³ per cm³ against silicon’s 1 × 10¹⁰, about 2 000 times more. Its gap is only 0.46 eV smaller, but that is 18 kT, and the exponent halves it: e^8.9 ≈ 7 300, reduced about 3.5 times by germanium’s smaller densities of states.'
```

:::know[How do we know the band gap?]
Shine light on silicon. A photon of energy above 1.12 eV can lift an electron across the gap and is absorbed; a photon with less energy cannot, and passes through. A photon's energy is $E = hc/\lambda$, which is $1240\ \mathrm{eV\cdot nm}/\lambda$, so silicon is opaque to visible light but transparent to infrared beyond about 1 100 nm. Measuring the absorption edge gives the gap directly. It is also why silicon camera sensors stop seeing at about 1.1 µm, and why the optical fibres of the internet, at 1 310 and 1 550 nm, can be routed through silicon waveguides on a chip.

A second measurement uses temperature: the conductivity of pure silicon rises as $e^{-E_g/2k_\mathrm{B}T}$, so plotting its logarithm against $1/T$ gives a straight line of slope $-E_g/2k_\mathrm{B}$.:cite[sze2007]
:::

```answer
id: bands/transparent
title: Where silicon turns transparent
prompt: 'Silicon’s gap at room temperature is 1.12 eV. Using $\lambda = 1240\ \mathrm{eV\cdot nm} / E$, what is the longest wavelength, in nanometres, that it absorbs strongly?'
answer: 1107
tolerance: 15
unit: nm
why: '1240 / 1.12 ≈ 1107 nm, in the near infrared. Longer wavelengths pass through silicon almost unabsorbed.'
```

## Why silicon?

Germanium came first. The first transistor, built at Bell Labs in December 1947, was a slab of germanium with two gold contacts pressed against it, and germanium transistors filled the radios of the 1950s.:cite[riordan1997] Gallium arsenide has electrons about six times more mobile than silicon's, which makes it faster. Yet nearly every chip made today is silicon. There are four reasons, and only the first is about the band gap.

1. **The gap suits the job.** Germanium's narrower gap gives it 2 000 times more intrinsic carriers than silicon at room temperature, and the number doubles with every few degrees: a warm germanium device leaks. Silicon's 1.12 eV keeps leakage small up to well above 100 °C. A much wider gap would make the material harder to dope and to switch.
2. **It grows a superb insulator.** Heat silicon in oxygen and it grows a layer of silicon dioxide, glass, with a gap of about 9 eV and an almost perfect interface to the crystal underneath. That oxide insulates the gate of every transistor (chapter 4), masks the wafer during processing and protects its surface (chapter 15). Germanium's oxide dissolves in water.
3. **It is abundant.** Silicon is the second most abundant element in the Earth's crust after oxygen, about 28 % of it by mass, mostly as quartz sand.:cite[haynes2016]
4. **It is the material everything was built for.** Seventy years of purification, crystal growth, equipment and process knowledge are silicon's. A newcomer must beat all of it.

:::history{year=1954 title="The first silicon transistor" people="Gordon Teal"}
Gordon Teal had learned to grow single crystals of germanium at Bell Labs. At Texas Instruments he grew silicon ones, much harder because silicon melts at 1 414 °C rather than 938 °C, and in May 1954 announced a working silicon transistor. At a conference he played a record through an amplifier whose germanium transistors sat in hot oil; the music faded as they heated. He then swapped in silicon transistors, and it played on.:cite[riordan1997]
:::

## Temperature and the chip

Because $n_i$ depends on temperature exponentially, so does everything that leaks. In silicon near room temperature, $n_i$ doubles roughly every 9 K; between 25 °C and 100 °C it rises about 150-fold. That is one of the reasons chips have a maximum operating temperature, typically somewhere around 100 to 125 °C, and why a hot processor wastes more power than a cool one doing the same work (chapter 6).

:::question
At 77 K, the temperature of liquid nitrogen, the widget gives silicon an $n_i$ below one carrier per cubic kilometre. Does that mean a silicon chip stops working when cooled? (Chapter 2 has the answer: the carriers in a working device do not come from broken bonds at all.)
:::

## Summary

- Silicon atoms share their four valence electrons with four neighbours in a diamond-cubic crystal of $5.0 \times 10^{22}$ atoms per cm³.
- A broken bond makes two carriers: a free electron and a hole, which moves like a positive charge.
- In the band picture, the full valence band and the empty conduction band are separated by the band gap $E_g$, 1.12 eV for silicon.
- The intrinsic carrier concentration $n_i = \sqrt{N_c N_v}\, e^{-E_g/2k_\mathrm{B}T}$ is about $10^{10}$ per cm³ for silicon at room temperature, and doubles roughly every 9 K.
- Silicon wins on its gap, its oxide, its abundance and seventy years of investment.
