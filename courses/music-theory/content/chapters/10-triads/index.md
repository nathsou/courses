---
number: 10
title: Triads
summary: Four kinds of triad, triads on every degree, Roman numerals and chord symbols.
duration: 50 minutes
prerequisites: [minor]
skills:
  - Playing triads
  - Hearing triad qualities
---

:::check
```play
id: triads/check-1
title: Four triads
prompt: 'Play :c[Eb], :c[F#m], :c[Bdim] and :c[Abaug], in any octave and any order of notes.'
range: [48, 84]
steps:
  - chord: Eb
  - chord: F#m
  - chord: Bdim
  - chord: Abaug
```
:::

## Stacking thirds

The chords in the prologue were built by playing a key, skipping one, playing one, skipping one, playing
one. In other words, by stacking two **thirds**. A three-note chord built that way is a **triad**, and it is
the basic chord of most Western music. Its notes are named from the bottom of the stack:

- the **root**, the note the triad is built on and named after;
- the **third**, a third above the root;
- the **fifth**, a fifth above the root.

Each third can be major (four semitones) or minor (three), so there are four kinds of triad:

| Triad | Lower third | Upper third | Root to fifth | On :n[C] | Symbol |
| --- | --- | --- | --- | --- | --- |
| **major** | major | minor | perfect fifth | :n[C] :n[E] :n[G] | :c[C] |
| **minor** | minor | major | perfect fifth | :n[C] :n[Eb] :n[G] | :c[Cm] |
| **diminished** | minor | minor | diminished fifth | :n[C] :n[Eb] :n[Gb] | :c[Cdim] (or C°) |
| **augmented** | major | major | augmented fifth | :n[C] :n[E] :n[G#] | :c[Caug] (or C+) |

Major and minor triads are consonant: every interval in them is a third, a fifth or (counting from the top
note down) a sixth or fourth. Diminished and augmented triads contain a dissonant fifth, and they sound
unstable, as if they need to move.

::chord-lab

Hold any three keys in the lab above: if they make a triad, the course names it. Try changing one note of
:c[C] at a time, :n[E] to :n[Eb], then :n[G] to :n[Gb], then back, and :n[G] to :n[G#], and listen to the
four kinds.

```ear
id: triads/major-minor
title: Major or minor?
prompt: 'A triad, played together. Major or minor?'
kind: quality
pool: [maj, min]
range: [52, 64]
rounds: 12
pass: 10
```

```ear
id: triads/four-kinds
title: All four
prompt: 'Major, minor, diminished or augmented? The last two are the odd ones: diminished sounds squeezed, augmented stretched.'
kind: quality
pool: [maj, min, dim, aug]
range: [52, 64]
rounds: 12
pass: 9
```

```spell
id: triads/write
title: Write triads
prompt: 'Root, third, fifth: one letter skipped between each. Then adjust the third and fifth to the right size.'
staff: treble
range: [55, 84]
items:
  - ask: 'A :n[D] major triad.'
    answer: [D4, F#4, A4]
  - ask: 'A :n[G] minor triad.'
    answer: [G4, Bb4, D5]
  - ask: 'A :n[C#] diminished triad.'
    answer: [C#5, E5, G5]
  - ask: 'An :n[F] augmented triad.'
    answer: [F4, A4, C#5]
  - ask: 'A :n[Bb] minor triad.'
    answer: [Bb4, Db5, F5]
```

:::note[A stopping point]
Four triads, built from thirds. The next session builds them from a scale.
:::

## Triads in a key

Build a triad on every note of a major scale, using only the scale’s notes. In :n[C] major: :c[C] (C E G),
:c[Dm] (D F A), :c[Em] (E G B), :c[F] (F A C), :c[G] (G B D), :c[Am] (A C E) and :c[Bdim] (B D F). The pattern
of qualities is the same in every major key:

**major, minor, minor, major, major, minor, diminished**

Musicians name these chords with **Roman numerals** by the degree of their root, upper case for major,
lower case for minor, with ° for diminished:

**I  ii  iii  IV  V  vi  vii°**

The numerals are what make the prologue’s loop portable. I – V – vi – IV is :c[C] :c[G] :c[Am] :c[F] in
:n[C] major and :c[D] :c[A] :c[Bm] :c[G] in :n[D] major: the same journey through the key.

```play
id: triads/c-major-degrees
title: The triads of C major
prompt: 'Play the triad on each degree of :n[C] major, from I to vii°, using only white keys.'
range: [48, 84]
steps:
  - chord: C
    label: I
  - chord: Dm
    label: ii
  - chord: Em
    label: iii
  - chord: F
    label: IV
  - chord: G
    label: V
  - chord: Am
    label: vi
  - chord: Bdim
    label: vii°
```

```play
id: triads/d-major-degrees
title: The same in D major
prompt: 'Now in :n[D] major: I, IV, V, vi. Remember the key’s :n[F#] and :n[C#].'
range: [48, 84]
key: D major
steps:
  - chord: D
    label: I
  - chord: G
    label: IV
  - chord: A
    label: V
  - chord: Bm
    label: vi
```

### Triads in a minor key

In a minor key the triads depend on which form of the scale is in use. With the harmonic minor’s raised
seventh (which is how chords in minor are usually built), :n[A] minor gives:

**i  ii°  III+  iv  V  VI  vii°**: :c[Am], :c[Bdim], :c[Caug], :c[Dm], :c[E], :c[F] and :c[G#dim].

Two of these are the reason harmonic minor exists. **V** is major (:c[E], with the :t[leading note] :n[G#]),
so it pulls to the tonic as strongly as V does in a major key, and **vii°** has the :t[leading note] too. In
practice, minor-key music usually takes the third chord from the natural minor (:c[C], III), because the
augmented III+ is rare.

::chord-lab{tonic="A" mode="minor"}

```quiz
q: 'In :n[G] major, which chord is vi?'
options:
  - text: ':c[Em]'
    correct: true
    why: 'The sixth degree of :n[G] major is :n[E]; the triad on it, :n[E] :n[G] :n[B], is minor.'
  - text: ':c[E]'
    why: 'Built from the notes of :n[G] major, the triad on :n[E] has :n[G], not :n[G#]: it is minor.'
  - text: ':c[D]'
    why: ':c[D] is V in :n[G] major.'
```

## Chord symbols

Pop and jazz musicians name chords by **chord symbol**: the root, then a suffix for anything other than
major. A plain letter is a major triad (:c[F]); m is minor (:c[Fm]); dim or ° diminished; aug or +
augmented. Chord symbols say what the chord *is*; Roman numerals say what it *does* in the key. You will use
both: symbols to play from a lead sheet, numerals to understand why the chords work.

```play
id: triads/symbols
title: From a lead sheet
prompt: 'Play these chords in order, as you would from a song sheet.'
range: [48, 84]
steps:
  - chord: G
  - chord: Em
  - chord: C
  - chord: D
```

That was I – vi – IV – V in :n[G] major, the loop of countless 1950s songs (Chapter 15 comes back to it).

:::key
- A **triad** is two stacked thirds: root, third and fifth.
- **Major** (M3 + m3), **minor** (m3 + M3), **diminished** (m3 + m3) and **augmented** (M3 + M3).
- In a major key the triads are **I ii iii IV V vi vii°**; in minor (with the harmonic minor’s :t[leading note])
  **i ii° III iv V VI vii°**.
- Roman numerals say what a chord does in the key; chord symbols say what it is.
:::
