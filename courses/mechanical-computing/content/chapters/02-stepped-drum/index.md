---
number: 2
title: 'The stepped drum: Leibniz to the Curta'
summary: A variable gear, shift-and-add multiplication, Leibniz’s unfinished carry and the calculator in a pepper mill.
duration: 75 minutes
prerequisites: [pascaline]
---

:::check
```answer
id: stepped-drum/check-1
title: Turns
prompt: On a stepped-drum machine, how many turns of the crank does it take to multiply a number by 213 by the usual method?
answer: 6
why: 'Three turns at the units, one at the tens, two at the hundreds: the sum of the digits of 213 = 2 + 1 + 3.'
```

```answer
id: stepped-drum/check-2
title: A shortcut
prompt: A machine that can subtract as easily as it adds multiplies by 99 in how few turns?
answer: 2
why: '99 = 100 − 1: one turn added at the hundreds, one subtracted at the units.'
```
:::

A Pascaline adds whatever you dial into it, one digit at a time, and for multiplication you must dial the same number again and again. To multiply quickly a machine needs to *remember* a number and add it every time a crank goes round. That needs a gear whose number of teeth you can choose. Here is one.

::drum-lab

Move the slider and turn the crank. The pinion on the square shaft slides along a drum carrying nine teeth of different lengths; at setting 3 it meets only the three longest, and one turn of the crank turns it three tenths of a turn. At 9 it meets all nine. At 0 it meets none. This is the **stepped drum**, and it ran the world's mechanical calculators for three hundred years.

## Leibniz's living bank clerk

:::bio{name="Gottfried Wilhelm Leibniz" born=1646 died=1716 place="Leipzig"}
Philosopher, mathematician, lawyer, diplomat and librarian to the Dukes of Brunswick-Lüneburg in Hanover. He invented the calculus at the same time as Newton (and quarrelled with him about it), wrote on binary arithmetic, and dreamed of a *calculus ratiocinator*, a calculus in which disputes could be settled by computation.
:::

Leibniz saw a Pascaline in Paris and set out to improve on it: a machine that would multiply and divide as easily as it added. He showed a wooden model to the Royal Society in London in 1673. The working machine, built in brass for him by craftsmen in Paris and later in Hanover, took him most of the next twenty years.:cite[williams1997]

:::source{who="Gottfried Wilhelm Leibniz" when="1685"}
For it is unworthy of excellent men to lose hours like slaves in the labour of calculation which could safely be relegated to anyone else if machines were used.:cite[smith1929]
:::

Each digit of the number to be multiplied has its own drum, and all the drums turn together, geared to one crank. The pinions above them are set by the operator: the setting register. The pinions turn the wheels of the result register, which sits on a **carriage** that can be moved along one place at a time. To multiply 347 by 213:

1. Set 347 on the pinions.
2. With the carriage at the units, turn the crank 3 times: the result is 3 × 347.
3. Move the carriage one place, so that the setting now lines up with the tens of the result. Turn once: you have added 10 × 347.
4. Move it again and turn twice: you have added 200 × 347.

Six turns and two shifts, and the result reads 73 911. This is exactly long multiplication as taught at school, with the machine doing each row's addition and the shifting carriage writing each row one place further left.

::reckoner{flavour="arithmometer" id="stepped-drum/multiply" title="Multiply 347 × 213" prompt="Set 347, then use the crank and the carriage to make the result 73 911, with the counter showing 213. Use no more than 6 turns." goal='{"result":73911,"counter":213,"maxTurns":6}' hints='["Set 3, 4 and 7 with the ▲ keys on the three right-hand setting digits.","Turn three times at shift 0, move the carriage left once and turn once, move it again and turn twice."]'}

The counter is new too. It counts the turns at each shift, so that after a multiplication it shows the multiplier, 213: a check that the operator turned the right number of times.

## A carry that stops

Leibniz's machine had a weakness, and it was the carry. In a stepped-drum machine every result wheel is turned by its drum at the same moment, during the same turn of the crank; the carries have to be made afterwards. Leibniz's mechanism did make a carry from any wheel that passed 9 → 0 during the addition: it moved the next wheel on by one. But if that next wheel was itself at 9, so that the carry turned it to 0 as well, the carry went no further. Instead a small disc at the edge of the machine stood up, to show the operator that a carry was waiting, and the operator turned the next wheel on by hand.:cite[williams1997]

