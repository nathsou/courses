---
number: 9
title: 'Zuse’s Z1: binary in sheet metal'
summary: Logic gates made of sliding plates and pins, binary floating point, and a program on punched film.
duration: 65 minutes
prerequisites: [note-g]
---

:::check
```answer
id: z1/check-1
title: Binary
prompt: What is the binary number 1101 in decimal?
answer: 13
why: '8 + 4 + 0 + 1 = 13.'
```

```answer
id: z1/check-2
title: Floating point
prompt: 'In binary floating point, 1.1 × 2³ (the mantissa 1.1 in binary) is what in decimal?'
answer: 12
why: '1.1 in binary is 1.5; 1.5 × 8 = 12.'
```
:::

Every digital machine so far has counted in tens: wheels with ten positions, carries at 9 → 0. Here is a different idea, from Berlin in 1936. Each element holds one of only two states, and every operation is built from elements that let a motion through or block it. Set the two inputs and run a clock cycle.

::z1-lab

The steel driving plate moves in every cycle. The pin of control plate A is either in its pusher's path (1) or out of it (0); if it is in, the pusher drags the brass output plate along, and that plate's own pusher reaches for pin B. The dark output plate at the end moves only if both pins were in place: the pair computes **A AND B**. Tick the box to move the second pusher to the 0 position, and the same parts compute **A AND NOT B**. That is all the logic a computer needs.

## A computer in the living room

:::bio{name="Konrad Zuse" born=1910 died=1995 place="Berlin"}
Civil engineer, who in the 1930s worked on aircraft stress calculations at Henschel and found the endless arithmetic intolerable. He built four computers between 1936 and 1945, designed the first high-level programming language (Plankalkül, 1945), and founded one of the first computer companies.
:::

Zuse quit his job at the Henschel aircraft works in 1935 to build a calculating machine. He knew nothing of Babbage. He worked in his parents' flat in Berlin-Kreuzberg, with friends helping to cut thousands of thin steel plates with a fretsaw, and by 1938 he had the **Z1**: a mechanical, binary, programmable calculator, driven by an electric motor.:cite[zuse1993]

Three design decisions made it unlike anything before it, and like everything after it:

1. **Binary.** Every number is a pattern of two-state elements. Decimal machines need ten-position wheels and carries over ten; a binary element is a plate in one of two positions, and the logic for adding two bits is a handful of elements. Zuse chose binary for simplicity of mechanism, not because anyone had told him to.
2. **Floating point.** Each number is stored as a sign, an exponent and a mantissa, so that very large and very small numbers fit in the same word and the machine keeps track of the binary point.
3. **A program on punched film.** Instructions came from discarded 35 mm cinema film, punched with eight holes per row: load a number from memory, store it, add, subtract, multiply, divide, read a decimal number from the keyboard, show a result on the lamps. There was no conditional branch.:cite[rojas2014]

The memory held 16 words in the original (64 in the reconstruction), each a pattern of plates. The arithmetic unit added and subtracted floating-point numbers, multiplied by repeated additions and divided by repeated subtractions, and converted between decimal and binary for the operator.

## Logic from plates and pins

The Z1 was built in layers: stacks of thin steel plates, each layer able to slide in one direction, with pins passing between layers. The clock pushed driving plates in four directions in turn, one in each phase of a cycle. Every element followed the same principle as the pair above: a control plate places a pin, and the pin either catches a moving plate or misses it.

With that one element Zuse built everything:

- **AND:** elements in series, each output plate driving the next element.
- **OR:** elements side by side, either one able to push a shared output plate.
- **NOT:** an element whose pin couples in the 0 position instead of 1.
- **Memory:** a plate held in one of two positions until another element moves it.

```order
id: z1/order-cycle
title: One clock phase in the pair of elements
prompt: With A = 1 and B = 1, put the events of one clock phase in order.
steps:
  - The clock pushes the steel driving plate along.
  - The driver’s pusher meets pin A, which control plate A holds in the 1 position.
  - Pin A drags the first output plate, whose own pusher moves towards pin B.
  - The second pusher meets pin B, held in the 1 position by control plate B.
  - Pin B drags the final output plate along: the result is 1, ready to move another element’s control plate.
why: Each element hands its motion on, or not; the result of one is a position that sets the next.
```

::gate-chooser{id="z1/xor" title="Exclusive or, from three gates" prompt="Choose three gates so that out = G3(G1(A, B), G2(A, B)) is 1 exactly when A and B differ (exclusive or). You may use AND, OR, NAND and NOR." hints='["XOR is ‘A or B, but not both’.","‘Not both’ is NAND. Combine OR and NAND with a third gate."]' solution="out = AND(OR(A, B), NAND(A, B)): the OR says at least one is 1, the NAND says not both."}

