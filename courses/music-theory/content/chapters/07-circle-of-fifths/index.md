---
number: 7
title: Keys and the circle of fifths
summary: Key signatures, the order of sharps and flats, and all twelve major scales.
duration: 45 minutes
prerequisites: [major-scale]
skills:
  - Key signatures
  - Major scales in all keys
---

:::check
```score caption="Which major key has this signature?" play="false"
\key ab \major \hidetime s1 |
```

```quiz
q: 'Which major key has four flats?'
options:
  - text: ':n[Ab] major'
    correct: true
    why: 'The flats are :n[Bb], :n[Eb], :n[Ab] and :n[Db]; the key is the second-last flat, :n[Ab].'
  - text: ':n[Db] major'
    why: ':n[Db] major has five flats.'
  - text: ':n[Eb] major'
    why: ':n[Eb] major has three flats.'
```

```play
id: circle-of-fifths/check-1
title: E major
prompt: 'Play the notes of :n[E] major, from the tonic up, in any octave.'
range: [48, 84]
steps:
  - notes: [E]
  - notes: [F#]
  - notes: [G#]
  - notes: [A]
  - notes: [B]
  - notes: [C#]
  - notes: [D#]
```
:::

## Key signatures

A piece in :n[D] major uses :n[F#] and :n[C#] all the time. Writing a sharp before every :n[F] and every
:n[C] would clutter the page, so the sharps are written once, at the start of every line, just after the
clef: the **key signature**. A sharp on the :n[F] line means *every* :n[F], in every octave, is :n[F#]
unless a natural says otherwise.

```score caption=":n[D] major: two sharps in the signature, none needed in the music." tempo="100"
\key d \major \time 4/4 d'4 e'4 f#'4 g'4 | a'4 b'4 c#''4 d''4 | c#''4 b'4 a'4 f#'4 | d'1 |
```

The signature tells you the key (or one of two keys: Chapter 9 adds the minor ones). And it is never a
random collection. Sharps and flats always appear in a fixed order:

- **Sharps:** :n[F#] :n[C#] :n[G#] :n[D#] :n[A#] :n[E#] :n[B#]
- **Flats:** :n[Bb] :n[Eb] :n[Ab] :n[Db] :n[Gb] :n[Cb] :n[Fb], the same letters backwards.

A key with three sharps always has the first three, :n[F#] :n[C#] :n[G#], never any other three.
Two quick ways to read a signature:

- **Sharps:** the tonic is a semitone above the last sharp. Last sharp :n[G#], so the key is :n[A] major.
- **Flats:** the tonic is the second-last flat. Flats :n[Bb] :n[Eb] :n[Ab], so the key is :n[Eb] major.
  (One flat is the exception to learn: :n[F] major.)

```score caption="Signatures from one to four sharps, then one to four flats." play="false"
\key g \major \hidetime s1 |
```

```score play="false" label="Two sharps"
\key d \major \hidetime s1 |
```

```score play="false" label="Three sharps"
\key a \major \hidetime s1 |
```

```score play="false" label="Two flats"
\key bb \major \hidetime s1 |
```

## The circle

Build major scales one after another, each starting on the fifth note of the last: :n[C], then :n[G], then
:n[D], then :n[A]… Each new scale needs exactly **one more sharp** than the last, and the new sharp is always
its :t[leading note] (degree 7): :n[G] major adds :n[F#], :n[D] major adds :n[C#]. Going the other way, down
a fifth each time (:n[C], :n[F], :n[Bb], :n[Eb]…), each new scale adds **one flat**, on its fourth degree.

Twelve fifths later you are back where you started (on the piano, at least), and the keys arrange
themselves in a circle.

::circle-of-fifths{minor=false}

The circle explains why some keys sound related: keys next to each other share six of their seven notes.
It is the map of every key relationship in this course, from the chords of a key (Chapter 10) to
modulation (Chapter 24), and pianists use it as a practice order: one more sharp each day.

:::note[Why fifths?]
A **fifth** is the distance from a note to the fifth note of its scale: seven semitones, :n[C] up to :n[G].
After the octave it is the simplest relationship between two notes (their frequencies are in the ratio 3:2),
which is why so much of harmony moves by fifths. Chapter 8 names all the intervals.
:::

```quiz
q: 'You are in :n[A] major (three sharps) and move one step clockwise round the circle. Which key, and how many sharps?'
options:
  - text: ':n[E] major, four sharps'
    correct: true
    why: ':n[E] is a fifth above :n[A]. Its new sharp is :n[D#], its :t[leading note].'
  - text: ':n[D] major, two sharps'
    why: 'That is one step anticlockwise.'
  - text: ':n[B] major, five sharps'
    why: 'That is two steps clockwise.'
```

:::note[A stopping point]
Reading signatures and the circle are the core. The last session is practice: all twelve major scales.
:::

## All twelve major scales

At the bottom of the circle, three keys can each be spelt two ways. :n[F#] major (six sharps) and :n[Gb]
major (six flats) are the same keys on the piano; so are :n[B] (five sharps) and :n[Cb] (seven flats), and
:n[Db] (five flats) and :n[C#] (seven sharps). These **enharmonic keys** are why the circle closes on the
keyboard: twelve different keys, fifteen signatures.

::scale-explorer{tonic="E" tonics="C,G,D,A,E,B,F#,Db,Ab,Eb,Bb,F" signature}

Practise the scales round the circle, a few a day. For fingering, they fall into groups:

- **:n[C], :n[G], :n[D], :n[A], :n[E]**: the fingering of Chapter 6 (right hand 1 2 3, 1 2 3 4 5).
- **:n[F]**: right hand 1 2 3 4, 1 2 3 4, with 4 on :n[Bb]; left hand as :n[C].
- **:n[B]**: right hand as :n[C]; left hand starts with 4 (4 3 2 1, 4 3 2 1).
- **The black-key scales** (:n[Db], :n[Gb], :n[Ab], :n[Eb], :n[Bb]): the thumbs play only white keys, and
  fingers 4 fall on the same black key every octave.

Appendix B lists every fingering. Learn them by group, not one by one.

```play
id: circle-of-fifths/a-major
title: A major
prompt: 'Play the notes of :n[A] major, from the tonic, in any octave. Three sharps: :n[F#], :n[C#] and :n[G#].'
range: [48, 84]
steps:
  - notes: [A]
  - notes: [B]
  - notes: [C#]
  - notes: [D]
  - notes: [E]
  - notes: [F#]
  - notes: [G#]
```

```perform
id: circle-of-fifths/eb-major
title: E♭ major, in time
prompt: 'Right hand, one octave up and down. Fingering: 3 on :n[Eb4], then 1 2 3 on :n[F4] :n[G4] :n[Ab4], 4 on :n[Bb4], 1 2 3 on :n[C5] :n[D5] :n[Eb5]. Finger 4 always lands on :n[Bb].'
mode: both
tempo: 66
range: [55, 84]
score: |
  \time 4/4 \key eb \major eb'4 f'4 g'4 ab'4 | bb'4 c''4 d''4 eb''4 | d''4 c''4 bb'4 ab'4 | g'4 f'4 eb'2 |
```

```spell
id: circle-of-fifths/write
title: Write the scales
prompt: 'Write each major scale; the key signature is not shown, so every sharp or flat counts.'
staff: treble
range: [55, 84]
items:
  - ask: ':n[B] major (five sharps).'
    answer: [B4, C#5, D#5, E5, F#5, G#5, A#5]
  - ask: ':n[Ab] major (four flats).'
    answer: [Ab4, Bb4, C5, Db5, Eb5, F5, G5]
  - ask: ':n[Gb] major (six flats).'
    answer: [Gb4, Ab4, Bb4, Cb5, Db5, Eb5, F5]
hints:
  - ':n[Gb] major has a :n[Cb]: one letter per degree means the fourth note, a semitone above :n[Bb], is a kind of C. Play the key that is usually called :n[B], then use ⇄.'
```

:::key
- A **key signature** puts the key’s sharps or flats at the start of each line; they apply to every octave.
- Sharps come in the order F C G D A E B, flats in B E A D G C F. For sharps, the tonic is a semitone above
  the last; for flats, it is the second-last (one flat is :n[F] major).
- On the **circle of fifths**, each step clockwise adds a sharp (the new :t[leading note]), each step
  anticlockwise a flat. Neighbouring keys share six notes.
- Three keys have two spellings (**enharmonic keys**): :n[B]/:n[Cb], :n[F#]/:n[Gb], :n[C#]/:n[Db].
:::
