---
number: 18
title: Phrase and period
summary: Antecedent and consequent, the sentence, and cadences as punctuation. Korobeiniki II.
duration: 45 minutes
prerequisites: [accompanying]
skills:
  - Phrase structure
---

:::check
```ear
id: phrase-and-period/check-1
title: Comma or full stop?
prompt: 'A four-:t[bar] phrase in :n[C] major. Does it end with a comma (an imperfect cadence) or a full stop (a perfect cadence)?'
kind: custom
options: [Comma, Full stop]
items:
  - play: [C3 E4 G4 C5, F2 F4 A4 C5, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: Full stop
  - play: [C3 E4 G4 C5, A2 E4 A4 C5, D3 F4 A4 D5, G2 D4 G4 B4]
    answer: Comma
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, C3 C4 E4 G4, G2 B3 D4 G4]
    answer: Comma
  - play: [C3 C4 E4 G4, D3 D4 F4 A4, G2 B3 D4 G4, C3 C4 E4 G4]
    answer: Full stop
rounds: 6
pass: 6
```
:::

## Musical sentences

Melodies are punctuated. A **phrase** is a span of music, usually four :t[bar]s, that ends in a cadence (Chapter
13), and the kind of cadence is its punctuation: an **imperfect cadence**, ending on V, is a comma, a pause
that wants more; a **perfect cadence**, V–I, is a full stop. Composers combine phrases into larger shapes, and
two of those shapes are so common that they have names.

## The period

A **period** is two phrases that answer each other. The first, the **antecedent**, ends with a weaker cadence
(usually imperfect); the second, the **consequent**, ends with a stronger one (perfect). Question and answer.
When the consequent starts like the antecedent, the period is **parallel**; when it starts differently, it
is **contrasting**.

The Ode to Joy (Chapter 17) is a textbook parallel period. Bars 1–4 end on :n[D] over V: the comma. Bars 5–8
begin exactly the same way, and only the last :t[bar] changes, to end on :n[C] over V–I: the full stop.

```score caption="The Ode to Joy as a period: antecedent ending on V, consequent ending V–I." tempo="100"
\time 4/4 e''4^"C" e''4 f''4 g''4 | g''4^"G7" f''4 e''4 d''4 | c''4^"C" c''4 d''4 e''4 | e''4.^"G" d''8 d''2_"imperfect" \bar "||" | e''4^"C" e''4 f''4 g''4 | g''4^"G7" f''4 e''4 d''4 | c''4^"C" c''4 d''4 e''4 | d''4.^"G7" c''8 c''2^"C"_"perfect" |
```

```quiz
q: 'Why does a period need its first phrase to end weakly?'
options:
  - text: 'So that the second phrase can complete it: a strong first ending would make the second phrase sound like a repeat, not an answer.'
    correct: true
  - text: 'Because the antecedent must always end on vi.'
    why: 'An antecedent usually ends on V (an imperfect cadence); ending on vi would be an interrupted cadence.'
  - text: 'Because the consequent must be in a different key.'
    why: 'Both phrases of a simple period are in the same key.'
```

## The sentence

The other common shape grows from a single idea. A **sentence** (eight :t[bar]s) states a two-:t[bar]
**basic idea**, repeats it (often on other chords, I then V), then breaks into a four-:t[bar]
**continuation** that shortens the idea into fragments, speeds up the harmonic rhythm and drives to a
cadence. The opening of Beethoven’s Piano Sonata in F minor, Op. 2 No. 1, is the example every theory book
quotes. Here is one written for the course:

```score caption="A sentence: basic idea (bars 1–2), repetition on V (3–4), continuation with fragments (5–6) and cadence (7–8)." tempo="104"
\time 4/4 c''4^"C" e''8 d''8 c''4 g'4 | e''2 c''2 | b'4^"G7" d''8 c''8 b'4 g'4 | f''2 d''2 | e''4^"C" g''8 f''8 e''4 c''4 | f''4^"F" a''8 g''8 f''4^"G" d''4 | e''4^"C" c''4 d''4^"G7" b'4 | c''1^"C" |
```

The idea, the same idea again, then faster and faster to the end: the sentence feels like a single breath.
The period feels like a conversation.

