---
number: 1
title: High and low
summary: Pitch, the keyboard’s pattern of twos and threes, the white-key names, middle C and the octave.
duration: 30 minutes
prerequisites: [four-chords]
skills:
  - Naming white keys
  - Finding any C
---

:::check
If you can do this without thinking, skim the chapter and move on.

```play
id: high-and-low/check-1
title: Four keys
prompt: 'Play :n[C4] (middle C), then the :n[F] above it, then the :n[B] just below middle C, then the :n[A] above middle C.'
range: [48, 72]
steps:
  - notes: [C4]
  - notes: [F4]
  - notes: [B3]
  - notes: [A4]
```
:::

## Higher and lower

Play the lowest key of your keyboard, then the highest. Everything in music happens between those two
sounds, and the first thing to notice is that one is **low** and the other **high**. How high or low a
sound is, is its **pitch**. On a piano, pitch rises from left to right: every key sounds a little higher
than the key to its left.

That is not as obvious as it sounds. Hearing which of two notes is higher is a skill, and it improves with
practice, especially when the notes are close together. Try it.

```ear
id: high-and-low/higher-lower
title: Higher or lower?
prompt: 'The course plays two notes. Is the second higher or lower than the first? The notes get closer as you go: some are only one key apart.'
kind: highlow
range: [55, 70]
rounds: 10
pass: 8
```

:::note[Why “high”?]
Nothing goes up when a note gets higher. What changes is how fast the air vibrates, as the next section
shows. Calling fast vibrations “high” is a habit shared by many languages, and the written music you will
meet in Chapter 5 follows it: higher notes are written higher on the page.
:::

## The pattern of the keys

Look at the black keys. They are not spaced evenly: they come in groups of **two** and groups of
**three**, alternating all the way along the keyboard. That pattern is how pianists find their way
without counting keys.

::keyboard{lo=48 hi=72 labels="white"}

The white keys are named with the first seven letters of the alphabet, **A B C D E F G**, and then the
names start again. Two keys are worth learning first, because the black keys point straight at them:

- **:n[C]** is the white key just to the left of each group of **two** black keys.
- **:n[F]** is the white key just to the left of each group of **three** black keys.

From :n[C] the letters climb to the right, :n[C] :n[D] :n[E] :n[F] :n[G] :n[A] :n[B], and then the next
:n[C] arrives, just left of the next group of two. Every white key is now one step from a landmark:
:n[D] sits between the two black keys, :n[E] just right of them; :n[G] and :n[A] sit inside the group of
three, :n[B] just right of it.

:::note[If your note names are Do Ré Mi]
The course writes names in the system you chose (the keyboard button at the top of the page). Whatever
the names, the keys are the same: the key left of the two black keys is :n[C], whether you call it C, Do
or C.
:::

```play
id: high-and-low/every-c
title: Every C
prompt: 'Find each :n[C] on this keyboard, from the lowest to the highest. Each one sits just left of a group of two black keys.'
range: [36, 84]
steps:
  - notes: [C2]
  - notes: [C3]
  - notes: [C4]
  - notes: [C5]
  - notes: [C6]
hints:
  - 'Look for the pairs of black keys. The white key touching the left of each pair is a :n[C].'
```

```play
id: high-and-low/white-keys
title: Name a key, find a key
prompt: 'Play each of these, in any octave: :n[F], :n[A], :n[D], :n[B], :n[G], :n[E].'
range: [48, 84]
steps:
  - notes: [F]
  - notes: [A]
  - notes: [D]
  - notes: [B]
  - notes: [G]
  - notes: [E]
hints:
  - ':n[F] is just left of a group of three black keys; :n[A] is the second white key inside that group.'
```

:::note[A stopping point]
You can find every white key from the pattern of the black keys. The next session explains why the same
names come round again and again.
:::

## Octaves

Play any :n[C], then the next :n[C] up. The two notes are clearly different (one is higher) and yet they
sound alike, so alike that we give them the same name. The distance between them is an **octave**: eight
white keys counting both ends (C D E F G A B C), which is where the name comes from (*octo* is Latin for
eight).

The reason they sound alike is in the vibration. The widget below shows how fast each key vibrates, in
vibrations per second (*hertz*, Hz). Play a key, then the same letter an octave lower.

::pitch-lab

The note an octave higher vibrates exactly **twice as fast**. The A just above middle C vibrates 440 times
a second (the international standard for tuning, which digital pianos follow); the A an octave below vibrates 220 times, the one
below that 110. Two vibrations that fit together so neatly, two to one, blend so well that the ear hears
them as the same note in a different register. Chapter 8 explains what this has to do with which notes
sound well together, and Chapter 42 why the piano has exactly twelve keys to each octave.

### Naming the octaves

With the names repeating, “play a :n[C]” is ambiguous on a keyboard with seven or eight of them. The
course uses **scientific pitch notation**: the letter, then the number of the octave, with each octave
starting on :n[C]. The :n[C] nearest the middle of the piano, **middle C**, is :n[C4]; the :n[D] above it is
:n[D4]; the :n[B] just below it is :n[B3], because a new number starts on every :n[C]. A full piano runs
from :n[A0] at the bottom to :n[C8] at the top: 88 keys, 52 white and 36 black.

```quiz
q: 'Which note is just below :n[C5]?'
options:
  - text: ':n[B4]'
    correct: true
    why: 'The number changes on :n[C], so the key just below :n[C5] still belongs to octave 4.'
  - text: ':n[B5]'
    why: ':n[B5] is the :n[B] above :n[C5], seven white keys higher.'
  - text: ':n[C4]'
    why: ':n[C4] is a whole octave lower.'
```

Middle C is the key to know best. On an 88-key piano it is the fourth :n[C] from the left, a little left
of the centre of the keyboard (the middle of the 88 keys falls between :n[E4] and :n[F4]); on a 61-key
keyboard it is usually the third :n[C].

## Finding notes by ear

Musicians often know which key they want before they play it, because they can hear it in their head.
That skill starts with something simpler: hearing a note and finding it. The course plays a white key
between :n[C4] and :n[C5]; find it. Use the landmarks: is it near the bottom of that octave, or the top?

```ear
id: high-and-low/find-it
title: Find the note
prompt: 'Listen, then play the same key. All the notes are white keys between :n[C4] and :n[C5].'
kind: pitch
range: [60, 72]
white: true
rounds: 8
pass: 5
hints:
  - 'Start on :n[C4] and move up a key at a time until your note matches. Sliding towards a note is how everyone begins.'
```

This one is hard at first. Five out of eight is a pass because that is already better than guessing; you
will come back to it in the practice room, and it gets easier with every chapter.

:::key
- **Pitch** is how high or low a note is; on the piano it rises from left to right.
- The black keys come in groups of two and three. :n[C] is just left of each group of two, :n[F] just
  left of each group of three.
- The white keys are named A to G, repeating. An **octave** is the distance from one note to the next with
  the same name; the higher note vibrates twice as fast.
- Octaves are numbered from :n[C]: middle C is :n[C4], and the :n[B] below it is :n[B3].
:::
