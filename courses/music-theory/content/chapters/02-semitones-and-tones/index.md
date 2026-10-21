---
number: 2
title: Semitones, tones and the black keys
summary: Half and whole steps, sharps and flats, and why some white keys have no black key between them.
duration: 30 minutes
prerequisites: [high-and-low]
skills:
  - Semitones and tones
  - Naming black keys
---

:::check
```play
id: semitones-and-tones/check-1
title: Steps and names
prompt: 'Play :n[F#4], then :n[Bb3], then the note a semitone above :n[E4], then the note a tone below :n[C4].'
range: [48, 72]
steps:
  - notes: [F#4]
  - notes: [Bb3]
  - notes: [F4]
  - notes: [Bb3]
```
:::

## The smallest step

Play any key, then the key immediately to its right, black or white, whichever is nearest. That is the
smallest step on the keyboard: a **semitone** (in American usage, a :t[semitone] is a *half step*). Every
key is one semitone from each of its neighbours, so twelve semitones take you from one :n[C] to the next.

Two semitones make a **tone** (a *whole step*). From :n[C] to :n[D] is a tone, because the black key
between them is one semitone from each.

::step-counter

Now look at :n[E] and :n[F], and at :n[B] and :n[C]. There is no black key between them. They are
neighbours, so each of those pairs is only a **semitone** apart, even though both notes are white. The
other neighbouring white keys (:n[C]–:n[D], :n[D]–:n[E], :n[F]–:n[G], :n[G]–:n[A], :n[A]–:n[B]) are a
tone apart, with a black key in between. That pattern of tones and semitones between the white keys is
not an accident of design; it *is* the major scale, and Chapter 6 shows where it comes from.

```ear
id: semitones-and-tones/semitone-or-tone
title: Semitone or tone?
prompt: 'Two notes, one after the other. Are they a semitone apart, or a tone?'
kind: interval
pool: [m2, M2]
range: [55, 72]
rounds: 10
pass: 8
hints:
  - 'A semitone is the tightest step there is: the two notes almost rub. A tone sounds like the first two notes of a scale.'
```

In the answers a semitone is called a *minor second* and a tone a *major second*: those are their names as
intervals, which Chapter 8 explains.

## Sharps and flats

The black keys have no letters of their own. Each is named after a white key next to it:

- A **sharp** (♯) raises a note by a semitone: :n[C#] is the key a semitone above :n[C].
- A **flat** (♭) lowers a note by a semitone: :n[Db] is the key a semitone below :n[D].

So the black key between :n[C] and :n[D] has two names, :n[C#] and :n[Db], and so does every black key.
Two names for the same key are called **enharmonic** equivalents. Which name to use depends on the music
around it; Chapter 6 shows how that choice is made, one letter per step of the scale.

::keyboard{lo=60 hi=72 labels="all"}

Sharps and flats are not only for black keys. :n[E#] means “a semitone above :n[E]”, which is the key we
usually call :n[F], and :n[Cb] is the key usually called :n[B]. They look odd, but they turn up in keys
with many sharps or flats, where every letter has to appear once. A third sign, the **natural** (♮), cancels
a sharp or flat: :n[Fn] is plain :n[F].

```quiz
q: 'Which of these names the same key as :n[G#]?'
options:
  - text: ':n[Ab]'
    correct: true
    why: 'A semitone above :n[G] and a semitone below :n[A] are the same black key.'
  - text: ':n[Gb]'
    why: ':n[Gb] is a semitone *below* :n[G]: the black key on the other side of it.'
  - text: ':n[A#]'
    why: ':n[A#] is a semitone above :n[A], two semitones higher than :n[G#].'
```

```play
id: semitones-and-tones/black-keys
title: Black keys by name
prompt: 'Play :n[F#4], :n[Bb4], :n[Eb4], :n[C#5] and :n[Ab4].'
range: [55, 79]
steps:
  - notes: [F#4]
  - notes: [Bb4]
  - notes: [Eb4]
  - notes: [C#5]
  - notes: [Ab4]
hints:
  - 'For a sharp, find the letter and go one key right; for a flat, find the letter and go one key left.'
```

:::note[A stopping point]
Semitones, tones and the names of the black keys: that is the whole vocabulary of the keyboard. The rest of
the chapter puts it to work.
:::

## Writing the names

When you write a note, the name matters as well as the key. :n[F#] and :n[Gb] sound the same on the piano,
but they are different notes in writing, and they belong to different keys. The next exercise asks for
notes by description; write each one with the name asked for. If the course spells a key the other way,
use the ⇄ button on the note.

```spell
id: semitones-and-tones/names
title: Two names for one key
prompt: 'Play the key; then make sure it has the name the question asks for.'
staff: treble
range: [55, 79]
items:
  - ask: 'The black key between :n[F] and :n[G], written as a sharp.'
    answer: [F#4]
  - ask: 'The same key, written as a flat.'
    answer: [Gb4]
  - ask: 'The note a semitone above :n[E], written with the letter E.'
    answer: [E#4]
  - ask: 'The note a tone above :n[Bb].'
    answer: [C5]
  - ask: 'The note a semitone below :n[A], written as a flat.'
    answer: [Ab4]
```

## Steps you can play

Semitones and tones are the building blocks of every scale and chord in the course. A last exercise
before the next chapter: climb from :n[C4] in tones, then come down in semitones.

```perform
id: semitones-and-tones/whole-tone-climb
title: Up in tones, down in semitones
prompt: 'Play the notes in order, at your own pace. Going up, every step is a tone; coming down, every step is a semitone.'
mode: notes
range: [55, 79]
score: |
  \time 4/4 c'4 d'4 e'4 f#'4 | g#'4 a#'4 c''2 | c''4 b'4 a#'4 a'4 | g#'4 g'4 f#'2 |
```

Climbing in tones gets you from :n[C] to :n[C] in six steps, not seven: a scale made only of tones (the
*whole-tone scale*) sounds dreamlike and directionless, and Chapter 39 explains why composers such as
Debussy used it.

:::key
- A **semitone** is the step from one key to the next; a **tone** is two semitones.
- :n[E]–:n[F] and :n[B]–:n[C] are semitones; the other neighbouring white keys are a tone apart.
- A sharp raises a note a semitone, a flat lowers it, a natural cancels either. Each black key has two
  names (**enharmonic** equivalents), and the name depends on the key you are in.
:::
