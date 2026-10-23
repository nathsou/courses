---
number: 32
title: Piano voicings
summary: Shells, rootless voicings, drop 2, quartal voicings and upper structures.
duration: 55 minutes
prerequisites: [lead-sheets-and-extensions]
skills:
  - Jazz voicings
---

:::check
```quiz
q: 'Which two notes of :c[G7] are its guide tones?'
options:
  - text: ':n[B] and :n[F], the third and the seventh.'
    correct: true
  - text: ':n[G] and :n[D], the root and the fifth.'
    why: 'Root and fifth say nothing about the quality: they are the same in :c[G7], :c[Gmaj7] and :c[Gm7].'
  - text: ':n[A] and :n[E], the ninth and the thirteenth.'
    why: 'Those are extensions, colours added on top. The third and seventh define the chord.'
```
:::

## Voicing

A **voicing** is a particular arrangement of a chord’s notes: which ones, in which octaves, in which hand. Chapter 11
chose inversions to keep the hand still. Jazz pianists go further, and a handful of standard voicings cover most
of the repertoire. All of them rest on one idea from Chapter 31: the third and the seventh, the **guide tones**,
carry the chord.

## Shell voicings

A **shell** is the root with the guide tones: root, seventh and third (1–7–3) or root, third and seventh (1–3–7),
a wide, hollow chord in the left hand, leaving the right hand free for the melody. Alternating the two shapes makes
ii–V–I move by the smallest steps.

```score caption="Shells for ii – V – I in :n[C]: 1–7–3, 1–3–7, 1–7–3. The guide tones move by a semitone or not at all." tempo="66"
\time 4/4 \staff treble s1 | s1 | s1 | \staff bass <d c' f'>1_"Dm7" | <g, b f'>1_"G7" | <c b e'>1_"Cmaj7" |
```

Follow the guide tones: :n[C] falls to :n[B] and stays; :n[F] stays, then falls to :n[E]. That pair of lines, the
seventh of each chord falling to the third of the next, is the backbone of ii–V–I and of any circle-of-fifths
progression (Chapter 15).

```play
id: piano-voicings/shells
title: Shells, ii – V – I
prompt: 'Play the three shells with the left hand: exactly these keys.'
range: [36, 72]
steps:
  - notes: [D3, C4, F4]
    label: Dm7
  - notes: [G2, B3, F4]
    label: G7
  - notes: [C3, B3, E4]
    label: Cmaj7
```

## Rootless voicings

With a bass player, pianists usually leave the root out. A **rootless voicing** keeps the guide tones and adds
extensions: four notes in one hand, in two standard shapes, called **A** (3–5–7–9) and **B** (7–9–3–5, or with the
thirteenth in place of the fifth on a dominant). For ii–V–I, ii and I take one shape and V the other, so the hand
hardly moves: the voicings associated with Bill Evans and countless pianists after him.

```score caption="Rootless ii – V – I in :n[C]: :c[Dm9] (A form), :c[G13] (B form), :c[Cmaj9] (A form). The bass player supplies :n[D], :n[G], :n[C]." tempo="66"
\time 4/4 \staff treble s1 | s1 | s1 | \staff bass <f a c' e'>1_"Dm9" | <f a b e'>1_"G13" | <e g b d'>1_"Cmaj9" |
```

From :c[Dm9] to :c[G13] only one note moves, :n[C] down to :n[B]; from :c[G13] to :c[Cmaj9] every note moves down a step or
stays.

```play
id: piano-voicings/rootless
title: Rootless ii – V – I in three keys
prompt: 'Left hand, exactly these keys: :n[C], then :n[F], then :n[Bb] major.'
range: [48, 72]
steps:
  - notes: [F3, A3, C4, E4]
    label: Dm9
  - notes: [F3, A3, B3, E4]
    label: G13
  - notes: [E3, G3, B3, D4]
    label: Cmaj9
  - notes: [Bb3, D4, F4, A4]
    label: Gm9
  - notes: [Bb3, D4, E4, A4]
    label: C13
  - notes: [A3, C4, E4, G4]
    label: Fmaj9
  - notes: [Eb3, G3, Bb3, D4]
    label: Cm9
  - notes: [Eb3, G3, A3, D4]
    label: F13
  - notes: [D3, F3, A3, C4]
    label: Bbmaj9
hints:
  - 'In each key the pattern is the same: ii is 3–5–7–9 from its third; V keeps two notes and moves one; I steps down.'
```

:::note[A stopping point]
Shells and rootless voicings. Three more shapes: drop 2, fourths, and a triad on top.
:::

## Drop 2

Take a four-note chord in close position and drop its second-highest note an octave: the result is a **drop 2**
voicing, wider and more open, a favourite for chord melodies (the melody on top, the chord under it in the same
hand or split between the hands).

```score caption=":c[Cmaj7] in close position, then drop 2: the :n[G] falls an octave." tempo="60"
\time 2/4 \staff treble <c' e' g' b'>2 | <c' e' b'>2 | \staff bass s2_"close" | g2_"drop 2" |
```

## Quartal voicings

Chords built from fourths instead of thirds have no clear root and a modern, open sound. The most famous is the
**So What chord**, after Miles Davis’s “So What” (1959): three perfect fourths and a major third, :n[E] :n[A] :n[D] :n[G]
:n[B], over :n[D] Dorian (Chapter 34). Slide the whole shape along the scale and it stays modal, never quite a
dominant, never quite a tonic.

```score caption="The So What chord on :n[E], then the same shape a step lower." tempo="60"
\time 4/4 \staff treble <d' g' b'>2 <c' f' a'>2 | \staff bass <e a>2 <d g>2 |
```

## Upper structures

Over a dominant shell, the right hand can play a whole **triad** made of the extensions: an **upper structure**.
Over :c[C7] (left hand :n[C] :n[Bb] :n[E]), a :c[D] major triad in the right hand gives the ninth (:n[D]), the ♯11 (:n[F#]) and
the thirteenth (:n[A]): :c[C13], with a ♯11, in two easy shapes.

```score caption="An upper-structure triad: :c[D] major over a :c[C7] shell." tempo="60"
\time 4/4 \staff treble <d'' f#'' a''>1 | \staff bass <c bb e'>1_"C7" |
```

```play
id: piano-voicings/upper
title: Upper structures
prompt: 'Left hand: the :c[C7] shell :n[C3] :n[Bb3] :n[E4]. Right hand, over it: a :c[D] major triad, then an :c[A] major triad (13, ♭9, 3), then an :c[Eb] major triad (♯9, 5, ♭7).'
range: [43, 84]
steps:
  - notes: [C3, Bb3, E4, D5, F#5, A5]
    label: C13♯11
  - notes: [C3, Bb3, E4, A4, C#5, E5]
    label: C13♭9
  - notes: [C3, Bb3, E4, Eb5, G5, Bb5]
    label: C7♯9
```

:::key
- **Shells** (1–7–3 and 1–3–7) carry the guide tones; alternating them gives smooth ii–V–I.
- **Rootless voicings**, A (3–5–7–9) and B (7–9–3–13), leave the root to the bass; ii and I take one shape, V the other.
- **Drop 2** opens a close chord by dropping the second note from the top an octave.
- **Quartal voicings** stack fourths (the So What chord); **upper structures** put a triad of extensions over a shell.
:::
