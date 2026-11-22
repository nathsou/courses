---
number: 16
title: 'Building the inverter, step by step'
summary: 'From bare wafer to first metal in cross-section: isolation, wells, gates, sources and drains, contacts and copper.'
duration: 60 minutes
prerequisites: [etch-deposit-dope, signoff]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: In a CMOS process, the sources and drains are implanted after the gates are made. Why that order?
options:
  - text: The gate itself blocks the implant, so the source and drain line up with the gate exactly, with no overlay error.
    correct: true
    why: 'This is self-alignment. A source or drain that stops short of the gate leaves a gap the channel cannot bridge; one that runs far under it adds capacitance. Using the gate as its own mask removes the alignment error between the two layers altogether.'
  - text: The gate oxide must be grown at high temperature, which would melt the implanted regions.
    why: 'Silicon does not melt at oxidation temperatures. High temperatures would spread the implanted dopants, which is a reason to implant late too, but the decisive reason is alignment.'
  - text: Implanting first would leave the gate oxide too thin.
    why: 'The gate oxide is grown on silicon that has not yet been implanted in either order; the issue is where the implanted regions end relative to the gate.'
```

```answer
id: flow/check-masks
title: Counting masks
prompt: 'Making an inverter up to its first layer of metal, with one well, needs a mask for each of: active regions, the well, the gates, the n⁺ implant, the p⁺ implant, the contacts and metal 1. How many masks is that?'
answer: 7
why: 'Seven. A real process adds masks for the other well, threshold-adjusting and lightly doped drain implants, silicide blocking and much else, and many more for each of a dozen or more metal layers, some printed in several exposures: well over fifty in a leading-edge process.'
```
:::

Chapter 12 ended with a layout: rectangles on five layers. This chapter builds it. Here is a cut through the inverter's pMOS transistor beside a cut through its nMOS, starting from a bare p-type wafer. Step through the process. At each lithography step, the mask is taken from the layout; the light passes through its clear parts.

::process-flow

Twenty-seven steps take a bare wafer to two transistors and their first wires, using seven masks and nearly every technique of chapters 13 to 15: oxidation, CVD, lithography, plasma etching, polishing, implantation and annealing, sputtering and electroplating. A real flow of the mid-2020s has well over a thousand steps, including the cleans and measurements between them, and takes about three months.

## Front end and back end

The flow divides into two halves. The **front end of the line** (FEOL) makes the transistors, in and on the silicon itself: isolation, wells, gates, sources and drains. It involves the highest temperatures and the most delicate layers. The **back end of the line** (BEOL) wires them together: contacts, then layer after layer of metal and insulator. Once the first metal is down, nothing may get hot enough to damage it, and the back end runs below about 400 °C.

## Isolation

Transistors must be electrically separated from their neighbours. Older processes grew thick oxide between them by **local oxidation** (LOCOS, developed at Philips around 1970), with a nitride mask over the active regions; the oxide crept under the mask's edges in a shape called the bird's beak, wasting space. Since the late 1990s, **shallow trench isolation** has been used instead, as in the widget: trenches are etched into the silicon around each active region, filled with oxide and polished flat, using the nitride as a polishing stop.

## The gate, and self-alignment

The gate is made before the source and drain, and that order is the most important trick in the flow. When the arsenic or boron ions arrive, the gate blocks them, so the source and drain begin exactly at the gate's edges: they are **self-aligned**. Without it, a separate mask would have to place them, with an overlay error on each side. Compare the two orders, and misalign the gate's mask:

::self-align

With the source and drain made first, a misplaced gate leaves a strip of channel uncovered at one end, where no inversion layer can form, and the transistor never turns on. The only defence is to draw the gate longer than the channel, overlapping the source and the drain, and every micrometre of overlap adds capacitance that must be charged at every switching: the overlap with the drain counts double, because the drain swings the opposite way to the gate (the Miller effect). With the gate made first, misalignment shifts the whole transistor slightly, and nothing else.

```answer
id: process-flow/overlap
title: The price of alignment
prompt: 'Switch to the aluminium gate and choose the smallest overlap with which 99 % of transistors work (the mask lands with a random error of standard deviation 1 µm). How much larger is the gate capacitance than the channel''s alone, in per cent?'
answer: 52
tolerance: 3
unit: '%'
why: 'For 99 % of a normal distribution to fall within ±o, o must be 2.58 standard deviations: 2.6 µm on each side of a 10 µm channel, so the gate is 15.2 µm long and its capacitance 52 % larger. The self-aligned gate needs no margin at all; its only overlap is the few tenths of a micrometre by which the implanted dopant spreads under the gate''s edges.'
```

:::history{year=1968 title="The silicon gate" people="Federico Faggin, Tom Klein"}
The first MOS chips had aluminium gates, deposited after the sources and drains, which could not survive the high temperatures needed to make them; the gate had to be aligned to them, and overlap them generously. In 1968 at Fairchild, Federico Faggin, building on work by Tom Klein and others, developed a process with a gate of polysilicon, which tolerates the heat, made first and then used as the mask for the sources and drains. Self-aligned silicon gates made MOS chips smaller, faster and more reliable; Faggin used the process at Intel to build the 4004 three years later.
:::

Two simplifications in the widget deserve mention. Real transistors have **lightly doped drain** extensions and **spacers**: after the gate is etched, a shallow, light implant is made, then thin walls of nitride (spacers) are formed on the gate's sides, then the heavy source and drain implant, which the spacers keep a little further from the channel. That softens the electric field at the drain end. And the tops of the sources, drains and gates are usually turned into a **silicide**, a compound of silicon and a metal such as nickel, to lower their resistance.

## Contacts and wires

The first layer of glass over the transistors is polished flat and pierced by **contacts**: holes etched down to the sources, drains and gates, filled with tungsten, which deposits into narrow holes without voids, and polished back to leave plugs. Above them, the wires.

Aluminium wiring, deposited as a film and etched into lines, served for thirty years. In 1997 IBM introduced **copper**, which has about 40 % less resistance and survives the current densities of fine wires much longer, but which cannot be etched with plasma, since its compounds do not evaporate.:cite[edelstein1997] The answer was the **damascene** process, the last four steps of the widget: etch trenches into the insulator, line them with a thin barrier (copper must never reach the silicon, where it ruins transistors), fill them with copper by electroplating, and polish the excess away. The **dual-damascene** variant makes a layer's vias and wires in one fill. The insulator between wires is now a porous, low-permittivity glass, to cut the capacitance of wires running side by side.

Then the loop repeats: insulator, vias, trenches, copper, polish, for every layer of metal, a dozen or more in a leading process, the lowest patterned at the finest pitch of the whole chip, the top ones thick for power. Finally the chip is sealed under a passivation layer of nitride, with openings for the pads or bumps that will connect it to its package (chapter 17).

```order
id: flow/order
title: The flow, in order
prompt: 'Put these steps of the inverter’s flow in order.'
steps:
  - Etch trenches around the active regions and fill them with oxide (isolation).
  - Implant the n-well where the pMOS transistor will be.
  - Grow the gate oxide and deposit polysilicon.
  - Pattern and etch the gates.
  - Implant the sources and drains, self-aligned to the gates.
  - Cover everything with glass and etch contact holes.
  - Fill the contacts with tungsten.
  - Etch trenches for metal 1 and fill them with copper (damascene).
