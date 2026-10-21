---
number: 25
title: Mixture
summary: Chords borrowed from the parallel minor, the Picardy third and modal interchange.
duration: 45 minutes
prerequisites: [modulation]
skills:
  - Modal mixture
---

:::check
```quiz
q: 'In :n[C] major, which of these chords is borrowed from :n[C] minor?'
options:
  - text: ':c[Fm] (:n[F] :n[Ab] :n[C]), the minor iv.'
    correct: true
  - text: ':c[Dm], ii.'
    why: ':c[Dm] belongs to :n[C] major already: all its notes are in the scale.'
  - text: ':c[D] major, V/V.'
    why: ':c[D] major is a secondary dominant (Chapter 23). Its :n[F#] comes from :n[G] major, not from :n[C] minor.'
```
:::

## Major and minor, mixed

Chapter 9 introduced **parallel keys**: :n[C] major and :n[C] minor share a tonic and differ in three notes, the
third, sixth and seventh degrees (:n[E]/:n[Eb], :n[A]/:n[Ab], :n[B]/:n[Bb]). A piece in :n[C] major can borrow chords
from :n[C] minor without leaving :n[C]: the tonic stays the same, only the colour changes. This is **mixture** (or
**modal mixture**, or **borrowing**), and its sound is unmistakable: a shadow passing over a major key.

The borrowed chords most often met in a major key:

| Chord | In :n[C] | Borrowed note | Typical use |
| --- | --- | --- | --- |
| iv | :c[Fm] | :n[Ab] | predominant; IV – iv – I, the “minor plagal” cadence |
| ii° or iiø7 | :c[Ddim], :c[Dm7b5] | :n[Ab] | predominant before V |
| ♭VI | :c[Ab] | :n[Ab], :n[Eb] | after I or V; ♭VI – ♭VII – I |
| ♭VII | :c[Bb] | :n[Bb] | before I, in place of V |
| ♭III | :c[Eb] | :n[Eb], :n[Bb] | a bright, distant colour, common in rock |

Notice that the borrowed **sixth degree**, :n[Ab], does most of the work: it leans down to :n[G], the fifth of the
tonic chord and the root of V, more strongly than :n[A] does.

```score caption="Borrowed chords in :n[C] major: IV – iv – I (the minor plagal cadence), then ♭VI – ♭VII – I." tempo="66"
\time 4/4 \staff treble <c' f' a'>2 <c' f' ab'>2 | <c' e' g'>1 | <c' eb' ab'>2 <bb d' f'>2 | <g c' e'>1 | \staff bass f2_"IV" f2_"iv" | c1_"I" | ab,2_"♭VI" bb,2_"♭VII" | c1_"I" |
```

::progression-player{romans="I,IV,iv,I" tonics="C,G,F,D,Bb" patterns="block,broken" title="IV – iv – I" subtitle="One note changes: the third of IV falls a semitone, and the major key darkens for a moment."}

```ear
id: mixture/hear
title: Major or borrowed?
prompt: 'A cadence in :n[C] major. Is the chord before the last one IV (major) or iv (borrowed from minor)?'
kind: custom
options: [IV – I, iv – I]
items:
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, C3 E4 G4 C5]
    answer: IV – I
  - play: [C3 E4 G4 C5, F3 F4 Ab4 C5, C3 E4 G4 C5]
    answer: iv – I
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, C3 C4 E4 G4]
    answer: IV – I
  - play: [C3 C4 E4 G4, F2 C4 F4 Ab4, C3 C4 E4 G4]
    answer: iv – I
rounds: 8
pass: 7
```

```realise
id: mixture/realise
title: A borrowed predominant
prompt: 'I – iv – V7 – I in :n[C] major. Let the borrowed :n[Ab] fall to :n[G].'
key: C major
bass: 'c4 f g, c |'
numerals: [I, iv, V7, I]
example: ['C3 E4 G4 C5', 'F3 F4 Ab4 C5', 'G2 F4 G4 B4', 'C3 E4 G4 C5']
hints:
  - 'Over :n[F3]: :n[F4] :n[Ab4] :n[C5]. Then :n[Ab4] falls to :n[G4], :n[C5] to :n[B4], and :n[F4] stays as the seventh of V7.'
```

:::note[A stopping point]
Borrowing in a major key. Now the reverse: a major chord at the end of a minor piece.
:::

## The Picardy third

A piece in a minor key may end on a **major** tonic chord: the third is raised at the last moment, and the final
chord glows. This is the **Picardy third** (*tierce de Picardie*). It was so common in the Renaissance and Baroque
that a final minor chord was almost unusual: many of Bach’s minor-key chorales and preludes end this way. Nobody
knows for certain why it is named after Picardy, in northern France.

```realise
id: mixture/picardy
title: End with a Picardy third
prompt: 'i – iv – V – I in :n[A] minor: the last chord is :c[A] major, with :n[C#].'
key: A minor
bass: 'a,4 d e a, |'
numerals: [i, iv, V, I]
example: ['A2 A4 C5 E5', 'D3 A4 D5 F5', 'E3 G#4 B4 E5', 'A2 A4 C#5 E5']
hints:
  - 'V in :n[A] minor is :c[E] major, with :n[G#] (the raised :t[leading note]); I is :c[A] major, with :n[C#].'
```

## Modal interchange in pop

Pop and rock borrow constantly, and call it **modal interchange**: chords taken from a parallel mode (Chapter 34
meets the modes). A few borrowings have become clichés of their own:

- **♭VII – I**, the “Mixolydian cadence”: :c[Bb] to :c[C] in place of :c[G] to :c[C], with no :t[leading note] at all.
  It sounds open and unhurried, and it is everywhere in rock.
- **♭VI – ♭VII – I**: :c[Ab] :c[Bb] :c[C], a rising triumphant approach, famous from the fanfares of video games
  and film.
- **I – III – IV – iv**: Radiohead’s “Creep” (1992) loops :c[G] :c[B] :c[C] :c[Cm]: a chromatic major III and a
  borrowed iv in four chords.

::progression-player{romans="I,♭VI,♭VII,I" tonics="C,D,E,G" patterns="block,pulse,broken" tempo="96" title="♭VI – ♭VII – I" subtitle="Two chords borrowed from the parallel minor, rising to a major tonic."}

```play
id: mixture/play
title: Borrowed chords in G major
prompt: 'In :n[G] major: I, then iv, ♭VI and ♭VII, each followed by I.'
key: G major
range: [43, 79]
steps:
  - chord: G
    label: I
  - chord: Cm
    label: iv
  - chord: G
    label: I
  - chord: Eb
    label: ♭VI
  - chord: F
    label: ♭VII
  - chord: G
    label: I
```

:::key
- **Mixture** borrows chords from the parallel key without changing the tonic: in major, chiefly iv, ii°, ♭VI, ♭VII
  and ♭III.
- The borrowed sixth degree (:n[Ab] in :n[C]) leans down to the fifth: IV – iv – I, ♭VI – V.
- The **Picardy third** ends a minor piece on a major tonic.
- Pop calls it **modal interchange**: ♭VII – I, ♭VI – ♭VII – I, I – III – IV – iv.
:::
