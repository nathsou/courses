---
number: 8
title: Intervals
summary: Number and quality, inversion, and consonance heard against the harmonic series.
duration: 50 minutes
prerequisites: [circle-of-fifths]
skills:
  - Naming intervals
  - Hearing intervals
---

:::check
```spell
id: intervals/check-1
title: Intervals above a note
prompt: 'Write the note at the interval asked for, above the given note.'
staff: treble
range: [55, 84]
items:
  - ask: 'A major sixth above :n[D4].'
    answer: [B4]
  - ask: 'A minor third above :n[F#4].'
    answer: [A4]
  - ask: 'A perfect fifth above :n[Bb4].'
    answer: [F5]
  - ask: 'An augmented fourth above :n[F4].'
    answer: [B4]
```
:::

## Distance between two notes

An **interval** is the distance between two notes, played one after the other (a *melodic* interval) or
together (a *harmonic* interval). You have met three already: the semitone, the tone and the octave. Musicians
name every interval in two parts, a **number** and a **quality**, such as *major third* or *perfect fifth*.

### The number

The number counts **letters**, including both ends. From :n[C] up to :n[E] is a third (C, D, E); from :n[C]
up to :n[G] a fifth (C D E F G); from :n[C] up to the next :n[C] an eighth, the octave. On the staff, the
number is easy to see: a third goes from a line to the next line (or a space to the next space), a fifth
skips two lines.

