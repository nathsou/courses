---
number: 6
title: 'Numbers as angles: Antikythera and the slide rule'
summary: Gear ratios as arithmetic, a pin-and-slot that models the Moon, and logarithms as lengths.
duration: 70 minutes
---

:::check
```answer
id: antikythera/check-1
title: Two gears
prompt: A 64-tooth gear drives a 32-tooth gear. How many turns does the small gear make for one turn of the large one?
answer: 2
why: 'Every tooth of the driver pushes one tooth of the driven gear: 64 teeth pass, which is two turns of a 32-tooth gear (in the opposite direction).'
```

```answer
id: antikythera/check-2
title: Lengths that multiply
prompt: On a slide rule, distances from the 1 are proportional to logarithms. If 2 sits 30.1 mm from the 1 and 3 sits 47.7 mm from it, how far from the 1 is 6, in millimetres?
answer: 77.8
tolerance: 0.15
why: 'log 6 = log 2 + log 3, so the distances add: 30.1 + 47.7 = 77.8 mm.'
```
:::

Every machine so far has held numbers as *digits*: a wheel stops at one of ten positions, and nothing in between means anything. This part of the course is about machines that hold numbers as *quantities*: an angle, a length, a speed. Here is the oldest one we know of. Turn its handle.

::antikythera-lab

The handle turns the big wheel once a year, and the Sun pointer with it. A train of gears turns the Moon pointer 254 times in 19 years, which is how often the Moon goes round the sky against the stars; a little extra device makes the Moon run fast and slow by turns, as the real Moon does. Nothing in it counts. Every number in the mechanism is an angle, and every calculation is done by the shapes and sizes of its gears.

## A wreck and a lump of bronze

In 1900 sponge divers sheltering from a storm off the Greek island of Antikythera found the wreck of a Roman-era ship, about two thousand years old, laden with bronze and marble statues. Among the finds lifted in 1901 were corroded lumps of bronze and wood, and in one of them someone noticed a gear wheel. The fragments, eighty-two of them in the end, hold the remains of about thirty gears, with tiny inscriptions on their plates.

:::know[Reading a machine you cannot open]
For seventy years the mechanism was a puzzle. In 1974 Derek de Solla Price published *Gears from the Greeks*, a reconstruction from X-ray photographs that showed it was an astronomical calculator.:cite[price1974] In 2005 the Antikythera Mechanism Research Project took the fragments through a high-resolution X-ray CT scanner and photographed their surfaces under changing light, counting teeth that no one had seen and reading thousands of characters of inscription, a user's manual engraved on the machine. Their 2006 paper decoded the back dials and the lunar gearing, including the pin-and-slot;:cite[freeth2006] their 2021 model reconstructed the front, a display of the Sun, Moon and five planets.:cite[freeth2021] Tooth counts are estimates from broken, corroded gears; where a gear is missing, a reconstruction proposes one that fits the astronomy and the evidence. Price's reconstruction included a differential gear which later work showed was not there.
:::

The mechanism was made in the second century BC, perhaps a little later; the ship sank around 60 BC. It was a box about the size of a shoebox, with a handle on the side. Its front showed the zodiac and a 365-day calendar, with pointers for the Sun, the Moon (with a little ball, half silver and half black, that turned to show the phase) and the planets. Its back had two large spiral dials: a 19-year calendar of months and an 18-year cycle for predicting eclipses. Nothing as complex survives from the next thousand years.

## Gear ratios are arithmetic

When one gear drives another, every tooth that passes pushes one tooth of the other. A gear of 64 teeth driving one of 32 makes it turn twice for each of its turns, in the opposite direction. Two gears fixed on one axle turn together, so a train of pairs multiplies:

> turns of the last axle = (64 / 38) × (48 / 24) × (127 / 32) turns of the first

That is the lunar train in the widget: gears b2, c1, c2, d1, d2 and e2. Tap them to see their tooth counts.

```answer
id: antikythera/lunar-ratio
title: The lunar train
prompt: 'Work out (64 / 38) × (48 / 24) × (127 / 32) to three decimal places.'
answer: 13.368
tolerance: 0.0006
why: '64 × 48 × 127 = 390 144 and 38 × 24 × 32 = 29 184, and 390 144 / 29 184 = 254/19 = 13.368…, the number of times the Moon goes round the zodiac in a year: 254 sidereal months in 19 years.'
```

Why 254/19? The Babylonians had found, and the Greeks knew, that 19 years hold almost exactly 235 months from new Moon to new Moon (synodic months), which is the same as 254 trips of the Moon round the stars (sidereal months), since the Sun goes round 19 times in the meantime: 235 + 19 = 254. A gear train turns a ratio of whole numbers into motion, so the designer needed gears whose teeth multiply out to 254 over 19. 254 = 2 × 127, and 127 is prime: the 127-tooth gear d2 is there for no other reason. Its count was one of the clues that told Price what the train was for.

::gear-designer{id="antikythera/design-synodic" title="Design a train for the phases" prompt="The Moon’s phases repeat 235 times in 19 years. Choose tooth counts for two meshes (driver → driven) whose ratio is exactly 235/19. Every gear must have between 15 and 225 teeth." num=235 den=19 hints='["Factor the numbers: 235 = 5 × 47, and 19 is prime.","One driven gear needs 19 teeth (or a multiple). Try 94 → 19 for one mesh (that is 2 × 47 over 19): what ratio must the other mesh make?","The other mesh must give 5/2, for example 40 → 16."]'}

