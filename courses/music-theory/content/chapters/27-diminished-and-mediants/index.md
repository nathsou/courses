---
number: 27
title: Diminished sevenths and chromatic mediants
summary: Enharmonic modulation and third relations. Chopin’s Prelude in C minor, Korobeiniki IV.
duration: 60 minutes
prerequisites: [neapolitan-and-augmented-sixths]
skills:
  - Diminished sevenths
  - Chromatic mediants
---

:::check
```quiz
q: 'How many different diminished seventh chords are there, counting chords with the same keys as the same chord?'
options:
  - text: 'Three.'
    correct: true
  - text: 'Twelve, one on each note.'
    why: 'A diminished seventh is a stack of minor thirds that divides the octave into four equal parts, so the chord on :n[B] has the same keys as the chords on :n[D], :n[F] and :n[Ab]. Twelve roots, four per chord: three chords.'
  - text: 'Four.'
    why: 'Each chord has four notes, and each of them can be its root, so twelve roots give only three different chords.'
```
:::

## The diminished seventh

Chapter 14 met the **diminished seventh chord** as vii°7 in minor: :n[B] :n[D] :n[F] :n[Ab] in :n[C] minor. Look at its
intervals: :n[B] to :n[D], :n[D] to :n[F], :n[F] to :n[Ab] are minor thirds, and so is :n[Ab] up to :n[B] (spelt :n[G#] to
:n[B]). The chord divides the octave into four equal parts. It has no bottom and no top: invert it and you get the
same shape, the same sound.

That symmetry makes it the great pivot of Romantic harmony. As vii°7 its job is to resolve up a semitone from its
root to a tonic. But which note is the root? Spell the chord four ways and each of its notes becomes a :t[leading note]:

| Spelling | Leading note | Resolves to |
| --- | --- | --- |
| :n[B] :n[D] :n[F] :n[Ab] | :n[B] | :c[Cm] (or :c[C]) |
| :n[D] :n[F] :n[Ab] :n[Cb] | :n[D] | :c[Ebm] (or :c[Eb]) |
| :n[E#] :n[G#] :n[B] :n[D] | :n[E#] | :c[F#m] (or :c[F#]) |
| :n[G#] :n[B] :n[D] :n[F] | :n[G#] | :c[Am] (or :c[A]) |

One chord, four keys a minor third apart. Arriving on a diminished seventh in one key and leaving it as if it
belonged to another is **enharmonic modulation**: the most sudden way to travel far, and a favourite of
opera and melodrama, where the chord itself is the sound of suspense.

```play
id: diminished-and-mediants/four-ways
title: One chord, four resolutions
prompt: 'The same four keys each time, :n[B] :n[D] :n[F] :n[Ab] (in any octave and order), resolving four different ways.'
range: [43, 79]
steps:
  - chord: Bdim7
    label: vii°7 of C minor
  - chord: Cm
    label: i
  - chord: Ddim7
    label: vii°7 of E♭ minor
  - chord: Ebm
    label: i
  - chord: E#dim7
    label: vii°7 of F♯ minor
  - chord: F#m
    label: i
  - chord: G#dim7
    label: vii°7 of A minor
  - chord: Am
    label: i
```

## Chromatic mediants

Chords whose roots are a third apart are **mediant** relations: :c[C] and :c[Am], :c[C] and :c[Em] share two notes and are
diatonic neighbours. A **chromatic mediant** keeps the third relation and the chord quality but changes a note
chromatically: :c[C] major to :c[E] major, :c[A] major, :c[Ab] major or :c[Eb] major. Only one note is shared, the other two move
by semitone or tone, and the effect is a sudden change of light rather than a progression with a function.

```score caption="Chromatic mediants from :c[C]: up a major third to :c[E], down a major third to :c[Ab]. One common tone each time; the other notes move by semitone." tempo="60"
\time 4/4 \staff treble <c' e' g'>2 <b e' g#'>2 | <c' e' g'>1 | <c' e' g'>2 <c' eb' ab'>2 | <c' e' g'>1 | \staff bass c2_"I" e2_"III" | c1_"I" | c2_"I" ab,2_"♭VI" | c1_"I" |
```

Schubert loved them: his late works move between keys a third apart as easily as between tonic and dominant.
Film music uses them constantly, for wonder, menace or heroism, because they colour a scene without setting off
the expectation of a cadence. Chapter 40 gives them a geometry of their own.

```ear
id: diminished-and-mediants/hear-mediant
title: Diatonic or chromatic mediant?
prompt: 'Two chords, the second a third away from :c[C]. Is the second chord diatonic (:c[Am] or :c[Em]) or a chromatic mediant (:c[A], :c[E], :c[Ab] or :c[Eb] major)?'
kind: custom
options: [Diatonic, Chromatic]
items:
  - play: [C3 C4 E4 G4, A2 C4 E4 A4]
    answer: Diatonic
  - play: [C3 C4 E4 G4, A2 C#4 E4 A4]
    answer: Chromatic
  - play: [C3 C4 E4 G4, E3 B3 E4 G4]
    answer: Diatonic
  - play: [C3 C4 E4 G4, E3 B3 E4 G#4]
    answer: Chromatic
  - play: [C3 C4 E4 G4, Ab2 C4 Eb4 Ab4]
    answer: Chromatic
  - play: [C3 C4 E4 G4, Eb3 Bb3 Eb4 G4]
    answer: Chromatic
rounds: 8
pass: 7
```

:::note[A stopping point]
Diminished sevenths and chromatic mediants. The rest of the chapter is one piece, and one more arrangement.
:::

## Chopin, Prelude in C minor

The twentieth of Chopin’s 24 Preludes, Op. 28 (1839), is thirteen :t[bar]s of slow chords in the same rhythm, and
almost every chord technique of Parts II and IV is in it.

```score caption="Chopin, Prelude in C minor, Op. 28 No. 20 (1839). Notes from Edition Peters (via the Mutopia Project, public domain)." tempo="46"
\key c \minor \time 4/4 \staff treble <g c' eb' g'>4 <ab c' eb' ab'>4 <eb' g'>8. <d' f'>16 <eb g c' eb'>4 | <eb ab c' eb'>4 <f ab db' f'>4 <c' eb'>8. <bb db'>16 <c eb ab c'>4 | <d f b d'>4 <e g bb c' e'>4 g'8. f'16 <g c' eb'>4 | <f# c' d'>4 <g b d' g'>4 b'8. a'16 <b d' g'>4 | <eb' g' eb''>4 <eb' ab' eb''>4 <d' d''>4 <d' g' d''>4 | <c' g' c''>4 <c' d' f#' d''>4 <d' g' b'>8. <c' a'>16 <b d' g'>4 | <c' g' c''>4 <ab c' ab'>4 g'8. f'16 <g c' eb'>4 | <eb ab c' eb'>4 <f ab db' f'>4 eb'8. d'16 <eb g c'>4 | <eb' g' eb''>4 <eb' ab' eb''>4 <d' d''>4 <d' g' d''>4 | <c' g' c''>4 <c' d' f#' d''>4 <d' g' b'>8. <c' a'>16 <b d' g'>4 | <c' g' c''>4 <ab c' ab'>4 g'8. f'16 <g c' eb'>4 | <eb ab c' eb'>4 <f ab db' f'>4 eb'8. d'16 <eb g c'>4 | <c' eb' g' c''>1 | \voice s2 <g b>4 s4 | s2 <db eb g>4 s4 | s2 <ab c'>4 s4 | s2 <c' d' f#'>4 s4 | s2 ab'8. f#'16 s4 | s1 | s2 <g d'>4 s4 | s2 <f g b>4 s4 | s2 ab'8. f#'16 s4 | s1 | s2 <g d'>4 s4 | s2 <f g b>4 s4 | s1 | \staff bass <c, c>4 <f,, f,>4 <g,, g,>4 <c, g, c>4 | <ab,, ab,>4 <db,, db,>4 <eb,, eb,>4 <ab,, ab,>4 | <g,, g,>4 <c,, c,>4 <f,, f,>4 <c, c>4 | <d, a, d>4 <g,, g,>4 <d,, d,>4 <g,, g,>4 | <c, c>4 <c c'>4 <b, b>4 <bb, bb>4 | <a, a>4 <ab, ab>4 <g, g>4 <f, f>4 | <eb, eb>4 <f, f>4 <b,, b,>4 <c, c>4 | <ab,, ab,>4 <db,, db,>4 <g,, g,>4 <c,, c,>4 | <c, c>4 <c c'>4 <b, b>4 <bb, bb>4 | <a, a>4 <ab, ab>4 <g, g>4 <f, f>4 | <eb, eb>4 <f, f>4 <b,, b,>4 <c, c>4 | <ab,, ab,>4 <db,, db,>4 <g,, g,>4 <c,, c,>4 | <c, g,>1 |
```

Chord by chord:

- **Bar 1:** i – iv – V7 – i. On beat 3 the right hand’s :n[Eb] is an appoggiatura that falls to :n[D] over the
  dominant.
- **Bar 2:** a tonicisation of VI. :c[Ab] – :c[Db] – :c[Eb7] – :c[Ab] is I – IV – V7 – I in :n[Ab] major; in :n[C] minor the
  :c[Db] is ♭II, the Neapolitan in root position (Chapter 26).
- **Bar 3:** V7 – V7/iv – iv – i: :c[G7], then :c[C7] (with :n[E] natural) as the dominant of :c[Fm].
- **Bar 4:** V7/V – V – V7/V – V: :c[D7] and :c[G] twice, ending on the dominant, an imperfect cadence.
- **Bars 5–8:** the bass falls by semitones, :n[C] :n[B] :n[Bb] :n[A] :n[Ab] :n[G], a chromatic **lament bass**. On :n[Ab] in
  bar 6 the chord is :n[Ab] :n[C] :n[D] :n[F#], a French sixth, expanding to :n[G]. Then V42 – i6 – iv – V65 – i, and bar 8
  repeats bar 2’s cadence with the Neapolitan :c[Db] straight into V7: VI – ♭II – V7 – i.
- **Bars 9–12** repeat 5–8, very softly; **bar 13** is the final tonic, held.

```analyse
id: diminished-and-mediants/prelude-bars-1-4
title: Bars 1–4, reduced
prompt: 'The first four bars with each appoggiatura resolved, one chord per beat, in :n[C] minor. Name each chord: write secondary dominants as V7/x, the Neapolitan as ♭II.'
key: C minor
score: |
  \key c \minor \time 4/4 \staff treble <g c' eb' g'>4 <ab c' eb' ab'>4 <g b d' f'>4 <eb g c' eb'>4 | <eb ab c' eb'>4 <f ab db' f'>4 <eb g bb db'>4 <c eb ab c'>4 | <d f b d'>4 <e g bb c' e'>4 <ab c' f'>4 <g c' eb'>4 | <f# c' d'>4 <g b d' g'>4 <c' d' f#' a'>4 <b d' g'>4 | \staff bass <c, c>4 <f,, f,>4 <g,, g,>4 <c, g, c>4 | <ab,, ab,>4 <db,, db,>4 <eb,, eb,>4 <ab,, ab,>4 | <g,, g,>4 <c,, c,>4 <f,, f,>4 <c, c>4 | <d, a, d>4 <g,, g,>4 <d,, d,>4 <g,, g,>4 |
answers: [i, iv, 'V7|V', i, VI, '♭II|bII|IV/VI', 'V7/VI|V/VI', VI, 'V7|V', 'V7/iv|V/iv', iv, i, 'V7/V|V/V', V, 'V7/V|V/V', V]
hints:
  - 'Bar 2 is in :n[Ab] major for a moment: :c[Ab], :c[Db], :c[Eb7], :c[Ab]. In :n[C] minor, :c[Ab] is VI.'
  - 'Bar 3, chord 2: :n[C] :n[E] :n[G] :n[Bb] is :c[C7], the dominant of :c[Fm] (iv).'
```

## Korobeiniki IV

The fourth arrangement uses Part IV’s tools. The first eight :t[bar]s are in :n[A] minor, with two secondary dominants:
:c[A7] (V7/iv) leading into the :c[Dm] of :t[bar] 5, and :c[G7] (V7/III) leading into the :c[C] of :t[bar] 6. At the end, the
last tonic chord becomes :c[A7] again, and this time it is the dominant of a new key: the melody begins again a fifth
lower, in :n[D] minor, with the same harmony transposed. A secondary dominant turned into a real one: that is
the simplest modulation of all.

```score caption="Korobeiniki IV: secondary dominants, then a modulation to :n[D] minor (from :t[bar] 9)." tempo="84"
\time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | a'4 e'8 f'8 g'4 f'8 e'8 | d'4 d'8 f'8 a'4 g'8 f'8 | e'4. f'8 g'4 a'4 | f'4 d'4 d'2 | r8 g'4 bb'8 d''4 c''8 bb'8 | a'4. f'8 a'4 g'8 f'8 | e'4 e'8 f'8 g'4 a'4 | f'4 d'4 d'2 | \staff bass e,2_"V7" <g# d'>2 | a,2_"i" e2 | e,2_"V7" <g# d'>2 | a,2_"i" <a, c# g>2_"V7/iv" | d2_"iv" <g, b, f>2_"V7/III" | <c g>1_"III" | <b, f>2_"iiø7" <e, g# d>2_"V7" | a,2_"i" <a, c# g>2_"d: V7" | a,2_"V7" <c# g>2 | d2_"i" a2 | a,2_"V7" <c# g>2 | d2_"i" <d f# c'>2_"V7/iv" | g,2_"iv" <c e bb>2_"V7/III" | <f, c>1_"III" | <e bb>2_"iiø7" <a, c# g>2_"V7" | <d, a,>1_"i" |
```

```perform
id: diminished-and-mediants/korobeiniki-4
title: Korobeiniki IV
prompt: 'Hands together, at your own pace: the melody in the right hand, the bass notes and chords in the left, two per :t[bar].'
mode: notes
range: [40, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | a'4 e'8 f'8 g'4 f'8 e'8 | d'4 d'8 f'8 a'4 g'8 f'8 | e'4. f'8 g'4 a'4 | f'4 d'4 d'2 | r8 g'4 bb'8 d''4 c''8 bb'8 | a'4. f'8 a'4 g'8 f'8 | e'4 e'8 f'8 g'4 a'4 | f'4 d'4 d'2 | \staff bass e,2 <g# d'>2 | a,2 e2 | e,2 <g# d'>2 | a,2 <a, c# g>2 | d2 <g, b, f>2 | <c g>1 | <b, f>2 <e, g# d>2 | a,2 <a, c# g>2 | a,2 <c# g>2 | d2 a2 | a,2 <c# g>2 | d2 <d f# c'>2 | g,2 <c e bb>2 | <f, c>1 | <e bb>2 <a, c# g>2 | <d, a,>1 |
hints:
  - 'Learn the left hand alone first, four :t[bar]s at a time. The second half is the first half moved down a fifth: the same shapes, starting on :n[A] instead of :n[E].'
```

:::key
- A **diminished seventh** divides the octave into minor thirds; there are only three, and each can resolve to four
  keys: **enharmonic modulation**.
- **Chromatic mediants** are major (or minor) chords a third apart sharing one note: a change of colour, not a
  functional progression.
- Chopin’s C minor Prelude packs secondary dominants, a Neapolitan, a French sixth and a chromatic lament bass into
  thirteen :t[bar]s.
- A secondary dominant can become a real dominant: the simplest way to modulate.
:::
