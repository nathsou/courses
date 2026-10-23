---
number: 40
title: Neo-Riemannian harmony
summary: P, L and R, the Tonnetz and hexatonic cycles.
duration: 45 minutes
prerequisites: [symmetry]
skills:
  - Neo-Riemannian transformations
---

:::check
```quiz
q: 'Which triad shares two notes with :c[C] major and differs from it by one note moving a semitone?'
options:
  - text: ':c[Em]: :n[C] moves down a semitone to :n[B], :n[E] and :n[G] stay.'
    correct: true
  - text: ':c[Am]: :n[G] moves to :n[A].'
    why: ':c[Am] does share two notes with :c[C], but :n[G] moves to :n[A] by a whole tone.'
  - text: ':c[G] major.'
    why: ':c[G] major shares only one note with :c[C] (:n[G]).'
```
:::

## Chords that slide

Chapter 27’s chromatic mediants (:c[C] to :c[E], :c[C] to :c[Ab]) sound wonderful and yet have no function: no dominant, no
cadence. Nineteenth-century composers, Schubert, Liszt and Wagner above all, used them constantly. A way of thinking
about them, developed from the ideas of the theorist Hugo Riemann (1849–1919) by David Lewin, Richard Cohn and others
from the 1980s, is **neo-Riemannian theory**. It looks not at functions but at **voice leading between triads**: how
few notes must move, and how far, to get from one triad to another.

## Three moves

Hold two notes of a major or minor triad and move the third by the smallest possible step, and you reach one of exactly
three neighbouring triads:

| Move | Name | Example | What moves |
| --- | --- | --- | --- |
| **P** | parallel | :c[C] ↔ :c[Cm] | the third, by a semitone |
| **L** | leading-tone exchange | :c[C] ↔ :c[Em] | the root of the major triad, down a semitone to its own leading note (:n[C] to :n[B]) |
| **R** | relative | :c[C] ↔ :c[Am] | the fifth of the major triad, up a tone |

Each move swaps major and minor, and each undoes itself (P then P is back where you started). Combined, they reach
every triad, and the chromatic mediants of Chapter 27 are two-step combinations: :c[C] to :c[Ab] is P then L, :c[C] to :c[E] is L
then P, :c[C] to :c[A] is R then P, and :c[C] to :c[Eb] is P then R.

## The Tonnetz

Lay the twelve pitch classes out on a lattice: fifths running across, major thirds rising to the right, minor thirds
rising to the left. Every small triangle is then a triad, upward-pointing triangles major and downward-pointing
triangles minor, and P, L and R are simply flips of a triangle across one of its three edges. This “tone network”
(**Tonnetz**) was drawn by Euler in 1739 and used by Riemann; neo-Riemannian theory made it a map of smooth voice
leading.

::tonnetz{start="C"}

```play
id: neo-riemannian/hexatonic
title: The hexatonic cycle
prompt: 'Alternate P and L from :c[C]: six triads, each one note away from the last, back to :c[C]. Any voicing; try to move one finger at a time.'
range: [48, 79]
steps:
  - chord: C
  - chord: Cm
    label: P
  - chord: Ab
    label: L
  - chord: Abm
    label: P
  - chord: E
    label: L
  - chord: Em
    label: P
  - chord: C
    label: L
```

:::note[A stopping point]
P, L, R and the Tonnetz. Last, the cycles they make, and where you hear them.
:::

## Cycles

Alternating two moves goes round in a circle. **P and L** alternately visit six triads, :c[C] :c[Cm] :c[Ab] :c[Abm] :c[E] :c[Em], whose
roots are a major third apart and whose notes all belong to one six-note scale (:n[C] :n[Eb] :n[E] :n[G] :n[Ab] :n[B]): a
**hexatonic cycle**. **P and R** alternately visit eight triads with roots a minor third apart (:c[C] :c[Cm] :c[Eb] :c[Ebm] …),
all inside one octatonic scale (Chapter 39). **L and R** alternately visit all 24 major and minor triads.

The two triads opposite each other on a hexatonic cycle, such as :c[C] and :c[Abm], share no notes, but each note moves
only a semitone to get from one to the other. Cohn calls them **hexatonic poles**, and they have an uncanny sound: film
composers reach for them when something otherworldly appears.

::progression-player{chords="C,Cm,Ab,Abm,E,Em,C,C" tonics="C,D,F" patterns="block,arpeggio" tempo="72" title="A hexatonic cycle" subtitle="P, L, P, L, P, L: six triads, one note moving each time."}

```ear
id: neo-riemannian/hear-move
title: P, L or R?
prompt: ':c[C] major, then one of its three neighbours. Which move was it?'
kind: custom
options: [P (C to Cm), L (C to Em), R (C to Am)]
items:
  - play: [C4 E4 G4, C4 Eb4 G4]
    answer: P (C to Cm)
  - play: [C4 E4 G4, B3 E4 G4]
    answer: L (C to Em)
  - play: [C4 E4 G4, C4 E4 A4]
    answer: R (C to Am)
  - play: [E4 G4 C5, Eb4 G4 C5]
    answer: P (C to Cm)
  - play: [E4 G4 C5, E4 G4 B4]
    answer: L (C to Em)
  - play: [G3 C4 E4, A3 C4 E4]
    answer: R (C to Am)
rounds: 8
pass: 7
hints:
  - 'Listen for which note moves: the third, by a semitone, for P; the root slipping down a semitone for L; the fifth rising a tone for R.'
```

:::key
- Neo-Riemannian theory relates triads by **voice leading**: **P** (parallel, :c[C]–:c[Cm]), **L** (leading-tone exchange, :c[C]–:c[Em]),
  **R** (relative, :c[C]–:c[Am]), each moving one note by a step.
- On the **Tonnetz** triads are triangles and P, L, R are flips across their edges.
- **P–L** cycles visit six triads a major third apart (hexatonic); **P–R** cycles eight a minor third apart (octatonic).
:::
