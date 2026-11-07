---
number: 7
title: Integrating with a wheel
summary: The planimeter, the disc integrator, Kelvin’s harmonic analyser and his tide predictor.
duration: 70 minutes
prerequisites: [antikythera]
---

:::check
```answer
id: integrators/check-1
title: Rolling
prompt: 'A wheel of radius 0.25 rests on a disc at distance 0.5 from its centre. The disc turns three times. How many times does the wheel turn?'
answer: 6
why: 'Each turn of the disc moves its surface under the wheel by 2π × 0.5 = π; the wheel’s circumference is 2π × 0.25 = π/2, so it turns twice per turn of the disc, six times in all.'
```

```answer
id: integrators/check-2
title: Spring tides
prompt: 'The Moon’s main tide repeats every 12.42 hours and the Sun’s every 12 hours. Every how many days do they come back into step (giving the big spring tides)? Give one decimal place.'
answer: 14.8
tolerance: 0.06
why: '1 / (1/12 − 1/12.42) ≈ 355 hours ≈ 14.8 days: half a lunar month, from one new or full Moon to the next.'
```
:::

A gear multiplies by a fixed number. Here is a mechanism that does something no arrangement of fixed gears can: it adds up a quantity that keeps changing. Turn the disc and move the wheel.

::integrator-lab

The disc turns steadily; its turning is x. The small wheel rests on it at a distance y from the centre, set by the red carriage. Near the centre the disc's surface hardly moves under the wheel; near the rim it moves fast. So in each small turn dx of the disc the wheel rolls by an amount proportional to y·dx, and over a whole run the wheel's counter holds the sum of all those small amounts: **the integral of y with respect to x**. Set y to grow in step with x and the counter computes x²/2. Set it to follow a sine and the counter follows 1 − cos x.

## Area, by walking round it

The first integrating machines measured areas, for surveyors, engineers and naval architects who needed the area of a field on a map or of a cross-section of a hull. A **planimeter** does it by tracing the boundary. The best known, Jakob Amsler's polar planimeter of 1854, is two arms hinged together: one pivots about a weighted pole set down outside the shape; the other carries a pointer you run round the outline. On the second arm is a small wheel that can only roll sideways to the arm, and slides along without turning when moved lengthwise.

::planimeter-lab

When the pointer comes back to where it started, the wheel's total roll times the length of the tracer arm is exactly the area enclosed. Not approximately: exactly, for any shape, by a theorem of calculus (Green's theorem, which turns an integral over an area into an integral round its boundary). The arms do the geometry; the wheel does the adding up.

```answer
id: integrators/planimeter
title: Reading a planimeter
prompt: 'A planimeter’s tracer arm is 2.5 units long. After tracing round a field on a map, its wheel has rolled 0.8 units. What is the area of the field on the map, in square units?'
answer: 2
why: 'Area = arm length × roll = 2.5 × 0.8 = 2. Scale up by the map’s scale squared for the real field.'
```

:::history{year=1876 title="The disc, the globe and the cylinder" people="James Thomson"}
Wheel-and-disc integrators had been made since the 1810s, but a wheel that must slide across the disc as y changes also skids, and skidding is error. In 1876 James Thomson, engineer and brother of William Thomson (later Lord Kelvin), published a better version: a ball pressed between the disc and a cylinder. The ball rolls without slipping in every direction, so moving it across the disc costs no skidding, and the cylinder turns by the integral. He had devised it for meteorological and other instruments; his brother saw at once what else it could do.:cite[thomson1876]
:::

## Kelvin's machines

:::bio{name="William Thomson, Lord Kelvin" born=1824 died=1907 place="Belfast"}
Physicist and engineer at Glasgow for fifty-three years: thermodynamics (the absolute temperature scale is named after him), the first successful transatlantic telegraph cable, the mariner's compass, and a long list of instruments, several of them calculating machines.
:::

