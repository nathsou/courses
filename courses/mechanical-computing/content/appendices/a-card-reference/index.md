---
number: A
title: The card language
summary: Every card the course’s Analytical Engine reads, with its timing.
---

The course's Analytical Engine reads a single deck of cards, written one card per line. The kinds of card are Babbage's; the notation is the course's own, chosen to be short to type. Anything after `#` on a line is a comment.

## The store and the mill

- The **store** has 1 000 columns, V0 to V999. Each holds a whole number of up to 50 digits with a sign (or a fixed-point number, below). Every column starts at 0.
- The **mill** has two **ingress axes** and an **egress**. After an operation card, or after the mill has worked, the next number given to the mill goes to ingress axis 1 and the one after that to axis 2; as soon as axis 2 is filled, the mill works, and the result waits on the egress.
- The **run-up lever** is reset every time the mill works, then set if the result has the opposite sign to the first number (a subtraction that went below zero), if the result overflows 50 digits, or on division by zero.

## The cards

| Card | Kind | What it does | Time |
|---|---|---|---|
| `N7 3.25` | number | puts 3.25 into V7 | 0.5 s |
| `+` `-` `×` `÷` (or `*` `x` `/` `−`) | operation | sets what the mill does next | 0.1 s |
| `L7` | variable | gives V7 to the mill and keeps it in the store | 0.5 s |
| `Z7` | variable | gives V7 to the mill and clears V7 to zero | 0.5 s |
| `S7` | variable | stores the mill's result in V7 | 0.5 s |
| `S7'` | variable | stores the remainder of the last division in V7 | 0.5 s |
| `P` | printing | prints the last result | 0.1 s |
| `CF 3` / `CB 3` | combinatorial | moves the chain forward (skips the next 3 cards) or back (so that the next card read is 3 cards before this one) | 0.1 s |
| `CF? 3` / `CB? 3` | combinatorial | the same, but only if the run-up lever is set | 0.1 s |
| `BELL` | attendant | rings the bell | 0.1 s |
| `H` | halt | stops the engine | 0.1 s |
| `.decimal 20` | setting | fixed point: every number carries 20 decimal places; × and ÷ keep the point in place | none |

When the mill works it adds about 1 s for + and −, and about 60 s for × and ÷, after Babbage's own estimates for the engine as designed.:cite[babbage1864]

## Patterns

Copy a column (V2 into V1): add zero to it.

```deck
+
L2
L0
S1
```

Loop while a counter is above zero: decrement it, test whether it has gone below zero by subtracting 1 into a scratch column, and jump back unless the lever is set.

```deck
N1 5      # the counter
N2 1      # one
N3 0      # the total
+         # the body: add the counter into the total
L3
L1
S3
-         # count down
L1
L2
S1
-         # was it already 0? (V1 − 1 < 0 sets the lever)
L1
L2
S9
CF? 1
CB 13
H
```

Test for zero (here the remainder of a division, in V3): subtract it from 0. A positive remainder sets the lever; zero leaves it clear.

## Differences from Babbage's design

Babbage planned separate chains of operation cards and variable cards, so that the same operations could be applied to different columns, and number cards in a third chain; the course's engine reads one chain, in the order the cards are used. Babbage's combinatorial cards counted cards on each chain separately. His mill also had stepping cards to shift a number by powers of ten; the course's `.decimal` setting does that automatically for every multiplication and division. Babbage's engine was never built, and his designs changed over the decades, so no single card notation is "the" original one.:cite[bromley1982]
