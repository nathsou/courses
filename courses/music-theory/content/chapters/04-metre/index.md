---
number: 4
title: Metre
summary: Bars and time signatures, strong and weak beats, counting aloud and the upbeat.
duration: 30 minutes
prerequisites: [pulse-and-rhythm]
skills:
  - Time signatures
  - Counting
---

:::check
```perform
id: metre/check-1
title: A waltz with an upbeat
prompt: 'Tap the rhythm, starting on the upbeat.'
mode: rhythm
tempo: 100
score: |
  \time 3/4 \partial 4 b'4 | b'2 b'4 | b'4. b'8 b'4 | b'2. |
```
:::

## Beats come in groups

Listen to a waltz and you hear **one**-two-three, **one**-two-three; a march goes **left**-right,
**left**-right. Beats are not all equal. Some feel stronger, and the strong ones return at regular
intervals, grouping the beats in twos, threes or fours. That grouping is the music’s **metre**.

::metre-grid

In writing, each group is a **:t[bar]**, closed by a vertical **bar line**. The first beat of every
:t[bar], the **downbeat**, is the strongest. In groups of four, beat 3 is a little stronger than beats 2
and 4, so four is not quite two twos.

```ear
id: metre/twos-or-threes
title: Twos or threes?
prompt: 'Listen to the accents. Are the beats grouped in twos or in threes?'
kind: custom
options: [In twos, In threes]
items:
  - play: [C3 E4, G4, G3 D4, G4, C3 E4, G4, G3 D4, G4]
    answer: In twos
  - play: [F3 A4, C5, C3 G4, C5, F3 A4, C5, C3 G4, C5]
    answer: In twos
  - play: [C3 E4, G4, G4, G3 D4, G4, G4, C3 E4, G4, G4]
    answer: In threes
  - play: [F3 A4, C5, C5, C3 G4, C5, C5, F3 A4, C5, C5]
    answer: In threes
rounds: 8
pass: 7
```

## Time signatures

At the start of a piece, after the clef, two numbers stacked like a fraction give the metre. This is the
**time signature**.

- The **top number** says how many beats there are in each :t[bar].
- The **bottom number** says which note value is one beat: 4 means a :t[crotchet], 2 a :t[minim], 8 a
  :t[quaver].

So 3/4 means three :t[crotchet] beats in every :t[bar], 2/4 two, and 4/4 four. 4/4 is so common that it has
a sign of its own, a large C. It is read as “common time”, but the sign is older than the phrase: it comes
from the broken circle that medieval notation used for this metre.

```score caption="The same four notes in 2/4, 3/4 and 4/4: only the grouping changes." play="false"
\time 2/4 c''4 d''4 | e''4 f''4 | g''2 |
```

```score play="false" label="In 3/4"
\time 3/4 c''4 d''4 e''4 | f''4 g''2 |
```

```score play="false" label="In 4/4"
\time 4/4 c''4 d''4 e''4 f''4 | g''1 |
```

Every :t[bar] must add up to its time signature: four :t[crotchet] beats in 4/4, or any mixture of values
that makes four (a :t[minim] and two :t[crotchet]s, a dotted :t[minim] and a :t[crotchet], eight
:t[quaver]s).

```quiz
q: 'Which of these fills exactly one :t[bar] of 3/4?'
options:
  - text: 'A dotted :t[minim]'
    correct: true
    why: 'A dotted :t[minim] lasts three :t[crotchet] beats.'
  - text: 'A :t[semibreve]'
    why: 'A :t[semibreve] lasts four beats: one too many.'
  - text: 'Two :t[crotchet]s and a :t[minim]'
    why: 'That makes 1 + 1 + 2 = 4 beats.'
```

:::note[A stopping point]
You can read a time signature and check that a :t[bar] adds up. Next: counting, which is how you keep your
place while you play.
:::

## Counting aloud

Pianists learning a piece count the beats, aloud or in their head: “**one** two three four”. Notes that
fall between beats are counted with **and** (written +): a bar of :t[quaver]s in 4/4 is “one and two and
three and four and”. Counting is not for beginners only. It is the surest way to play long notes for their
full length and to come in at the right moment after a rest.

```score caption="Count it: one, two-and, three, four-and." tempo="84"
\time 4/4 c''4^"1" c''8^"2" c''8^"+" c''4^"3" c''8^"4" c''8^"+" | c''2^"1" r2^"3" |
```

```perform
id: metre/count-and-play
title: Count and tap
prompt: 'Count out loud while you tap. Every note in this exercise starts on a beat or exactly halfway between two.'
mode: rhythm
tempo: 80
score: |
  \time 4/4 b'4 b'8 b'8 b'4 b'4 | b'8 b'8 b'4 r4 b'4 | b'2 b'8 b'8 b'4 | b'1 |
```

## The upbeat

Many tunes do not start on a downbeat. They start with one or more notes before the first full :t[bar], a
lead-in called the **upbeat** (or *anacrusis*, or *pickup*). The first :t[bar] is then incomplete, and the
last :t[bar] of the piece is usually shortened to match, so that the two together make a whole :t[bar].

```score caption="A tune written for the course, in 3/4 with a one-beat upbeat; its last :t[bar] has two beats, so that with the upbeat it makes a whole :t[bar]. Count “three” for the upbeat: it is the last beat of a :t[bar]." tempo="96"
\time 3/4 \partial 4 g'4 | c''2 e''4 | d''4. c''8 b'4 | c''2 g'4 | e''2 d''4 | c''2
```

Count the upbeat as the end of a :t[bar]: here, “three, **one** two three, **one** two three…”. The strong
beat falls on the first note *after* the upbeat, not on the first note of the piece.

```perform
id: metre/upbeat
title: Play the tune
prompt: 'Play it in time, starting with the upbeat on :n[G4]. Listen first if the notes are new.'
mode: both
tempo: 84
range: [53, 79]
score: |
  \time 3/4 \partial 4 g'4 | c''2 e''4 | d''4. c''8 b'4 | c''2 g'4 | e''2 d''4 | c''2
hints:
  - 'Practise the notes slowly first; the click starts after a full :t[bar] of counting in, so the upbeat falls on the third click of the counting-in :t[bar].'
```

:::key
- **Metre** is the grouping of beats into twos, threes or fours, each group a **:t[bar]**. The first beat of
  a :t[bar] (the downbeat) is the strongest.
- A **time signature**’s top number is the beats per :t[bar]; the bottom number is the value of one beat
  (4 = :t[crotchet]). Every :t[bar] must add up.
- Count “one and two and…” to keep your place. An **upbeat** comes before the first full :t[bar], and
  counts as the end of one.
:::
