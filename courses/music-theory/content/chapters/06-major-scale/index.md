---
number: 6
title: The major scale
summary: The pattern of tones and semitones, scale degrees, the pull of the tonic and the first fingerings.
duration: 45 minutes
prerequisites: [semitones-and-tones, grand-staff]
skills:
  - Major scales
  - Scale degrees
---

:::check
```spell
id: major-scale/check-1
title: Two scales
prompt: 'Write each scale with one note per letter.'
staff: treble
items:
  - ask: 'The notes of :n[G] major.'
    answer: [G4, A4, B4, C5, D5, E5, F#5]
  - ask: 'The notes of :n[Bb] major.'
    answer: [Bb4, C5, D5, Eb5, F5, G5, A5]
```
:::

## Eight notes from C to C

Play the white keys from :n[C4] up to :n[C5], one at a time. You have played the **major scale**: the
seven notes of “do, re, mi, fa, sol, la, ti, do”, and the eighth that brings you home. It is the basis of
most of the music you know, and of most of this course.

```perform
id: major-scale/c-major
title: C major, right hand
prompt: 'Up and down, at your own pace. The usual fingering (1 = thumb, 5 = little finger) is 1 2 3, then the thumb passes under to play :n[F4], then 1 2 3 4 5 to the top.'
mode: notes
range: [55, 79]
score: |
  \time 4/4 c'4 d'4 e'4 f'4 | g'4 a'4 b'4 c''4 | b'4 a'4 g'4 f'4 | e'4 d'4 c'2 |
```

::keyboard{lo=60 hi=72 labels="white" fingers='{"60":1,"62":2,"64":3,"65":1,"67":2,"69":3,"71":4,"72":5}'}

Why does this particular set of white keys sound like *the* scale? Look at the steps between them.

## The pattern

From :n[C] to :n[D] is a tone, :n[D] to :n[E] a tone, :n[E] to :n[F] a semitone (no black key between),
then tone, tone, tone, and :n[B] to :n[C] a semitone again:

**tone, tone, semitone, tone, tone, tone, semitone**

That pattern is what makes a major scale. Written as T T S T T T S, it splits into two identical halves of
four notes, T T S, joined by a tone in the middle. Each half is called a **tetrachord**: :n[C] :n[D] :n[E]
:n[F] and :n[G] :n[A] :n[B] :n[C] have the same shape.

::scale-explorer{tonics="C" kinds="major"}

The semitones fall between notes 3 and 4 and between notes 7 and 8. Those two places are where the scale
has its character: a major scale is the scale whose half-steps come there.

## Major scales on other notes

