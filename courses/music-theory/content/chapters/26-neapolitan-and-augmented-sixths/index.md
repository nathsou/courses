---
number: 26
title: The Neapolitan and augmented sixths
summary: ♭II6 and the Italian, French and German sixths.
duration: 50 minutes
prerequisites: [mixture]
skills:
  - Chromatic predominants
---

:::check
```quiz
q: 'An augmented sixth chord in :n[C] minor has :n[Ab] in the bass and :n[F#] above it. Where do those two notes go?'
options:
  - text: 'Both to :n[G]: :n[Ab] down a semitone, :n[F#] up a semitone, an octave apart.'
    correct: true
  - text: 'Both to :n[F].'
    why: ':n[F#] is a raised note, a leading note to :n[G]; it does not fall back to :n[F].'
  - text: ':n[Ab] to :n[A] and :n[F#] to :n[F].'
    why: 'The augmented sixth expands outwards, each note moving a semitone away from the other.'
```
:::

## Chromatic predominants

Chapters 23 and 25 added chromatic notes to the dominant side and to the predominants of a key. This chapter adds
the two strongest chromatic predominants of all. Both approach V, and both are built so that as many notes as
possible move to it by a semitone. They are the sound of the dramatic cadence in Classical and Romantic music.

## The Neapolitan sixth

The **Neapolitan** is a major chord on the lowered second degree, ♭II: in :n[C] minor, :n[Db] :n[F] :n[Ab]. It
almost always appears in first inversion, with the fourth degree (:n[F]) in the bass, so it is written **N6** or
**♭II6**. Its function is predominant, exactly like iv or ii°6, which share its bass note: it replaces the :n[D] of
ii°6 with a :n[Db], a semitone above the tonic, and that :n[Db] falls to the :t[leading note] :n[B], a diminished
third down, as the music reaches V.

```score caption="i – N6 – V – i in :n[C] minor. The :n[Db] on top falls a diminished third to :n[B]." tempo="60"
\time 4/4 \key c \minor \staff treble <eb' g' eb''>4 <f' ab' db''>4 <d' g' b'>4 <eb' g' c''>4 | \staff bass c4_"i" f4_"N6" g,4_"V" c4_"i" |
```

In four voices, double the bass, :n[F]. The name comes from the composers of 18th-century Naples, Alessandro
Scarlatti among them, who used it often, though it is older than their operas. It is used in major keys too,
borrowed from minor (Chapter 25): in :n[C] major the Neapolitan is the same :c[Db/F].

```realise
id: neapolitan-and-augmented-sixths/n6
title: A Neapolitan sixth
prompt: 'i – N6 – V – i in :n[C] minor. Double the bass of the Neapolitan, and let its :n[Db] fall to :n[B].'
key: C minor
bass: 'c4 f g, c |'
numerals: [i, ♭II6, V, i]
example: ['C3 Eb4 G4 Eb5', 'F3 F4 Ab4 Db5', 'G2 D4 G4 B4', 'C3 Eb4 G4 C5']
hints:
  - 'N6 over :n[F3]: :n[F4] :n[Ab4] :n[Db5]. Then :n[Db5] to :n[B4], :n[Ab4] to :n[G4], :n[F4] to :n[D4].'
```

:::note[A stopping point]
The Neapolitan. Now the family of chords built on an augmented sixth.
:::

## Augmented sixth chords

