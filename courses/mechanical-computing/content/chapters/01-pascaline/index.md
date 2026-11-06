---
number: 1
title: 'Counting and the carry: the Pascaline'
summary: Counting wheels, a gravity-driven carry, and subtraction by nines’ complement.
duration: 70 minutes
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: pascaline/check-1
title: A long carry
prompt: A Pascaline with six wheels shows 099 999. You add 1 to the units wheel. How many sautoirs fall?
answer: 5
why: Each of the five 9s turns to 0 and releases its sautoir; the fifth sautoir pushes the sixth wheel from 0 to 1, which does not carry.
```

```answer
id: pascaline/check-2
title: Subtracting forwards
prompt: A six-wheel decimal machine holds 000 270. What does its complement row show?
answer: 999729
why: Each digit d shows as 9 − d.
```
:::

Here is a calculating machine from 1642, opened up so that you can see inside. Type a number and dial it in, or press **Set all to 9** and then **+1 on the units**, and watch what happens to the red levers.

::pascaline-lab{start=0}

That cascade, a 9 turning to 0 and pushing the next wheel along, is the **carry**. It is the first hard problem in mechanical arithmetic, and every machine in the first half of this course has to solve it. This chapter is about the machine that first solved it well.

## A wheel that counts

Counting with a wheel is easy. Cut ten teeth, engrave a digit beside each, and turn the wheel one tooth per unit. A wheel holds one decimal digit; a row of wheels holds a number. Turn the units wheel three teeth and you have added 3.

The trouble comes at the tenth tooth. When the units wheel passes from 9 to 0, the tens wheel must move on by one, and if the tens wheel was also at 9 it must pass the carry on to the hundreds, and so on. People who add with pen and paper do this without noticing; people who used a counting board or an abacus did it by hand, lifting ten counters off one line and putting one on the next. A machine has to do it by itself, and that is harder than it sounds.

The obvious way is to put a single tooth on each wheel that catches the next wheel once per turn, as in a car's odometer. It works for one carry. But add 1 to 99 999 and every wheel must turn at the same moment, all driven by the finger turning the units wheel. The force needed grows with the number of wheels, the friction of every wheel and every mesh adds up, and somewhere along the row a tooth bends.

::carry-race

:::history{year=1623 title="The calculating clock" people="Wilhelm Schickard"}
Nineteen years before Pascal, the Tübingen professor Wilhelm Schickard described a "calculating clock" in letters to Johannes Kepler: six-digit adding wheels with a single-tooth carry, and Napier's rods mounted above them to help with multiplication. A machine being made for Kepler was destroyed by fire before it was finished, and Schickard's design was forgotten until historians found the letters and his sketches in the twentieth century.:cite[williams1997] Replicas built from the sketches add well; a carry through many wheels at once is their weakness, as the widget above suggests.
:::

## Pascal's machine

:::bio{name="Blaise Pascal" born=1623 died=1662 place="Clermont, Auvergne"}
Mathematician, physicist and religious writer. At sixteen he published a theorem on conic sections; later he founded, with Fermat, the mathematics of probability, and showed with barometers carried up the Puy de Dôme that the air has weight. He began his calculating machine at eighteen, in Rouen.
:::

In 1639 Étienne Pascal was sent to Rouen as a royal commissioner for taxes in Upper Normandy, a job that meant years of adding up columns of livres, sols and deniers. His son Blaise, then eighteen, began designing a machine to do the additions in 1642. By his own account he made about fifty models, in wood, ivory, copper and steel, before he was satisfied; in 1645 he presented one to the Chancellor, Pierre Séguier, with a dedication and a notice to potential users, and in 1649 Louis XIV granted him a privilege, a monopoly on making calculating machines in France.:cite[mourlevat1988,marguin1994]

The machines were expensive and delicate, and few were sold. Perhaps twenty were made, and nine survive in museums. Some are decimal; others are built for money, with wheels of 20 sols to the livre and 12 deniers to the sol, and one, for surveyors, counts toises, pieds and pouces.

:::know[Nine machines]
Most of what we know about the Pascaline's insides comes from the surviving machines themselves, which have been taken apart, measured and drawn, and from Pascal's own printed notice of 1645. The machines differ from one another in detail: Pascal kept improving the design. The model in this chapter follows the common arrangement of the surviving machines, simplified so that every part can be seen at once.:cite[mourlevat1988]
:::

## Inside the machine

Turn the 3D model in the first widget and tap the parts to name them. Each column of the machine is one digit, and each has the same chain of parts:

1. **The input wheel**, on top, with spokes. You put a stylus between two spokes, opposite the digit you want to add on the fixed dial ring, and turn the wheel clockwise until the stylus meets the **stop**. The wheel has then moved on by exactly that digit. It cannot turn back: a click prevents it.
2. **The crown wheel**, a ring of pins at the foot of the input shaft, turns a **lantern pinion** on an axle that runs from front to back. That is how the vertical motion of your stylus becomes the horizontal motion of the drum.
3. **The number drum**, on the same axle, carries the digits 0–9 round its rim and shows one of them through a window in the lid.
4. **The carry wheel**, at the back of the same axle, has a pin that lifts the **sautoir** as the drum turns from 0 towards 9.

The **sautoir** is the clever part. It is a weighted lever, pivoted on a rod that runs the length of the machine. As a wheel climbs from 0 to 9 its pin raises the sautoir, a little at each step; the effort comes from your stylus, spread over the whole revolution. When the wheel passes from 9 to 0 the pin slips out from under the sautoir and it falls. As it falls, a pawl at its far end pushes the next column's pinion on by one tooth: the carry.

:::key
The sautoir stores the energy for the carry before the carry is needed, a little at a time, and gravity releases it in one go. A carry through five 9s costs the operator no more effort than a single carry: the first sautoir falls, the next wheel turns to 0 and releases its own sautoir, which falls in turn, and so on down the line, like dominoes.
:::

Run the first widget again in slow motion, setting all the wheels to 9 and adding 1. The sautoirs fall one after another, never together. The time a carry takes grows with the number of wheels it passes through, but the force does not.

```order
id: pascaline/order-carry
title: What happens when 0 999 becomes 1 000
prompt: Put these events in the order they happen inside the machine, from the stylus to the end of the carry.
steps:
  - The stylus turns the units wheel from 9 towards 0, lifting the units sautoir the last little way.
  - The units wheel passes 9 → 0; the units sautoir slips off its pin and falls.
  - The units sautoir's pawl pushes the tens pinion on by one tooth; the tens wheel passes 9 → 0.
  - The tens sautoir falls and pushes the hundreds wheel from 9 to 0.
  - The hundreds sautoir falls and pushes the thousands wheel from 0 to 1.
  - The thousands sautoir, lifted only a tenth of its way, stays put.