:::modern[Rational approximation]
Choosing tooth counts is finding a fraction p/q, with factors small enough to cut as gears, close to a number you want. Clockmakers and engineers did it with tables; mathematicians do it with continued fractions, which give the best approximations with small denominators. The same problem appears inside every digital frequency synthesiser, which divides and multiplies a crystal's frequency by whole numbers to make the frequency it needs.
:::

## A gear that runs fast and slow

The Moon does not move at a steady speed. It runs ahead of its average position for half of each month and falls behind for the other half, by up to about six degrees, because its orbit is not a circle. Hipparchos, in the second century BC, modelled this with circles: the Moon moving steadily round a small circle whose centre moves steadily round the Earth. The mechanism's makers built his theory in bronze.

Two gears of the same size, k1 and k2, sit on axles about a millimetre apart. A pin on k1 sits in a radial slot cut in k2. As k1 turns steadily, the pin slides in and out along the slot, and because k2's axle is off-centre, k2 turns a little faster when the pin is on one side and a little slower on the other. On average they turn together; in detail k2 leads and lags, by an angle of about (offset ÷ pin radius) radians.

Run the widget a month at a time with the pin-and-slot on, then off, and watch "Moon ahead of mean". The plot under it shows the Moon pointer's speed over one month.

```answer
id: antikythera/pin-slot
title: How big an anomaly?
prompt: 'If the pin sits 9 mm from k1’s axle and the axles are 1 mm apart, the largest lead or lag is about offset ÷ radius radians. About how many degrees is that? (A whole number.)'
answer: 6
tolerance: 0.6
why: '1/9 rad ≈ 0.111 rad ≈ 6.4°, close to the Moon’s actual anomaly of a little over 6°. On the original the slot gear is about a centimetre across at the pin, and the axles about a millimetre apart.'
```

The real mechanism goes one step further. The whole pin-and-slot pair rides on a larger gear, e3, that turns once every nine years or so, because the point of the Moon's orbit where it moves fastest also creeps round the sky in that time. The model above leaves that out.

:::question
The pin-and-slot gives the Moon's speed variation *exactly* the shape of Hipparchos's model, because both are the same geometry: steady motion seen from an off-centre point. Is the mechanism then calculating, or modelling? Is there a difference?
:::

## Logarithms as lengths

In 1614 John Napier published his logarithms: numbers chosen so that multiplying two numbers is the same as adding their logarithms. A few years later Edmund Gunter marked logarithms as lengths along a ruler, so that a pair of dividers could add them, and in the 1620s William Oughtred put two such scales side by side, sliding against each other. The **slide rule** was born, and for three hundred and fifty years it was what engineers multiplied with.:cite[cajori1909]

::slide-rule

To multiply 2 by 3, slide the C scale so that its 1 sits over 2 on D, and look along C to 3: below it on D is 6. The lengths log 2 and log 3 have been laid end to end, and their sum is log 6.

```answer
id: antikythera/slide-multiply
title: Use the rule
prompt: Use the slide rule to multiply 2.6 by 3.4. Give the result to three significant figures.
answer: 8.84
tolerance: 0.051
why: 'Put C’s 1 over 2.6 on D, move the cursor to 3.4 on C, and read about 8.84 on D. The rule gives three figures, and you place the decimal point yourself: it cannot tell 8.84 from 88.4.'
```

```answer
id: antikythera/precision
title: How many figures?
prompt: 'A 25 cm slide rule spans one power of ten (1 to 10). If you can read a position to a quarter of a millimetre, the relative error of a reading is about 10^(0.25/250) − 1. To how many significant figures can you trust a result? (A whole number.)'
answer: 3
why: '10^0.001 − 1 ≈ 0.0023, about a quarter of one percent: three significant figures. Every analog machine has such a limit, set by how finely its parts can be made and read. A digital machine adds another wheel for another figure.'
```

:::key
In a digital machine a number is a pattern of discrete states, and a small disturbance changes nothing: a wheel at 7 is at 7. In an analog machine a number *is* a physical quantity, and every imprecision in cutting, every bit of backlash or slip, is an error in the number. In exchange, analog machines do in one motion things that digital ones must do in many steps: one gear pair multiplies by a constant, one pin-and-slot computes a trigonometric correction.
:::

:::ledger{machine="Antikythera mechanism and slide rule"}
**Antikythera mechanism (2nd century BC):** about 30 surviving gears in a shoebox-sized case; computes the positions of the Sun and Moon, the Moon's phase, calendar cycles and eclipse months, by fixed gear ratios. One input (the handle), many outputs; it cannot be reprogrammed. Accuracy limited by the hand-cut teeth: positions to a degree or two. **Slide rule (1620s–1970s):** multiplies, divides, takes roots and logarithms, as fast as you can slide; three significant figures on a 25 cm rule; the operator keeps track of the decimal point.
:::

## Summary

- An **analog** machine holds numbers as physical quantities: angles, lengths. A **digital** one holds them as discrete states.
- A gear train multiplies a rotation by a ratio of whole numbers: the Antikythera mechanism's lunar train makes 254/19 with gears of 64, 38, 48, 24, 127 and 32 teeth.
- A **pin-and-slot** pair on offset axles adds a periodic lead and lag: Hipparchos's lunar theory, built in bronze.
- A **slide rule** multiplies by adding logarithms as lengths, to about three significant figures.
- Analog precision is set by the precision of the parts; there is no extra digit to add. Chapter 7 adds the analog machine's most powerful trick: integration.
