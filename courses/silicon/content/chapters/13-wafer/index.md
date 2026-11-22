---
number: 13
title: 'From sand to wafer'
summary: 'Reducing quartz, purifying silicon to eleven nines, growing a single crystal and slicing it into wafers.'
duration: 60 minutes
prerequisites: [doping]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: wafer/check-nines
title: Nine nines
prompt: 'Electronic-grade silicon is at least 99.9999999 % pure (“nine nines”). Silicon has 5 × 10²² atoms per cm³. How many impurity atoms per cm³ can such silicon contain, at most? (Write it like 2e12.)'
answer: 5e13
tolerance: 1e12
placeholder: 'e.g. 2e12'
why: 'One atom in 10⁹ of 5 × 10²²: 5 × 10¹³ per cm³, between 10¹³ and 10¹⁴ (log₁₀ ≈ 13.7). That is still far more than n_i, which is why the impurities that matter (dopants and metals) must be lower still, and why purity is quoted as low as parts per trillion for some.'
```

```quiz
q: 'When a silicon crystal is pulled from the melt, why is it first grown as a thin neck a few millimetres across, before widening to full size?'
options:
  - text: 'To grow out the dislocations that the thermal shock of dipping the seed creates.'
    correct: true
    why: 'Dislocations, lines of misplaced atoms, propagate along certain crystal planes; in a thin, fast-grown neck they run out to the surface and end. William Dash showed in 1959 that a crystal grown on top of such a neck could be entirely dislocation-free.'
  - text: 'To save silicon while the puller warms up.'
    why: 'The neck is grown deliberately, and the amount of silicon in it is negligible either way.'
  - text: 'So that the finished ingot can be hung from it during cooling.'
    why: 'The neck does carry the ingot’s weight (hundreds of kilograms, on a neck a few millimetres across), but that is a consequence, not the reason.'
