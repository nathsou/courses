---
number: 5
title: 'The Analytical Engine: cards and Note G'
summary: Operation and variable cards, loops and branches, and Lovelace’s program for the Bernoulli numbers.
duration: 90 minutes
prerequisites: [analytical-engine]
---

:::check
```quiz
q: 'A deck reads `−`, `L1`, `L2`, `S3` with V1 = 3 and V2 = 5. What does the run-up lever do?'
options:
  - text: It is set, because the result (−2) has the opposite sign to the first number.
    correct: true
    why: That is the engine’s signal that a subtraction has gone below zero; a conditional card can then change what happens next.
  - text: Nothing; the lever only reacts to overflow.
    why: Overflow sets it too, but so does a change of sign.
  - text: It stops the engine.
    why: The engine carries on; the lever only matters to the next conditional card.
```
:::

The Analytical Engine's cards are its program, and the course's engine reads them. Here is a deck: run it, step through it, and switch between the text, the cards themselves and the table that Ada Lovelace would have drawn.

```deck caption="(a + b) × c, with a = 7, b = 5 and c = 3: run it, then change the number cards and run it again."
N1 7        # number cards put values in the store
N2 5
N3 3
+           # operation card: the mill will add
L1          # variable card: V1 to the mill (kept in the store)
L2          # V2 to the mill: the mill works
S4          # the result goes to V4
×
L4
L3
S5
P           # print the last result
```

Appendix A lists every card the course's engine reads. There are four kinds, and all four were Babbage's:

- **Number cards** put a number into a column of the store.
- **Operation cards** set what the mill will do: +, −, × or ÷.
- **Variable cards** move numbers: `L` gives a column's number to the mill and keeps it in the store, `Z` gives it and clears the column, and `S` takes the mill's result back to a column. Babbage made operation and variable cards separate chains, so that one sequence of operations could be reused on different columns. The course's engine reads them from a single deck, in the order they are used.
- **Combinatorial cards** move the chain of cards backwards or forwards: `CB 13` backs up thirteen cards, `CF 2` skips two. With a question mark (`CB? 13`) they move only if the **run-up lever** is set: the mill sets it when a result has the opposite sign to its first number, or overflows. That is the engine's conditional branch.

## Your first programs

```cards
id: note-g/euler
title: Euler’s polynomial
prompt: 'V1 holds x. Write a deck that leaves x² + x + 41 in V2. (V0 always holds 0 unless you change it, and you may use any other columns as scratch.)'
deck: |
  # V1 holds x. Leave x² + x + 41 in V2.
  N3 41
tests:
  - set: { V1: 0 }
    expect: { V2: 41 }
  - set: { V1: 5 }
    expect: { V2: 71 }
  - set: { V1: 40 }
    expect: { V2: 1681 }
hints:
  - 'Three workings of the mill: x × x, then add x, then add 41.'
  - 'After each working, store the result with an S card before using it again.'
solutionDeck: |
  N3 41
  ×
  L1
  L1
  S2
  +
  L2
  L1
  S2
  +
  L2
  L3
  S2
why: 'Each working costs about a second for an addition and a minute for the multiplication: on the real engine this deck would take just over a minute, almost all of it the ×.'
```

A deck that runs straight through computes one value. To make a table you need a **loop**: the same cards, read again and again. Here is the method of differences from chapter 3 with the loop half-written: the deck sets up the columns for x² + x + 41 and prints the first value.

```cards
id: note-g/table-loop
title: The difference engine, as a program
prompt: 'V1 holds N. Complete the deck so that it prints the table of x² + x + 41 for x = 0 to N: 41 first (already done), then N more values. Use a combinatorial card to loop, and the run-up lever to stop.'
deck: |
  N2 41     # the value
  N3 2      # the first difference
  N4 2      # the second difference (constant)
  N5 1      # the constant one
  +
  L2
  L0
  P         # prints 41
  # Your loop: add the difference into the value and print it,
  # add the second difference into the first, count V1 down,
  # and go back unless V1 has reached 0.
  H
tests:
  - set: { V1: 5 }
    printed: [41, 43, 47, 53, 61, 71]
  - set: { V1: 1 }
    printed: [41, 43]
  - set: { V1: 12 }
    printed: [41, 43, 47, 53, 61, 71, 83, 97, 113, 131, 151, 173, 197]
hints:
  - 'The body: + L2 L3 S2 P (new value, printed); + L3 L4 S3 (new difference); − L1 L5 S1 (one fewer to go).'
  - 'To stop when V1 reaches 0, compute V1 − 1 into a scratch column: the lever is set only if V1 was already 0. Then CF? 1 skips the card that loops back.'
  - 'Count cards carefully: CB n goes back so that the next card read is n cards before the CB card itself.'
solutionDeck: |
  N2 41
  N3 2
  N4 2
  N5 1
  +
  L2
  L0
  P
  +
  L2
  L3
  S2
  P
  +
  L3
  L4
  S3
  -
  L1
  L5
  S1
  -
  L1
  L5
  S6
  CF? 1
  CB 18
  H
why: 'Your deck is a difference engine in 20 cards. It is also slower: the Difference Engine does seven additions in two half-cycles of the handle, while the Analytical Engine reads a card at a time. Generality costs speed, a trade every general-purpose computer makes.'
```

