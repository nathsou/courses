---
number: 12
title: Rhythm in more detail
summary: Compound metre, triplets, semiquavers, syncopation and swing. Korobeiniki I.
duration: 50 minutes
prerequisites: [metre, triads]
skills:
  - Compound metre
  - Triplets and syncopation
---

:::check
```perform
id: rhythm-in-detail/check-1
title: Six-eight and triplets
prompt: 'Tap the rhythm in 6/8. The click marks the two dotted-:t[crotchet] beats of each :t[bar].'
mode: rhythm
tempo: 72
score: |
  \time 6/8 b'8 b'8 b'8 b'4 b'8 | b'4. b'4. |
```

```perform
id: rhythm-in-detail/check-2
title: Triplets and syncopation
mode: rhythm
tempo: 72
score: |
  \time 4/4 \tuplet 3/2 { b'8 b'8 b'8 } b'4 b'8 b'4 b'8 | b'4 b'2 r4 |
```
:::

## Semiquavers in combination

A beat can be split into four :t[semiquaver]s, and the four can be grouped in several ways. Four rhythms
cover most of what you will meet, all of them one beat long:

```score caption="Four :t[semiquaver]s; a :t[quaver] and two :t[semiquaver]s; two :t[semiquaver]s and a :t[quaver]; a dotted :t[quaver] and a :t[semiquaver]." tempo="66"
\time 4/4 b'16 b'16 b'16 b'16 b'8 b'16 b'16 b'16 b'16 b'8 b'8. b'16 |
```

Count them with four syllables per beat, “one-e-and-a”, and land each note on its syllable. The dotted
:t[quaver]-:t[semiquaver] figure is the “one ... a” of that count: long, then a short note that leans into the
next beat.

```perform
id: rhythm-in-detail/semiquavers
title: Four to a beat
mode: rhythm
tempo: 60
score: |
  \time 4/4 b'4 b'16 b'16 b'16 b'16 b'8 b'16 b'16 b'4 | b'8. b'16 b'8. b'16 b'16 b'16 b'8 b'4 |
hints:
  - 'Count “one-e-and-a” on every beat, slowly, before you start. Each :t[semiquaver] gets one syllable.'
```

## Compound metre

In every metre so far the beat has divided into **two**: a :t[crotchet] into two :t[quaver]s. In **compound
metre** the beat divides into **three**. The beat is then a dotted note: in **6/8** there are two beats per
:t[bar], each a dotted :t[crotchet] made of three :t[quaver]s. 9/8 has three such beats, 12/8 four.

So 6/8 and 3/4 both hold six :t[quaver]s, but they group them differently: 6/8 is **one**-two-three
**four**-five-six (two beats, each in three), 3/4 is **one**-and **two**-and **three**-and (three beats, each in
two). The page shows the difference in the beaming.

```score caption="Six :t[quaver]s in 6/8 (two groups of three) and in 3/4 (three groups of two)." tempo="72"
\time 6/8 c''8 d''8 e''8 f''8 e''8 d''8 | c''4. g'4. |
```

```score play="false" label="The same six quavers in 3/4"
\time 3/4 c''8 d''8 e''8 f''8 e''8 d''8 | c''2 g'4 |
```

Compound metres give music a lilt: jigs, lullabies and barcarolles are often in 6/8, and slow blues and
gospel ballads in 12/8.

```perform
id: rhythm-in-detail/six-eight
title: A tune in 6/8
prompt: 'A course tune in 6/8. The click is on the dotted-:t[crotchet] beats: two per :t[bar].'
mode: both
tempo: 56
range: [55, 79]
score: |
  \time 6/8 c''4 d''8 e''4 c''8 | g''4. e''4. | f''8 e''8 d''8 c''4 b'8 | c''4. r4. |
```

## Triplets

A **triplet** fits three notes into the time of two of the same kind: three triplet :t[quaver]s fill one
:t[crotchet] beat. It brings compound metre’s three-way division into a simple metre for a moment. Triplets are
written with a 3 over the group (and a bracket when the notes are not beamed).

```score caption="Straight :t[quaver]s, then triplet :t[quaver]s, then triplet :t[crotchet]s: three in the time of two :t[crotchet]s." tempo="72"
\time 4/4 b'8 b'8 \tuplet 3/2 { b'8 b'8 b'8 } \tuplet 3/2 { b'4 b'4 b'4 } |
```