```ear
id: phrase-and-period/same-start
title: Parallel or contrasting?
prompt: 'Two phrases. Does the second start like the first (parallel) or differently (contrasting)?'
kind: custom
options: [Parallel, Contrasting]
items:
  - play: [E5, E5, F5, G5, G5, F5, E5, D5, E5, E5, F5, G5, G5, F5, E5, C5]
    answer: Parallel
  - play: [C5, E5, G5, E5, D5, F5, E5, D5, A5, G5, F5, E5, D5, B4, C5, C5]
    answer: Contrasting
  - play: [G4, C5, E5, D5, C5, B4, A4, G4, G4, C5, E5, D5, C5, D5, B4, C5]
    answer: Parallel
  - play: [G4, C5, E5, D5, C5, B4, A4, G4, F5, E5, D5, F5, E5, D5, B4, C5]
    answer: Contrasting
rounds: 6
pass: 5
```

:::note[A stopping point]
Periods and sentences. The last session puts Part II together in the second arrangement of Korobeiniki.
:::

## Korobeiniki II

Korobeiniki’s first section is eight :t[bar]s in two four-:t[bar] phrases. Both end with V – i, so it is not a
period in the strict sense: two phrases, each with a full stop. The second phrase brings new chords, iv
(:c[Dm]) and III (:c[C]), the relative major, before V7 returns. With sevenths on the dominant, here is the
harmony of the whole section:

```score caption="Korobeiniki II: the first section with its chords, and a broken-chord left hand (level 3)." tempo="84"
\time 4/4 \key a \minor \staff treble e''4^"E7" b'8 c''8 d''4 c''8 b'8 | a'4^"Am" a'8 c''8 e''4 d''8 c''8 | b'4.^"E7" c''8 d''4 e''4 | c''4^"Am" a'4 a'2 | r8 d''4^"Dm" f''8 a''4 g''8 f''8 | e''4.^"C" c''8 e''4 d''8 c''8 | b'4^"E7" b'8 c''8 d''4 e''4 | c''4^"Am" a'4 a'2 | \staff bass e,8_"V7" b,8 e8 b,8 d8 b,8 e8 b,8 | a,8_"i" e8 a8 e8 c'8 e8 a8 e8 | e,8_"V7" b,8 e8 b,8 d8 b,8 e8 b,8 | a,8_"i" e8 a8 e8 a,2 | d8_"iv" a8 d'8 a8 f8 a8 d'8 a8 | c8_"III" g8 c'8 g8 e8 g8 c'8 g8 | e,8_"V7" b,8 e8 b,8 d8 b,8 e8 b,8 | a,8_"i" e8 a8 e8 a,2 |
```

```perform
id: phrase-and-period/korobeiniki-2a
title: Korobeiniki II, level 1
prompt: 'The melody of the whole section, right hand, in time.'
mode: both
tempo: 96
range: [55, 84]
score: |
  \time 4/4 \key a \minor e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 |
```

```perform
id: phrase-and-period/korobeiniki-2b
title: Korobeiniki II, level 2
prompt: 'Hands together: the left hand plays the root of each chord, then the note an octave above it, as two :t[minim]s.'
mode: both
tempo: 80
range: [33, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass e,2 e2 | a,2 a2 | e,2 e2 | a,2 a2 | d2 d'2 | c2 c'2 | e,2 e2 | a,2 a2 |
hints:
  - 'Practise the left hand alone first: the roots are the chords’ letters, :n[E] :n[A] :n[E] :n[A] :n[D] :n[C] :n[E] :n[A].'
```

```perform
id: phrase-and-period/korobeiniki-2c
title: Korobeiniki II, level 3
prompt: 'Hands together with the broken-chord left hand from the score above. Untimed: take it slowly, one note at a time.'
mode: notes
range: [33, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass e,8 b,8 e8 b,8 d8 b,8 e8 b,8 | a,8 e8 a8 e8 c'8 e8 a8 e8 | e,8 b,8 e8 b,8 d8 b,8 e8 b,8 | a,8 e8 a8 e8 a,2 | d8 a8 d'8 a8 f8 a8 d'8 a8 | c8 g8 c'8 g8 e8 g8 c'8 g8 | e,8 b,8 e8 b,8 d8 b,8 e8 b,8 | a,8 e8 a8 e8 a,2 |
```

:::key
- A **phrase** ends with a cadence; imperfect cadences are commas, perfect cadences full stops.
- A **period** pairs an **antecedent** (weak ending) with a **consequent** (strong ending); parallel periods
  start both phrases alike.
- A **sentence** states a basic idea, repeats it, then fragments and accelerates into a cadence.
- Korobeiniki’s first section: two phrases over V7 – i, then iv – III – V7 – i.
:::