The number ignores sharps and flats. :n[C] to :n[E], :n[C] to :n[Eb] and :n[C#] to :n[E] are all thirds,
because all three span the letters C, D, E. That is deliberate: the number tells you how the interval looks
on the staff and how it fits into a scale. The quality says which of them it is.

### The quality

Measure from the tonic of a major scale to each of its notes, and you get the reference intervals:

| From :n[C] to | Number | Semitones | Name |
| --- | --- | --- | --- |
| :n[C] | unison | 0 | perfect unison |
| :n[D] | second | 2 | major second |
| :n[E] | third | 4 | major third |
| :n[F] | fourth | 5 | perfect fourth |
| :n[G] | fifth | 7 | perfect fifth |
| :n[A] | sixth | 9 | major sixth |
| :n[B] | seventh | 11 | major seventh |
| :n[C] | octave | 12 | perfect octave |

Unisons, fourths, fifths and octaves are called **perfect**; seconds, thirds, sixths and sevenths **major**.
Then:

- A major interval made a semitone smaller (same letters) is **minor**: :n[C] up to :n[Eb] is a minor third.
- Any interval made a semitone larger is **augmented**: :n[C] up to :n[G#] is an augmented fifth.
- A perfect or minor interval made a semitone smaller is **diminished**: :n[C] up to :n[Gb] is a diminished fifth.

Perfect intervals never become major or minor; they go straight to augmented or diminished.

::interval-lab

Try :n[C4] and :n[F#4], then respell the :n[F#] as :n[Gb]: the same six semitones are an *augmented fourth*
one way and a *diminished fifth* the other. Either name is often shortened to **tritone**, three tones, the
interval that halves the octave. It is the most restless sound in this chapter.

:::note[Measuring from a note that is not a tonic]
To name :n[E] up to :n[C], imagine the major scale of the lower note, :n[E] major. Its sixth degree is
:n[C#]. :n[C] is a semitone less: a minor sixth. That trick works for every interval.
:::

```spell
id: intervals/build
title: Build intervals
prompt: 'Count the letters first, then adjust with a sharp or flat until the size is right.'
staff: treble
range: [55, 84]
items:
  - ask: 'A major third above :n[Ab4].'
    answer: [C5]
  - ask: 'A perfect fourth above :n[E4].'
    answer: [A4]
  - ask: 'A minor seventh above :n[G4].'
    answer: [F5]
  - ask: 'A diminished fifth above :n[B4].'
    answer: [F5]
  - ask: 'A minor sixth above :n[E4].'
    answer: [C5]
  - ask: 'A major second above :n[B4].'
    answer: [C#5]
hints:
  - 'For a major third above :n[Ab]: the letters are A B C, so the answer is some kind of C. :n[Ab] major has :n[C] as its third, so it is plain :n[C].'
```

:::note[A stopping point]
Naming intervals is half the chapter. The other half is hearing them.
:::

## Inversion and compound intervals

Turn an interval upside down, so that the lower note goes up an octave, and you **invert** it. :n[C] up to
:n[E] (a major third) becomes :n[E] up to :n[C] (a minor sixth). Two rules make inversions easy:

- The numbers add up to **9**: thirds become sixths, seconds sevenths, fourths fifths.
- Major becomes minor and minor major; augmented becomes diminished and diminished augmented; perfect stays
  perfect.

Intervals wider than an octave are **compound**: a ninth is an octave plus a second, a tenth an octave plus
a third. They keep the quality of the simple interval inside them, so :n[C4] up to :n[D5] is a major ninth.

```quiz
q: 'What is the inversion of an augmented fourth?'
options:
  - text: 'A diminished fifth'
    correct: true
    why: '4 + 5 = 9, and augmented becomes diminished. Both are six semitones: the tritone is its own inversion.'
  - text: 'A perfect fifth'
    why: 'Perfect fourths invert to perfect fifths, but an augmented interval inverts to a diminished one.'
  - text: 'An augmented fifth'
    why: 'Augmented intervals invert to diminished ones.'
```

## Hearing intervals

Each interval has a sound you can learn to recognise. Many musicians start with tunes that open with it.
None is played here, but you will know most of them:

| Interval (rising) | Opening of |
| --- | --- |
| minor second | the shark’s theme from *Jaws* |
| major second | “Happy Birthday” (*hap-py* **birth**-) |
| minor third | “Greensleeves” |
| major third | “When the Saints Go Marching In” |
| perfect fourth | “Here Comes the Bride” (Wagner) |
| tritone | “Maria” from *West Side Story* |
| perfect fifth | “Twinkle, Twinkle, Little Star” |
| major sixth | “My Bonnie Lies over the Ocean” |
| minor seventh | “Somewhere” from *West Side Story* |
| octave | “Somewhere Over the Rainbow” |

Song anchors are a start, not a method: the aim is to hear the interval itself. Begin with four that
sound very different.

```ear
id: intervals/four
title: Four intervals
prompt: 'Rising melodic intervals: major second, major third, perfect fifth or octave?'
kind: interval
pool: [M2, M3, P5, P8]
range: [55, 67]
rounds: 12
pass: 10
```

```ear
id: intervals/thirds-fourths
title: Thirds and fourths
prompt: 'Now closer relatives: minor third, major third, perfect fourth or perfect fifth?'
kind: interval
pool: [m3, M3, P4, P5]
range: [55, 67]
rounds: 12
pass: 9
```

```ear
id: intervals/harmonic
title: Together
prompt: 'The same four, played together (harmonic intervals). Together, intervals have a colour more than a shape.'
kind: interval
pool: [m3, M3, P4, P5]
harmonic: true
range: [52, 64]
rounds: 12
pass: 9
```

## Consonance and dissonance

Play a fifth, then a semitone, together. The fifth blends; the semitone rubs. Musicians call intervals that
sound stable **consonant** and those that sound tense, wanting to move, **dissonant**. In the tradition this
course follows:

- **Perfect consonances:** unison, octave, fifth (and the fourth, depending on context).
- **Imperfect consonances:** thirds and sixths, major and minor.
- **Dissonances:** seconds, sevenths, and every augmented and diminished interval, the tritone above all.

Why should some intervals blend? Chapter 1 showed that an octave is a 2:1 ratio of frequencies. A real note
is not one frequency but many: the piano string vibrates as a whole, in halves, in thirds, in quarters…, so
every note contains a stack of fainter tones at 2, 3, 4, 5… times its frequency, the **harmonic series**.

::harmonic-series{compare}

Two notes a fifth apart share many of those partials; two notes a semitone apart share almost none, and
their nearly-equal partials beat against each other, which the ear hears as roughness. That is a large part
(not all) of what consonance is. Chapter 42 returns to the harmonic series to explain why the piano is tuned
the way it is.

```play
id: intervals/play-fifths
title: Fifths and thirds above
prompt: 'Play, together, a perfect fifth above :n[D4], a major third above :n[Eb4], a minor third above :n[B3] and a tritone above :n[F4].'
range: [55, 79]
steps:
  - notes: [D4, A4]
  - notes: [Eb4, G4]
  - notes: [B3, D4]
  - notes: [F4, B4]
```

:::key
- An interval’s **number** counts letters, both ends included; its **quality** (perfect, major, minor,
  augmented, diminished) fixes its exact size.
- Measure from the lower note’s major scale: its notes give the major and perfect intervals.
- **Inversions** add up to nine and swap major with minor, augmented with diminished.
- Consonant intervals (octaves, fifths, thirds, sixths) share many partials of the **harmonic series**;
  dissonant ones (seconds, sevenths, the tritone) share few.
:::