```perform
id: rhythm-in-detail/triplets
title: Two and three
prompt: 'Alternate straight and triplet :t[quaver]s. Count “one-and” for twos and “one-trip-let” for threes.'
mode: rhythm
tempo: 66
score: |
  \time 4/4 b'8 b'8 \tuplet 3/2 { b'8 b'8 b'8 } b'8 b'8 \tuplet 3/2 { b'8 b'8 b'8 } | b'4 \tuplet 3/2 { b'4 b'4 b'4 } b'4 |
```

:::note[A stopping point]
Divisions by two, three and four. The last session is about rhythms that pull against the beat, and then
the first arrangement of Korobeiniki.
:::

## Syncopation and swing

**Syncopation** is an accent where the beat does not expect it: a note that starts off the beat and is held
through the next one, so the strong beat arrives with no new note. The commonest pattern is a :t[quaver], a
:t[crotchet], a :t[quaver]: the :t[crotchet] starts on the “and” of a beat and covers the beat after it.

```score caption="Syncopation: the long notes start on the “and” and hold through the beat." tempo="88"
\time 4/4 c''8 d''4 e''8~ e''8 d''4 c''8 | b'8 c''4 d''8~ d''2 |
```

```perform
id: rhythm-in-detail/syncopation
title: Off the beat
prompt: 'Keep the beat in your head, or tap your foot, and play only the notes. The click marks the beats you do not play on.'
mode: rhythm
tempo: 80
score: |
  \time 4/4 b'8 b'4 b'8~ b'8 b'4 b'8 | b'4 b'8 b'8~ b'4 b'4 |
```

Jazz, blues and much pop play :t[quaver]s unevenly: long, short, long, short, the first of each pair taking about
two thirds of the beat. This **swing** is rarely written out; the score shows plain :t[quaver]s and the word
*swing* (or a note that two :t[quaver]s are to be played like a triplet :t[crotchet] and :t[quaver]).

::swing-lab

## Korobeiniki I

The running tune of this course is ready for its first arrangement. Korobeiniki is in :n[A] minor, and its
opening phrase uses only two chords: **V** (:c[E], with the :t[leading note] :n[G#] from harmonic minor) and **i**
(:c[Am]). It starts on V, which is why its first note sounds as if it is already going somewhere.

```score caption="Korobeiniki I: the opening phrase over V and i. Level 3 (full): left hand root, then the rest of the chord." tempo="96"
\time 4/4 \key a \minor \staff treble e''4^"E" b'8 c''8 d''4 c''8 b'8 | a'4^"Am" a'8 c''8 e''4 d''8 c''8 | b'4.^"E" c''8 d''4 e''4 | c''4^"Am" a'4 a'2 | \staff bass e,2_"V" <g# b>2 | a,2_"i" <c' e'>2 | e,2_"V" <g# b>2 | a,2_"i" <c' e'>2 |
```

Play it at three levels: the melody alone, then with the bass, then in full.

```perform
id: rhythm-in-detail/korobeiniki-1
title: Korobeiniki I, level 1
prompt: 'The right hand alone, in time.'
mode: both
tempo: 92
range: [55, 79]
score: |
  \time 4/4 \key a \minor e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 |
```

```perform
id: rhythm-in-detail/korobeiniki-2
title: Korobeiniki I, level 2
prompt: 'Hands together: the left hand holds the root of each chord for the whole :t[bar], :n[E2] and :n[A2].'
mode: both
tempo: 80
range: [36, 79]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass e,1 | a,1 | e,1 | a,1 |
hints:
  - 'Practise without the clock first (each hand alone, then together), then come back for the timed run.'
```

```perform
id: rhythm-in-detail/korobeiniki-3
title: Korobeiniki I, level 3
prompt: 'Hands together, the left hand playing the root on beat 1 and the rest of the chord on beat 3.'
mode: both
tempo: 72
range: [36, 79]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass e,2 <g# b>2 | a,2 <c' e'>2 | e,2 <g# b>2 | a,2 <c' e'>2 |
```

:::key
- Semiquaver patterns are counted “one-e-and-a”; the dotted :t[quaver]-:t[semiquaver] is the commonest.
- In **compound metre** (6/8, 9/8, 12/8) each beat is a dotted note that divides into three.
- A **triplet** puts three notes in the time of two; **syncopation** starts notes off the beat and holds
  them through it; **swing** plays written :t[quaver]s long-short.
- Korobeiniki’s opening phrase rests on two chords, V and i, and starts on V.
:::
