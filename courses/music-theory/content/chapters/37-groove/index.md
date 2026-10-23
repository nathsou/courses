---
number: 37
title: Groove and accompaniment
summary: Comping, stride, bossa nova, the pop ballad and gospel left hands. Korobeiniki VI.
duration: 55 minutes
prerequisites: [reharmonisation]
skills:
  - Accompaniment styles
---

:::check
```quiz
q: 'In stride piano, what does the left hand do?'
options:
  - text: 'Alternates a low bass note on beats 1 and 3 with a chord in the middle of the keyboard on beats 2 and 4.'
    correct: true
  - text: 'Plays a walking line of crotchets, one note per beat.'
    why: 'That is a walking bass, the bass player’s job in a jazz group.'
  - text: 'Holds long chords while the right hand plays a steady rhythm.'
    why: 'Stride is all left-hand motion: the “stride” is the leap between bass and chord.'
```
:::

## The same chords, different grooves

Chapter 17 showed that one progression can be a hymn, a waltz or a ballad depending on the accompaniment pattern.
Popular styles each have a characteristic **groove**: a rhythm, a register and a way of spreading the chord between the
hands. A pianist who knows the main ones can make a lead sheet sound like almost any style.

::progression-player{chords="Cmaj7,A7,Dm7,G7" tonics="C,F,Bb,G" patterns="charleston,walking,stride,bossa,arpeggio,block" tempo="112" title="One turnaround, six grooves" subtitle="Comping, walking bass, stride, bossa nova, ballad arpeggio and plain block chords."}

## Comping

In a jazz group the pianist **comps** (accompanies, or complements): short chords, usually rootless voicings (Chapter
32), placed around the soloist rather than on every beat. The classic figure is the **Charleston** rhythm, a chord
on beat 1 and another on the “and” of 2, named after the 1920s dance. Good comping listens: it leaves holes when the
soloist is busy and answers when the soloist pauses.

## Stride

**Stride** piano, from Harlem in the 1920s (James P. Johnson, Fats Waller, and later Art Tatum), grew out of ragtime.
The left hand strides between a low bass note on beats 1 and 3 (often an octave or a tenth) and a chord in the middle
of the keyboard on beats 2 and 4, while the right hand plays the tune.

```perform
id: groove/stride
title: A stride left hand
prompt: 'Left hand alone: bass on 1 and 3, chord on 2 and 4, for :c[C] – :c[A7] – :c[Dm] – :c[G7]. Slowly; aim the leap with your eyes on the bass note.'
mode: notes
range: [28, 67]
score: |
  \clef bass \time 4/4 c,4 <e g c'>4 g,4 <e g c'>4 | a,,4 <e g c#'>4 e,4 <e g c#'>4 | d,4 <f a d'>4 a,,4 <f a d'>4 | g,,4 <f g b>4 d,4 <f g b>4 |
```

## Bossa nova

**Bossa nova** came from Rio de Janeiro in the late 1950s (João Gilberto, Antônio Carlos Jobim): samba slowed down
and made intimate, with jazz harmony. The guitar or the pianist’s left hand plays the root and the fifth in a steady
two-beat pattern, while the chords fall off the beat in a syncopated cycle.

```perform
id: groove/bossa
title: A bossa nova bass
prompt: 'Left hand: root on beat 1 (held), fifth on the “and” of 2, fifth on 3 (held), root on the “and” of 4, for :c[Dm7] then :c[G7]. In time.'
mode: both
tempo: 80
range: [36, 60]
score: |
  \clef bass \time 4/4 d4. a,8 a,4. d8 | g,4. d8 d4. g,8 | d4. a,8 a,4. d8 | g,4. d8 d4. g,8 |
```

:::note[A stopping point]
Comping, stride and bossa nova. Two more styles, then Korobeiniki VI.
:::

## The pop ballad

The piano ballad spreads each chord across the keyboard: the left hand rolls root, fifth, octave and tenth (the
**arpeggio** pattern of Chapter 17), the sustain pedal (appendix B) changes with each chord, and the right hand plays
chords or the melody in the middle register. The bass line often moves by step through inversions (:c[C] :c[G/B] :c[Am]
:c[Am/G] :c[F]), the walking-down bass of countless ballads.