why: 'Isolation and wells first; then the gate, because it masks the source and drain implants; then the back end, from contacts upwards. The high-temperature steps all come before the first metal.'
```

:::fab[How the leading edge differs]
The flow in the widget is the classic planar CMOS flow of around 2000. Leading processes have changed almost every step while keeping its shape. Since 2007 most use a **replacement gate**: a temporary gate of polysilicon is made, used for self-alignment, then removed and replaced with high-k dielectric and metal, so that the metal never sees the high temperatures. Since 2011, the active regions have been fins, and since 2022 stacks of nanosheets, etched from alternating layers of silicon and silicon–germanium grown by epitaxy; the sources and drains are grown epitaxially too, of silicon–germanium for pMOS, to squeeze the channel and speed up its holes. And some processes now put the power wiring on the back of the wafer, after thinning it to a few micrometres.
:::

:::history{year=1959 title="The planar process" people="Jean Hoerni, Robert Noyce, Jack Kilby"}
In September 1958 Jack Kilby at Texas Instruments built the first integrated circuit, a few components on a sliver of germanium joined by wires bonded by hand.:cite[kilby1976] In 1959 Jean Hoerni at Fairchild invented the **planar process**: the oxide grown on the wafer is kept, patterned with photolithography to let dopants in through openings, and left in place to protect the junctions, so that everything lies flat in the plane of the wafer. Robert Noyce saw that the flat oxide could carry a layer of metal, patterned into wires, connecting components made in the same piece of silicon. Every chip since, including the flow above, is a descendant of the planar process.
:::

## Summary

- The front end makes transistors: shallow trench isolation, wells by implantation through resist, gate oxide and gate, sources and drains self-aligned to the gate, an activating anneal.
- The back end wires them: contacts filled with tungsten, then copper wires inlaid by the damascene process, layer after layer.
- Every lithography step's mask comes from one layer of the layout; a full process uses well over fifty, through more than a thousand steps.
- Modern processes replace the gate after the hot steps, build fins or nanosheets, grow strained sources and drains, and sometimes power the chip from the back.
