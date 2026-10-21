---
number: 13
title: Function and cadence
summary: Tonic, predominant and dominant, and the cadences that end phrases.
duration: 45 minutes
prerequisites: [triads, inversions]
skills:
  - Chord function
  - Hearing cadences
---

:::check
```ear
id: function-and-cadence/check-1
title: Which cadence?
prompt: 'A short phrase in :n[C] major. How does it end?'
kind: custom
options: [Perfect (V–I), Imperfect (ends on V), Plagal (IV–I), Interrupted (V–vi)]
items:
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, G2 B3 D4 G4, C3 C4 E4 G4]
    answer: Perfect (V–I)
  - play: [C3 C4 E4 G4, A2 C4 E4 A4, F2 C4 F4 A4, G2 B3 D4 G4]
    answer: Imperfect (ends on V)
  - play: [C3 C4 E4 G4, G2 B3 D4 G4, F2 C4 F4 A4, C3 C4 E4 G4]
    answer: Plagal (IV–I)
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, G2 B3 D4 G4, A2 A3 C4 E4]
    answer: Interrupted (V–vi)
rounds: 8
pass: 7
```
:::

## What chords do

Chapter 10 named seven chords in every key. They are not seven equals. Play :c[C], then :c[G], then :c[C]
again: the :c[G] chord pulls back towards :c[C] as surely as the :t[leading note] pulls up to the tonic. Play
:c[C], then :c[F], then :c[G]: the :c[F] seems to set out from home, the :c[G] to arrive somewhere urgent. Chords
have jobs. Musicians call those jobs **functions**, and in common practice there are three.

- **Tonic (T):** home, rest, arrival. Chord **I**, and its close relatives **vi** (and less often **iii**),
  which share two of its notes.
- **Dominant (D):** tension that wants to resolve to the tonic. Chord **V**, and **vii°**. Both contain the
  :t[leading note] (degree 7), a semitone below the tonic, and degree 4, which leans down to degree 3.
- **Predominant (PD):** the chords that lead to the dominant, setting up the tension before it arrives.
  Chords **IV** and **ii**, both built on notes a step or so away from the dominant.

The course colours them consistently: tonic blue, predominant green, dominant orange.

::progression-player{romans="I,IV,V,I" tonics="C,G,F,D" patterns="block,pulse,broken" title="Home, away, tension, home"}

## The phrase

Those three functions combine into the most common shape in tonal music:

**T → PD → D → T**

Start at home, move away, build tension, resolve. I – IV – V – I is the plainest version; I – ii – V – I,
I – vi – IV – V – I and I – vi – ii – V – I are others, and you will find them under hymns, Classical sonatas,
pop songs and jazz standards. The order matters more than the particular chords: PD goes to D, D goes to T,
and going backwards (V to IV, say) sounds like a deliberate effect, not the normal flow.

::progression-player{romans="I,vi,ii,V,I" tonics="C,G,F,Bb" patterns="block,broken,alberti" title="T, T, PD, D, T"}

```analyse
id: function-and-cadence/analyse-1
title: Name the chords
prompt: 'A phrase written for the course, in :n[G] major. Write the Roman numeral of each chord.'
key: G major
score: |
  \key g \major \time 4/4 \staff treble <b d' g'>2 <c' e' g'>2 | <a d' f#'>2 <b d' g'>2 | \staff bass g,2 c2 | d2 g,2 |
answers: [I, IV, V, I]
hints:
  - 'Look at the bass: :n[G], :n[C], :n[D], :n[G]. In :n[G] major those are degrees 1, 4, 5 and 1.'
```

```play
id: function-and-cadence/t-pd-d-t
title: T – PD – D – T in three keys
prompt: 'Play I – IV – V – I in :n[G] major, then in :n[F] major. Any voicing; smooth voicings are best.'
range: [43, 79]
steps:
  - chord: G
    label: 'G: I'
  - chord: C
    label: IV
  - chord: D
    label: V
  - chord: G
    label: I
  - chord: F
    label: 'F: I'
  - chord: Bb
    label: IV
  - chord: C
    label: V
  - chord: F
    label: I
```

:::note[A stopping point]
Three functions and one shape. The rest of the chapter is about endings.
:::

## Cadences

