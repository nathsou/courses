---
number: 15
title: 'Adding and removing: deposition, etching and doping'
summary: 'Oxidation, CVD and ALD, wet and plasma etching, ion implantation and annealing, and polishing flat.'
duration: 75 minutes
prerequisites: [lithography]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: Why does a plasma etch cut nearly vertical walls when a liquid etch undercuts its mask?
options:
  - text: The plasma accelerates ions straight down onto the wafer, and the etching happens mostly where they strike.
    correct: true
    why: 'An electric field forms between the plasma and the wafer (the sheath) and drives positive ions downwards. Floors are bombarded; walls, hit only at grazing angles, barely etch, especially when the chemistry also coats them with a protective film.'
  - text: The gases in a plasma are hotter, so they react faster downwards.
    why: 'Heat speeds up reactions in every direction equally; it is the direction of the ions that matters.'
  - text: A plasma cannot reach under the mask because it is a gas.
    why: 'Gas molecules reach under a mask perfectly well; neutral radicals alone would undercut it like a liquid.'
```

```answer
id: etch/check-oxide
title: Glass eats silicon
prompt: 'A thermal oxide 100 nm thick is grown on a silicon wafer. About how much of the original silicon, in nanometres, has it consumed?'
answer: 44
tolerance: 2
unit: nm
why: 'About 44 % of the oxide’s thickness: each nanometre of oxide contains the silicon atoms of about 0.44 nm of silicon. The oxide grows into the wafer as well as above it, which is why the interface it forms is buried, clean and nearly perfect.'
```
:::

Every structure on a chip is made by repeating a handful of operations: put a layer down, print a pattern on it, remove what the pattern leaves exposed, change the silicon underneath, make it flat again. Here is the operation that turns a printed pattern into a physical one, an etch through a resist mask, seen in cross-section. Compare a wet etch and a plasma etch, and run each beyond the moment the film clears.

::etch-lab

The wet etch eats sideways as fast as downwards: by the time it clears the film, the opening has widened by twice the film's thickness, and a pattern finer than its film cannot survive. The plasma etch cuts almost straight down, keeping the mask's dimensions, but it erodes the mask too, and once through the film it starts on whatever lies beneath. Every etch step is a trade between these: direction, selectivity, speed, damage. This chapter covers the four families of operation, add, remove, change and flatten, and the physics that sets their limits.

## The process as a loop

A leading-edge chip passes through well over a thousand process steps over two to three months. Most of them belong to a loop that repeats for every layer:

1. **Add** a film: grow it from the silicon itself (oxidation), or deposit it (chemical or physical vapour deposition, atomic layer deposition, electroplating).
2. **Pattern** it: coat with resist, expose, develop (chapter 14).
3. **Remove** what is exposed: etch.
4. **Change** what is exposed: implant dopants, then anneal.
5. **Strip** the resist and **clean**, often polish flat, then **measure** and **inspect**.

## Growing oxide

Silicon heated in oxygen or steam grows silicon dioxide, glass. The oxidising molecules must diffuse through the oxide already grown to reach the silicon, so growth slows as the layer thickens. Bruce Deal and Andrew Grove described this in 1965 with a model still used today:

$$
x^2 + A x = B\,(t + \tau).
$$

For thin oxides growth is linear in time, limited by the reaction at the interface ($x \approx (B/A)\,t$); for thick ones it is parabolic, limited by diffusion through the oxide ($x \approx \sqrt{Bt}$).:cite[dealgrove1965] Steam diffuses through oxide far faster than oxygen, so wet oxidation is used for thick insulating layers and dry for thin, high-quality ones.

::oxide-lab

```answer
id: etch/wet-oxide
title: An hour in steam
prompt: 'Use the widget. How thick, in nanometres, is the oxide grown in steam in one hour at 1000 °C? (Within 20 nm.)'
answer: 388
tolerance: 20
unit: nm
why: 'About 390 nm in steam, against about 58 nm in dry oxygen. The thermal oxide’s great virtue is its interface: grown into the crystal, it leaves very few broken bonds, which is what made the MOSFET work in 1959 (chapter 4).'
```

## Depositing films

Most films cannot be grown from the silicon and must be deposited on top.

- **Chemical vapour deposition** (CVD): gases react on the hot wafer and leave a solid film. Silane gives polysilicon; tetraethyl orthosilicate (TEOS) gives silicon dioxide; dichlorosilane and ammonia give silicon nitride. Adding a plasma (PECVD) supplies the energy to react at lower temperatures, so films can go on top of metals that would not survive a furnace.
- **Physical vapour deposition** (PVD), usually **sputtering**: ions from a plasma knock atoms off a target of the material, which fly in straight lines to the wafer. It is used for metals: the thin barriers and seed layers under copper, for instance.
- **Atomic layer deposition** (ALD): two precursor gases are let in alternately, each reacting only with the surface left by the other, then stopping. Each cycle adds about a tenth of a nanometre, exactly, on every exposed surface however steep or deep. The high-k gate dielectrics of chapter 4 are made this way, a couple of nanometres in a few dozen cycles.
- **Electroplating**: copper wires are grown from a solution onto a thin seed layer.
- **Epitaxy**: growing new single-crystal silicon (or silicon–germanium) that continues the wafer's lattice, for channels and for the stressed sources and drains that speed up modern transistors.

How a film coats steep features, its **conformality**, matters more with every generation, as structures grow taller and narrower:

::deposition-lab

:::scale[Atom by atom]
ALD was invented in Finland in the 1970s by Tuomo Suntola, to make electroluminescent displays. Half a century later it is how chip factories deposit the films where every atomic layer counts. A gate dielectric of 2 nm is about twenty ALD cycles; a DRAM capacitor's dielectric must coat the inside of holes many times deeper than they are wide, uniformly, on every wafer, every time.
:::

## Etching

**Wet etching** dips the wafer in a liquid: hydrofluoric acid dissolves silicon dioxide but not silicon; hot phosphoric acid dissolves silicon nitride but barely touches oxide. Wet etches can be exquisitely **selective**, removing one material and stopping on another, but they are **isotropic**, eating sideways as fast as down. They are still used for cleaning and for stripping films, but not for patterning fine features.

**Dry** or **plasma etching** fills a chamber with a low-pressure gas, energised into a plasma by radio-frequency power. The plasma makes reactive radicals (fluorine, chlorine) that attack the film chemically, and ions that the field above the wafer accelerates straight down. Etching happens mainly where ions strike, so the floors of features etch and their walls barely do: **anisotropic** etching, called **reactive-ion etching** (RIE). The chemistry is tuned so that by-products form a thin protective film on the walls, and so that the etch is selective enough to stop on the layer below. Etch tools watch the plasma's light for the moment the chemistry changes, the **end point**, and add a calculated over-etch to clear every feature on the wafer.

```answer
id: etch/undercut
title: Undercut
prompt: 'An isotropic wet etch removes a 200 nm film through a mask opening 120 nm wide, stopping the moment the film clears at the centre of the opening. How wide, in nanometres, is the opening at the top of the film, just under the mask?'
answer: 520
tolerance: 2
unit: nm
why: 'The etch has gone 200 nm down and 200 nm sideways from each edge: 120 + 2 × 200 = 520 nm. Use the widget with the wet etch at 100 %: the undercut is the full film thickness on each side.'
```

## Doping

Doping by diffusion, heating the wafer in a gas containing the dopant, made the first integrated circuits. Since the 1970s it has been done almost entirely by **ion implantation**: dopant atoms are ionised, accelerated through tens of kilovolts (from below one to several thousand), filtered by a magnet so that only the right ions pass, and scanned across the wafer. Each ion slows down by colliding with silicon nuclei and electrons and stops at a depth that varies randomly around the **projected range** $R_p$, with a spread called the **straggle** $\Delta R_p$; the resulting profile is roughly Gaussian. The **dose**, the number of ions per cm² (from about $10^{11}$ to over $10^{16}$), is counted precisely from the beam current. Wherever the resist (or a gate) blocks the beam, nothing is implanted.

::implant-lab

Implantation wrecks the crystal locally, knocking silicon atoms out of place, and leaves most dopant atoms in positions where they do nothing. An **anneal** restores the lattice and moves the dopants onto lattice sites, where they become donors or acceptors. Heat also lets them diffuse, which blurs the profile and deepens the junction. Modern processes anneal very hot for a very short time, seconds or even milliseconds with lamps and lasers, so that the crystal heals before the dopants have time to move. In the widget, 10 s at 1 000 °C barely moves an arsenic junction; 30 minutes in a furnace doubles its depth.

:::history{year=1954 title="Shooting dopants in" people="William Shockley"}
William Shockley patented the idea of doping semiconductors by bombarding them with ions in 1954. It took two decades, and machines borrowed from nuclear physics, before implanters became production tools in the 1970s. Their attraction was control: the dose counted ion by ion, the depth set by a voltage, the pattern set by a mask, the whole thing done at room temperature.
:::

## Making it flat

Each layer of patterns leaves the surface uneven, and lithography needs it flat to within its depth of focus (chapter 14). **Chemical-mechanical polishing** (CMP), developed at IBM in the 1980s, presses the wafer face down on a rotating pad flooded with a slurry of fine abrasive particles in a reactive chemical, which together remove high points faster than low ones. CMP made possible the **damascene** process for copper wiring (chapter 16): etch trenches into insulator, overfill them with copper, polish the excess away until only the copper in the trenches is left. To polish evenly, every region of every layer must have a similar density of material, so designers' tools fill empty areas with dummy shapes that serve no electrical purpose.

:::know[How do we know what we made?]
Fabs measure after almost every step. **Ellipsometry** measures film thickness to a fraction of a nanometre from how the film changes the polarisation of reflected light. Scanning electron microscopes measure the widths of printed lines (CD-SEM) and inspect for defects. Optical scatterometry infers profile shapes from how a test grating diffracts light. Secondary-ion mass spectrometry sputters a sample away layer by layer and weighs what comes off, giving dopant concentration against depth, the real version of the widget's curves. And when something is wrong, a chip is sliced with an ion beam and imaged in a transmission electron microscope, atom by atom.
:::

## Summary

- Every layer goes through add, pattern, remove, change, strip and clean, measure; a leading-edge chip takes well over a thousand steps.
- Thermal oxide grows into the silicon (44 % of its thickness), linearly at first and then as $\sqrt{t}$ (Deal–Grove); steam is much faster than dry oxygen.
- CVD, PECVD, PVD, ALD, electroplating and epitaxy deposit films; ALD coats every surface uniformly, one atomic layer per cycle.
- Wet etches are selective and isotropic; plasma (reactive-ion) etches are directional, at a cost in selectivity and damage.
- Ion implantation places dopants by energy and dose through masks; short, hot anneals activate them without moving them far.
- CMP polishes each layer flat and makes damascene copper wiring possible.
