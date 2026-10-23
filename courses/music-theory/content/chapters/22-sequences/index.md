---
number: 22
title: Sequences
summary: Descending fifths and thirds, the ascending 5–6, in Bach and in pop. Canon II, Korobeiniki III.
duration: 55 minutes
prerequisites: [six-four-and-figured-bass]
skills:
  - Harmonic sequences
---

:::check
```ear
id: sequences/check-1
title: Which sequence?
prompt: 'A sequence in :n[C] major. Listen to the bass. Does it fall by fifths, fall by a fourth and rise by a step, or rise by step?'
kind: custom
options: [Descending fifths, Down a fourth and up a step, Rising by step (5–6)]
items:
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, B2 D4 F4 B4, E3 E4 G4 B4, A2 C4 E4 A4, D3 D4 F4 A4, G2 B3 D4 G4, C3 C4 E4 G4]
    answer: Descending fifths
  - play: [C3 E4 G4 C5, G2 D4 G4 B4, A2 C4 E4 A4, E2 B3 E4 G4, F2 A3 C4 F4, C2 G3 C4 E4, F2 A3 C4 F4, G2 G3 B3 D4]
    answer: Down a fourth and up a step
  - play: [C3 E4 G4, C3 E4 A4, D3 F4 A4, D3 F4 B4, E3 G4 B4, E3 G4 C5, F3 A4 C5, G3 F4 B4, C3 E4 C5]
    answer: Rising by step (5–6)
rounds: 6
pass: 6
```
:::

## Patterns that move

A **sequence** is a pattern repeated at a new pitch, usually a step higher or lower each time. Chapter 16 met
the melodic sequence, a motif repeated on other notes; Bach’s Invention turned its subject upside down and
sequenced it down in thirds (Chapter 20). A **harmonic sequence** does the same with chords: a short
progression, usually two chords, repeated a step lower or higher, with the voices moving the same way each
time.

Sequences are how tonal music gets from one place to another. Once the ear has heard the pattern twice it
knows what is coming, and the music can travel a long way, through chords that would sound odd on their own,
without losing the thread. Three sequences cover most of what you will meet.

| Sequence | Bass | Chords in :n[C] major | Where you hear it |
| --- | --- | --- | --- |
| **descending fifths** | down a fifth, up a fourth | I IV vii° iii vi ii V I | Baroque everything; jazz standards; disco |
| **descending thirds** (the “Pachelbel”) | down a fourth, up a step | I V vi iii IV I IV V | Pachelbel’s Canon; pop ballads |
| **ascending 5–6** | up a step, a fifth then a sixth above each note | I vi6 ii vii°6 iii I6 … | Corelli, Handel, Vivaldi |

## Descending fifths

Chapter 15 met this progression as the circle of fifths: every root falls a fifth (or rises a fourth). As a
sequence it is two chords long. In the four-part version below the top voice holds its note over each pair of
chords, then steps down: :n[C] :n[C], :n[B] :n[B], :n[A] :n[A], :n[G] :n[G]. The inner voices follow the same
pattern, so each pair of chords is the first pair, a step lower.

```score caption="The descending-fifths sequence in :n[C] major, in keyboard style. Each two-chord unit is the last one a step lower." tempo="76"
\time 4/4 \staff treble <e' g' c''>4 <f' a' c''>4 <d' f' b'>4 <e' g' b'>4 | <c' e' a'>4 <d' f' a'>4 <b d' g'>4 <c' e' g'>4 | \staff bass c4_"I" f4_"IV" b,4_"vii°" e4_"iii" | a,4_"vi" d4_"ii" g,4_"V" c4_"I" |
```

Inside a sequence the pattern outranks some of Chapter 19’s rules. The vii° chord here doubles its root, :n[B],
the :t[leading note], and :n[B] does not rise to :n[C] afterwards: in the middle of a sequence it is not acting
as a leading note, just as one more chord in the chain. The parallel fifths and octaves are still avoided.

The same sequence runs through a great deal of popular music. In :n[A] minor it is :c[Am] :c[Dm] :c[G] :c[C]
:c[F] :c[Bm7b5] :c[E] (with sevenths added, as is usual): the chords under the verses of *I Will Survive*
(1978) and the opening of *Fly Me to the Moon* (1954), and in a minor key the backbone of the jazz standard
*Autumn Leaves* (1945, usually played in :n[G] minor).