Take the predominant iv6 in :n[C] minor (:n[Ab] in the bass, then :n[C] and :n[F]) and raise its :n[F] to :n[F#]. Now
the bass :n[Ab] and the :n[F#] are an **augmented sixth** apart, and they pull apart in both directions, a
semitone each, onto the octave :n[G]: the dominant. Chords built on that interval are **augmented sixth chords**.
They come in three national flavours, named (for no historical reason anyone can confirm) Italian, French and
German. All three have :n[Ab] in the bass, :n[C] and :n[F#] above it, and differ in the fourth note:

| Chord | Notes in :n[C] minor | Fourth note | Sound |
| --- | --- | --- | --- |
| **Italian sixth** (It+6) | :n[Ab] :n[C] :n[F#] | doubled :n[C] | spare |
| **French sixth** (Fr+6) | :n[Ab] :n[C] :n[D] :n[F#] | :n[D] | two tritones: a whole-tone colour |
| **German sixth** (Ger+6) | :n[Ab] :n[C] :n[Eb] :n[F#] | :n[Eb] | full, like a dominant seventh |

```score caption="The three augmented sixths in :n[C] minor, each resolving to V. The German sixth goes through the cadential six-four." tempo="60"
\time 4/4 \key c \minor \staff treble <eb' g' c''>4 <c' f#' c''>4 <d' g' b'>2 \bar "||" | <c' eb' g'>4 <c' d' f#'>4 <b d' g'>2 \bar "||" | <c' eb' g'>4 <c' eb' f#'>4 <c' eb' g'>4 <b d' g'>4 | <c' eb' g'>1 | \staff bass c4_"i" ab,4_"It+6" g,2_"V" | c4_"i" ab,4_"Fr+6" g,2_"V" | c4_"i" ab,4_"Ger+6" g,4_"i64" g,4_"V" | c1_"i" |
```

The German sixth has a problem of its own: moving straight to V, its :n[Eb] and :n[Ab] would fall to :n[D] and
:n[G] in parallel fifths. Composers usually avoid them by going through the cadential six-four, where the :n[Eb]
can stay put. (Mozart sometimes let the fifths happen, and the passing parallels are still called “Mozart fifths”.)

```ear
id: neapolitan-and-augmented-sixths/hear
title: Italian, French or German?
prompt: 'An augmented sixth in :n[C] minor, between i and V. Which one?'
kind: custom
options: [Italian, French, German]
items:
  - play: [C3 Eb4 G4 C5, Ab2 C4 F#4 C5, G2 D4 G4 B4]
    answer: Italian
  - play: [C3 C4 Eb4 G4, Ab2 C4 D4 F#4, G2 B3 D4 G4]
    answer: French
  - play: [C3 C4 Eb4 G4, Ab2 C4 Eb4 F#4, G2 C4 Eb4 G4, G2 B3 D4 G4]
    answer: German
rounds: 9
pass: 7
hints:
  - 'The German sixth sounds exactly like a dominant seventh chord. The French has a hollow, whole-tone sound. The Italian has only three different notes.'
```

```play
id: neapolitan-and-augmented-sixths/play-german
title: The German sixth and its resolution
prompt: 'Ger+6 – i64 – V – i in :n[C] minor, exactly these keys. Only the outer notes move at first: :n[Ab2] down to :n[G2], :n[F#4] up to :n[G4].'
key: C minor
range: [40, 72]
steps:
  - notes: [Ab2, C4, Eb4, F#4]
    label: Ger+6
  - notes: [G2, C4, Eb4, G4]
    label: i64
  - notes: [G2, B3, D4, G4]
    label: V
  - notes: [C3, C4, Eb4, G4]
    label: i
```

## The German sixth and the tritone substitution

Play the German sixth on its own: :n[Ab] :n[C] :n[Eb] :n[F#]. Respell the :n[F#] as :n[Gb] and it is :c[Ab7], a dominant
seventh chord. The ear cannot tell them apart; only the resolution differs. As :c[Ab7] it would resolve to :c[Db]; as a
German sixth it resolves to :c[G], a semitone below its root.

Jazz musicians know that second resolution well. :c[Ab7] going to :c[G] stands in for :c[D7] going to :c[G] (V7/V to V):
the two chords share their tritone (:n[C] and :n[F#]/:n[Gb]) and their roots are a tritone apart. That is the
**tritone substitution**, the commonest reharmonisation in jazz (Chapter 36). Classical and jazz harmony meet
here: the same chord, spelt two ways.

:::key
- The **Neapolitan sixth** (N6, ♭II6) is a major chord on the lowered second degree, in first inversion; its root
  falls a diminished third to the :t[leading note].
- **Augmented sixth chords** put ♭6 in the bass and ♯4 above it; both move a semitone outwards to the octave on 5.
- **Italian:** ♭6, 1, ♯4. **French:** adds 2. **German:** adds ♭3, usually resolving through the cadential six-four.
- The German sixth sounds like a dominant seventh: it is the classical twin of the **tritone substitution**.
:::
