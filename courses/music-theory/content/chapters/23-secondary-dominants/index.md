---
number: 23
title: Secondary dominants
summary: V/V and its relatives, tonicisation, and secondary leading-note chords.
duration: 50 minutes
prerequisites: [sequences]
skills:
  - Secondary dominants
---

:::check
```quiz
q: 'In :n[G] major, which chord is V/V, the dominant of the dominant?'
options:
  - text: ':c[A] major (:n[A] :n[C#] :n[E]).'
    correct: true
  - text: ':c[Am] (:n[A] :n[C] :n[E]).'
    why: ':c[Am] is ii in :n[G] major. V/V is the dominant of :n[D], which is major and has :n[C#], the leading note of :n[D].'
  - text: ':c[D] major.'
    why: ':c[D] is V itself. V/V is the chord that leads to it.'
```
:::

## Borrowing a dominant

Play :c[C], :c[D], :c[G], :c[C]. The second chord has an :n[F#] in it, a note that is not in :n[C] major, and yet the
progression sounds entirely in :n[C]. What :n[F#] does is point at :n[G]: it is the :t[leading note] of :n[G] major,
and :c[D] is the dominant chord of :n[G] major. For a moment the music treats :c[G] as if it were a tonic, then
carries on in :n[C].

A chord that acts as the dominant of a chord other than the tonic is a **secondary dominant** (or **applied
dominant**), written V/x: “V of x”. :c[D] in :n[C] major is **V/V**. With its seventh, :c[D7], it is **V7/V**.
Making a chord sound briefly like a tonic in this way is **tonicisation**: the key does not change, but one of its
chords borrows the power of a cadence.

Every major or minor triad of a key can be tonicised; the diminished vii° cannot, because a diminished chord cannot
sound like a tonic. In :n[C] major:

| Secondary dominant | Chord | New note | Resolves to |
| --- | --- | --- | --- |
| V/ii | :c[A] (:c[A7]) | :n[C#] | :c[Dm] |
| V/iii | :c[B] (:c[B7]) | :n[D#] (and :n[F#]) | :c[Em] |
| V/IV | :c[C7] | :n[Bb] | :c[F] |
| V/V | :c[D] (:c[D7]) | :n[F#] | :c[G] |
| V/vi | :c[E] (:c[E7]) | :n[G#] | :c[Am] |

V/IV needs its seventh: plain :c[C] is the tonic itself, and only the :n[Bb] makes it sound like a dominant.

::progression-player{romans="I,V7/V,V7,I,V7/vi,vi,V7/IV,IV,V7,I" tonics="C,G,F,D,Bb" patterns="block,broken" tempo="84" title="Three secondary dominants" subtitle="V7/V, V7/vi and V7/IV, each resolving to its target."}

### Spotting them

In a score, look for an accidental. A **raised** note (a sharp in a flat key or a natural, or a natural in a flat
key) is usually the leading note of a chord a semitone above it: :n[F#] points at :c[G], :n[G#] at :c[Am]. A
**lowered** note is often the seventh of a secondary dominant: :n[Bb] in :n[C] major turns :c[C] into V7/IV. Then
check the chord the accidental belongs to, and the chord after it.

### Voice leading

A secondary dominant behaves like a dominant towards its target: its leading note rises a semitone to the target’s
root, and its seventh falls by step. The new note should not be doubled, and it should not be contradicted at
once in another voice (an :n[F#] in the soprano followed by an :n[F] in the bass is a **cross-relation**, a harsh
effect that composers usually avoid).

```analyse
id: secondary-dominants/analyse-c
title: Find the secondary dominants
prompt: 'A phrase written for the course, in :n[C] major. Name each chord. Two are secondary dominants: write them as V7/vi or V65/V.'
key: C major
score: |
  \time 4/4 \staff treble <e' g' c''>4 <d' g#' b'>4 <c' a' c''>4 <d' a' c''>4 | <d' g' b'>2 <e' g' c''>2 | \staff bass c4 e4 a,4 f#4 | g2 c2 |
answers: [I, 'V7/vi|V/vi', vi, 'V65/V|V7/V|V/V', V, I]
hints:
  - 'Chord 2 has :n[G#]: the leading note of :n[A]. Chord 4 has :n[F#] in the bass: the leading note of :n[G], and :n[C] above it is a seventh.'
```

:::note[A stopping point]
Secondary dominants and how to spot them. Next: playing them, and their leading-note relatives.
:::

## At the keyboard

```play
id: secondary-dominants/play-pairs
title: Secondary dominants and their targets
prompt: 'Each secondary dominant, then the chord it points to, in :n[C] major. Any voicing.'
range: [43, 79]
steps:
  - chord: D7
    label: V7/V
  - chord: G
    label: V
  - chord: E7
    label: V7/vi
  - chord: Am
    label: vi
  - chord: A7
    label: V7/ii
  - chord: Dm
    label: ii
  - chord: C7
    label: V7/IV
  - chord: F
    label: IV
```

```ear
id: secondary-dominants/hear
title: ii or V/V?
prompt: 'Four chords. Is the second one ii (minor) or V/V (major, with a raised note)?'
kind: custom
options: [ii – V – I, V/V – V – I]
items:
  - play: [C3 E4 G4 C5, D3 D4 F4 A4, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: ii – V – I
  - play: [C3 E4 G4 C5, D3 D4 F#4 A4, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: V/V – V – I
  - play: [G2 B3 D4 G4, A2 A3 C4 E4, D3 A3 D4 F#4, G2 B3 D4 G4]
    answer: ii – V – I
  - play: [G2 B3 D4 G4, A2 A3 C#4 E4, D3 A3 D4 F#4, G2 B3 D4 G4]
    answer: V/V – V – I
rounds: 8
pass: 7
hints:
  - 'V/V is brighter, and its raised note rises straight into the next chord. ii is darker and softer.'
```

```realise
id: secondary-dominants/realise
title: Two secondary dominants in G major
prompt: 'I – V7/vi – vi – V/V – V7 – I. Resolve each applied leading note up by a semitone and each seventh down by step.'
key: G major
bass: 'g,4 b, e a, | d2 g, |'
numerals: [I, V7/vi, vi, V/V, V7, I]
example: ['G2 G4 B4 D5', 'B2 A4 B4 D#5', 'E3 G4 B4 E5', 'A2 A4 C#5 E5', 'D3 C5 D5 F#5', 'G2 B4 D5 G5']
hints:
  - 'V7/vi in :n[G] major is :c[B7]: :n[B] :n[D#] :n[F#] :n[A]. The :n[D#] rises to :n[E], the :n[A] falls to :n[G].'
  - 'V/V is :c[A] major; its :n[C#] rises to :n[D] in the V7 chord.'
```

## Secondary leading-note chords

The dominant has a relative, vii°, the triad on the :t[leading note] (Chapter 13), and so does every secondary
dominant. **vii°/V** in :n[C] major is :n[F#] :n[A] :n[C], and the fully diminished **vii°7/V**, :n[F#] :n[A] :n[C]
:n[Eb], is a favourite approach to V. All its notes lean towards the target: :n[F#] up to :n[G], :n[A] down to
:n[G], :n[C] down to :n[B] and :n[Eb] down to :n[D].

```score caption="vii°7/V in :n[C] major resolving to V, then I: every note of the diminished seventh moves by step." tempo="66"
\time 4/4 \staff treble <c' eb' a'>4 <b d' g'>4 <c' e' g'>2 | \staff bass f#4_"vii°7/V" g4_"V" c2_"I" |
```

## Chains of dominants

A secondary dominant can itself be preceded by its own dominant, and so on: V7/V/V. Chained, they make a
circle-of-fifths sequence of dominant sevenths, each resolving into the next: in :n[C] major, :c[E7] :c[A7] :c[D7]
:c[G7] :c[C]. This is the **ragtime progression** of early jazz and popular song around 1900–1930, where whole
choruses are built from it.

::progression-player{romans="V7/vi,V7/ii,V7/V,V7,I" tonics="C,F,G,Bb,Eb" patterns="block,pulse,broken" tempo="100" title="The ragtime progression" subtitle="Dominant sevenths falling by fifths: III7, VI7, II7, V7, I."}

:::key
- A **secondary dominant** (V/x, V7/x) is the dominant of a chord other than the tonic; it **tonicises** that chord
  for a moment without changing key.
- Spot one by its accidental: a raised note is a new leading note, a lowered note is often a new seventh.
- Its leading note rises to the target, its seventh falls; **vii°/x** and **vii°7/x** work the same way.
- Chained, secondary dominants make the **ragtime progression**: III7 VI7 II7 V7 I.
:::
