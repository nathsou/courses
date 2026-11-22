---
number: 14
title: 'Lithography: printing with light'
summary: 'Masks, photoresist and projection optics; diffraction, the Rayleigh limit, optical proximity correction and extreme ultraviolet.'
duration: 80 minutes
prerequisites: [wafer]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: lithography/check-rayleigh
title: The Rayleigh limit
prompt: 'A scanner uses 193 nm light through water with a numerical aperture of 1.35. With k₁ = 0.28, what is the smallest half-pitch it can print in one exposure, in nanometres?'
answer: 40
tolerance: 0.5
unit: nm
why: 'Half-pitch = k₁ λ / NA = 0.28 × 193 / 1.35 ≈ 40 nm: lines 40 nm wide at an 80 nm pitch, from light whose wavelength is almost five times larger.'
```

```quiz
q: Why are extreme-ultraviolet scanners built entirely of mirrors, in vacuum?
options:
  - text: Every material absorbs 13.5 nm light strongly, including glass and air, so there can be no lenses and no air in the path.
    correct: true
    why: 'At 92 eV per photon, EUV is absorbed within a fraction of a micrometre by almost anything. The mirrors are stacks of dozens of alternating molybdenum and silicon layers, each pair reflecting a little in phase; even so, each mirror reflects only about 70 %.'
  - text: Mirrors are cheaper than lenses at that size.
    why: 'EUV mirrors are among the most precise optical surfaces ever made, and are not cheap. There is simply no transparent material for lenses.'
  - text: Mirrors avoid chromatic aberration, which is worse at short wavelengths.
    why: 'EUV light from a tin plasma is filtered to a narrow band, so chromatic aberration is not the issue; absorption is.'
