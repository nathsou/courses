---
number: 3
title: 'Differences: Difference Engine No. 2'
summary: Errors in printed tables, Prony’s human computers, finite differences and a pipelined engine of thousands of parts.
duration: 80 minutes
prerequisites: [pascaline]
---

:::check
```answer
id: difference-engine/check-1
title: Constant differences
prompt: In a table of x³ for x = 0, 1, 2, …, which order of difference is constant, and what is it? Give the constant.
answer: 6
why: 'The values 0, 1, 8, 27, 64 have first differences 1, 7, 19, 37, second differences 6, 12, 18 and third differences 6, 6: for a cubic with leading coefficient 1, the third difference is 3! = 6.'
```

```answer
id: difference-engine/check-2
title: Columns
prompt: How many columns of figure wheels does a difference engine need to tabulate a polynomial of degree 7?
answer: 8
why: One for the value and one for each of the seven orders of difference. Difference Engine No. 2 has exactly eight.
```
:::

Chapter 1 ended with a trick: a table of x² + x + 41 can be continued by adding up differences, without a single multiplication. Here is a machine that does nothing else. It is a slice of Charles Babbage's Difference Engine No. 2, three columns of its eight, five digits of its thirty-one, set up for that table. Press **One cycle**.

::slice-lab

Each cycle prints the next value of x² + x + 41. Nobody chooses what to add, or when to carry, or when to shift: the handle drives everything, and the pattern of additions is built into the machine. That is the step this chapter is about, from a calculator that does what the operator tells it to an engine that follows a method.

## Tables full of errors

In 1821 the nineteenth century ran on printed tables: logarithms for multiplication, trigonometric tables for surveying and astronomy, tables of the Moon's position for navigation at sea, interest tables for insurance. Each was computed by hand, copied by hand, typeset by hand and proof-read by hand, and every stage introduced errors. A misprinted logarithm was a nuisance; a misprinted lunar position could put a ship on the rocks.

:::history{year=1793 title="Making logarithms like pins" people="Gaspard de Prony"}
After the Revolution the French government wanted new tables for the decimal system: logarithms of the numbers up to 200 000, and of sines in the new decimal division of the circle, to more places than anyone would ever need. Gaspard de Prony organised the work like Adam Smith's pin factory. A few mathematicians chose formulas; a handful of skilled calculators turned them into starting values and differences; and a large room of computers, many of them people with no mathematics beyond addition and subtraction, filled in the tables by adding differences, row after row. The finished tables filled many manuscript volumes. They were never printed in full.:cite[grattan1990]
:::

Prony's insight was that the work at the bottom of the pyramid needed no understanding at all, only careful addition. Charles Babbage read about Prony's project and drew the next conclusion: work that needs no understanding can be done by a machine.

