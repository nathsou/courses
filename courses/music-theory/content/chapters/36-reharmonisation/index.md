---
number: 36
title: Reharmonisation
summary: Tritone substitution, the backdoor ii–V, passing diminished chords and Coltrane changes. Canon IV.
duration: 55 minutes
prerequisites: [improvising]
skills:
  - Reharmonisation
---

:::check
```quiz
q: 'What is the tritone substitute for :c[G7]?'
options:
  - text: ':c[Db7]: its root is a tritone from :n[G], and it shares the tritone of :c[G7], :n[B] and :n[F] (as :n[Cb] and :n[F]).'
    correct: true
  - text: ':c[C#m7].'
    why: 'A tritone substitute is a dominant seventh, like the chord it replaces; :c[C#m7] has neither :n[B] nor :n[F].'
  - text: ':c[D7].'
    why: ':c[D7] is a fifth above :n[G] (V7/V), not a tritone away.'
```
:::

## New chords under an old tune

To **reharmonise** is to change the chords under a melody while the melody stays the same. Every note of a tune
belongs to several chords (Chapter 17), and arrangers choose among them for colour, for a smoother bass line, or for
surprise. Jazz has a toolkit of standard substitutions, each grounded in something from earlier in the course.

## Tritone substitution

The tension of a dominant seventh lies in its tritone, the third and the seventh: in :c[G7], :n[B] and :n[F]. Another
dominant seventh has the same tritone, the one whose root is a tritone away: :c[Db7], whose third and seventh are :n[F]
and :n[Cb] (:n[B]). Swap one for the other and the resolution still works, and the bass now falls by a semitone:

**ii – V – I** :c[Dm7] :c[G7] :c[Cmaj7] becomes **ii – ♭II7 – I** :c[Dm7] :c[Db7] :c[Cmaj7].