::reckoner{flavour="leibniz" id="stepped-drum/leibniz" title="Finish Leibniz’s carry" prompt="The result register holds 9 995 and the setting is 5. Turn the crank once, then finish the carries by hand (press ↑ above a waiting carry) until the result reads 10 000." startResult=9995 startSetting=5 goal='{"result":10000}' hints='["After one turn the units carry has been made, but the tens wheel went from 9 to 0 by that carry, so the carry into the hundreds is waiting.","Each ↑ you press moves one wheel on; if that wheel was a 9, the next carry waits in turn."]'}

:::question
In the Pascaline a carry from a 9 releases the next sautoir, so a long carry finishes itself. Why is that harder in a machine where every wheel is turned at once by its own drum? (Think about when, during the turn, each wheel learns that it must carry.)
:::

:::know[The machine in the attic]
One of Leibniz's machines survives, in the Gottfried Wilhelm Leibniz Library in Hanover. It was forgotten for over a century and a half, lost in an attic at the University of Göttingen until 1879, and repaired in the 1890s. Studies of it, and replicas built since, are how we know how its carry behaves.:cite[williams1997]
:::

## The arithmometer: a drum for every office

Leibniz's drum was right; his carry, and the precision of seventeenth-century metalwork, were not. A century and a half later, Charles Xavier Thomas, a French army officer turned insurance director, patented an **arithmometer** in 1820 built on stepped drums, with a carry that ripples to completion. After thirty years of improvements his workshop began making it in numbers in 1851, and it became the first calculating machine made and sold in quantity: to insurance companies, observatories, banks and government offices, for the rest of the century.:cite[marguin1994]

The arithmometer adds whatever the setting holds at each turn of the crank, but it cannot turn backwards. To subtract, the operator flips a lever that reverses the gearing between drums and result wheels. That is one more thing to set, and one more thing to forget.

## The Curta

:::bio{name="Curt Herzstark" born=1902 died=1988 place="Vienna"}
Son of the owner of a Viennese calculating-machine company. In the 1930s he worked on a calculator small enough to hold in one hand. Deported to Buchenwald in 1943, he completed the design there; after the war he built it in Liechtenstein.
:::

Herzstark had already conceived the Curta before the war. In Buchenwald he was set to work in a factory attached to the camp, and his own account is that the camp's managers, learning of his design, encouraged him to finish it, intending it as a gift to the regime after victory. He drew it on paper in the camp. After the liberation in 1945 he had the drawings made into a prototype, and in 1948 a company in Liechtenstein began to make it; about 140,000 were sold before electronic calculators ended production in the early 1970s.:cite[stoll2004]

The Curta is a cylinder the size of a pepper mill with a crank on top. Inside is a single stepped drum, turned by the crank, with sliders down the side for the setting. All eight digits of the setting use the same drum: each slider's pinion sits at its own angle round it, so every pinion meets the teeth in turn. The result and counter registers ride on a top carriage that is lifted and turned to shift.

Its cleverest trick is subtraction. The drum carries a second set of steps, the **complements**: where a normal tooth row adds s, the complementary row adds 9 − s. Pull the crank up and turn, and the drum adds the nines' complement of the setting, plus a 1 fed into the lowest place. That is the **tens' complement**, and adding it is the same as subtracting. The operator lifts the crank and turns, and the machine subtracts with the same wheels turning the same way.

::reckoner{flavour="curta"}

```answer
id: stepped-drum/curta-subtract
title: Inside a subtraction
prompt: 'An 11-digit Curta result register shows 00 000 001 000 and the setting is 1. Lifting the crank, the drum adds the nines’ complement of the setting to every place and a 1 at the bottom. What does the register show afterwards?'
answer: 999
why: '1 000 + 99 999 999 998 + 1 = 100 000 000 999, and the 1 at the far left falls off the 11 digits: 999 remains. Adding the tens’ complement of 1 has subtracted 1.'
```

## Faster multiplication by subtracting

A machine that subtracts as easily as it adds can multiply faster. To multiply by 198 the usual way takes 1 + 9 + 8 = 18 turns. But 198 = 200 − 2: two turns added at the hundreds, then two subtracted at the units. Four turns.