## Gospel

Gospel piano fills every space with harmony: **passing chords** between the chords of the song, walk-ups in the bass,
plagal IV – I “amen” colours, and the passing diminished chords of Chapter 36. A typical approach to a final cadence:

::progression-player{chords="C,C7,F,F#dim7,C/G,G7,C,C" tonics="C,F,G" patterns="block,pulse" tempo="84" title="A gospel approach to the cadence" subtitle="I – I7 – IV – ♯iv°7 – I64 – V7 – I: every chord leans into the next."}

## Korobeiniki VI

The sixth arrangement turns Korobeiniki into a jazz tune. The melody stays; the harmony is reharmonised with the tools of
Part VI, and the left hand plays rootless voicings, leaving the roots to a bass player (the course plays them for
listening).

- :c[E7] becomes :c[E7b9], and in :t[bar]s 3 and 7 the dominant is preceded by its ii: :c[Bm7b5] – :c[E7b9], the minor ii–V of
  Chapter 33.
- :c[Am] becomes :c[Am9]; at the end of :t[bar] 4, :c[A13] (V7/iv) leads into the :c[Dm9] of :t[bar] 5.
- :c[C] becomes :c[Cmaj9]; the last chord is :c[Am6].

Play the quavers swung (Chapter 12).

```score caption="Korobeiniki VI: rootless voicings in the left hand (upper voice of the bass staff); the bass line below them is for a bass player." tempo="132"
\time 4/4 \key a \minor \staff treble e''4^"E7b9" b'8 c''8 d''4 c''8 b'8 | a'4^"Am9" a'8 c''8 e''4 d''8 c''8 | b'4.^"Bm7b5" c''8 d''4^"E7b9" e''4 | c''4^"Am9" a'4 a'2^"A13" | r8 d''4^"Dm9" f''8 a''4 g''8 f''8 | e''4.^"Cmaj9" c''8 e''4 d''8 c''8 | b'4^"Bm7b5" b'8 c''8 d''4^"E7b9" e''4 | c''4^"Am6" a'4 a'2 | \staff bass <d f g# b>4. <d f g# b>8 r2 | <c e g b>4. <c e g b>8 r2 | <d f a>2 <d f g# b>2 | <c e g b>2 <g b c#' f#'>2 | <f a c' e'>4. <f a c' e'>8 r2 | <e g b d'>4. <e g b d'>8 r2 | <d f a>2 <d f g# b>2 | <c e f# a>1 | \voice e,1 | a,1 | b,2 e,2 | a,2 a,2 | d,1 | c,1 | b,,2 e,2 | a,,1 |
```

```perform
id: groove/korobeiniki-6
title: Korobeiniki VI
prompt: 'The melody and the left-hand voicings, without the bass line, at your own pace. Then try it in time, swung.'
mode: notes
range: [48, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass <d f g# b>4. <d f g# b>8 r2 | <c e g b>4. <c e g b>8 r2 | <d f a>2 <d f g# b>2 | <c e g b>2 <g b c#' f#'>2 | <f a c' e'>4. <f a c' e'>8 r2 | <e g b d'>4. <e g b d'>8 r2 | <d f a>2 <d f g# b>2 | <c e f# a>1 |
```

```improvise
id: groove/korobeiniki-solo
title: Solo on Korobeiniki VI
prompt: 'The new changes, swung, with the course comping. Start from the melody, then decorate it, then leave it.'
chart: [E7b9, Am9, Bm7b5 E7b9, Am9 A13, Dm9, Cmaj9, Bm7b5 E7b9, Am6]
tempo: 120
choruses: 3
range: [55, 84]
```

:::key
- Each style has a **groove**: comping (Charleston rhythm, rootless voicings), **stride** (bass on 1 and 3, chord on
  2 and 4), **bossa nova** (root–fifth bass, syncopated chords), the **ballad** (arpeggios and pedal), **gospel** (passing
  chords and walk-ups).
- Korobeiniki VI: :c[E7b9], :c[Am9], minor ii–V’s and :c[A13] into :c[Dm9], with rootless voicings.
:::
