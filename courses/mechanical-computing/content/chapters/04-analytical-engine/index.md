---
number: 4
title: 'The Analytical Engine: store, mill and barrels'
summary: Memory and processor in brass, the anticipating carriage, and the studded barrels that were microcode.
duration: 70 minutes
prerequisites: [difference-engine]
---

:::check
```answer
id: analytical-engine/check-1
title: One step
prompt: 'Adding 99 999 999 + 1, a ripple carry needs 8 carry steps after the digits are added. How many does Babbage’s anticipating carriage need?'
answer: 1
why: The carriage looks down the line for a warning followed by 9s, and makes every carry in one motion.
```

```answer
id: analytical-engine/check-2
title: Memory
prompt: 'In the Analytical Engine, what was the part that held numbers waiting to be used called? (One word.)'
answer: [store, 'the store']
why: The store held the numbers; the mill did the arithmetic; the racks carried numbers between them.
```
:::

Difference Engine No. 2 does one thing, beautifully. Here is a design that does whatever its cards tell it. Step through the cards: the engine works out (7 + 5) × 3.

::store-mill

Three things in that picture had never existed together before, and every computer since has had all three: a **store** of numbers separate from the place where arithmetic happens, a **mill** that does the arithmetic on numbers brought to it, and a **program**, a chain of cards outside the machine that says what to fetch, what to do and where to put the result.

## A machine that can be told what to do

While Difference Engine No. 1 stood half-built in 1833, Babbage noticed something about his own design. The engine fed its results back into itself: column 1 into column 0, column 2 into column 1. What if a machine could feed any result into any place, and carry out any sequence of operations? Over the next few years he designed the **Analytical Engine**: a mill that could add, subtract, multiply and divide, a store to hold numbers, and punched cards to control both. He kept refining it, in hundreds of drawings and thousands of pages of notes, until he died in 1871.:cite[bromley1982]

:::history{year=1804 title="Cards that weave" people="Joseph Marie Jacquard"}
In 1804 Joseph Marie Jacquard demonstrated a loom attachment controlled by a chain of punched cards: each card, one row of the weave, its holes deciding which warp threads were lifted. Patterns of any complexity could be woven by changing the cards, not the loom, and Jacquard looms spread across Europe. Babbage owned a portrait of Jacquard woven in silk on such a loom, said to have taken tens of thousands of cards, and liked to ask visitors whether it was an engraving. He took his program cards straight from the loom.:cite[swade2001]
:::

The engine was never built. Babbage could not get funding after the fiasco of the first difference engine, and he kept redesigning rather than building. After his death his son Henry assembled a small part of the mill, and in 1910 it calculated, with some errors, a table of multiples of π. What we know of the engine we know from Babbage's drawings, and from the study of them by Allan Bromley and others since the 1970s.

## Store and mill

**The store** is a set of columns of figure wheels, each column holding one number of up to fifty digits with its sign. Babbage's later plans went up to a thousand columns. In modern terms that is about twenty kilobytes of memory, built from brass wheels.

**The mill** is where arithmetic happens. Numbers do not stay there: they are brought in on two **ingress axes**, worked on, and the result left on an **egress axis**, from which it is taken back to the store. The mill adds and subtracts in a single sweep of all fifty digits at once; it multiplies by first forming the multiples 1× to 9× of the multiplicand on table axes, then adding the right multiple for each digit of the multiplier while stepping the egress along; it divides by trial subtraction in the same way.

Between them run the **racks**: toothed bars that carry a number from any column of the store to the mill, or back. Only one number travels at a time.

:::modern[Memory, processor and bus]
Store, mill and racks are memory, arithmetic unit and bus. Babbage separated them for the reason computers still do: a mill is expensive, so build one and bring the numbers to it; a column of the store is cheap, so build a thousand. The racks, one number at a time, are the bottleneck that John Backus would name, in 1977, the "von Neumann bottleneck", after the man who described the same arrangement for electronic machines in 1945.
:::

## The anticipating carriage

The mill had to be fast, because a multiplication of two fifty-digit numbers is fifty additions. And each addition ends with carries. In Difference Engine No. 2 the carries go up the column one place at a time, which was acceptable for a machine that did one addition per half-cycle. For the mill it was not: a carry through forty-nine 9s would take forty-nine carry steps, and every addition would have to allow time for the worst case.

Babbage's answer took him years, and he was prouder of it than of almost anything else. He called it the **anticipating carriage**. After the digits are added, each place knows two things: whether it *made* a carry (its sum reached ten, so it raised a warning) and whether it *would pass one on* (it now shows 9). A place receives a carry exactly when somewhere below it there is a warning followed by nothing but 9s. Babbage built rods that look down the line for that pattern, so that every carry is made in a single motion, however long the run of 9s.:cite[bromley1982]