This is the **tritone substitution**. Chapter 26 met the same chord in classical clothing: :n[Ab] :n[C] :n[Eb] :n[F#], the
German sixth in :n[C] minor, sounds exactly like :c[Ab7] and resolves to :c[G], a semitone below its root, just as :c[Ab7] would
as the tritone substitute for :c[D7].

```score caption="ii – V – I, then the same with a tritone substitute: the guide tones are unchanged, the bass falls by semitones." tempo="72"
\time 4/4 \staff treble <f' c''>2 <f' b'>2 | <e' b'>1 | <f' c''>2 <f' cb''>2 | <e' b'>1 | \staff bass d2_"Dm7" g,2_"G7" | c1_"Cmaj7" | d2_"Dm7" db2_"Db7" | c1_"Cmaj7" |
```

```ear
id: reharmonisation/hear-tritone
title: V7 or its substitute?
prompt: 'Two chords and a resolution to :c[C]. Is the dominant :c[G7] (bass falling a fifth) or the tritone substitute :c[Db7] (bass falling a semitone)?'
kind: custom
options: [G7 – C, Db7 – C]
items:
  - play: [D3 F3 C4, G2 F3 B3, C3 E3 B3]
    answer: G7 – C
  - play: [D3 F3 C4, Db3 F3 B3, C3 E3 B3]
    answer: Db7 – C
  - play: [D3 F3 A3 C4, G2 F3 A3 B3, C3 E3 G3 B3]
    answer: G7 – C
  - play: [D3 F3 A3 C4, Db3 F3 B3 Eb4, C3 E3 G3 B3]
    answer: Db7 – C
rounds: 8
pass: 7
hints:
  - 'Listen to the bass only. A fifth falling (:n[G] to :n[C]) sounds like a big step; a semitone (:n[Db] to :n[C]) sounds like sliding.'
```

## The backdoor ii – V

Another route home borrows from the parallel minor (Chapter 25): **iv7 – ♭VII7 – I**, in :n[C] :c[Fm7] – :c[Bb7] – :c[Cmaj7]. It
arrives at the tonic “through the back door”, with no :t[leading note] at all: the :c[Bb7] contains :n[Ab] falling to :n[G]
and :n[D] rising to :n[E], a softer, bluesier cadence.

## Passing diminished chords

A diminished seventh can slip between two chords a tone apart, with its bass on the semitone between:
**I – ♯I°7 – ii**, :c[Cmaj7] – :c[C#dim7] – :c[Dm7]. It works because :c[C#dim7] is vii°7/ii (Chapter 23), a rootless :c[A7b9] leading to
:c[Dm7]. Gospel and stride players fill every gap this way: ii – ♯ii°7 – iii, IV – ♯IV°7 – I/V.

```play
id: reharmonisation/play-three
title: Three substitutions in C
prompt: 'Any voicing: a tritone substitute, a backdoor ii – V, and a passing diminished chord, each resolving.'
range: [36, 84]
steps:
  - chord: Dm7
  - chord: Db7
  - chord: Cmaj7
  - chord: Fm7
  - chord: Bb7
  - chord: Cmaj7
  - chord: C#dim7
  - chord: Dm7
  - chord: G7
  - chord: Cmaj7
```

:::note[A stopping point]
Three standard substitutions. Then a famous, radical one, and Canon IV.
:::

## Coltrane changes

On “Giant Steps” (1959), John Coltrane built a tune on three keys a major third apart, :n[B], :n[G] and :n[Eb], which divide
the octave into three equal parts (the way the diminished seventh divides it into four), each key approached by its own
dominant. Applied to a ii – V – I in :n[C], the idea gives the **Coltrane substitution**: the music visits :n[Ab] and :n[E]
on its way, each through its V7, before the final V7 – I:

:c[Dm7] :c[Eb7] · :c[Abmaj7] :c[B7] · :c[Emaj7] :c[G7] · :c[Cmaj7]

::progression-player{chords="Dm7,Eb7,Abmaj7,B7,Emaj7,G7,Cmaj7,Cmaj7" tonics="C,F,Bb" patterns="block,charleston" tempo="104" title="The Coltrane substitution" subtitle="Tonics a major third apart (C, A♭, E), each reached through its own dominant seventh."}

## Canon IV: Pachelbel reharmonised

Pachelbel’s first violin line (Chapter 22) over its eight chords is the test piece. Keep the melody; change four of the
chords, each with a tool from this part of the course:

| Melody | Pachelbel | Canon IV | Why it fits |
| --- | --- | --- | --- |
| :n[F#] | :c[D] | :c[Dmaj7] | the same chord, with its seventh |
| :n[E] | :c[A] | :c[F#7] | V7/vi, leading to :c[Bm7]; :n[E] is its seventh |
| :n[D] | :c[Bm] | :c[Bm7] | the same chord, with its seventh |
| :n[C#] | :c[F#m] | :c[F#m7] | the same chord, with its seventh |
| :n[B] | :c[G] | :c[Gmaj7] | the same chord, with its seventh |
| :n[A] | :c[D] | :c[B7] | V7/ii, leading to :c[Em7]; :n[A] is its seventh |
| :n[B] | :c[G] | :c[Em7] | ii in place of IV: the same function, a predominant |
| :n[C#] | :c[A] | :c[Eb7] | the tritone substitute for :c[A7]; :n[C#] (:n[Db]) is its seventh |

```score caption="Canon IV: Pachelbel’s first violin line over a jazz reharmonisation." tempo="66"
\key d \major \time 4/4 \staff treble f#''4^"Dmaj7" e''4^"F#7" d''4^"Bm7" c#''4^"F#m7" | b'4^"Gmaj7" a'4^"B7" b'4^"Em7" c#''4^"Eb7" | d''1^"Dmaj7" | \staff bass <d c#'>4 <f# e'>4 <b, a>4 <f# e'>4 | <g, f#>4 <b, a>4 <e d'>4 <eb db'>4 | <d c#'>1 |
```

```perform
id: reharmonisation/canon-4
title: Play Canon IV
prompt: 'The melody in the right hand, and in the left hand the root and seventh of each chord. At your own pace.'
mode: notes
range: [38, 79]
score: |
  \key d \major \time 4/4 \staff treble f#''4 e''4 d''4 c#''4 | b'4 a'4 b'4 c#''4 | d''1 | \staff bass <d c#'>4 <f# e'>4 <b, a>4 <f# e'>4 | <g, f#>4 <b, a>4 <e d'>4 <eb db'>4 | <d c#'>1 |
```

:::key
- The **tritone substitution** replaces V7 with the dominant seventh a tritone away (:c[G7] → :c[Db7]); they share their tritone,
  and the bass falls by semitone. It is the German sixth’s jazz twin.
- The **backdoor ii – V**, iv7 – ♭VII7 – I, comes home through the parallel minor.
- **Passing diminished chords** (I – ♯I°7 – ii) fill a whole step in the bass.
- **Coltrane changes** move through keys a major third apart, each approached by its dominant.
:::
