---
number: 17
title: Accompanying a melody
summary: Choosing chords for a tune, reading a lead sheet and left-hand patterns.
duration: 50 minutes
prerequisites: [non-chord-tones]
skills:
  - Harmonising a melody
  - Left-hand patterns
---

:::check
```analyse
id: accompanying/check-1
title: Choose the chords
prompt: 'A melody written for the course, in :n[F] major. Choose one chord per :t[bar] from :c[F], :c[Bb] and :c[C] (or :c[C7]).'
instruction: 'One chord symbol per :t[bar].'
per: bar
key: F major
score: |
  \key f \major \time 4/4 a'4 c''4 f''4 c''4 | d''4 bb'4 f'4 bb'4 | g'4 e'4 c''4 bb'4 | a'2 f'2 |
answers: [F, Bb, 'C|C7', F]
```
:::

## Choosing chords

To harmonise a melody, find for each stretch of the tune a chord that contains its important notes. The
important notes are the ones on strong beats and the long ones; the others are often non-chord tones
(Chapter 16) and can be left out of the reckoning. Three questions get you most of the way:

1. **What key is it in?** That gives you the candidate chords: I, ii, IV, V and vi first.
2. **Which chord contains the strong-beat notes?** Often only one or two of the candidates do.
3. **Where are the cadences?** Phrase endings want V – I (or IV – I, or end on V for a pause), and choosing them
   first fixes the shape of the whole accompaniment.

Here is a famous melody to try it on, the theme Beethoven set to Schiller’s “Ode to Joy” in the finale of his
Ninth Symphony (1824), in :n[C] major.

```score caption="Beethoven, the “Ode to Joy” theme (Symphony No. 9, finale), in :n[C] major." tempo="100" names="true"
\time 4/4 e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | e''4. d''8 d''2 | e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | d''4. c''8 c''2 |
```

Bar 1 has :n[E] and :n[G] on its strong beats: :c[C]. Bar 2 has :n[G], :n[E] and :n[D], and the line :n[G]
:n[F] :n[E] :n[D] fits :c[G7] (:n[E] is a passing note). Bar 3 is :c[C] again. Bar 4 ends the first phrase on
:n[D], a note of :c[G]: an imperfect cadence. The second half repeats the first until bar 8, which ends on
:n[C] over V – I: a perfect cadence.

```analyse
id: accompanying/ode
title: Harmonise the Ode to Joy
prompt: 'One chord per :t[bar] for the whole theme, from :c[C], :c[F] and :c[G] (or :c[G7]). The last :t[bar] can hold two chords: write them both, e.g. G-C.'
instruction: 'One chord symbol per :t[bar] (or two, joined by a hyphen).'
per: bar
key: C major
score: |
  \time 4/4 e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | e''4. d''8 d''2 | e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | d''4. c''8 c''2 |
answers: [C, 'G|G7', C, 'G|G7|C-G', C, 'G|G7', C, 'G-C|G7-C|C']
```

## Lead sheets

Pop, jazz and folk musicians often play from a **lead sheet**: the melody on one staff, with chord symbols
above it, and nothing else. The accompaniment is left to the player, who turns each symbol into a texture.
That is what the rest of this chapter is about.

```score caption="The Ode to Joy as a lead sheet: melody and chord symbols." tempo="100"
\time 4/4 e''4^"C" e''4 f''4 g''4 | g''4^"G7" f''4 e''4 d''4 | c''4^"C" c''4 d''4 e''4 | e''4.^"G" d''8 d''2 | e''4^"C" e''4 f''4 g''4 | g''4^"G7" f''4 e''4 d''4 | c''4^"C" c''4 d''4 e''4 | d''4.^"G7" c''8 c''2^"C" |
```

```perform
id: accompanying/ode-roots
title: Melody and roots
prompt: 'Right hand: the melody. Left hand: the root of each chord, held through the :t[bar] (in the last :t[bar], :n[G2] then :n[C3]). At your own pace first.'
mode: notes
range: [40, 79]
score: |
  \time 4/4 \staff treble e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | e''4. d''8 d''2 | e''4 e''4 f''4 g''4 | g''4 f''4 e''4 d''4 | c''4 c''4 d''4 e''4 | d''4. c''8 c''2 | \staff bass c1 | g,1 | c1 | g,1 | c1 | g,1 | c1 | g,2 c2 |
```

:::note[A stopping point]
Choosing chords and reading them from a lead sheet. Now: what the left hand does with them.
:::

## Left-hand patterns

A chord symbol says *which* notes; the **accompaniment pattern** says *when* and *where*. The same four
chords can be a hymn, a waltz or a ballad depending on the pattern. The commonest:

- **Block chords:** the whole chord at once, held or repeated on the beat. Solid, plain, good for hymns.
- **Root and chord** (“oom-pah”): bass note on the strong beats, chord on the weak ones. In 3/4 it is the
  **waltz** pattern: root, chord, chord.
- **Broken chords:** the chord’s notes one after another, root–fifth–octave–fifth: a flowing bass for ballads.
- **Alberti bass:** low–high–middle–high in steady :t[quaver]s, named after Domenico Alberti, who used it
  constantly; Mozart’s Sonata in C, K. 545, opens with it.
- **Arpeggio:** root, fifth, octave, tenth and back, spread wide: the pop-ballad left hand.

::progression-player{romans="I,vi,IV,V" tonics="C,G,F,D" patterns="block,pulse,waltz,broken,alberti,arpeggio" title="One progression, six accompaniments"}

Choose a pattern for the character you want, keep the harmonic rhythm steady, and make the left hand quieter
than the melody. A good test: if you hum the tune over your left hand, does it sound like a song?

```perform
id: accompanying/waltz
title: A waltz accompaniment
prompt: 'Left hand only, in 3/4: root on beat 1, chord on beats 2 and 3, for I – IV – V7 – I in :n[C] major.'
mode: both
tempo: 96
range: [36, 67]
score: |
  \clef bass \time 3/4 c4 <e g>4 <e g>4 | f,4 <f a>4 <f a>4 | g,4 <f b>4 <f b>4 | c4 <e g>4 <e g>4 |
```

```perform
id: accompanying/alberti
title: An Alberti bass
prompt: 'Left hand, steady :t[quaver]s: low, high, middle, high. :c[C], then :c[G7] with :n[B2] at the bottom (:n[B2] :n[G3] :n[F3] :n[G3]), then :c[C].'
mode: both
tempo: 66
range: [43, 67]
score: |
  \clef bass \time 4/4 c8 g8 e8 g8 c8 g8 e8 g8 | b,8 g8 f8 g8 b,8 g8 f8 g8 | c8 g8 e8 g8 c2 |
```

:::key
- Harmonise by finding chords that contain the **strong-beat** and long notes, and by choosing the
  **cadences** first.
- A **lead sheet** gives the melody and chord symbols; the player supplies the accompaniment.
- Accompaniment patterns (block, root-and-chord, waltz, broken chords, Alberti, arpeggio) give the same
  chords different characters.
:::