::progression-player{chords="Am7,Dm7,G7,Cmaj7,Fmaj7,Bm7b5,E7,Am7" tonic="A" mode="minor" patterns="block,broken" tempo="96" title="Falling fifths in A minor" subtitle="Every root a fifth below the last, with sevenths: the chain that pop and jazz borrowed from the Baroque."}

```realise
id: sequences/fifths
title: Realise the descending fifths
prompt: 'The bass and the numerals are given. Keep the pattern: over each pair of chords the top voice holds a note, then steps down, and the right hand’s shape repeats a step lower each time.'
key: C major
bass: 'c4 f b, e | a, d g, c |'
numerals: [I, IV, vii°, iii, vi, ii, V, I]
rules: [span, crossing, parallel-fifths, parallel-octaves, contrary-fifths-octaves, hidden-fifths-octaves, seventh, chord-tones, incomplete, doubled-third, leap]
example: ['C3 E4 G4 C5', 'F3 F4 A4 C5', 'B2 D4 F4 B4', 'E3 E4 G4 B4', 'A2 C4 E4 A4', 'D3 D4 F4 A4', 'G2 B3 D4 G4', 'C3 C4 E4 G4']
hints:
  - 'Start with :n[E4] :n[G4] :n[C5] over :n[C3]. For IV keep :n[C5] and move the others up a step: :n[F4] :n[A4] :n[C5].'
  - 'Then down to :n[D4] :n[F4] :n[B4] for vii°, and the pattern repeats a step lower.'
```

:::note[A stopping point]
Falling fifths, the commonest sequence. Two more: one falling, one rising.
:::

## Canon II: descending thirds

Pachelbel’s ground (Chapter 15) is a sequence too. Group its chords in pairs: I–V, vi–iii, IV–I. Each pair falls a
fourth in the bass, and each pair starts a third lower than the one before (:n[D], :n[B], :n[G]). Then IV–V
turns back to the start. Musicians call it the descending-thirds sequence, or simply the Pachelbel sequence.

```score caption="Pachelbel’s ground as a sequence: three pairs of chords, each a third lower, then IV – V. The top voice falls by step from :n[D5]." tempo="66"
\key d \major \time 4/4 \staff treble <f#' a' d''>4 <e' a' c#''>4 <d' f#' b'>4 <c#' f#' a'>4 | <b d' g'>4 <a d' f#'>4 <b d' g'>4 <a c#' e'>4 | \staff bass d4_"I" a,4_"V" b,4_"vi" f#,4_"iii" | g,4_"IV" d,4_"I" g,4_"IV" a,4_"V" |
```

Over this ground three violins play a **canon**: each enters two bars after the last with the same melody, and
the melody has been written so that every phrase of it fits the eight chords, whatever the other violins are
playing at the time. The first violin’s first phrase is a falling scale, one note per bass note, mostly a tenth
or a twelfth above the bass: the melody runs in step with the sequence.

```perform
id: sequences/canon-melody
title: The first violin’s entry
prompt: 'The ground in the left hand, the first violin’s opening phrase in the right, at your own pace.'
mode: notes
range: [38, 79]
score: |
  \key d \major \time 4/4 \staff treble f#''4 e''4 d''4 c#''4 | b'4 a'4 b'4 c#''4 | \staff bass d4 a,4 b,4 f#,4 | g,4 d,4 g,4 a,4 |
```