:::bio{name="Charles Babbage" born=1791 died=1871 place="London"}
Mathematician, Lucasian Professor at Cambridge (Newton's chair), founder of the Astronomical Society and the Statistical Society, writer on manufacturing, economics, cryptography and the reform of science. He spent fifty years and much of his fortune on calculating engines, and finished none of them.
:::

The story Babbage told later is that in 1821 he and his friend John Herschel were checking two sets of astronomical tables, computed independently for the Astronomical Society, against each other. They found so many disagreements that Babbage exclaimed that he wished to God the calculations had been executed by steam. Within a year he had a small working model of a machine that tabulated by differences.:cite[swade2001]

## The method of differences

Take any table of a polynomial and subtract each value from the next. Do it again to the differences, and again. For a polynomial of degree n the n-th differences are constant. Running the subtraction backwards turns it into a recipe for building the table: keep one number per order of difference, and at each step add each column into the one on its left.

| x | x² + x + 41 | first difference | second difference |
|---|---|---|---|
| 0 | 41 | 2 | 2 |
| 1 | 43 | 4 | 2 |
| 2 | 47 | 6 | 2 |
| 3 | 53 | 8 | 2 |

That is why Babbage called it a *difference engine*: one column of figure wheels for each order of difference, and an adding mechanism between every pair of neighbouring columns.

And differences catch errors too. A wrong entry e in a table disturbs its second differences in the pattern e, −2e, e: a regular column with a sudden wobble. Proof-readers of tables used differencing to find misprints, and so can you.

::error-hunt{id="difference-engine/misprint" prompt="This table of x² + x + 41 has one wrong entry, a slip of the kind compositors made. Show the differences, find where they stop being regular, and tap the wrong entry." values='[41,43,47,53,61,71,85,97,113,131,151]' wrong=6}

Not every useful function is a polynomial, but over a short stretch almost every smooth function is close to one. A table of logarithms can be built in short sections, each from a polynomial that matches the logarithm closely enough over its stretch, with the starting differences recomputed by hand at the start of each section. Prony's computers worked that way, and so would Babbage's engine.

## Difference Engine No. 1, and why it was not finished

Babbage persuaded the British government to fund a full-size engine in 1823. He hired Joseph Clement, one of the best mechanical engineers in London, and over ten years Clement's workshop made thousands of precision parts and new machine tools to make them. In 1832 a demonstration section, about a seventh of the planned calculating mechanism, was assembled. It works to this day.

In 1833 Babbage and Clement quarrelled over money and the ownership of the tools, and work stopped. By then Babbage had a new idea, a machine that could be told what to compute (chapters 4 and 5), and the government, having spent over £17 000, an enormous sum for a scientific instrument, lost patience. The project was formally abandoned in 1842.:cite[swade2001]

:::history{year=1853 title="The Scheutz engine" people="Georg and Edvard Scheutz"}
A Swedish printer and his son read an account of Babbage's engine and built their own, smaller and simpler, with a printer. A version was completed in 1853, won a medal in Paris in 1855, and was bought for the Dudley Observatory in Albany, New York; a copy computed life tables for the British General Register Office. Neither was reliable enough to be left alone for long. The difference engine was possible; making one that never slipped was the hard part.:cite[swade2001]
:::

## Difference Engine No. 2

Between 1847 and 1849, after he had worked out the Analytical Engine, Babbage went back and redesigned the difference engine with everything he had learnt: about a third of the parts of the first design for the same power, eight columns of thirty-one digits, and a printer that impressed the results into soft material for printing plates, so that no human hand came between the machine and the page. He offered the drawings to the government. They were not built in his lifetime.

:::know[Built from the drawings]
Between 1985 and 1991 the Science Museum in London built Difference Engine No. 2's calculating section from Babbage's drawings, for his bicentenary, under the curator Doron Swade; the printer followed in 2000. The builders corrected a few errors in the drawings, and kept to tolerances achievable in Babbage's time, to answer the question of whether his engine could have worked. It did: it computes to 31 digits, exactly as designed. It has about 8 000 parts and weighs about five tonnes, counting the printer.:cite[swade2001,swade2005]
:::

### Two half-cycles

In the method of differences as written, each addition uses the old value of the column to its right, so the additions in one step must happen in order: column 1 into 0 first, then 2 into 1, and so on. That is slow: seven additions one after another, each with its carries.

Babbage did them in two halves. In the first half-cycle the odd-numbered columns (1, 3, 5, 7) all add into their left neighbours (0, 2, 4, 6) at once; in the second, the even-numbered ones (2, 4, 6) add into 1, 3 and 5. Each half-cycle does up to four additions in parallel. The cost is subtle: column 1 now receives column 2's *new* value, not its old one, and so on down the line. The columns run a step or two out of phase with each other.

The fix is to set the engine up with staggered starting values: column i starts with the i-th difference taken not at x = 0 but at x = −⌊i/2⌋, so that the out-of-phase additions come out right. Try it with and without the staggering.

::engine-columns{poly="cubes" staggered=false}

```answer
id: difference-engine/stagger
title: Setting up for cubes
prompt: 'To tabulate x³ on the engine, column 0 starts at f(0) = 0 and column 1 at Δf(0) = 1. Column 2 must start with the second difference taken at x = −1, that is f(1) − 2f(0) + f(−1). What number goes in column 2?'
answer: 0
why: '1 − 0 + (−1) = 0. Column 3 starts at the constant third difference, 6. With 0, 1, 0, 6 the engine prints 0, 1, 8, 27, 64, …; with the unstaggered 0, 1, 6, 6 it does not.'
```

:::modern[Pipelining]
Running the stages of a computation out of phase so that several of them work at once is **pipelining**, and the price is the same as in Babbage's engine: the stages see each other's results at different moments, and the start-up has to account for it. A processor fetches one instruction while decoding the previous one and executing the one before that; when one instruction needs a result that another has not finished yet, the hardware has to stall or forward it, and a compiler or a hardware designer has to think about exactly the timing question that the staggered set-up answers.
:::

### Carries in a spiral

Within one addition, every figure wheel of the receiving column is turned at the same moment by the matching digit of the giving column. A wheel that passes 9 → 0 cannot carry at once, because its neighbour above is still turning. Instead it raises a **carry warning**. Once the addition is over, a vertical shaft beside the column turns once. Its arms are set in a spiral, so they pass the wheels one at a time from the bottom up; an arm meeting a raised warning turns the wheel above on by one. If that wheel was a 9, it becomes 0 and raises its own warning just in time for the next arm up.

Watch the slice at slow speed: the red warnings rise during the addition and drop as the spiral passes. Here is the order of events in one half-cycle.

```order
id: difference-engine/half-cycle
title: One half-cycle, in order
prompt: Put the events of one half-cycle of the engine in order.
steps:
  - Every figure wheel of the receiving column turns forward by the digit of the giving column beside it, all at once.
  - Each wheel that passed 9 → 0 during that addition raises its carry warning.
  - The carry shaft turns; its lowest arm meets the units wheel's raised warning and turns the tens wheel on by one.
  - The tens wheel, which was at 9, passes to 0 and raises its own warning.
  - The next arm up meets the tens warning and turns the hundreds wheel on by one.
  - The warnings are reset; the column holds the correct sum, and the other half-cycle can begin.
why: Additions first, all digits in parallel; then carries, one place at a time, in a sequence slow enough that a carry can trigger the next.
```

:::question
The spiral carries one place per arm, so a carry through thirty 9s takes the whole turn of the shaft. Why is that acceptable here? (Compare with the anticipating carriage in chapter 4, designed for a machine that must also multiply.)
:::

## How fast?

Each cycle of the engine takes four turns of its handle and produces one new 31-digit value of the table, with all seven differences updated. Turning at a comfortable pace, the operator gets a new value every few seconds, already printed and set in type. Prony's room of human computers produced, for the logarithms alone, values in the hundreds of thousands; one engine and one operator could do a table of tens of thousands of entries in a working week, with no arithmetic errors and no typesetting errors at all.

:::ledger{machine="Difference Engine No. 2"}
**Designed:** 1847–1849; **built:** 1985–1991, printer 2000. **Holds:** 8 columns of 31 decimal digits: a polynomial of degree 7. **Does:** one method only, tabulation by differences, plus printing. **Speed:** one cycle (seven additions in two half-cycles, with carries) per four turns of the handle: a new value every few seconds. **Size:** about 8 000 parts and five tonnes with its printer. **Failure modes:** none in its arithmetic once built, but the first engine was never finished: building thousands of identical precision parts was the real obstacle.
:::

## Summary

- Printed tables were full of errors at every stage, from computing to typesetting.
- **Prony** showed that table-making can be split so that most of the work is adding differences, needing no mathematics.
- The **method of differences** continues the table of any polynomial by additions alone, and approximates other functions piece by piece. Differences also expose misprints.
- **Difference Engine No. 2** has eight columns of 31 digits. It adds in two **half-cycles**, which needs a **staggered** set-up (a pipeline), and carries in a **spiral**, one place at a time after each addition.
- It runs one method, built into its metal. To compute something else you must rebuild it. Babbage's next machine removed that limit.
