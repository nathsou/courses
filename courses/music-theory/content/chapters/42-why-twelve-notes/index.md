---
number: 42
title: Why twelve notes?
summary: The harmonic series, Pythagorean tuning, just intonation, meantone and equal temperament. Korobeiniki VII.
duration: 55 minutes
prerequisites: [pitch-class-sets]
skills:
  - Tuning and temperament
---

:::check
```quiz
q: 'In equal temperament, how does the major third compare with the pure major third of the harmonic series (5:4)?'
options:
  - text: 'It is about 14 cents wider.'
    correct: true
  - text: 'It is exactly pure.'
    why: 'Only the octave is pure in equal temperament. The equal-tempered third is 400 cents; the pure 5:4 is about 386.'
  - text: 'It is about 2 cents narrower.'
    why: 'That is the fifth: 700 cents against a pure 702.'
```
:::

## The problem

Chapter 8 found the consonant intervals in the harmonic series: the octave 2:1, the fifth 3:2, the fourth 4:3, the major
third 5:4, the minor third 6:5. They are the simplest frequency ratios, and when two notes are tuned to them exactly
they blend without beating. The trouble is that these pure intervals do not fit together. Stack twelve pure fifths and
you should come back to where you started, seven octaves up; you do not quite. Stack three pure major thirds (5:4 ×
5:4 × 5:4) and you fall short of an octave. Every tuning system is a compromise between pure intervals and a usable
set of keys, and the twelve notes of the piano are the compromise Western music settled on.

Tuning differences are small, so they are measured in **cents**: hundredths of an equal-tempered semitone, 1200 to the
octave. The ear notices a difference of a few cents in a sustained chord, through **beating**: the slow wobble two
nearly-in-tune notes make.

## Pythagorean tuning

Tune by pure fifths alone, as medieval theorists after Pythagoras did: :n[C] :n[G] :n[D] :n[A] :n[E] … Twelve pure fifths overshoot seven
octaves by about 23.5 cents, the **Pythagorean comma**, so one fifth somewhere must be badly out (a “wolf”). The fifths
are perfect, but the major thirds come out at about 408 cents, 22 cents wider than pure: harsh, which suited medieval
music, where thirds were treated as dissonances.

## Just intonation

Tune the main chords of one key to pure ratios, fifths 3:2 and thirds 5:4, and the triads of that key sound wonderfully
smooth: **just intonation**. Choirs and string quartets drift towards it naturally. But a fixed keyboard tuned justly in
:n[C] has a fifth from :n[D] to :n[A] about 22 cents narrow (the **syntonic comma**, 81:80, about 21.5 cents), and other keys are
worse. Just intonation is a way of singing, not a way of tuning a piano.

## Meantone and well temperament

From the 16th century keyboards were usually tuned in **meantone**: in **quarter-comma meantone** every fifth is narrowed by a
quarter of the syntonic comma, about 5.4 cents, so that four fifths (:n[C] :n[G] :n[D] :n[A] :n[E]) make a pure major third. Eight major
thirds are pure and the music of the Renaissance and early Baroque sounds radiant; but the leftover fifth, :n[G#] to :n[Eb], is a
howling wolf, about 738 cents, and keys far from :n[C] are unusable.

In the late 17th and 18th centuries tuners spread the comma around more evenly: **well temperaments** (by Werckmeister,
Kirnberger and others) make every key usable while keeping some keys purer than others, so that each key has its own
colour. Bach’s *Well-Tempered Clavier* (Chapter 30) celebrates a keyboard on which all 24 keys can be played; which tuning
Bach himself used is still argued over.

## Equal temperament

**Equal temperament** divides the octave into twelve exactly equal semitones, each a frequency ratio of the twelfth root of
2. Every fifth is 2 cents narrow, every major third 14 cents wide, and every key sounds the same. It is the standard
tuning of pianos from the 19th century on, and it is what makes the enharmonic tricks of Chapters 26 and 27 work: :n[F#] and
:n[Gb] are the same key and the same pitch.

Why twelve? Because twelve fifths come very close to seven octaves ((3/2)¹² ≈ 129.7, against 2⁷ = 128), so twelve equal steps
give good fifths. Other divisions have been tried: 19, 31 and 53 equal steps give better thirds, at the cost of more keys.

::temperament-lab

Play the major third in just intonation, then in equal temperament: the second one beats, a slow wobble, and the cents
table says by how much.

:::note[A stopping point]
Five tunings. Last, the final arrangement of Korobeiniki.
:::

## Korobeiniki VII

The last arrangement puts the tune through the strange mirrors of Part VII. First, **distortions**: keep the rhythm and the
contour, but map each degree of the :n[A] minor scale onto another scale. On the **whole-tone** scale on :n[A] (:n[A] :n[B] :n[C#]
:n[D#] :n[F] :n[G]) the tune loses every semitone and floats; on an **octatonic** scale (:n[A] :n[B] :n[C] :n[D] :n[D#] :n[F] :n[F#] :n[G#]) its
fifth becomes :n[D#] and its seventh :n[G#], and the minor key turns uncanny.

```score caption="Korobeiniki VII (1): mapped onto the whole-tone scale on :n[A]." tempo="96"
\time 4/4 f''4 b'8 c#''8 d#''4 c#''8 b'8 | a'4 a'8 c#''8 f''4 d#''8 c#''8 | b'4. c#''8 d#''4 f''4 | c#''4 a'4 a'2 | r8 d#''4 g''8 a''4 g''8 g''8 | f''4. c#''8 f''4 d#''8 c#''8 | b'4 b'8 c#''8 d#''4 f''4 | c#''4 a'4 a'2 |
```

```score caption="Korobeiniki VII (2): mapped onto an octatonic scale on :n[A]." tempo="96"
\time 4/4 d#''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 d#''4 d''8 c''8 | b'4. c''8 d''4 d#''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g#''8 f''8 | d#''4. c''8 d#''4 d''8 c''8 | b'4 b'8 c''8 d''4 d#''4 | c''4 a'4 a'2 |
```

Then **tuning**: in the temperament lab above, play Korobeiniki in :n[A] minor in quarter-comma meantone, then choose :n[F#] and play it
again. The same tune, the same tuning, a different key: in :n[F#] minor the thirds of the dominant chord are far too wide.
Equal temperament is the compromise that let music travel to every key.

```perform
id: why-twelve-notes/korobeiniki-7
title: Korobeiniki VII, whole-tone
prompt: 'The whole-tone version, right hand, at your own pace. Its notes are exactly those of the whole-tone scale on :n[A].'
mode: notes
range: [57, 84]
score: |
  \time 4/4 f''4 b'8 c#''8 d#''4 c#''8 b'8 | a'4 a'8 c#''8 f''4 d#''8 c#''8 | b'4. c#''8 d#''4 f''4 | c#''4 a'4 a'2 | r8 d#''4 g''8 a''4 g''8 g''8 | f''4. c#''8 f''4 d#''8 c#''8 | b'4 b'8 c#''8 d#''4 f''4 | c#''4 a'4 a'2 |
```

:::key
- Pure intervals (3:2 fifths, 5:4 thirds) do not stack into a closed system of twelve notes: the **Pythagorean comma**
  (about 23.5 cents) and the **syntonic comma** (about 21.5) are the leftovers.
- **Pythagorean** tuning keeps fifths pure; **just intonation** keeps one key’s triads pure; **meantone** keeps thirds pure at the cost of a
  wolf; **well temperaments** make every key usable with different colours; **equal temperament** makes every key the same.
- Twelve notes work because twelve fifths almost equal seven octaves.
:::
