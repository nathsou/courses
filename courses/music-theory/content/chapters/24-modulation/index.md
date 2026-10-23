---
number: 24
title: Modulation
summary: Closely related keys, pivot chords, direct modulation and the pop key change.
duration: 50 minutes
prerequisites: [secondary-dominants]
skills:
  - Modulation
  - Pivot chords
---

:::check
```quiz
q: 'Which of these keys is *not* closely related to :n[D] major?'
options:
  - text: ':n[E] major.'
    correct: true
  - text: ':n[A] major.'
    why: ':n[A] major has one sharp more than :n[D] major: its neighbour on the circle of fifths.'
  - text: ':n[B] minor.'
    why: ':n[B] minor is the relative minor of :n[D] major: the same key signature.'
  - text: ':n[E] minor.'
    why: ':n[E] minor is the relative minor of :n[G] major, one sharp fewer than :n[D] major.'
```
:::

## Changing key

A secondary dominant (Chapter 23) points at a chord for a moment and the music stays in its key. A
**modulation** goes further: the music leaves its key and settles in a new one, long enough for the new tonic
to sound like home. The test is a cadence. If the music reaches a perfect cadence in the new key, and stays a
while, it has modulated; if it turns back at once, it has only tonicised.

Almost every piece longer than a minute modulates. Bach’s Invention in C reaches :n[G] major by bar 7 (Chapter 20);
a Classical sonata movement in a major key moves to its dominant for the second theme (Chapter 29); a pop song
may lift the last chorus by a semitone.

## Closely related keys

The easiest modulations are to the **closely related keys**: those whose key signatures differ from the home key’s
by at most one sharp or flat. On the circle of fifths (Chapter 7) they are the neighbours on either side and the
relative minors of all three. From :n[C] major:

| Key | Signature | Its tonic in :n[C] major |
| --- | --- | --- |
| :n[G] major | 1♯ | V |
| :n[F] major | 1♭ | IV |
| :n[A] minor | none | vi |
| :n[E] minor | 1♯ | iii |
| :n[D] minor | 1♭ | ii |

The tonics of the closely related keys are exactly the major and minor triads of the home key, the chords that can
be tonicised. The commonest destination by far is the dominant key from a major key, and the relative major
from a minor key.

## Pivot chords

The smoothest way to change key is through a **pivot chord**: a chord that belongs to both keys, heard first in
the old key and then reinterpreted in the new one. From :n[C] to :n[G], :c[Am] is vi in :n[C] and ii in :n[G]; arriving
on it, the ear still hears :n[C], but the chords that follow (:c[D7], with :n[F#], and :c[G]) make it the ii of a ii–V–I
in :n[G]. The analysis writes both numerals at the pivot: **vi = ii**.

```score caption="A pivot-chord modulation from :n[C] major to :n[G] major. :c[Am] is the pivot: vi in :n[C], ii in :n[G]." tempo="72"
\time 4/4 \staff treble <e' g' c''>4 <f' a' c''>4 <e' a' c''>4 <d' f#' c''>4 | <d' g' b'>1 | \staff bass c4_"I" f4_"IV" a,4_"vi = ii" d4_"V7" | g,1_"I" |
```

To find a pivot, list the chords the two keys share. :n[C] major and :n[G] major share :c[C], :c[Em], :c[G] and :c[Am]
(I, iii, V, vi in :n[C]; IV, vi, I, ii in :n[G]). The best pivots are predominant chords in the new key (ii or IV),
because they lead naturally to its V.

```analyse
id: modulation/pivot
title: Find the pivot
prompt: 'This phrase modulates from :n[C] major to :n[F] major. Name each chord. At the pivot write both numerals, old key first, like vi=iii; after it, use numerals in :n[F] major.'
instruction: 'One numeral per chord; at the pivot, two joined by “=”.'
key: C major
score: |
  \time 4/4 \staff treble <e' g' c''>4 <e' a' c''>4 <f' a' d''>4 <g' bb' e''>4 | <f' a' f''>1 | \staff bass c4 a,4 d4 c4 | f,1 |
answers: [I, vi, 'ii=vi', V7, I]
hints:
  - 'The :n[Bb] in chord 4 is the first sign of :n[F] major: :c[C7] is V7 in :n[F].'
  - 'The chord before it, :c[Dm], is ii in :n[C] and vi in :n[F].'
```

:::note[A stopping point]
Closely related keys and pivot chords. Next: changing key without a pivot.
:::

## Direct modulation

Not every modulation needs a pivot. In a **direct** (or **phrase**) modulation, one phrase ends in the old key and
the next simply begins in the new one, often on its dominant. It is abrupt by nature, and composers use it for
contrast: a new section, a new theme, a change of mood.

### The pop key change

Pop songs often modulate directly **up a semitone or a tone** for the last chorus, to lift the energy: the singer
repeats the chorus, and everything is suddenly a little higher and brighter. It is sometimes called the “truck
driver’s gear change”, after the lurch of a lorry changing gear. Sometimes the new dominant is slipped in first as
a short pivot; often there is nothing at all, only a jump.

```score caption="The prologue’s loop in :n[C] major, then up a semitone in :n[Db] major: a direct modulation." tempo="88"
\time 4/4 \staff treble <e' g' c''>2 <d' g' b'>2 | <c' e' a'>2 <c' f' a'>2 | <f' ab' db''>2 <eb' ab' c''>2 | <db' f' bb'>2 <db' gb' bb'>2 | <f' ab' db''>1 | \staff bass c2_"C: I" g,2_"V" | a,2_"vi" f,2_"IV" | db2_"Db: I" ab,2_"V" | bb,2_"vi" gb,2_"IV" | db1_"I" |
```

```ear
id: modulation/hear
title: Home or away?
prompt: 'A short phrase starting in :n[C] major. Does it stay in :n[C], or move to a new key and cadence there?'
kind: custom
options: [Stays in C major, Moves to G major, Moves to F major]
items:
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: Stays in C major
  - play: [C3 E4 G4 C5, A2 E4 A4 C5, D3 D4 F4 A4, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: Stays in C major
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, A2 E4 A4 C5, D3 D4 F#4 C5, G2 D4 G4 B4]
    answer: Moves to G major
  - play: [C3 E4 G4 C5, A2 E4 A4 C5, D3 F4 A4 D5, C3 G4 Bb4 E5, F2 F4 A4 F5]
    answer: Moves to F major
rounds: 8
pass: 7
hints:
  - 'Listen for the new note just before the end: :n[F#] leads to :n[G], :n[Bb] leans down towards :n[A] in :n[F] major.'
```

```realise
id: modulation/realise
title: Modulate from C to G
prompt: 'The numerals are in :n[C] major; the last two chords are V7 – I in :n[G] major (V7/V – V in :n[C]). Resolve the :n[F#] up and the seventh :n[C] down.'
key: C major
bass: 'c4 f a, d | g,1 |'
numerals: [I, IV, vi, V7/V, V]
example: ['C3 E4 G4 C5', 'F3 F4 A4 C5', 'A2 E4 A4 C5', 'D3 D4 F#4 C5', 'G2 D4 G4 B4']
hints:
  - 'Keep :n[C5] on top for the first four chords; in the last chord it falls to :n[B4].'
```

:::key
- A **modulation** establishes a new key with a cadence there; a tonicisation only visits.
- **Closely related keys** differ by at most one sharp or flat: from a major key, V, IV, vi, iii and ii.
- A **pivot chord** belongs to both keys and is analysed in both (vi = ii); predominants make the best pivots.
- A **direct modulation** simply starts the next phrase in the new key, like the pop key change up a semitone.
:::