:::modern[The branch]
`CF? 1` and `CB 18` together are an `if` and a `while`: test a flag the arithmetic unit set, and change which instruction comes next. Every processor has the same pair: a flags register set by arithmetic (negative, zero, overflow, carry), and conditional jumps that read it. The Analytical Engine's run-up lever is a one-bit flags register.
:::

```cards
id: note-g/euclid
title: Euclid’s algorithm
prompt: 'V1 holds a and V2 holds b (both positive whole numbers). Leave their greatest common divisor in V1. Euclid’s method: divide a by b; if the remainder is 0, b is the answer; otherwise replace a by b and b by the remainder, and repeat.'
deck: |
  # V1 = a, V2 = b. Leave the greatest common divisor in V1.
  ÷
  L1
  L2
  S9      # the quotient (not needed)
  S3'     # the remainder
tests:
  - set: { V1: 1071, V2: 462 }
    expect: { V1: 21 }
  - set: { V1: 100, V2: 75 }
    expect: { V1: 25 }
  - set: { V1: 17, V2: 5 }
    expect: { V1: 1 }
  - set: { V1: 12, V2: 18 }
    expect: { V1: 6 }
hints:
  - 'Copy a column by adding 0 to it: + L2 L0 S1 puts V2 into V1.'
  - 'To test whether the remainder is 0, subtract it from 0: − L0 L3 S9 sets the lever when the remainder is positive, and leaves it clear when it is 0.'
  - 'So after moving b into V1 and the remainder into V2, a conditional CB? goes back to the division while the lever is set.'
solutionDeck: |
  ÷
  L1
  L2
  S9
  S3'
  +
  L2
  L0
  S1
  +
  L3
  L0
  S2
  -
  L0
  L3
  S9
  CB? 17
  H
why: 'When the remainder is 0, V1 has just received b, which is the answer. Euclid’s algorithm is more than two thousand years old; on the Analytical Engine it costs about a minute per division.'
```

## The translator's notes

In 1840 Babbage went to Turin and explained the Analytical Engine to a group of Italian scientists. A young engineer in the audience, Luigi Menabrea (later Prime Minister of Italy), wrote up an account and published it in French, in a Geneva journal, in 1842.

:::bio{name="Ada Lovelace" born=1815 died=1852 place="London"}
Augusta Ada King, Countess of Lovelace, the only legitimate child of Lord Byron, whom she never knew. Her mother had her taught mathematics, partly in the hope of keeping her from her father's poetry; her tutors included Augustus De Morgan. She met Babbage at seventeen, saw the demonstration piece of the Difference Engine, and kept up a correspondence with him for the rest of her short life.
:::

Lovelace translated Menabrea's paper into English for Taylor's *Scientific Memoirs*, and at Babbage's suggestion added notes of her own. The notes, A to G, came out three times as long as the paper. They explain what the engine is for, how its cards are organised, how a sequence of operations can be repeated, and, in Note G, they work through in full how the engine would compute the Bernoulli numbers: a table of every operation, the columns it reads and the columns it writes, and the value in every column after every step.:cite[menabrea1843]

:::source{who="Ada Lovelace, Note A" when="1843"}
We may say most aptly that the Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.
:::

She also saw further than the arithmetic. The engine, she wrote, operates on symbols according to rules, and those symbols need not stand for numbers: if the relations of musical sounds could be expressed in such terms, the engine might compose elaborate pieces of music of any complexity. And she set out a limit that people still argue about.

:::source{who="Ada Lovelace, Note G" when="1843"}
The Analytical Engine has no pretensions whatever to originate anything. It can do whatever we know how to order it to perform.
:::

Alan Turing answered this, a century later, as "Lady Lovelace's objection" in his 1950 paper on machine intelligence.

:::know[Who wrote the program?]
How much of the Notes was Lovelace's and how much Babbage's has been argued over for decades. Babbage wrote, years later, that he had suggested the Bernoulli example and supplied the algebra, and that Lovelace had found a serious mistake in it; their surviving letters show her drafting, checking and arguing over the Notes, and correcting his work as well as he hers. Some historians read the letters as showing Lovelace as the author of the ideas; others as a gifted interpreter of Babbage's. Either way the Notes were published under her initials, and they contain the first published account of a nontrivial program for a general-purpose machine, written out operation by operation.:cite[fuegi2003]
:::