Start on :n[G] and play only white keys, and something sounds wrong near the top: from :n[E] to :n[F] is a
semitone, where the pattern wants a tone, and :n[F] to :n[G] is a tone, where it wants a semitone. Raise
the :n[F] to :n[F#] and both steps come right. :n[G] major has one sharp.

Start on :n[F] and the problem is in the middle: :n[A] to :n[B] is a tone where the pattern wants a semitone.
Lower the :n[B] to :n[Bb]. :n[F] major has one flat.

::scale-explorer{tonic="G" tonics="C,G,D,A,E,F,Bb,Eb"}

### One letter per note

Why :n[Bb] and not :n[A#], which is the same key? Because a scale uses **every letter once**: :n[F] :n[G]
:n[A] :n[Bb] :n[C] :n[D] :n[E]. Writing :n[A#] would give two :n[A]s and no :n[B]. This rule is what fixes
the spelling of every scale, and it is why scales use sharps or flats but not both. The explorer above
always follows it; try :n[Eb] major and count the letters.

```spell
id: major-scale/write-scales
title: Write major scales
prompt: 'Follow the pattern T T S T T T S, one letter per note. Play the keys, then use ⇄ on any note whose name is wrong.'
staff: treble
range: [55, 84]
items:
  - ask: 'The notes of :n[D] major.'
    answer: [D4, E4, F#4, G4, A4, B4, C#5]
  - ask: 'The notes of :n[F] major.'
    answer: [F4, G4, A4, Bb4, C5, D5, E5]
  - ask: 'The notes of :n[A] major.'
    answer: [A4, B4, C#5, D5, E5, F#5, G#5]
  - ask: 'The notes of :n[Eb] major.'
    answer: [Eb4, F4, G4, Ab4, Bb4, C5, D5]
hints:
  - 'Write the seven letters first, starting on the tonic (for :n[D] major: D E F G A B C), then fix the steps one by one with sharps or flats.'
```

:::note[A stopping point]
You can build a major scale on any note. The last two sessions are about what the notes of a scale *do*.
:::

## Degrees and the pull of the tonic

The notes of a scale are its **degrees**, numbered from 1 (often written with a caret, 1̂ to 7̂). The first
degree is the **tonic**: the note the scale is named after and the place it feels at rest. Each degree has a
traditional name too:

| Degree | Name | In :n[C] major |
| --- | --- | --- |
| 1 | tonic | :n[C] |
| 2 | supertonic | :n[D] |
| 3 | mediant | :n[E] |
| 4 | subdominant | :n[F] |
| 5 | dominant | :n[G] |
| 6 | submediant | :n[A] |
| 7 | :t[leading note]{both} | :n[B] |

Two of these matter at once. The **dominant**, degree 5, is the most important note after the tonic; the
chord built on it drives music home (Chapter 13). The **:t[leading note]**, degree 7, is only a semitone below
the tonic, and it leans towards it so strongly that stopping on it feels unfinished. Hear the difference.

```ear
id: major-scale/home
title: Home, or not yet?
prompt: 'A major scale goes up and stops. Does it stop on the tonic, or one note short?'
kind: custom
options: [On the tonic, One note short]
items:
  - play: [C4, D4, E4, F4, G4, A4, B4, C5]
    answer: On the tonic
  - play: [C4, D4, E4, F4, G4, A4, B4]
    answer: One note short
  - play: [G3, A3, B3, C4, D4, E4, F#4, G4]
    answer: On the tonic
  - play: [G3, A3, B3, C4, D4, E4, F#4]
    answer: One note short
  - play: [F4, G4, A4, Bb4, C5, D5, E5, F5]
    answer: On the tonic
  - play: [F4, G4, A4, Bb4, C5, D5, E5]
    answer: One note short
rounds: 8
pass: 7
```

That pull of the :t[leading note] towards the tonic is one of the two or three forces the rest of the
course is built on.

## Fingering scales

A scale has eight notes and a hand has five fingers, so the hand has to move. Pianists do it by passing the
thumb under the hand (going up in the right hand) or crossing a finger over the thumb (going down), so
that the line stays smooth. For :n[C] major:

- **Right hand**, up: 1 2 3, thumb under to :n[F], 1 2 3 4 5. Down: 5 4 3 2 1, then 3 crosses over the
  thumb to :n[E], 3 2 1.
- **Left hand**, up from :n[C3]: 5 4 3 2 1, then 3 crosses over the thumb to :n[A3], 3 2 1. Down:
  1 2 3, thumb under to :n[G3], 1 2 3 4 5: the same finger order as the right hand going up.

:n[G], :n[D], :n[A] and :n[E] major use exactly the same fingering. :n[F] major changes the right hand to
1 2 3 4 (with 4 on :n[Bb]), then the thumb on :n[C], 1 2 3 4. Appendix B gives the fingerings for every key;
they are not arbitrary but follow one principle: the thumb never plays a black key in a scale if it can
avoid it.

```perform
id: major-scale/c-major-left
title: C major, left hand
prompt: 'From :n[C3] up to :n[C4] and back: 5 4 3 2 1, third finger over to :n[A3], 3 2 1. Coming down, thumb under after :n[A3].'
mode: notes
range: [43, 64]
score: |
  \clef bass \time 4/4 c4 d4 e4 f4 | g4 a4 b4 c'4 | b4 a4 g4 f4 | e4 d4 c2 |
```

```perform
id: major-scale/g-major-timed
title: G major, in time
prompt: 'Right hand, one note per beat, with the same fingering as :n[C] major. Keep the thumb passage smooth: it is the moment most scales stumble.'
mode: both
tempo: 72
range: [55, 84]
score: |
  \time 4/4 \key g \major g'4 a'4 b'4 c''4 | d''4 e''4 f#''4 g''4 | f#''4 e''4 d''4 c''4 | b'4 a'4 g'2 |
```

:::key
- A **major scale** follows the pattern tone, tone, semitone, tone, tone, tone, semitone: two identical
  tetrachords joined by a tone.
- Built on any note, it uses **one letter per degree**, which decides whether its black keys are sharps or
  flats.
- The **tonic** (1) is home; the **dominant** (5) comes next in importance; the **:t[leading note]** (7) pulls up
  to the tonic.
- Scales are fingered by passing the thumb under or crossing over it; :n[C], :n[G], :n[D], :n[A] and :n[E]
  major share one fingering.
:::
