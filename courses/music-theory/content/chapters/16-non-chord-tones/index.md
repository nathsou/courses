---
number: 16
title: Melody and non-chord tones
summary: Passing and neighbour notes, suspensions, appoggiaturas, motif and phrase.
duration: 45 minutes
prerequisites: [progressions]
skills:
  - Non-chord tones
---

:::check
```analyse
id: non-chord-tones/check-1
title: Label the notes
prompt: 'Over the chords shown, label each melody note: CT (chord tone), P (passing), N (neighbour) or App (appoggiatura).'
instruction: 'One label per note: CT, P, N or App.'
per: note
score: |
  \time 4/4 e''4^"C" f''4 g''4 e''4 | d''4^"G" e''4 d''4 b'4 | a'4^"F" e''4 f''4 c''4 | g'4^"C" a'4 g'4 e'4 |
answers: [CT, P, CT, CT, CT, N, CT, CT, CT, App, CT, CT, CT, N, CT, CT]
```
:::

## Melodies are not chords

Sing any tune and only some of its notes belong to the chord underneath. The rest move between chord tones,
decorate them, or delay them. They are **non-chord tones** (or *non-harmonic tones*), and they are where most
of a melody’s character lives: a tune made only of chord tones sounds like an arpeggio.

Each kind of non-chord tone is named after how it is **approached** (from the note before) and **left** (to
the note after), by step or by leap:

| Name | Approached | Left | What it does |
| --- | --- | --- | --- |
| **passing note** (P) | by step | by step, same direction | fills the gap between two chord tones |
| **neighbour note** (N) | by step | by step, back | decorates a chord tone from above or below |
| **appoggiatura** (App) | by leap | by step | an accented clash that resolves, often expressive |
| **escape note** (E) | by step | by leap, the other way | slips out of the chord |
| **suspension** (S) | held over from the previous chord | down by step | a chord tone that outstays its chord |
| **anticipation** (Ant) | by step | stays: becomes a chord tone | arrives early, before its chord |

::non-chord-tones

### Suspensions

A suspension has three stages. A note is **prepared** as a chord tone, then **held** (often tied) while the
harmony changes under it, so that it becomes a dissonance, then it **resolves** down by step to a tone of the
new chord. Suspensions are named by the intervals above the bass: a **4–3** suspension over V holds the
fourth (:n[C] over a :c[G] bass) and resolves to the third (:n[B]); **7–6** and **9–8** are common too. They
are the sound of Baroque and Classical cadences, and of a great deal of film music.

```score caption="A 4–3 suspension over V: :n[C] is prepared over IV, held into V, and resolves to :n[B]." tempo="60"
\time 4/4 \staff treble c''2~ c''4 b'4 | c''1 | \voice f'2 d'2 | e'1 | \staff bass f,2_"IV" g,2_"V(4–3)" | c1_"I" |
```

```analyse
id: non-chord-tones/label
title: Name the non-chord tones
prompt: 'Over the chords shown, label each melody note: CT, P (passing), N (neighbour), App (appoggiatura), E (escape), S (suspension) or Ant (anticipation).'
instruction: 'One label per note.'
per: note
score: |
  \time 4/4 c''4^"C" d''4 e''4 c''4 | b'4^"G" a'4 b'4 d''4 | c''2^"F" c''2~ | c''4^"G" b'4 g'4 c''4 | c''1^"C" |
answers: [CT, P, CT, CT, CT, N, CT, CT, CT, CT, S, CT, CT, Ant, CT]
hints:
  - 'The :n[C5] in :t[bar] 4 is tied over from :t[bar] 3, held over :c[G], and resolves down to :n[B4]: a suspension.'
  - 'The last :n[C5] of :t[bar] 4 is not in :c[G]; it arrives before the :c[C] chord it belongs to.'
```

:::note[A stopping point]
Six kinds of non-chord tone, named by how they move. The rest of the chapter is about how melodies are built.
:::

## Motif and phrase

The smallest meaningful unit of a melody is the **motif**: a few notes with a recognisable rhythm and shape.
Melodies grow by doing things with motifs:

- **Repetition:** the same motif again, so the ear can grasp it.
- **Sequence:** the motif repeated starting on a different note, usually a step higher or lower (Chapter 22).
- **Variation:** the motif with a changed interval or rhythm, so that it is related but new.

Korobeiniki shows all three in its first eight :t[bar]s. :t[Bar] 1 states a motif (long note, then a falling
line of short notes); :t[bar] 2 varies it; the second half of the tune starts the same rhythm on new notes.

```score caption="Korobeiniki, :t[bar]s 1–2: a motif and its variation." tempo="100"
\time 4/4 \key a \minor e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 |
```

A **phrase** is a musical sentence ending in a cadence, usually four or eight :t[bar]s long. Its melody often
rises towards a high point (the climax) and falls towards the cadence. Phrases pair up into larger units,
which is the subject of Chapter 18.

```ear
id: non-chord-tones/motifs
title: Same, sequence or new?
prompt: 'You hear a motif, then a second one. Is the second the same, a sequence (the same shape on other notes), or something new?'
kind: custom
options: [Same, Sequence, New]
items:
  - play: [C5, D5, E5, C5, C5, D5, E5, C5]
    answer: Same
  - play: [C5, D5, E5, C5, D5, E5, F5, D5]
    answer: Sequence
  - play: [E5, D5, C5, G4, D5, C5, B4, F4]
    answer: Sequence
  - play: [C5, D5, E5, C5, G5, E5, D5, D5]
    answer: New
  - play: [G4, A4, G4, E4, G4, A4, G4, E4]
    answer: Same
  - play: [G4, A4, G4, E4, C5, B4, C5, A4]
    answer: New
rounds: 8
pass: 6
```

```perform
id: non-chord-tones/play-suspension
title: Play a suspension
prompt: 'Play the 4–3 suspension above: hold the right hand’s :n[C5] while the left hand changes, then let it fall to :n[B4].'
mode: notes
range: [40, 79]
score: |
  \time 4/4 \staff treble c''2~ c''4 b'4 | c''1 | \voice f'2 d'2 | e'1 | \staff bass f,2 g,2 | c1 |
hints:
  - 'Keep :n[C5] down from the first chord to beat 4. On beat 3 the left hand moves to :n[G2] and the alto to :n[D4]; on beat 4 let :n[C5] go and play :n[B4], still holding :n[D4] and :n[G2].'
```

:::key
- **Non-chord tones** are named by approach and departure: **passing** (step, step on), **neighbour** (step,
  step back), **appoggiatura** (leap, step), **escape** (step, leap), **suspension** (held over, down by
  step), **anticipation** (arrives before its chord).
- A **suspension** is prepared, held as a dissonance, and resolves down by step: 4–3, 7–6, 9–8.
- Melodies are built from **motifs**, by repetition, sequence and variation, into **phrases** that end in
  cadences.
:::