::carry-lab

```answer
id: analytical-engine/ripple-steps
title: The worst case
prompt: 'With the 50-digit numbers of the Analytical Engine, how many carry steps would a ripple carry need in the worst case after one addition?'
answer: 50
hints:
  - 'The worst case is a warning in the lowest place followed by 9s all the way up: 999…99 + 1.'
why: 'One step for the carry out of the lowest place and one more for each of the 49 nines above it: 50 steps, against 1 for the anticipating carriage. Fifty additions in a multiplication made the difference enormous.'
```

```quiz
q: 'After the digits of an addition are added (before any carries), the places show, from the lowest: warning, 9, 9, 3, 9. Which places receive a carry?'
options:
  - text: 'The second, third and fourth places.'
    correct: true
    why: 'The warning in the first place passes through the two 9s and stops at the 3, which becomes 4. The 9 in the fifth place has no warning below it unbroken by a non-9, so it stays 9.'
  - text: 'The second, third, fourth and fifth places.'
    why: The 3 in the fourth place absorbs the carry; it does not pass it on to the fifth.
  - text: 'Only the second place.'
    why: That is what Leibniz’s machine would do (chapter 2). A carry into a 9 passes on.
```

:::modern[Carry lookahead]
Electronic designers rediscovered the anticipating carriage in the 1950s and called it **carry lookahead**. In their words a place *generates* a carry (sum ≥ base) or *propagates* one (sum = base − 1, a 9 in decimal or a 1 in binary), and the carry into place i is computed directly as "some place below generated, and every place between propagates", by logic instead of rods. Every fast adder in a modern processor is built on that idea.
:::

## Barrels: programs inside the program

An operation card says "multiply". But multiplying is itself a sequence of steps: bring the numbers in, form the table of multiples, add and step for each digit, take the product out. Who controls those steps?

Inside the mill, Babbage put **barrels**: drums like a music box's, with studs set in rows. At each step a barrel turns by one row, and the studs in the row at the top push levers; each lever sets off one action in the mill. An operation card does little more than choose a barrel and start it turning. A row of studs is one microstep; the barrel is a little program of its own, fixed in brass.

::barrel-lab{program="multiply"}

The multiplication barrel has a row that sends it *back* a row while digits of the multiplier remain: the barrel loops. Babbage's barrels could step forwards or backwards depending on conditions in the mill, so even the inner sequences of the mill had loops and branches.:cite[bromley1982]

:::modern[Microcode]
A layer of fixed programs beneath the visible instructions, each turning one instruction into a sequence of control signals, is **microcode**. Maurice Wilkes proposed it for electronic computers in 1951, and IBM's System/360 made it standard in 1964; modern x86 processors still carry microcode for their complex instructions, and can have it patched. Babbage's barrels are microcode in brass, a hundred years early.
:::

```order
id: analytical-engine/order-multiply
title: A multiplication, from card to store
prompt: Put the steps of one multiplication on the Analytical Engine in order.
steps:
  - The operation card for × sets the mill to multiply and selects the multiplication barrel.
  - A variable card sends the multiplicand from its column in the store, along the racks, to ingress axis 1.
  - A second variable card sends the multiplier to ingress axis 2.
  - The barrel’s studs make the mill form the multiples 1× to 9× of the multiplicand.
  - For each digit of the multiplier, the matching multiple is added into the egress (all carries at once) and the egress steps one place.
  - A variable card sends the product from the egress back along the racks to a column of the store.
why: Cards choose the operation and the operands; the barrel runs the steps inside the mill; the store keeps the result for later cards.
```

:::ledger{machine="Analytical Engine (design)"}
**Designed:** 1834–1871; never built. **Holds:** up to 1 000 numbers of 50 digits in the store (about 20 kB). **Does:** +, −, ×, ÷, under the control of cards, with loops and branches (chapter 5). **Speed (Babbage’s estimate):** about sixty additions or subtractions a minute; a multiplication of two fifty-digit numbers in about a minute. **Innovations:** separate store and mill, carry lookahead, microprogrammed control. **Obstacle:** its size and the precision of its tens of thousands of parts; Babbage never had the money or the stability of design to build it.:cite[babbage1864]
:::

## Summary

- The **Analytical Engine** separates a **store** of numbers from a **mill** that does arithmetic, joined by **racks** that carry one number at a time: memory, processor and bus.
- The **anticipating carriage** makes every carry of an addition at once, by looking for warnings followed by runs of 9s: carry lookahead.
- **Barrels** of studs inside the mill run the steps of each operation, with loops: microcode.
- What the engine computes is decided by **cards** outside it. Chapter 5 is about those cards, and about the first published program written for the engine.