why: The carry ripples from the lowest place upwards, one sautoir at a time. Each fall is caused by the one before it.
```

```answer
id: pascaline/carries-count
title: Counting carries
prompt: Starting from zero, you dial 487 into a decimal Pascaline, then 256. How many sautoirs fall in all?
answer: 2
hints:
  - Add the columns from the units up, the way the machine does when you dial the units first.
  - '7 + 6 = 13 carries one; 8 + 5 + 1 = 14 carries one; 4 + 2 + 1 = 7 does not.'
why: '487 + 256 = 743, with a carry out of the units and a carry out of the tens: two sautoirs fall.'
```

## Subtraction without turning backwards

The wheels of a Pascaline turn only one way. That is not an oversight: the sautoirs only work in one direction, since a wheel turning backwards past 0 would have to lift a fallen sautoir up again and borrow from the next column. So how did Pascal's machine subtract?

Look again at the number drums. Each carries two rows of figures: the digits, and above them their **nines' complements**, 9 − d. A sliding bar in the lid covers one row or the other. When the drum shows 2 in the lower row, it shows 7 in the upper one; when it shows 0, 9.

Here is the trick. For a six-wheel machine, the complement row shows 999 999 minus the number on the wheels. To work out a − b:

1. Set the machine so that the complement row shows a. (The wheels then hold 999 999 − a.)
2. Add b in the ordinary way.
3. Read the answer in the complement row.

Why it works: the wheels now hold 999 999 − a + b, so the complement row shows 999 999 − (999 999 − a + b) = a − b. Adding has done a subtraction, and every wheel has turned forwards.

::pascaline-lab{start=999256 complements=true title="Subtraction by complements: 743 − 256"}

The machine above is set up for 743 − 256: its windows show the complement row, 000 743. Now dial in 256 and read the result in the same row. (Switch to **Digits** to see what the wheels really hold.)

```answer
id: pascaline/complement-subtract
title: Read the complement row
prompt: 'With the complement row showing 005 000, you dial in 1 234. What does the complement row show now?'
answer: 3766
why: '5 000 − 1 234 = 3 766. The wheels went from 994 999 to 996 233; their complement is 003 766.'
```

:::modern[Complements in your processor]
Your computer subtracts the same way. In binary, the complement of a digit d is 1 − d, which just flips the bit, so the **ones' complement** of a number is all its bits inverted. Add 1 to that and you get the **two's complement**, the form in which almost every processor stores negative integers. Subtraction becomes addition of the two's complement, and the adder needs no separate subtracting circuit. Pascal's machine used nines' complement for the same reason: it had an adder and no way to run it backwards.
:::

## Livres, sols and deniers

Pascal built his first machines for his father's tax accounts, and French money was not decimal. There were 12 deniers to the sol and 20 sols to the livre, so the two lowest wheels of an accounting Pascaline have 12 and 20 positions. Nothing else changes: a wheel that passes its last position releases its sautoir.

::pascaline-lab{accounting=true wheels=5 start=0 title="An accounting Pascaline: livres, sols and deniers"}

```answer
id: pascaline/livres
title: Carrying in money
prompt: 'An accounting machine shows 3 livres 19 sols 11 deniers. You add 1 denier. How many livres, sols and deniers does it show? Answer as three numbers, livres first, for example “5 2 7”.'
answer: ['4 0 0', '4,0,0', '4 livres 0 sols 0 deniers']
why: 'The deniers wheel passes 11 → 0 and carries; the sols wheel passes 19 → 0 and carries; the livres go from 3 to 4. Two sautoirs fall, on wheels of different sizes.'
```

:::question
A carry is a rule about the size of each wheel and nothing else. What would you change to make a Pascaline count hours, minutes and seconds?
:::

## A table by additions

Here is a problem that will come back in every chapter of the first half of this course: making a table of the numbers x² + x + 41 for x = 0, 1, 2, … (Euler noticed in 1772 that its first forty values are all prime, which is why it is famous). A Pascaline cannot multiply, but it does not need to. Look at the differences between successive values:

| x | x² + x + 41 | difference from the previous value |
|---|---|---|
| 0 | 41 | |
| 1 | 43 | 2 |
| 2 | 47 | 4 |
| 3 | 53 | 6 |
| 4 | 61 | 8 |

The differences go up by 2 each time. So you can make the whole table with additions only: start the machine at 41, add 2, write down 43; add 4, write down 47; add 6, and so on. A clerk with a Pascaline and a pencil can tabulate a polynomial without a single multiplication.

```answer
id: pascaline/table
title: Continue the table
prompt: Continue by additions. What is x² + x + 41 when x = 7?
answer: 97
hints:
  - The next differences are 10, 12 and 14.