```
:::

A chip is built layer by layer, and every layer's pattern is printed onto the wafer with light. Here is the basic problem. A mask carries a grating of opaque lines; a lens projects its image onto a light-sensitive film, the photoresist. Shrink the pitch and watch what reaches the resist.

::aerial-image

At large pitches the image is a faithful copy of the mask. As the pitch shrinks, the edges blur, the contrast falls, and below a certain pitch the image becomes perfectly flat: the lines are not printed at all, however good the resist. The left panel shows why. The mask scatters light into a set of directions, its **diffraction orders**, and the lens can collect only those within its numerical aperture. Below the limit, only the straight-through order is collected, and a single order carries no pattern. Switch to a shorter wavelength or a larger aperture, and the limit moves. That race, against diffraction, has driven chipmaking for sixty years.

## Printing with light

Lithography borrows its name from printing. A wafer is coated with **photoresist**, a polymer film a few tens of nanometres to a micrometre thick, whose solubility changes where light falls on it. In a **positive** resist, exposed regions dissolve in the developer; in a **negative** resist, they stay. The light passes through a **mask** (or reticle): a plate of quartz carrying the layer's pattern in an opaque film, drawn four times larger than it will print. A projection lens, or a set of mirrors, shrinks the image fourfold onto the wafer. After development, the resist pattern protects some regions of the wafer from the next step, an etch or an implant, and is then stripped off.

The machine is a **scanner**. It exposes one field (a rectangle up to 26 mm × 33 mm) by sweeping a slit of light across mask and wafer simultaneously, the two moving in opposite directions at a precise ratio of speeds, then steps to the next field; a modern scanner exposes well over a hundred wafers an hour. Each layer must land on the ones beneath it with an error (**overlay**) of a couple of nanometres, over the whole wafer.

:::fab[Why the room is yellow]
Photoresists are made to react to deep ultraviolet light, and many also react, weakly, to the blue and violet in ordinary white light. The rooms where wafers are coated, exposed and developed are therefore lit with yellow light, which contains no short wavelengths. Walking into a lithography bay is walking into the colour this course's day theme is named after.
:::

## Diffraction and the limit

A grating of pitch $p$ diffracts light of wavelength $\lambda$ into directions where waves from neighbouring slits arrive in step:

$$
\sin\theta_n = \frac{n\lambda}{p}, \qquad n = 0, \pm 1, \pm 2, \ldots
$$

The finer the grating, the wider the angles. A lens collects rays up to an angle given by its **numerical aperture**, $\mathrm{NA} = n \sin\theta_{\max}$ (with $n$ the refractive index of the medium between lens and wafer). To form any image of the grating, the lens must collect at least two orders, which interfere to make the fringes; the zeroth order alone gives uniform light. With the light arriving straight on, the first order must satisfy $\lambda/p \leq \mathrm{NA}$. Illuminating at an angle (the widget's σ, the spread of illumination angles as a fraction of the lens's) shifts the orders and can bring the first order in at the opposite edge, which gives the absolute limit

$$
p_{\min} = \frac{\lambda}{\mathrm{NA}\,(1 + \sigma)}, \qquad \text{half-pitch} = k_1 \frac{\lambda}{\mathrm{NA}}, \quad k_1 \geq 0.25.
$$

The second form is **Rayleigh's criterion** as lithographers write it. The factor $k_1$ measures how hard a process pushes: above 0.6 printing is easy; production now runs at 0.3 or below, with every trick in this chapter. At $k_1 = 0.25$ the first orders sit at the very edges of the lens, and no single exposure can do better.

```answer
id: lithography/euv-k1
title: How hard is EUV working?
prompt: 'An EUV scanner (λ = 13.5 nm, NA = 0.33) prints lines and spaces at a pitch of 28 nm. What is its k₁? (Two decimal places.)'
answer: 0.34
tolerance: 0.006
why: 'k₁ = (14 nm × 0.33) / 13.5 nm ≈ 0.34: comfortable by the standards of 193 nm immersion lithography, which runs near 0.28. That headroom is what EUV bought.'
```

### Depth of focus

The same optics fix how far from perfect focus the wafer may be: roughly

$$
\mathrm{DOF} \approx k_2 \frac{\lambda}{\mathrm{NA}^2}.
$$

A larger aperture resolves finer detail but has a shallower focus. Drag the widget's defocus slider at a fine pitch and watch the contrast collapse within a hundred nanometres or so. That is why every layer must be polished flat (chapter 15), and why scanners measure the height of the wafer under every field before exposing it.

## Shorter wavelengths, larger lenses

For four decades the main lever was the light. Mercury lamps gave the g-line at 436 nm and then the i-line at 365 nm; excimer lasers gave krypton fluoride at 248 nm in the 1990s and argon fluoride at 193 nm in the 2000s. Lenses grew to apertures above 0.9, about the limit in air. Then, in the mid-2000s, **immersion** lithography put a film of ultrapure water between the last lens and the wafer. Water's refractive index at 193 nm is 1.44, so the aperture could exceed 1: 1.35 in today's scanners. Attempts at 157 nm, with fluorine lasers, failed for lack of suitable lens materials, and 193 nm immersion carried the industry for more than a decade.

## Below the limit

When the wavelength stopped shrinking, lithographers squeezed $k_1$ instead.

- **Off-axis illumination**: lighting the mask from carefully chosen angles (rings, pairs of poles, the σ of the widget) so that more diffraction orders fit through the lens for the patterns that matter.
- **Phase-shift masks**: etching the quartz so that light through neighbouring openings arrives half a wavelength out of step, which sharpens the dark line between them.:cite[levenson1982]
- **Optical proximity correction** (OPC): deliberately distorting the mask so that the printed shape comes out as intended.
- **Multiple patterning**: splitting a layer's pattern between two, three or four exposures and etches, each at a printable pitch, or printing lines and then building thin films on their sides (spacers) to double or quadruple their density.

OPC is now applied to every critical layer of every chip. Near the resolution limit, corners round, line ends pull back, and the same line prints at different widths depending on its neighbours. The fix is to predict the print with a model of the optics and the resist, and move the mask's edges to compensate, iterating until the predicted print matches the drawing:

::opc-lab

Run OPC on the line ends and look at the mask: hammerheads grow on the ends, and the edges acquire small jogs. Real OPC is run on whole chips, billions of edges, on large computer clusters, and modern masks look like nothing the designer drew. Switch to EUV and see how little correction the same pattern needs at a wavelength fourteen times shorter.

## Extreme ultraviolet

The leap the industry spent twenty years and billions of dollars on was **extreme ultraviolet** (EUV) lithography, at 13.5 nm, in volume production since 2019. Nothing is transparent at that wavelength, so EUV changes everything.

- **The source.** Droplets of molten tin, about fifty thousand a second, fly through a vacuum chamber. Each is hit by a weak laser pulse that flattens it into a pancake, then by a powerful carbon-dioxide laser pulse that turns it into a plasma at hundreds of thousands of degrees, which emits at 13.5 nm.
- **The optics.** Every element is a mirror, coated with dozens of alternating layers of molybdenum and silicon, each pair a few nanometres thick, which reflect about 70 % at best. After a dozen or so reflections only a few per cent of the light reaches the wafer.
- **The mask.** A reflective mask too: the pattern is an absorbing layer on top of a similar multilayer mirror.

How can a stack of layers reflect what no single surface does? Each interface between molybdenum and silicon reflects a tiny fraction of the light, because their refractive indices at 13.5 nm differ slightly (both are a little below 1). If the layers repeat every half wavelength or so, the reflections from all the interfaces leave in step and add up, as the planes of atoms in a crystal reflect X-rays. Build one:

::euv-mirror

```answer
id: lithography/euv-period
title: Tuning the mirror
prompt: 'Set 40 pairs. What period puts the peak of reflectivity at 13.5 nm? Give it in nanometres, to two decimal places.'
answer: 6.92
tolerance: 0.03
unit: nm
why: 'The reflections add in phase when one pair is about half a wavelength thick: 2 × 6.92 nm = 13.84 nm, a little more than 13.5 nm because the light travels through materials whose refractive indices are slightly below 1. A period 1 % off moves the peak by about 1 %, far enough to lose much of the light: the layers must be made to a few hundredths of a nanometre, a fraction of an atom, over mirrors tens of centimetres across.'
```

The reflectivity grows with every pair until the light no longer reaches the bottom of the stack, around forty pairs, at a little under 75 % in this model of perfect layers.:cite[henke1993] Real mirrors reach about 70 %, the difference lost to rough and intermixed interfaces. Each mirror passes on less than three quarters of the light, so the dozen or so in a scanner pass on only a few per cent of what the source emits. That is why the tin-plasma source must be so powerful, and why its power, for years, limited how many wafers an EUV scanner could expose in an hour.

One company, ASML, makes all the EUV scanners in use; each costs well over a hundred million euros. The newest generation, with a numerical aperture of 0.55 instead of 0.33 (**high-NA EUV**), is entering production in the mid-2020s.

:::scale[Counting photons]
An EUV photon carries 92 eV, fourteen times the 6.4 eV of a 193 nm photon. For the same exposure energy there are fourteen times fewer photons, and at the doses used, a square 10 nm on a side receives only a few thousand of them. Photons arrive at random, so the count varies from square to square by a few per cent; resist molecules react at random too. These **stochastic** effects roughen edges and, rarely, leave a contact hole unopened or two lines bridged. They now set the limits as much as the optics do.
:::

:::history{year=1957 title="Photolithography" people="Jay Lathrop, James Nall"}
At the US Army's Diamond Ordnance Fuze Laboratories in 1957, Jay Lathrop and James Nall used photoresist from Kodak, and a microscope objective used backwards, to pattern tiny transistors for proximity fuzes, and named the technique photolithography. Lathrop moved to Texas Instruments and Nall to Fairchild, where photolithography with Hoerni's planar process (chapter 16) made the integrated circuit manufacturable.
:::

## Summary

- Lithography prints each layer's pattern into photoresist through a mask, four times reduced by a scanner, with overlay errors of a few nanometres.
- A lens forms an image only from the diffraction orders it collects; the smallest half-pitch is $k_1 \lambda/\mathrm{NA}$ with $k_1 \geq 0.25$, and the depth of focus shrinks as $\lambda/\mathrm{NA}^2$.
- Wavelengths fell from 436 to 193 nm; immersion raised the aperture to 1.35; off-axis light, phase shifting, OPC and multiple patterning pushed $k_1$ towards its limit.
- EUV at 13.5 nm needs tin-plasma sources, multilayer mirrors and reflective masks in vacuum; its photons are so energetic that their randomness matters.
