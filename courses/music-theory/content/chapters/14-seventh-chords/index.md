---
number: 14
title: Seventh chords
summary: Five qualities, the diatonic sevenths, V7 and the tritone. Chopin’s Prelude in A major.
duration: 50 minutes
prerequisites: [function-and-cadence]
skills:
  - Seventh chords
  - Resolving V7
---

:::check
```play
id: seventh-chords/check-1
title: Five sevenths
prompt: 'Play :c[C7], :c[Fmaj7], :c[Dm7], :c[Bm7b5] and :c[G#dim7], any octave, any order of notes.'
range: [48, 84]
steps:
  - chord: C7
  - chord: Fmaj7
  - chord: Dm7
  - chord: Bm7b5
  - chord: G#dim7
```
:::

## One more third

Stack a third on top of a triad and you have a **seventh chord**: root, third, fifth and seventh, named
after the interval from root to top. :n[G] :n[B] :n[D] plus :n[F] is :c[G7]. The added note makes a chord
richer and more restless, because the seventh is a dissonance (Chapter 8) that wants to move.

Five kinds of seventh chord cover almost everything in this course:

| Name | Triad | Seventh | On :n[C] | Symbol | Where it lives |
| --- | --- | --- | --- | --- | --- |
| **dominant seventh** | major | minor seventh | :n[C] :n[E] :n[G] :n[Bb] | :c[C7] | V7 |
| **major seventh** | major | major seventh | :n[C] :n[E] :n[G] :n[B] | :c[Cmaj7] | I, IV |
| **minor seventh** | minor | minor seventh | :n[C] :n[Eb] :n[G] :n[Bb] | :c[Cm7] | ii, iii, vi |
| **half-diminished** | diminished | minor seventh | :n[C] :n[Eb] :n[Gb] :n[Bb] | :c[Cm7b5], Cø | vii in major, ii in minor |
| **diminished seventh** | diminished | diminished seventh | :n[C] :n[Eb] :n[Gb] :n[Bbb] | :c[Cdim7], C°7 | vii in minor |

The diminished seventh’s top note is :n[Bbb], spelt as a kind of B because it is a seventh above :n[C]; on
the keyboard it is the key usually called :n[A]. Every interval in a diminished seventh chord is a minor
third, so it divides the octave into four equal parts, a property Chapter 27 exploits.

::chord-lab{title="Seventh chords"}

```ear
id: seventh-chords/qualities
title: Which seventh?
prompt: 'Dominant seventh, major seventh, minor seventh, half-diminished or diminished seventh?'
kind: quality
pool: ['7', maj7, m7, m7b5, dim7]
range: [50, 60]
rounds: 15
pass: 11
hints:
  - 'Major seventh: soft and shimmering, with a semitone rub between the seventh and the octave. Dominant seventh: bright but restless. Minor seventh: mellow. Half-diminished: dark and searching. Diminished seventh: tense, the villain’s chord in old films.'
```

```spell
id: seventh-chords/write
title: Write seventh chords
prompt: 'Root, third, fifth, seventh: four letters, each a third apart. Then check each interval from the root.'
staff: treble
range: [55, 84]
items:
  - ask: ':c[G7]'
    answer: [G4, B4, D5, F5]
  - ask: ':c[Ebmaj7]'
    answer: [Eb4, G4, Bb4, D5]
  - ask: ':c[F#m7]'
    answer: [F#4, A4, C#5, E5]
  - ask: ':c[Bm7b5]'
    answer: [B4, D5, F5, A5]
  - ask: ':c[C#dim7]'
    answer: [C#5, E5, G5, Bb5]
```

## Sevenths in a key

Built from the notes of a major scale, the seventh chords fall into the same places every time:

**Imaj7 · ii7 · iii7 · IVmaj7 · V7 · vi7 · viiø7**