why: '61 + 10 = 71, + 12 = 83, + 14 = 97. Check: 49 + 7 + 41 = 97.'
```

Chapter 3 turns this observation into a machine that does the additions itself and prints the table.

:::modern[Ripple carry]
A chain of carries that passes from one place to the next, each waiting for the one before it, is what electronic designers call a **ripple-carry adder**. In the Pascaline the ripple is visible: sautoirs falling in a row. In a 64-bit binary adder it is invisible but just as real, and the time the longest carry takes limits how fast the adder can run. Babbage met this problem in brass two centuries after Pascal, and his solution (chapter 4) is the one processors use today.
:::

:::ledger{machine="Pascaline"}
**Machine:** Pascal's calculator, 1642–1650s. **Holds:** 5 to 8 digits, depending on the machine. **Does:** addition directly; subtraction by complements; multiplication only by repeated addition. **Speed:** as fast as the operator can dial, a few seconds per digit; a carry takes a fraction of a second per wheel. **Effort:** constant, however long the carry, thanks to the sautoirs. **Failure modes:** a sautoir that sticks, or a wheel shaken past a position; the wheels cannot be turned backwards.
:::

## Summary

- A wheel with one position per digit counts; a row of wheels holds a number. The hard part is the **carry**.
- Carrying with a single tooth works but makes a long carry drive every wheel at once.
- Pascal's **sautoir** stores the carry's energy in advance, by lifting a weight; carries then fall in turn with constant effort.
- The wheels only turn forwards, so subtraction uses the **nines' complement**: a − b is read from the complement row after adding b to the complement of a.
- Additions alone can tabulate a polynomial, by adding its **differences**.