The tide at a port is the sum of many regular rises and falls, each driven by the Moon or the Sun. The biggest, called M2, comes from the Moon and repeats every 12 hours 25 minutes; the next, S2, from the Sun, every 12 hours exactly; others come from the Moon's changing distance, the tilt of its orbit, and so on. Each has its own period, fixed by astronomy, and its own amplitude and timing at each port, fixed by the shape of the coast and the sea bed.

That gave Kelvin two problems, and he solved both with machines.

**Analysis:** from a year of measured tide heights at a port, find the amplitude and timing of each constituent. Mathematically that means multiplying the record by a cosine of each constituent's period and integrating: the same harmonic analysis that Fourier had shown could split any periodic signal into sines. Kelvin's **harmonic analyser** (1876–1878) did the integrals with James's disc-globe-cylinder integrators, one per coefficient, as an operator traced the curve of the measured tide.

**Prediction:** from the constituents, draw next year's tide. Kelvin's **tide predictor** (1872–1873, built by A. Légé & Co.) turns each constituent into a crank turning at its own period, with gears chosen to match it. Each crank moves a pulley up and down; a single wire passes over all the pulleys, so the end of the wire moves by the *sum* of their motions; and a pen on the end draws the tide on a moving roll of paper. A year of tides for a port came out in a few hours.:cite[kelvin1881]

::tide-lab

```quiz
q: 'In the tide predictor above, turn on only M2 and S2. Why do the high tides grow and shrink over two weeks?'
options:
  - text: 'M2 and S2 have slightly different periods, so they drift in and out of step: when their peaks coincide the tides are large (springs), when they oppose they are small (neaps).'
    correct: true
    why: 'This is a beat. It happens at every new and full Moon, when the Sun and Moon pull along the same line.'
  - text: The amplitude of M2 changes with the Moon’s distance.
    why: That is what N2 represents, and it repeats with the Moon’s orbit (about 27½ days), not every two weeks.
  - text: The pulleys slip on the wire.
    why: A good machine does not slip; the fortnightly cycle is in the sum itself.
```

:::modern[Fourier analysis]
Kelvin's two machines are a Fourier transform and its inverse, done by integrators and pulleys. Today the same split of a signal into frequencies is done in software and silicon, by the fast Fourier transform, inside every phone (audio, radio, image compression); tide tables are still computed from harmonic constituents, just with more of them and on a computer.
:::

Tide predictors were built and used for almost a century. Britain, the United States, Germany and others made their own, with up to several dozen constituents; the British machine of the Second World War predicted the tides for the D-Day landings. They were retired only in the 1960s and 1970s, when electronic computers could do the sums.

```answer
id: integrators/sine
title: Integrating a sine
prompt: 'In the integrator widget, choose y to follow 1 + 0.8 sin x and turn the disc for two full turns (x from 0 to 4π). The sine part adds up to zero over each full turn. What does the counter show at the end, as a multiple of π? (Give the number k in kπ, ignoring the factor of 2 in the scale.)'
answer: 4
why: '∫₀^{4π} (1 + 0.8 sin x) dx = 4π + 0.8(1 − cos 4π) = 4π. The counter in the widget shows twice that, about 25.1, because its scale is doubled.'
```

:::ledger{machine="Integrators and tide predictors"}
**Planimeter (1854):** measures any area by tracing its edge; accurate to a fraction of a percent. **Disc integrator:** integrates any quantity you can set as a distance; accuracy limited by slip (much reduced by Thomson's ball). **Harmonic analyser (1876–78):** several integrals at once from one traced curve. **Tide predictor (1872 on):** sums ten to forty sinusoids continuously; a year of tides in a few hours, to a few centimetres. **Weakness:** each does one job; to integrate an equation whose y depends on its own result, someone must turn the handle and steer the wheel by hand. Chapter 8 removes that someone.
:::

## Summary

- A **wheel on a turning disc**, set at distance y from the centre, turns by ∫ y dx: integration by rolling.
- A **planimeter** finds the area of any shape by tracing its outline, using the same principle.
- James Thomson's **disc-globe-cylinder** integrator removed the skidding.
- Kelvin's **harmonic analyser** did Fourier analysis with integrators; his **tide predictor** summed sinusoids with pulleys and a wire, and predicted tides for a century.