```realise
id: sequences/canon-ground
title: Canon II
prompt: 'Realise Pachelbel’s ground in keyboard style. Start with :n[D5] on top and let the top voice fall with the sequence. In a sequence the :t[leading note] may fall from V to vi, so that rule is off here.'
key: D major
bass: 'd4 a, b, f#, | g, d, g, a, |'
numerals: [I, V, vi, iii, IV, I, IV, V]
rules: [span, crossing, parallel-fifths, parallel-octaves, contrary-fifths-octaves, hidden-fifths-octaves, doubled-leading-note, chord-tones, incomplete, doubled-third, leap]
example: ['D3 F#4 A4 D5', 'A2 E4 A4 C#5', 'B2 D4 F#4 B4', 'F#2 C#4 F#4 A4', 'G2 B3 D4 G4', 'D2 A3 D4 F#4', 'G2 B3 D4 G4', 'A2 A3 C#4 E4']
hints:
  - 'The top voice can fall by step through the first seven chords: :n[D5] :n[C#5] :n[B4] :n[A4] :n[G4] :n[F#4] :n[G4].'
  - 'At the end, IV to V: the bass rises, so move the right hand down (:n[G4] to :n[E4] on top), or you get parallel octaves and fifths.'
```

## The ascending 5–6

A rising bass needs care: if the upper voices simply rise with it in root-position chords, they move in parallel
fifths. The **5–6** sequence avoids them. Above each bass note one voice moves from a fifth to a sixth, turning
a root-position chord into a first-inversion chord before the bass moves up; then the sixth becomes the fifth
above the new bass note. The fifths are always separated by a sixth, so they never move in parallel.

```score caption="The ascending 5–6 sequence in three voices. The figures are the top voice’s interval above the bass: 5, 6, 5, 6, …" tempo="80"
\time 4/4 \staff treble g'4 a'4 a'4 b'4 | b'4 c''4 c''4 b'4 | c''1 | \voice e'4 e'4 f'4 f'4 | g'4 g'4 a'4 f'4 | e'1 | \staff bass c4_"5" c4_"6" d4_"5" d4_"6" | e4_"5" e4_"6" f4_"5" g4 | c1 |
```

:::note[A stopping point]
Three sequences. Last, Korobeiniki in four voices.
:::

## Korobeiniki III

The third arrangement puts the melody on top of three more voices, as in a chorale. The inner voices and the
bass hold one note per :t[bar] (two in :t[bar] 5), so the harmony is clear and the left hand stays still. Look for
Chapter 19’s rules at work: the bass is mostly roots, the :t[leading note] :n[G#] is never doubled, and the
bass :n[G#3] in :t[bar] 3 (V in first inversion) rises to :n[A3].

```score caption="Korobeiniki III: the first section in four voices. Right hand: melody and alto. Left hand: tenor and bass." tempo="84"
\time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \voice g#'1 | e'1 | e'1 | e'1 | a'1 | g'1 | g#'1 | e'1 | \staff bass b1 | c'1 | b1 | c'1 | a1 | c'1 | b1 | c'1 | \voice e1_"V7" | a1_"i" | g#1_"V6" | a1_"i" | f2_"iv6" d2_"iv" | e1_"III6" | e1_"V7" | a1_"i" |
```

```perform
id: sequences/korobeiniki-3a
title: Korobeiniki III, level 1
prompt: 'The outer voices: the melody in the right hand, the bass in the left, at your own pace.'
mode: notes
range: [48, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass e1 | a1 | g#1 | a1 | f2 d2 | e1 | e1 | a1 |
```

```perform
id: sequences/korobeiniki-3b
title: Korobeiniki III, level 2
prompt: 'All four voices. Each hand holds two notes; the right hand’s thumb holds the alto while the fingers play the melody.'
mode: notes
range: [48, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \voice g#'1 | e'1 | e'1 | e'1 | a'1 | g'1 | g#'1 | e'1 | \staff bass b1 | c'1 | b1 | c'1 | a1 | c'1 | b1 | c'1 | \voice e1 | a1 | g#1 | a1 | f2 d2 | e1 | e1 | a1 |
hints:
  - 'Practise the left hand alone first: it changes only once in each :t[bar] (twice in :t[bar] 5).'
```

:::key
- A **harmonic sequence** repeats a short progression at successive pitch levels; inside it, the pattern can
  outrank the usual tendencies (a doubled or falling :t[leading note]).
- **Descending fifths:** roots fall by fifths (I IV vii° iii vi ii V I), from Bach to *Autumn Leaves*.
- **Descending thirds:** down a fourth, up a step (I V vi iii IV I), Pachelbel’s ground.
- **Ascending 5–6:** a rising bass with a fifth turning into a sixth above each note, to avoid parallel fifths.
:::