Music is divided into **phrases**, like sentences, and the chords at the end of a phrase are its
**cadence**, its punctuation. Four cadences are worth knowing by name:

| Cadence | Chords | Effect | American name |
| --- | --- | --- | --- |
| **perfect** | V → I | a full stop | authentic |
| **imperfect** | (anything) → V | a comma, a question | half |
| **plagal** | IV → I | a gentle close, the “Amen” | plagal |
| **interrupted** | V → vi | a surprise: the ending is postponed | deceptive |

A perfect cadence is strongest with both chords in root position and the tonic in the top voice. The
interrupted cadence works because vi shares two notes with I: the ear expects home and gets a room next to
it, and the music has to go round again to finish properly.

```score caption="The four cadences in :n[C] major: perfect, imperfect, plagal, interrupted." tempo="60"
\time 4/4 \staff treble <b d' g'>2 <c' e' g'>2 \bar "||" | <c' e' g'>2 <b d' g'>2 \bar "||" | <c' f' a'>2 <c' e' g'>2 \bar "||" | <b d' g'>2 <a c' e'>2 | \staff bass g,2_"V" c2_"I" | c2_"I" g,2_"V" | f,2_"IV" c2_"I" | g,2_"V" a,2_"vi" |
```

```ear
id: function-and-cadence/cadences
title: Hear the cadence
prompt: 'Each phrase is four chords in :n[C] major. Name the cadence at the end.'
kind: custom
options: [Perfect (V–I), Imperfect (ends on V), Plagal (IV–I), Interrupted (V–vi)]
items:
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, G2 B3 D4 G4, C3 C4 E4 G4]
    answer: Perfect (V–I)
  - play: [C3 E4 G4 C5, D3 D4 F4 A4, G2 D4 G4 B4, C3 E4 G4 C5]
    answer: Perfect (V–I)
  - play: [C3 C4 E4 G4, A2 C4 E4 A4, F2 C4 F4 A4, G2 B3 D4 G4]
    answer: Imperfect (ends on V)
  - play: [C3 E4 G4 C5, F2 F4 A4 C5, D3 F4 A4 D5, G2 D4 G4 B4]
    answer: Imperfect (ends on V)
  - play: [C3 C4 E4 G4, G2 B3 D4 G4, F2 C4 F4 A4, C3 C4 E4 G4]
    answer: Plagal (IV–I)
  - play: [C3 E4 G4 C5, A2 E4 A4 C5, F2 F4 A4 C5, C3 E4 G4 C5]
    answer: Plagal (IV–I)
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, G2 B3 D4 G4, A2 A3 C4 E4]
    answer: Interrupted (V–vi)
  - play: [C3 E4 G4 C5, D3 D4 F4 A4, G2 D4 G4 B4, A2 C4 E4 C5]
    answer: Interrupted (V–vi)
rounds: 10
pass: 8
hints:
  - 'Listen to the last chord first. If it sounds like home, the cadence is perfect or plagal; listen then to the chord before it. If it sounds unfinished, it is imperfect (on V, wanting more) or interrupted (a minor chord where home should be).'
```

```perform
id: function-and-cadence/perfect-cadence
title: A perfect cadence, in time
prompt: 'ii – V – I in :n[C] major, with the left hand on the roots. Two beats per chord, then hold the tonic.'
mode: both
tempo: 72
range: [40, 76]
score: |
  \time 4/4 \staff treble <d' f' a'>2 <d' g' b'>2 | <e' g' c''>1 | \staff bass d2 g,2 | c1 |
hints:
  - 'From :c[Dm] (:n[D4] :n[F4] :n[A4]) to :c[G]: :n[D4] stays, :n[F4] steps to :n[G4], :n[A4] to :n[B4]. Then :n[D4] rises to :n[E4], :n[G4] stays and :n[B4] rises to :n[C5]: the :t[leading note] goes home.'
```

:::key
- Chords have three **functions**: **tonic** (I, vi, iii) is rest, **predominant** (IV, ii) leads away,
  **dominant** (V, vii°) builds tension that resolves to the tonic.
- The basic phrase is **T → PD → D → T**.
- **Cadences** end phrases: **perfect** (V–I), **imperfect** (ending on V), **plagal** (IV–I) and
  **interrupted** (V–vi).
:::
