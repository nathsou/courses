---
number: 3
title: Pulse and rhythm
summary: Beat, tempo and the metronome; note values, rests, dots and ties.
duration: 35 minutes
prerequisites: [high-and-low]
skills:
  - Note values
  - Keeping a steady beat
---

:::check
```perform
id: pulse-and-rhythm/check-1
title: Tap a rhythm
prompt: 'Tap this rhythm on any key, in time with the click.'
mode: rhythm
tempo: 80
score: |
  \time 4/4 b'4 b'8 b'8 b'4. b'8 | b'2 r4 b'4 |
```
:::

## The beat

Clap along to almost any music and your hands find a regular pulse without being told: the **beat**. It is
the steady tick underneath the music, and most of what happens in rhythm is measured against it. How fast
the beat goes is the **tempo**, counted in **beats per minute** (BPM): 60 BPM is one beat a second, the
tick of a clock; 120 BPM is twice as fast, a brisk march.

::metronome{tempo=80}

A **metronome** clicks the beat for you. Start the one above and tap along on your keyboard, or on a table.
Then try slower and faster tempos. Slow tempos are harder to keep steady than they sound: there is more
time between clicks for your sense of the beat to drift.

Written music often gives the tempo in Italian, a habit from the 1700s. You will meet *adagio* (slow),
*andante* (at a walking pace), *moderato* (moderate), *allegro* (fast) and *presto* (very fast). These words
describe a character more than a number; when a composer wants a number, the score says so, for example
♩ = 80.

## How long a note lasts

The beat gives music a ruler. A note’s **value** says how many beats it lasts, and its shape on the page
shows it:

| Note | Share of a 4/4 :t[bar] | Beats | Shape |
| --- | --- | --- | --- |
| :t[semibreve]{both} | one whole | 4 | hollow, no stem |
| :t[minim]{both} | half | 2 | hollow, with a stem |
| :t[crotchet]{both} | a quarter | 1 | filled, with a stem |
| :t[quaver]{both} | an eighth | ½ | filled, stem and one flag |
| :t[semiquaver]{both} | a sixteenth | ¼ | filled, stem and two flags |

The American names count fractions of a bar of four beats; the British names are older and have to be
learnt. Either way, each value is exactly half the one above it.

::note-tree

When several :t[quaver]s or shorter notes fall within one beat, their flags are joined into a **beam**, so
that the eye sees the beat at once. Four :t[quaver]s are written as two beamed pairs, one pair per beat.

:::note[What is “one beat”?]
In this chapter the beat is a :t[crotchet], which is the usual case. Chapter 4 shows how a time signature
can make a different value the beat, and Chapter 12 introduces music where the beat divides into three.
:::

### Silence has values too

A **rest** is a written silence, with the same values as notes: a :t[semibreve rest] hangs below a line, a
:t[minim rest] sits on one, and the :t[crotchet rest], :t[quaver rest] and :t[semiquaver rest] have shapes
of their own. Rests are part of the rhythm, not gaps in it: the beat keeps going through them.

```score caption="A :t[crotchet rest] on beat 2, and a :t[minim rest] on beats 3 and 4." tempo="80"
\time 4/4 c''4 r4 c''4 r4 | c''4 c''4 r2 |
```

Now tap rhythms. The course counts you in with one bar of clicks; tap any key on each note, and hold
nothing for the rests. You do not have to hold the long notes for their full length: only the moments
you start each note are checked.

```perform
id: pulse-and-rhythm/crotchets-minims
title: Beats and half-bars
mode: rhythm
tempo: 80
score: |
  \time 4/4 b'4 b'4 b'2 | b'4 b'4 b'2 | b'4 b'4 b'4 b'4 | b'1 |
```

```perform
id: pulse-and-rhythm/quavers
title: Two to a beat
prompt: 'The :t[quaver]s go twice as fast as the beat. Count “one and two and” in your head.'
mode: rhythm
tempo: 72
score: |
  \time 4/4 b'4 b'8 b'8 b'4 b'4 | b'8 b'8 b'8 b'8 b'2 | b'4 r4 b'8 b'8 b'4 | b'2 r2 |
```

:::note[A stopping point]
Beat, tempo and the five note values: enough to read the rhythm of most simple tunes. The last session
adds the two ways of making notes longer.
:::

## Dots and ties

A **dot** after a note adds half its value again. A dotted :t[minim] lasts 2 + 1 = 3 beats; a dotted
:t[crotchet] lasts 1 + ½ = 1½ beats, and is almost always followed by a :t[quaver] to fill the beat it
spills into. That dotted-:t[crotchet]-:t[quaver] figure is one of the commonest rhythms there is.

A **tie** is a curved line joining two notes of the same pitch: play the first and hold it through the
second, without playing again. Ties let a note last across a bar line, or for a length no single value
gives (a :t[minim] tied to a :t[quaver] lasts 2½ beats).

```score caption="A dotted :t[minim], a dotted :t[crotchet] and its :t[quaver], and a note tied across the bar line." tempo="80"
\time 4/4 c''2. c''4 | c''4. c''8 c''2~ | c''4 c''4 c''2 |
```

```quiz
q: 'How many :t[quaver]s last as long as one dotted :t[minim]?'
options:
  - text: 'Six'
    correct: true
    why: 'A dotted :t[minim] is three beats, and each beat holds two :t[quaver]s.'
  - text: 'Four'
    why: 'Four :t[quaver]s fill an undotted :t[minim] (two beats); the dot adds one more beat.'
  - text: 'Three'
    why: 'Three :t[crotchet]s fill a dotted :t[minim]; :t[quaver]s are half as long.'
```

```perform
id: pulse-and-rhythm/dots-ties
title: Dots and ties
prompt: 'Tap each note that starts; a tied note is held, not played again.'
mode: rhythm
tempo: 72
score: |
  \time 4/4 b'4. b'8 b'4 b'4 | b'2~ b'8 b'8 b'4 | b'4. b'8 b'4. b'8 | b'1 |
hints:
  - 'In bar 2 the tie means only three taps: on beat 1, on the “and” of beat 3, and on beat 4.'
```

Finally, put rhythm and pitch together: here is the opening of Korobeiniki, the folk song that runs through
the course. Play it in time. If the notes are new to you, practise them without the click first (the
keyboard shows where each one is), then come back.

```perform
id: pulse-and-rhythm/korobeiniki-rhythm
title: Korobeiniki, the rhythm
prompt: 'First tap its rhythm on one key.'
mode: rhythm
tempo: 100
score: |
  \time 4/4 e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 |
```

:::key
- The **beat** is music’s steady pulse; the **tempo** is how fast it goes, in beats per minute.
- Note values halve from the :t[semibreve] (4 beats) to the :t[minim] (2), :t[crotchet] (1), :t[quaver] (½)
  and :t[semiquaver] (¼). Rests have the same values.
- A **dot** adds half the note’s value; a **tie** joins two notes of the same pitch into one longer note.
:::
