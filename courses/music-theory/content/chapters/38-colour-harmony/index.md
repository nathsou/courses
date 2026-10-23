---
number: 38
title: Colour harmony
summary: 'Debussy and Satie: planing, added notes, whole-tone and pentatonic harmony.'
duration: 50 minutes
prerequisites: [groove]
skills:
  - Non-functional harmony
---

:::check
```quiz
q: 'What is planing?'
options:
  - text: 'Moving a chord shape in parallel, every voice following the melody, so that the chords colour the line instead of progressing.'
    correct: true
  - text: 'Keeping the bass on one note while the chords change above it.'
    why: 'That is a pedal point (Chapters 21 and 22).'
  - text: 'Replacing V7 with the dominant a tritone away.'
    why: 'That is the tritone substitution (Chapter 36).'
```
:::

## Chords as colours

Everything since Chapter 13 has treated chords as functions: tonic, predominant, dominant, each pulling towards the
next. Around 1900 some composers, above all Claude Debussy (1862–1918) and Erik Satie (1866–1925), began to use chords
for their sound alone: a chord could be beautiful in itself, and need not go anywhere. The tools of this “colour
harmony” are few and recognisable, and they are the direct ancestors of jazz and film harmony.

## Planing

In **planing** a chord shape moves in parallel with the melody, every voice moving the same way. The parallel fifths
and octaves that Chapter 19 forbade are the whole point: the chords thicken the melody like an organ stop instead of
forming a progression.

- **Diatonic planing** keeps the chords in the scale, so their qualities change (major, minor, diminished).
- **Chromatic** (or **real**) **planing** keeps the exact shape, so the chords leave the key: major triads, or
  dominant ninths, on every melody note.

Debussy’s “La cathédrale engloutie” (*Préludes*, Book I, 1910) is full of parallel chords built of open fifths and
octaves, the sound of a cathedral’s bells and organ rising from the sea.

```score caption="One melody three ways, written for the course: plain, then with diatonic planing (triads from the scale), then with chromatic planing (major triads only)." tempo="66"
\time 4/4 g''4 f''4 e''4 d''4 | e''1 \bar "||" | <c'' e'' g''>4 <b' d'' f''>4 <a' c'' e''>4 <g' b' d''>4 | <a' c'' e''>1 \bar "||" | <c'' e'' g''>4 <bb' d'' f''>4 <a' c#'' e''>4 <g' b' d''>4 | <a' c#'' e''>1 |
```

```perform
id: colour-harmony/planing
title: Plane a melody
prompt: 'Right hand only: the chromatic planing above, one hand shape sliding with the melody. At your own pace.'
mode: notes
range: [64, 84]
score: |
  \time 4/4 <c'' e'' g''>4 <bb' d'' f''>4 <a' c#'' e''>4 <g' b' d''>4 | <a' c#'' e''>1 |
```

## Added notes

A triad with an extra note that does not resolve is an **added-note chord**: the **added sixth** (:c[C6]), the **added
ninth** (:c[Cadd9]), the major seventh used for its shimmer rather than as a dissonance. Debussy ended pieces on them, and so
does a great deal of jazz (Chapter 31): the final :c[C6] or :c[Cmaj9] is a direct inheritance.

## Pentatonic and whole-tone harmony

The **pentatonic scale** (Chapter 35) has no semitones, so any of its notes can sound together without clashing: its
chords are stacks of fourths and fifths, open and bright. The five black keys are a pentatonic scale, and Debussy’s
“La fille aux cheveux de lin” (*Préludes*, Book I) begins with a melody on one, unaccompanied.

The **whole-tone scale** divides the octave into six equal tones: :n[C] :n[D] :n[E] :n[F#] :n[G#] :n[A#]. With no semitones,
no perfect fifths and every note the same distance from its neighbours, it has no natural tonic: the music floats. Its
triads are all **augmented**. Debussy’s “Voiles” (Sails, *Préludes*, Book I) is almost entirely whole-tone, over a
pedal :n[Bb] in the bass; its brief middle section changes to the pentatonic scale, like a gust of wind.

::scale-explorer{tonic="C" kind="whole-tone" kinds="whole-tone,major-pentatonic,major" tonics="C,Db,F#" title="Whole-tone, pentatonic and major" subtitle="Compare the step patterns: whole tones only; tones and minor thirds; tones and two semitones."}

```ear
id: colour-harmony/hear-scale
title: Whole-tone, pentatonic or major?
prompt: 'A scale, played up from its first note. Which one?'
kind: scale
pool: [whole-tone, major-pentatonic, major]
rounds: 8
pass: 7
hints:
  - 'The whole-tone scale sounds as if it never arrives: no semitone pulls to the top note. The pentatonic has only five notes, with gaps of a minor third.'
```

:::note[A stopping point]
Planing, added notes, pentatonic and whole-tone colour. Last, two chords that never resolve.
:::

## Satie’s Gymnopédies

Erik Satie’s first *Gymnopédie* (1888) sways between two major seventh chords, :c[Gmaj7] and :c[Dmaj7], for its opening
:t[bar]s: a low bass note on the first beat, the chord on the second, and a melody that floats above in long notes. Neither
chord is the dominant of the other, nothing resolves, and the effect is of time suspended.

::progression-player{chords="Gmaj7,Dmaj7,Gmaj7,Dmaj7" tonics="G" patterns="waltz,block" pattern="waltz" tempo="72" title="Two chords, swaying" subtitle="Two major seventh chords in alternation, as at the start of Satie’s first Gymnopédie: colour without a cadence."}

:::key
- **Colour harmony** uses chords for their sound rather than their function.
- **Planing** moves a chord shape in parallel with the melody: **diatonic** (inside the scale) or **chromatic** (the exact shape).
- **Added-note chords** (6, add9, maj7) are colours, not dissonances to resolve.
- **Pentatonic** harmony has no semitones; **whole-tone** harmony has no perfect fifths and no tonic.
:::