In :n[C] major: :c[Cmaj7], :c[Dm7], :c[Em7], :c[Fmaj7], :c[G7], :c[Am7], :c[Bm7b5]. Only one is a dominant
seventh, and it is on the dominant: V7. In a minor key, with the harmonic minor’s raised seventh, V7 is a
dominant seventh too, and vii becomes a full diminished seventh (vii°7).

Jazz and much pop use the sevenths of a key as their everyday chords (Part VI). Classical music uses V7
constantly and the others more sparingly, mostly ii7 as a predominant.

::progression-player{romans="Imaj7,vi7,ii7,V7,Imaj7" tonics="C,F,G,Bb" title="The key’s seventh chords"}

:::note[A stopping point]
Five qualities and where they sit in a key. The next session is about the one that matters most.
:::

## V7 and the tritone

The dominant seventh is the engine of tonal harmony. :c[G7] contains :n[B] (the :t[leading note] of :n[C]
major) and :n[F] (degree 4). Between them is a **tritone**, the unstable interval of Chapter 8, and it
resolves in a fixed way: the two notes move in opposite directions by a semitone, :n[B] up to :n[C] and
:n[F] down to :n[E]. The tritone squeezes into a third, and the third belongs to the tonic chord.

```score caption="V7 – I in :n[C] major: :n[B] rises to :n[C], :n[F] falls to :n[E], :n[D] falls to :n[C], and the bass leaps from :n[G] to :n[C]." tempo="60"
\time 4/4 \staff treble <b d' f'>2 <c' e'>2 | \staff bass g,2_"V7" c2_"I" |
```

That rule, *the seventh falls, the :t[leading note] rises*, is the most reliable in harmony. On the piano,
with the left hand on the roots, the right hand’s V7 → I is a matter of tiny movements.

```perform
id: seventh-chords/v7-i
title: V7 – I in three keys
prompt: 'Left hand on the roots; the right hand plays only the third and seventh of V7, the tritone, and resolves it. At your own pace.'
mode: notes
range: [40, 79]
score: |
  \time 4/4 \staff treble <b f'>2 <c' e'>2 \bar "||" | <e' bb'>2 <f' a'>2 \bar "||" | <f#' c''>2 <g' b'>2 | \staff bass g,2 c2 | c2 f,2 | d2 g,2 |
hints:
  - 'In every key the lower note (the :t[leading note]) rises a semitone and the upper (the seventh) falls a semitone or a tone: :n[B]–:n[F] to :n[C]–:n[E], :n[E]–:n[Bb] to :n[F]–:n[A], :n[F#]–:n[C] to :n[G]–:n[B].'
```

```quiz
q: 'In :n[D] major, which notes form the tritone of V7, and where do they go?'
options:
  - text: ':n[C#] rises to :n[D]; :n[G] falls to :n[F#]'
    correct: true
    why: 'V7 in :n[D] is :c[A7] (:n[A] :n[C#] :n[E] :n[G]). :n[C#] is the :t[leading note] and :n[G] the seventh.'
  - text: ':n[A] rises to :n[D]; :n[E] falls to :n[D]'
    why: ':n[A] and :n[E] are the root and fifth of :c[A7]; they are a fifth apart, not a tritone.'
  - text: ':n[C#] falls to :n[B]; :n[G] rises to :n[A]'
    why: 'Tendency tones move the other way: the :t[leading note] up, the seventh down.'
```

## Chopin’s Prelude in A major

Frédéric Chopin’s 24 Preludes, Op. 28 (published in 1839), visit every major and minor key. The seventh, in
:n[A] major, is sixteen bars long and almost entirely made of two chords: V7 (:c[E7]) and I (:c[A]). Listen
to how much music Chopin finds in that alternation, and to the one chord, in bar 12, that breaks it.