:::modern[The same element, a billion times]
A transistor in a chip is the same element: a control (the gate voltage) decides whether a driving signal (from the supply) reaches the output. Logic families are built from series arrangements (NAND in CMOS has two transistors in series to ground) and parallel ones, exactly Zuse's AND and OR. His plates and pins are the first gate-level logic design of a working computer, and the same principle scaled by a factor of about a billion runs every processor.
:::

## Adding in binary

With gates, a machine adds. One column of binary addition takes two bits a and b and a carry in c, and produces a sum bit and a carry out:

- sum = a XOR b XOR c
- carry out = (a AND b) OR (c AND (a XOR b))

A **full adder**, four or five gates; a row of them, each carry feeding the next, adds whole words. It is the ripple carry of the Pascaline, now in binary and in steel: the carry still has to travel along the row. The Z1's adder used a faster scheme that computed carries in parallel, as Babbage's anticipating carriage had.:cite[rojas2014]

```answer
id: z1/binary-add
title: Add in binary
prompt: 'Add the binary numbers 1011 and 0111. Give the result in binary.'
answer: ['10010', '0b10010']
why: '1011 is 11 and 0111 is 7: 11 + 7 = 18 = 10010. Every column except the leftmost produced a carry.'
```

## Floating point

A fixed-point machine like the Analytical Engine needs the programmer to keep track of where the decimal point is (chapter 5's `.decimal` line). Zuse's floating point stores every number as ± 1.f × 2^e, with the leading 1 understood: the machine shifts mantissas to line up exponents before adding, and adds exponents when multiplying. The Z1's word is a sign, a 7-bit exponent and a mantissa; the description below follows Raúl Rojas's study of the reconstruction, with a 16-bit fraction.

::float-lab

```answer
id: z1/float-exponent
title: Find the exponent
prompt: 'In the format above, the number 100 is stored as 1.f × 2^e with 1 ≤ 1.f < 2. What is e?'
answer: 6
why: '2⁶ = 64 ≤ 100 < 128 = 2⁷, so 100 = 1.5625 × 2⁶; the fraction bits are .1001.'
```

```quiz
q: 'Why does the floating-point word not store the leading 1 of the mantissa?'
options:
  - text: Every non-zero number, normalised, has a leading 1 in binary; storing it would waste a bit that is always 1.
    correct: true
    why: In binary the only non-zero leading digit is 1. The trick (the "hidden bit") is still used in the IEEE 754 floating-point format of every modern processor.
  - text: The leading 1 is stored in the exponent instead.
    why: The exponent says where the binary point goes; it does not hold mantissa digits.
  - text: The Z1 could only represent numbers smaller than 1.
    why: With a 7-bit exponent it could represent numbers from about 10⁻¹⁹ to 10¹⁹.
```

## What happened to it

The Z1 was never reliable: thousands of hand-cut plates had to slide past each other without catching, and they often caught. Zuse kept its memory and design but rebuilt the arithmetic with telephone relays, first in the Z2 (1940) and then in the **Z3** (1941), the first working programmable, fully automatic digital computer, with some 2 600 relays. The Z1 was destroyed with his parents' flat in an air raid in December 1943, the Z3 in another raid. In the 1980s, retired, Zuse rebuilt the Z1 from memory and his old drawings; the reconstruction stands in the German Museum of Technology in Berlin, and, like the original, rarely runs for long.

:::know[Reading a machine nobody fully documented]
Zuse's surviving drawings of the Z1 were incomplete, and the 1980s reconstruction differs from the original in places, such as the size of the memory. How it worked in detail was not written down until Raúl Rojas and his students studied the reconstruction and Zuse's papers and published, in 2014, the first comprehensive description of its architecture and algorithms.:cite[rojas2014]
:::

:::ledger{machine="Zuse Z1"}
**Built:** 1936–1938, Berlin; destroyed 1943; reconstructed 1989. **Holds:** 16 words (64 in the reconstruction) of binary floating point. **Does:** +, −, ×, ÷, square root, decimal input and output, from a program on punched film with no branches. **Speed:** the reconstruction runs at one cycle per second; a multiplication takes several seconds. **Parts:** thousands of sheet-steel plates and pins. **Failure modes:** plates catching and jamming; the mechanism was never reliable, which is why the Z3 used relays.
:::

## Summary

- The **Z1** (1938) was mechanical, **binary**, **floating-point** and **programmable** from punched film.
- Its logic was built from one kind of element: a pin that couples a moving plate to an output plate, or not. Series gives AND, parallel OR, the other pin position NOT.
- Binary addition is a row of **full adders**; floating point stores ± 1.f × 2^e with a hidden leading 1.
- It jammed. Zuse moved to relays, switches moved by electricity rather than by levers, and the Z3 worked. Chapter 10 asks what else a computer can be made of.
