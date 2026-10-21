---
number: 5
title: Reading the grand staff
summary: Lines and spaces, treble and bass clefs, ledger lines, landmark notes and reading by interval.
duration: 45 minutes
prerequisites: [high-and-low, metre]
skills:
  - Reading the treble staff
  - Reading the bass staff
---

:::check
```read
id: grand-staff/check-1
title: Twelve notes
prompt: 'Play each note as it appears: both clefs, white keys from :n[C2] to :n[C6].'
staff: grand
range: [C2, C6]
rounds: 12
pass: 11
```
:::

## Five lines

Written music puts pitch on a **staff** (in British usage also a *stave*): five horizontal lines and the four
spaces between them. A note sits either *on* a line, with the line through its middle, or *in* a space,
between two lines. Higher on the staff means higher in pitch, so a tune that climbs climbs on the page too.

```score caption="Up the staff in steps: line, space, line, space… Each step is the next white key." names="true" tempo="120"
\time 9/4 e'4 f'4 g'4 a'4 b'4 c''4 d''4 e''4 f''4 |
```

Going from a line to the space just above it, or from a space to the line just above, is one step: the
next letter, the next white key. That is the most useful fact in this chapter. You do not have to know every
note on the staff by name; you can find most notes by counting steps from one you do know.

## Clefs

A staff on its own does not say which notes its lines are. A **clef** at the start does, by naming one line.

- The **treble clef** (or *G clef*) curls around the second line from the bottom and makes it :n[G4], the
  :n[G] above middle C. The treble staff covers the right hand’s usual range.
- The **bass clef** (or *F clef*) puts its two dots either side of the second line from the top and makes it
  :n[F3], the :n[F] below middle C. The bass staff covers the left hand’s.

Piano music joins a treble staff and a bass staff with a brace into the **grand staff**. Middle C sits
exactly between them, on a short line of its own: a **ledger line**, which extends the staff for one note.
Middle C can be written on a ledger line below the treble staff or above the bass staff; it is the same
key, and the writer chooses whichever staff the hand playing it is reading.

::staff-piano{landmarks}

Play anything on the keyboard above and it is written on the staff. With nothing pressed, the widget shows
five **landmark notes**: :n[C2] (two ledger lines below the bass staff), the bass clef’s :n[F3], middle C,
the treble clef’s :n[G4], and :n[C6] (two ledger lines above). Learn those five by sight, and every other
note is a step or two from one of them.

:::note[Mnemonics]
Many teachers give sentences for the lines and spaces in letter names: on the treble staff the lines are
E G B D F (*Every Good Boy Deserves Fun*) and the spaces spell F A C E; on the bass staff the lines are
G B D F A (*Good Boys Do Fine Always*) and the spaces A C E G (*All Cows Eat Grass*). They help at the
start, but reading by landmark and step is faster in the end, because it works on ledger lines too and
because it reads the *shape* of a tune, not just its letters.
:::

Now read. The course shows a note; play it as soon as you know it. The first drill uses the treble staff
from middle C upward.

```read
id: grand-staff/treble
title: The treble staff
prompt: 'White keys from :n[C4] to :n[G5]. Use :n[G4] (the clef’s line) and middle C as your landmarks.'
staff: treble
range: [C4, G5]
rounds: 20
pass: 18
```

```read
id: grand-staff/bass
title: The bass staff
prompt: 'White keys from :n[F2] to :n[C4]. Use :n[F3] (the line between the dots of the clef) and middle C.'
staff: bass
range: [F2, C4]
rounds: 20
pass: 18
```

:::note[A stopping point]
Two staves, two clefs and five landmarks. The rest of the chapter adds ledger lines and reading tunes rather
than single notes.
:::

## Ledger lines

Notes above or below a staff are written on **ledger lines**, short lines that continue the staff’s pattern
of lines and spaces. One ledger line below the treble staff is middle C; two ledger lines above the treble
staff is :n[C6]. Ledger lines are counted like staff lines: line, space, line, space.

```score caption="Ledger lines below and above the treble staff." names="true" play="false"
\time 6/4 a4 c'4 e'4 f''4 a''4 c'''4 |
```

```read
id: grand-staff/ledgers
title: Both staves, with ledger lines
prompt: 'White keys from :n[C2] to :n[C6], on whichever staff they belong to. The landmarks :n[C2] and :n[C6] sit on two ledger lines.'
staff: grand
range: [C2, C6]
rounds: 20
pass: 17
```

```spell
id: grand-staff/write
title: Write it
prompt: 'Play the key that is written where the question says; the course shows where your note lands.'
staff: grand
range: [36, 84]
items:
  - ask: 'The note on the middle line of the treble staff.'
    answer: [B4]
    octave: true
  - ask: 'The note on the top line of the bass staff.'
    answer: [A3]
    octave: true
  - ask: 'The note in the top space of the treble staff.'
    answer: [E5]
    octave: true
  - ask: 'The note on the bottom line of the bass staff.'
    answer: [G2]
    octave: true
  - ask: 'Middle C.'
    answer: [C4]
    octave: true
```

## Reading by interval

Single notes are only half of reading. Music moves, and the eye can follow the movement: a note one step
higher on the staff is the next key up; a note that skips a line (from a line to the next line, or a space
to the next space) skips one white key. Reading a tune is mostly reading those distances, with an
occasional landmark to check where you are.

```score caption="Steps (to the next line or space) and skips (to the next line from a line, or the next space from a space)." play="false"
\time 4/4 c''4 d''4 e''4 c''4 | e''4 g''4 e''4 c''4 | d''4 f''4 a''4 f''4 | e''2 c''2 |
```

Here is the opening phrase of Korobeiniki again, now to read rather than copy. Play it at your own pace:
the next note lights up, and the course moves on when you play it.

```perform
id: grand-staff/korobeiniki-read
title: Korobeiniki, read from the staff
prompt: 'Read and play, without the clock. Start on :n[E5], the top space.'
mode: notes
range: [57, 79]
score: |
  \time 4/4 \key a \minor e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 |
hints:
  - 'After the first :n[E5], the tune steps down: :n[B4] is the middle line, :n[C5] the space above it, :n[D5] the line above that.'
```

And something for the left hand: a bass line, on the bass staff, written for the course.

```perform
id: grand-staff/bass-line
title: A bass line
mode: notes
range: [36, 60]
score: |
  \clef bass \time 4/4 c4 e4 g4 e4 | f4 a4 c'4 a4 | g4 b4 d'4 b4 | c2 c,2 |
hints:
  - 'The first note is the second space of the bass staff: :n[C3]. The last is :n[C2], two ledger lines below.'
```

:::key
- The **staff** has five lines and four spaces; each step from a line to a space is the next white key.
- The **treble clef** makes the second line up :n[G4]; the **bass clef** makes the second line down :n[F3].
  Together they form the **grand staff**, with middle C on a ledger line between them.
- Learn five landmarks (:n[C2], :n[F3], :n[C4], :n[G4], :n[C6]) and read the rest by step and skip.
:::