```score caption="Chopin, Prelude in A major, Op. 28 No. 7 (complete). Click a chord to hear it." label="Chopin, Prelude in A major, Op. 28 No. 7"
\key a \major \time 3/4 \tempo 66 \partial 4
\staff treble e'4 | c#''8. d''16 <d' g#' b'>4 <d' g#' b'>4 | <d' g#' b'>2 <d'' f#''>4 | <b#' d#''>8. <c#'' e''>16 <c#'' a''>4 <c#'' a''>4 | <c#'' a''>2 <e' c#''>4 | <c#' a#'>8. <d' b'>16~ <f#' d''>4 <f#' d''>4 | <f#' d''>2 <d' g#'>4 | <d' g#'>8. <c#' an'>16 <c#' c#''>4 <c#' c#''>4 | <c#' c#''>2 e'4~ | c#''8. d''16 <d' g#' b'>4 <d' g#' b'>4 | <d' g#' b'>2 <d'' f#''>4 | <b#' d#''>8. <c#'' e''>16~ <a'' c#'''>4 <a'' c#'''>4 | <a#' c#'' e'' a#'' c#'''>2 <a#' c#''>4 | <a#' c#''>8. <b' d''>16~ <b' f#''>4 <an' f#''>4 | <g#' f#''>2 <d' g#'>4 | <d' b'>8. <c#' a'>16 <c#'' a''>4 <c#'' a''>4 | <a' c#'' a''>2 r4 | \voice s4 | s2. | s2. | s2. | s2. | s4 d'2~ | d'2 s4 | s2. | s2. | <e' g#'>4 s2 | s2. | s4 <c#'' e''>2 | s2. | s2. | s2. | s4 a'2~ | s2. |
\staff bass r4 | e,4 <e e'>4 <e e'>4 | <e e'>2 r4 | a,4 <a e'>4 <a e'>4 | <a e'>2 r4 | e,4 <e b>4 <e b>4 | <e b>2 r4 | a,,4 <e a e'>4 <e a e'>4 | <e a e'>2 r4 | e,4 <e e'>4 <e e'>4 | <e e'>2 r4 | a,4 <a e' a'>4 <a e' a'>4 | <f# c#' e' f#'>2 r4 | b,,4 <f# d'>4 <f# b d'>4 | <e b d'>2 r4 | a,,4 <e a e'>4 <a e'>4 | <a e'>2 r4 |
```

The piece is in pairs of bars, each pair a single chord: V7, I, V7, I… The melody rises each time to a note
of the chord, and the pairs group into two phrases of eight bars, the first ending on I, the second
reaching higher. In bar 12 Chopin writes a chord from outside the key, :c[F#7], the dominant seventh of
:c[Bm] (ii), and the tension resolves into :c[Bm] in bar 13 before V7 and I close the piece. Chapter 23 names
that kind of chord, a *secondary dominant*.

```analyse
id: seventh-chords/prelude-7
title: The Prelude’s first eight bars
prompt: 'One chord per bar (the opening upbeat is part of the first chord). Write the numeral of each, as in the reduction below.'
key: A major
score: |
  \key a \major \time 3/4 \staff treble <d' g#' b'>2. | <d' g#' b'>2. | <c#'' e'' a''>2. | <c#'' e'' a''>2. | <d' f#' b'>2. | <d' f#' b'>2. | <c#' e' a'>2. | <c#' e' a'>2. | \staff bass e,2. | e,2. | a,2. | a,2. | e,2. | e,2. | a,,2. | a,,2. |
answers: ['V7', 'V7', 'I', 'I', 'V7', 'V7', 'I', 'I']
hints:
  - 'A bass of :n[E] with :n[D] and :n[G#] above it is :c[E7], V7 of :n[A] major.'
```

:::key
- A **seventh chord** adds a seventh above the root: dominant (:c[C7]), major (:c[Cmaj7]), minor (:c[Cm7]),
  half-diminished (:c[Cm7b5]) and diminished (:c[Cdim7]) sevenths.
- In a major key: Imaj7, ii7, iii7, IVmaj7, **V7**, vi7, viiø7. V7 is the only dominant seventh.
- V7’s tritone resolves inwards: the :t[leading note] rises to the tonic, the seventh falls a step.
- Chopin’s Prelude in A major is built almost entirely from V7 and I.
:::
