---
number: 31
title: Lead sheets and extensions
summary: Chord symbols in full, ninths, elevenths and thirteenths, and what a pianist leaves out.
duration: 50 minutes
prerequisites: [fugue]
skills:
  - Chord symbols
  - Extensions
---

:::check
```quiz
q: 'Which notes are in :c[G13], as written in full?'
options:
  - text: ':n[G] :n[B] :n[D] :n[F] :n[A] :n[E]: the seventh chord with the ninth and the thirteenth (the eleventh left out).'
    correct: true
  - text: ':n[G] :n[B] :n[D] :n[E]: a :c[G6] chord.'
    why: ':c[G6] has no seventh. A 13 in a chord symbol implies the seventh (:n[F]) and usually the ninth (:n[A]) as well.'
  - text: ':n[G] :n[B] :n[D] :n[F] :n[A] :n[C] :n[E]: every note of the scale.'
    why: 'The eleventh, :n[C], is left out of a dominant thirteenth: it would clash with the third, :n[B].'
```
:::

## The lead sheet, in full

Chapter 17 introduced the **lead sheet**: a melody with chord symbols, the rest left to the player. Jazz and pop
musicians read whole repertoires from them, and their chord symbols say a good deal more than the triads and
sevenths of Part II. Here is the vocabulary, all on :n[C]:

| Symbol | Also written | Notes | Name |
| --- | --- | --- | --- |
| :c[C] | | :n[C] :n[E] :n[G] | major triad |
| :c[Cm] | C–, Cmin | :n[C] :n[Eb] :n[G] | minor triad |
| :c[C6] | | :n[C] :n[E] :n[G] :n[A] | major sixth |
| :c[Cm6] | C–6 | :n[C] :n[Eb] :n[G] :n[A] | minor sixth |
| :c[Cmaj7] | CΔ, CM7 | :n[C] :n[E] :n[G] :n[B] | major seventh |
| :c[C7] | | :n[C] :n[E] :n[G] :n[Bb] | dominant seventh |
| :c[Cm7] | C–7 | :n[C] :n[Eb] :n[G] :n[Bb] | minor seventh |
| :c[Cm7b5] | Cø | :n[C] :n[Eb] :n[Gb] :n[Bb] | half-diminished |
| :c[Cdim7] | C°7 | :n[C] :n[Eb] :n[Gb] :n[Bbb] | diminished seventh |
| :c[Csus4] | Csus | :n[C] :n[F] :n[G] | suspended fourth |
| :c[C7sus4] | | :n[C] :n[F] :n[G] :n[Bb] | dominant seventh, suspended |
| :c[Cadd9] | | :n[C] :n[E] :n[G] :n[D] | added ninth (no seventh) |

A number alone means a dominant chord (:c[C7], :c[C9], :c[C13]); *maj* refers only to the seventh (:c[Cmaj7], :c[Cmaj9]:
a major seventh, whatever else is added); *m* refers to the third. A slash names the bass: :c[C/E] is :c[C] with :n[E] at the
bottom (Chapter 11).

```ear
id: lead-sheets-and-extensions/hear-qualities
title: Five four-note chords
prompt: 'Name the chord quality.'
kind: quality
pool: [maj7, '7', m7, m7b5, '6']
rounds: 10
pass: 8
hints:
  - 'Listen to the top: a major seventh rubs a semitone below the octave; a dominant seventh leans down; a sixth sounds sweet and settled.'
```

## Extensions

Keep stacking thirds above a seventh chord and you reach the **extensions**: the **ninth** (the second, an octave
up), the **eleventh** (the fourth) and the **thirteenth** (the sixth). On :c[G7]: :n[A] is the ninth, :n[C] the eleventh,
:n[E] the thirteenth. Seven stacked thirds use every note of the scale, so the thirteenth is as far as stacking goes.

```score caption="Stacking thirds on :n[G]: the triad, the seventh, the ninth and the eleventh, then the thirteenth, written without the eleventh." tempo="60" play="true"
\time 4/4 \staff treble <b d'>4 <b d' f'>4 <b d' f' a'>4 <b d' f' a' c''>4 | <b d' f' a' e''>1 | \staff bass g,4_"G" g,4_"G7" g,4_"G9" g,4_"G11" | g,1_"G13, no 11th" |
```

The extensions change the colour of a chord without changing its job. A :c[G9] or :c[G13] is still V, a :c[Dm9] still ii,
a :c[Cmaj9] still I. The symbols you will meet most:

- **Major:** :c[Cmaj7], :c[C6], :c[Cmaj9], :c[Cmaj7#11] (the raised eleventh, :n[F#], instead of the clashing :n[F]).
- **Minor:** :c[Cm7], :c[Cm9], :c[Cm11], :c[Cm6].
- **Dominant:** :c[C7], :c[C9], :c[C13], :c[C7sus4], and the **altered** dominants, with ♭9, ♯9, ♯11 or ♭13:
  :c[C7b9], :c[C7#9], :c[C7#11]. The symbol “7alt” (C7alt) leaves the choice of alterations to the player.

Alterations are dominant-only colours. They add tension that resolves: the ♭9 of :c[G7b9] (:n[Ab]) falls a semitone
to the fifth of :c[C]; the ♯9 (:n[A#]/:n[Bb]) is the bluesy “Hendrix chord” sound, :c[E7#9] in his hands.

```play
id: lead-sheets-and-extensions/play-extended
title: Play the symbol
prompt: 'Play every note of each chord, in any voicing: two hands are allowed.'
range: [36, 84]
steps:
  - chord: Cmaj9
  - chord: Dm9
  - chord: G9
  - chord: G7b9
  - chord: Cm6
  - chord: F7#11
```

:::note[A stopping point]
Chord symbols and extensions. The last section is what to leave out.
:::

## What a pianist leaves out

A :c[G13] written out has six notes, and a pianist in a band rarely plays them all. The choice follows from what each
note does:

- **The third and the seventh** define the chord: major or minor, dominant or major seventh. Keep them. They are
  the **guide tones**, and Chapter 32 builds voicings on them.
- **The root** belongs to the bass player. With a bassist, pianists often leave it out (rootless voicings,
  Chapter 32); playing alone, the left hand keeps it.
- **The fifth** adds little unless it is altered (♭5, ♯5). Leave it out first.
- **The eleventh** clashes with a major third a ninth below it; over a major or dominant chord it is either raised
  (♯11) or omitted. Over a minor chord it is lovely.
- **The extensions** are the colour. Choose one or two, and keep them near the top of the voicing.

So :c[G13], played with a bassist, can be just :n[F] :n[B] :n[E]: the seventh, the third and the thirteenth, three notes
in one hand.

```score caption="Three ways to play :c[G13] at the keyboard: in full (minus the eleventh), with the root in the left hand and three notes in the right, and rootless (seventh, third, thirteenth)." tempo="60"
\time 3/4 \staff treble <b d' f' a' e''>2. | <f' a' b' e''>2. | <f' b' e''>2. | \staff bass g,2._"full" | g,2._"root + 7 9 3 13" | s2._"rootless" |
```

:::key
- Chord symbols: a number alone means a **dominant** chord; *maj* refers to the seventh; *m* to the third; a slash
  names the bass.
- **Extensions** (9, 11, 13) stack thirds above the seventh; they colour a chord without changing its function.
- **Alterations** (♭9, ♯9, ♯11, ♭13) belong to dominant chords.
- At the piano keep the **third and seventh**, add an extension or two, and drop the fifth (and the root, with a bassist).
:::