## Note G

The Bernoulli numbers turn up in the sums of powers (1ᵏ + 2ᵏ + … + nᵏ), in the series for the tangent function and in much of number theory. Lovelace computed them from a recurrence: each new Bernoulli number is found from the ones before it by a sum of terms, each a previous Bernoulli number times a ratio of products of small whole numbers. Her table works out the one she calls B₇, which is −1/30, from B₁ = 1/6, B₃ = −1/30 and B₅ = 1/42 (her numbering skips the zeros; today's books call these B₂, B₄, B₆ and B₈).

Here is her table in the course's card language: her twenty-five operations, using her column numbers. Operations 13 to 23 appear twice, as in her table, once for B₃ and once for B₅; the engine could repeat cards, but it had no way to make the same card read a different column on the second pass, so the repetition is written out. The deck works in fixed point with twenty decimal places (Babbage's engine had *stepping* cards to keep track of a decimal point; the course's engine does it with the `.decimal` line). Switch to the **Table** view to see it laid out as Lovelace laid it out.

::named-deck{name="note-g" caption="Note G, corrected: run it and V24 receives B₇ = −1/30. The run takes 153 cards and, by Babbage's estimates, about sixteen minutes, nearly all of it multiplication and division."}

### The bug

As printed in 1843, operation 4 reads the wrong way round: it divides column 5 by column 4, where the method needs column 4 divided by column 5, (2n − 1)/(2n + 1). Whether the slip was Lovelace's, Babbage's or the printer's, nobody can now say. Run as printed, the program produces a wrong value of B₇. Here is the deck as printed. Run it, find the operation that is wrong, and fix it.

```cards
id: note-g/fix
title: Debug Note G
prompt: 'This is Note G as printed in 1843. Run it: V24 should receive B₇ = −1/30 = −0.0333…, and it does not. Find the one operation that is wrong and correct it. (Use the Table view: compare each operation with what it should compute.)'
deckFrom: note-g-printed
tests:
  - expect: { V24: '-0.03333333333333333333' }
    tolerance: 100000
hints:
  - 'Operations 1 to 3 compute 2n, 2n − 1 and 2n + 1 into V4, V5 and V6 (and then V4 and V5 are updated). Which operation should then form (2n − 1)/(2n + 1)?'
  - 'Look at operation 4 in the Table view: which column is divided by which?'
  - 'Swap the two variable cards of operation 4, so that it divides V4 by V5.'
solution: 'In operation 4, swap <code>L5</code> and <code>L4</code> so that the cards read <code>÷ L4 L5 S11</code>. With V5 ÷ V4 the engine computes (2n + 1)/(2n − 1) = 9/7 instead of 7/9, every later term is right but the first is wrong, and V24 receives about 0.2206.'
why: 'One misplaced pair of cards out of about 150, and the answer is wrong in the first figure. Every programmer since has met the same lesson: a program that has never been run has not been checked, and Note G could not be run until a machine like this one existed.'
```

```answer
id: note-g/time
title: Engine time
prompt: 'Note G as written does 36 workings of the mill: 15 multiplications or divisions, at about a minute each, and 21 additions or subtractions, at about a second each. Leaving out the time to read cards and move numbers, roughly how many minutes does one run take? (A whole number.)'
answer: 15
tolerance: 0.6
why: '15 minutes for the multiplications and divisions plus 21 seconds for the rest: just over 15 minutes. The course’s engine reports about 16, because it also counts half a second for every number moved along the racks.'
```

:::ledger{machine="Analytical Engine (programs)"}
**Programs:** a single chain of cards in the course's engine (Babbage designed separate chains for operations and variables). **Control:** loops and conditional branches by combinatorial cards and the run-up lever, but no way to compute which column a card names. **Speed:** a card at a time; Note G takes about 16 engine minutes for one Bernoulli number. **Reliability:** the program could not be tested: the first bug in a published program sat unnoticed for over a century.
:::

## Summary

- A program for the Analytical Engine is a chain of **number**, **operation**, **variable** and **combinatorial** cards.
- **Loops** move the chain back; **branches** read the **run-up lever**, which the mill sets when a result changes sign or overflows. That is enough to write any algorithm the store has room for.
- **Lovelace's Notes** (1843) explain the engine's generality, foresee computing on symbols other than numbers, and in **Note G** give the first published program, for the Bernoulli numbers.
- As printed, Note G has a slip in operation 4. It would have been found the first time it ran.
- Babbage designed all this in brass, and none of it was built. Part III goes back two thousand years to machines that compute in a different way altogether.