```
:::

Every chip starts as a slice of a single crystal of silicon. Here is a 300 mm wafer, the size on which almost all advanced chips are made today, covered with dies. Change the die size and watch how many whole dies fit, and how much of the wafer's edge is wasted.

::wafer-map

A 300 mm wafer carries about 620 dies of 10 mm × 10 mm, and every one is printed and processed together, hundreds of steps at a time. This chapter is about where that wafer comes from: quartz, coal and chlorine, purified to the level of a few impurity atoms per billion, melted and grown into a single crystal up to two metres long, sliced and polished flatter than almost anything else made.

## From quartz to silicon

Silicon is the second most abundant element in the Earth's crust, but never free: it is bound to oxygen, as quartz (silicon dioxide) and in silicate rocks. The first step is to tear the oxygen away. In a submerged-arc furnace, quartz is heated with carbon (coal, coke and wood chips) to around 2 000 °C, and the carbon takes the oxygen:

$$
\mathrm{SiO_2} + 2\,\mathrm{C} \longrightarrow \mathrm{Si} + 2\,\mathrm{CO}.
$$

The product, **metallurgical-grade silicon**, is about 98–99 % pure, and most of it goes into aluminium alloys and silicone chemicals. Electronics and solar cells take only a fraction of the world's output, and need it far purer.

## Purification

A semiconductor's useful properties come from impurity concentrations of a part per million or less (chapter 2), so the starting material must contain much less than that. Metals such as iron and copper are especially harmful: they create energy levels deep in the gap that speed up recombination and leakage.

The standard route is the **Siemens process**. Metallurgical silicon reacts with hydrogen chloride to form trichlorosilane, $\mathrm{SiHCl_3}$, a liquid that boils at about 32 °C and can therefore be purified by repeated distillation, like spirits, leaving the metal chlorides behind. The purified vapour is then passed with hydrogen over thin silicon rods heated electrically to about 1 100 °C, where it decomposes and deposits silicon on them:

$$
\mathrm{SiHCl_3} + \mathrm{H_2} \longrightarrow \mathrm{Si} + 3\,\mathrm{HCl}.
$$

Over days the rods grow into thick bars of **polysilicon**, made of many small crystals, at least "nine nines" pure (99.9999999 %) and, for the most demanding uses, eleven.

:::scale[Eleven nines]
Eleven nines means one foreign atom in a hundred billion. If the silicon atoms of a wafer were people, there would be about one impurity atom for every dozen populations of the Earth. Few materials are made purer, and none in such quantity: more than a million tonnes of polysilicon a year, most of it for solar cells, which need somewhat less purity than chips.
:::

## Growing a single crystal

Polysilicon is pure but not a single crystal, and transistors need a perfect, continuous lattice: grain boundaries scatter carriers and leak. Nearly all chip-grade silicon is therefore grown by the **Czochralski method**.

Chunks of polysilicon are melted in a quartz crucible at a little above 1 414 °C, the melting point of silicon, under argon. A small **seed crystal**, cut along a chosen crystal direction, is dipped into the melt and slowly drawn upwards while seed and crucible rotate in opposite directions. Silicon freezes onto the seed, continuing its lattice exactly, atom by atom. The puller first grows a thin **neck**, to rid the crystal of the dislocations caused by the thermal shock of dipping; then widens it into a cone, the shoulder; then holds the diameter constant for the long body of the ingot, about a millimetre or less of growth per minute, adjusting the pull rate and the melt temperature continuously; then tapers it off. A 300 mm ingot weighs a few hundred kilograms and takes days to grow.

:::history{year=1916 title="A pen dipped in tin" people="Jan Czochralski"}
In 1916 the Polish chemist Jan Czochralski, working in Berlin on the speed at which metals crystallise, is said to have dipped his pen into a crucible of molten tin instead of his inkwell, and drawn out a thin thread of solid metal, which turned out to be a single crystal. He published the method in 1918.:cite[czochralski1918] It was a laboratory technique until 1950, when Gordon Teal and John Little at Bell Labs used it to grow single crystals of germanium for transistors.:cite[teal1950] In 1959 William Dash added the thin neck that makes dislocation-free silicon possible.:cite[dash1959]
:::

The crucible itself dissolves slowly into the melt, so Czochralski silicon contains about $10^{18}$ oxygen atoms per cm³. That turns out to be useful: oxygen strengthens the wafer against warping during hot processing, and clusters of it deep inside the wafer trap metal contaminants away from the transistors near the surface. For the purest silicon, as for some power devices, the crucible is avoided altogether: the **float-zone** method melts a narrow zone of a polysilicon rod with a radio-frequency coil and moves it slowly along the rod, so that the molten zone, held only by surface tension, never touches anything.

### Doping the ingot

Wafers are sold doped, to a specified resistivity, and the dopant (usually boron for p-type, phosphorus, arsenic or antimony for n-type) is added to the melt. But dopants do not freeze into the crystal at the same concentration as they have in the melt. The **segregation coefficient** $k$ is the ratio: the crystal takes up $k$ times the melt's concentration. For boron $k \approx 0.8$; for phosphorus 0.35; for antimony only 0.023. The dopant the crystal rejects stays in the shrinking melt, which grows steadily richer, and so does the crystal grown from it. If the melt started at concentration $C_0$, the crystal formed when a fraction $f$ of the melt has solidified holds

$$
C_s = k\,C_0\,(1 - f)^{k - 1}.
$$

This is **Scheil's equation**. With $k$ close to 1 the ingot is nearly uniform; with small $k$ its doping climbs steeply towards the tail.

::ingot-lab

```answer
id: wafer/ingot-spec
title: Boron against phosphorus
prompt: 'Use the widget with a target of 10 Ω·cm and a specification of ± 20 %. What percentage of a phosphorus-doped ingot meets it? (Boron gives 68 %.)'
answer: 30
tolerance: 2
unit: '%'
why: 'About 30 %. Phosphorus’s segregation coefficient of 0.35 makes the doping climb much faster along the ingot, so the resistivity falls out of specification much sooner. One reason p-type (boron-doped) wafers are the default for chips.'
```

:::know[How do we know the crystal is right?]
X-ray diffraction measures the orientation of the crystal planes to a fraction of a degree, so that wafers can be cut exactly along the (100) plane on which transistors are made. A four-point probe (chapter 2) maps the resistivity. Etching a sample in solutions that attack defects faster than perfect crystal reveals dislocations and other defects as visible pits, and infrared absorption measures the oxygen content.
:::

## Slicing and polishing

The ingot is ground to an exact diameter, and a small **notch** is ground along its length to mark the crystal orientation, so that machines can align every wafer the same way. Then it is sliced, with a wire saw carrying an abrasive slurry or diamond grit, into wafers 775 µm thick for 300 mm. The slices are lapped, etched to remove sawing damage, and polished by chemical-mechanical polishing until the surface is flat to within nanometres over the whole wafer, so that the lithography of chapter 14 can focus on all of it at once. Many wafers then receive a thin, perfect **epitaxial** layer of silicon grown on top, with exactly controlled doping.

## Bigger wafers

The first integrated circuits were made on wafers about an inch across. Diameters grew in steps (50, 75, 100, 125, 150 and 200 mm) and the first factories for 300 mm wafers opened around 2000. Each step lowered the cost per die: a wafer of twice the diameter holds more than four times as many dies, since less of its area is lost at the edge, and most process steps cost much the same per wafer whatever its size. An industry consortium worked in the 2010s towards 450 mm wafers, but the cost of developing every machine anew was too high, and the effort was abandoned; 300 mm remains the standard.

## Summary

- Quartz is reduced with carbon to metallurgical silicon (98–99 %), purified by distilling trichlorosilane, and deposited as polysilicon of nine to eleven nines (the Siemens process).
- Czochralski growth pulls a single crystal from the melt on a seed, through a thin neck that removes dislocations; the crucible adds useful oxygen.
- Dopants segregate between melt and crystal: Scheil's equation makes the doping rise along the ingot, steeply for small segregation coefficients.
- Ingots are ground, notched, sliced, lapped, etched and polished flat to nanometres; 300 mm wafers hold hundreds of dies each.
