---
number: 8
title: The differential analyser
summary: 'Integrators wired in a loop solve differential equations: Bush’s machine, and Hartree’s built from Meccano.'
duration: 65 minutes
prerequisites: [integrators]
---

:::check
```quiz
q: 'An integrator’s disc turns with t, and its wheel is set by a shaft carrying −y. Its output shaft starts at 0 and is connected to the wheel of a second integrator, whose output is y. What does the pair compute?'
options:
  - text: 'A solution of y″ = −y: y oscillates like a cosine (or sine).'
    correct: true
    why: The first output is ∫ −y dt = y′, and the second ∫ y′ dt = y. The loop says y″ = −y.
  - text: The area under y.
    why: One integrator alone would give an area; the loop feeds the answer back into the question.
  - text: Nothing; the shafts would lock.
    why: In a real machine the second integrator’s wheel must be driven by the first integrator’s tiny output torque, which is exactly the problem the torque amplifier solved.
```
:::

Chapter 7's integrator needed a person to set y. Now connect the output of one integrator to the wheel of another, and the second's output back to the first, and nobody need set anything: the machine steers itself. Press **Run**.

::analyser-lab

Integrator A's wheel is set by −y; its output is therefore ∫ −y dt, which is y′. Integrator B's wheel is set by that y′, and its output is ∫ y′ dt = y, which goes round, reversed, to steer A. The shafts enforce y″ = −y, and the only functions that satisfy it are sines and cosines: the output table draws a cosine because B started at 1 and A at 0. Change the set-up to a damped spring and the oscillation dies away; change it to the Moon's orbit and it draws an ellipse.

## Bush's machine

:::bio{name="Vannevar Bush" born=1890 died=1974 place="Everett, Massachusetts"}
Electrical engineer at MIT, later its vice-president, and during the Second World War the head of the US Office of Scientific Research and Development, which ran American wartime science. His 1945 essay *As We May Think* imagined a desk-sized machine for storing and linking documents, an ancestor of hypertext.
:::

Electrical engineers in the 1920s were drowning in differential equations: the behaviour of power networks, of transmission lines, of electric motors starting up. Most had no solution in formulas, and numerical solution by hand took weeks. Between 1928 and 1931 Bush and his students at MIT built the **differential analyser**: six wheel-and-disc integrators, connected by long shafts that could be geared together in any arrangement, with input tables on which an operator followed a given curve with a pointer, and output tables on which pens drew the solution.:cite[bush1931]

Setting up a problem meant rewiring the machine with spanners and screwdrivers: deciding which shaft carried which quantity, and connecting them with gears (to multiply by constants), differentials (to add), and integrators. It could take days. Then the motor ran, and a solution that would have taken weeks of hand calculation came out in minutes, drawn as a curve, accurate to about one part in a thousand.

::patch-puzzle{id="differential-analyser/patch" prompt="Choose what steers each integrator’s wheel so that B’s output draws y = cos t. Both discs turn with t; A’s output starts at 0 and B’s at 1." hints='["B’s output is y. What must B integrate to produce y?","A’s output must then be y′. What must A integrate to produce y′, if y″ = −y?"]' solution="A’s wheel is steered by B’s output through a reversing gear (so A integrates −y and outputs y′); B’s wheel is steered by A’s output (so B integrates y′ and outputs y)."}

### The torque amplifier

There is a catch. The integrating wheel can only turn its output shaft by friction against the disc, so it delivers almost no force: it can turn a light pointer, not a long shaft loaded with other integrators' wheels and gears. Connecting outputs to inputs, which is the whole point, would make the wheels slip.

Bush's machine solved this with a **torque amplifier**, invented by C. W. Nieman for steel-mill machinery in the 1920s, on the principle of a ship's capstan. A rope wrapped round a turning drum grips it more tightly the harder you pull the free end, and the friction multiplies the pull by e^(μθ), where μ is the coefficient of friction and θ the angle of wrap. In the amplifier, the integrator's feeble output tightens a band round a drum driven by a motor; two such stages in series multiply the torque by thousands, and the motor, not the integrator, drives the next shaft.

```answer
id: differential-analyser/capstan
title: How much amplification?
prompt: 'A band is wrapped two full turns (θ = 4π) round a turning drum, with friction coefficient μ = 0.3. By what factor does the drum multiply the pull on the band? (Round to a whole number.)'
answer: 43
tolerance: 0.6
why: 'e^(0.3 × 4π) = e^3.77 ≈ 43. A second stage in series multiplies again: over 1 800 times, from a pull the integrator can provide to a torque that can drive a shaft.'
```