::reckoner{flavour="curta" id="stepped-drum/shortcut" title="347 × 198 in four turns" prompt="Make the result register show 347 × 198 = 68 706 using no more than four turns of the crank. The counter must show 198 at the end." goal='{"result":68706,"counter":198,"maxTurns":4}' hints='["198 = 200 − 2.","Set 347. Shift the carriage two places and turn twice (adding); shift back to the units and turn twice with the crank lifted (subtracting)."]'}

:::modern[Booth's multiplier]
In 1951 Andrew Booth published a way to multiply binary numbers in hardware that replaces every run of 1s in the multiplier by one subtraction and one addition: 0111 1110 = 1000 0000 − 0000 0010. It is the Curta operator's trick in base 2, and variants of Booth recoding are still used in processor multipliers. Shift-and-add itself, with the carriage as a shift register, is how every multiplier circuit is understood before it is optimised.
:::

## Division

Division is repeated subtraction. Put the dividend in the result register, set the divisor, and move the carriage as far left as it will go. Subtract until the result goes *through zero*, which on a Curta you can see because the high digits suddenly fill with 9s. That subtraction was one too many: add once to undo it. Shift one place right and repeat. The counter, reversed so that each subtraction counts up, ends holding the quotient, and the result register the remainder. This is long division, with the machine doing the trial subtractions.

::reckoner{flavour="curta" id="stepped-drum/divide" title="Divide 1 000 by 7" prompt="The result register holds 1 000 and the setting is 7. Tick “reverse the counter”, then subtract and shift until the counter shows the quotient, 142, and the result register the remainder, 6." startResult=1000 startSetting=7 goal='{"result":6,"counter":142}' hints='["Start with the carriage shifted two places, so that the 7 lines up with the hundreds.","At each shift: subtract until the result goes through zero, then add once. Then move the carriage one place right.","At the hundreds you subtract twice (the second goes through), add once; at the tens you subtract five times, add once; at the units three times, add once."]'}

```answer
id: stepped-drum/division-turns
title: Counting turns
prompt: In the division above, starting with the carriage two places to the left, how many turns of the crank does the method take in all, counting the subtractions that went through zero and the additions that put them back?
answer: 13
feedback:
  '15': That is the count if you start with the carriage three places to the left, where the very first subtraction goes through zero and has to be put back. Starting at the hundreds saves those two turns.
why: 'Hundreds: 1 subtraction that stays above zero, 1 that goes through, 1 addition (3 turns). Tens: 4 + 1 + 1 = 6. Units: 2 + 1 + 1 = 4. In all 3 + 6 + 4 = 13. The quotient’s digits, 1, 4 and 2, are the subtractions that stayed above zero.'
```

## Euler's polynomial, multiplied

Back to the table of x² + x + 41. With a stepped-drum machine there is no need for differences: set x, multiply by x, then add x and add 41. Try x = 40.

```answer
id: stepped-drum/euler-40
title: The fortieth value
prompt: What is 40² + 40 + 41? (Work it on the Curta above if you like.) Is it prime?
answer: 1681
why: '1 681 = 41 × 41. Euler’s polynomial gives primes for x = 0, 1, …, 39 and fails at 40: the machine finds in a dozen turns what a table maker would have found by factoring.'
```

:::ledger{machine="Stepped-drum calculators"}
**Leibniz's reckoner (1694):** 8-digit setting, 16-digit result; adds, subtracts, multiplies and divides, but long carries must be finished by hand, and the craftsmanship of its time made it unreliable. **Thomas arithmometer (1851):** the first calculator made in quantity; a multiplication of six digits by six takes about half a minute of turning and shifting. **Curta (1948):** 8-digit setting, 11-digit result, 6-digit counter; small enough to hold in one hand; subtraction by lifting the crank. **Speed:** one addition of the whole setting per crank turn, about one per second by hand. **Limits:** the operator does the control: when to turn, when to shift, when a division has gone through zero.
:::

## Summary

- A **stepped drum** is a gear with a selectable number of teeth: a pinion slid to position s meets s teeth per turn.
- With a setting register, a shifting **carriage** and a **counter**, a crank and a hand make long multiplication: turns for each digit, a shift for each place.
- **Leibniz's** machine multiplied, but its carry stopped after one place; Thomas's **arithmometer** fixed it and was made in quantity.
- The **Curta** subtracts by adding the tens' complement from a second set of steps, which also makes multiplication faster (198 = 200 − 2) and division by repeated subtraction straightforward.
- In every one of these machines, the person turning the crank decides what happens next. Chapter 3 is about taking that job away from them.