:::modern[An amplifier is what makes composition possible]
A gate in a chip must drive the inputs of several other gates, and each stage of logic must restore its signal to full strength rather than pass on a weakened copy. The integrator without a torque amplifier is a gate without gain: it works alone and fails when connected. Gain is so central to building big machines out of small parts that chapter 11 puts it at the heart of why computers are electronic.
:::

## A machine made of Meccano

In 1933 Douglas Hartree, a physicist at Manchester who spent his life computing the structure of atoms by hand and with any machine he could find, visited MIT and saw the analyser. Back in Manchester, while waiting for money for a full-size machine, he and his student Arthur Porter built a model of it in 1934, almost entirely out of the children's construction kit Meccano, for about twenty pounds. It worked, to within a few percent of Bush's machine, and Hartree used it for real research while the full-size machine, built by Metropolitan-Vickers, followed in 1935.:cite[hartree1935] Other Meccano analysers followed at Cambridge, in Belfast and elsewhere.

:::know[How accurate?]
Analog accuracy is a property of the parts. Bush's analyser was typically good to about one part in a thousand; Hartree's Meccano model to a few parts in a hundred. Errors come from slip at the wheels, backlash in the gears, play in the shafts, and the operators following input curves by eye. Add slip in the widget above and compare with the dashed perfect curve: the oscillation dies away, because each lap round the loop loses a little.:cite[care2010]
:::

## The Moon's orbit

Analysers solved problems in ballistics, power engineering, atomic physics and astronomy. Here is the through-line problem of this part of the course. For a body moving under an inverse-square force, like the Moon round the Earth, write u = 1/r and use the angle θ round the orbit as the independent variable. Newton's law becomes Binet's equation:

> u″ + u = constant

That is the oscillator again, with a constant added (one more fixed setting in the loop). The motor now turns θ; the output table, set up to plot r = 1/u at angle θ, draws the orbit. Choose **The Moon's orbit** in the widget: at the Moon's eccentricity, 0.055, it is almost a circle, with the Earth slightly off centre; turn the eccentricity up and the ellipse appears.

```answer
id: differential-analyser/orbit
title: Nearest and furthest
prompt: 'With u(0) = 1 + e and u′(0) = 0, the solution is u = 1 + e cos θ, so r = 1/(1 + e cos θ). For the Moon, e ≈ 0.055. What is the ratio of its greatest distance to its least, to two decimal places?'
answer: 1.12
tolerance: 0.006
why: 'r_max / r_min = (1 + e)/(1 − e) = 1.055/0.945 ≈ 1.116: the Moon’s distance varies by about 12%, which is also why its speed varies, as the Antikythera mechanism’s pin-and-slot showed.'
```

## What an analog computer can compute

In 1941 Claude Shannon, who had worked on Bush's analyser as a graduate student, asked a mathematician's question: which functions can a machine of integrators, adders and constant gears generate at all? His answer: exactly those that satisfy algebraic differential equations, which includes the exponential, the trigonometric functions and their combinations, but not, for example, Euler's gamma function.:cite[shannon1941] It was one of the first theories of what a class of computing machine can and cannot do, and it was about an analog machine.

During the Second World War differential analysers computed artillery firing tables, each table hundreds of trajectories, for the US Army at the Moore School in Philadelphia. It was not fast enough. The Army paid for an electronic machine to do the same job: ENIAC, finished in 1945. Its first task was not firing tables, but it was built for them.

:::ledger{machine="Differential analysers"}
**Bush's analyser (1931):** six integrators; solves ordinary differential equations up to sixth order; set-up by rewiring shafts, hours to days; a solution in minutes; accuracy about one part in a thousand. **Hartree's Meccano model (1934):** about £20 of parts; a few parts in a hundred. **Strength:** solves whole equations continuously, all integrators working at once. **Limits:** accuracy fixed by the parts, errors accumulating round every loop; each new problem a new physical machine; and the integrators deliver no force without amplifiers.
:::

## Summary

- Integrators connected **in a loop** solve differential equations: y″ = −y needs two, and a reversing gear.
- Bush's **differential analyser** (1931) made such loops configurable with shafts, gears and differentials; problems took days to set up and minutes to solve.
- Integrators deliver no torque; the **torque amplifier**, a motor-driven capstan, gave them gain, and made connecting them possible.
- **Hartree** built a working analyser from Meccano.
- **Shannon** characterised what such machines can compute. ENIAC was built to do their job faster, and electronically.
