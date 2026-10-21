---
number: 9
title: Minor
summary: Natural, harmonic and melodic minor; relative and parallel keys.
duration: 45 minutes
prerequisites: [intervals]
skills:
  - Minor scales
  - Minor key signatures
---

:::check
```spell
id: minor/check-1
title: Minor scales
prompt: 'Write each scale, one letter per note.'
staff: treble
range: [55, 84]
items:
  - ask: ':n[E] harmonic minor.'
    answer: [E4, F#4, G4, A4, B4, C5, D#5]
  - ask: ':n[D] melodic minor, going up.'
    answer: [D4, E4, F4, G4, A4, B4, C#5]
```

```quiz
q: 'What is the relative minor of :n[Eb] major?'
options:
  - text: ':n[C] minor'
    correct: true
    why: 'Three semitones below :n[Eb] is :n[C], and :n[C] minor shares the three flats.'
  - text: ':n[Eb] minor'
    why: 'That is the parallel minor: the same tonic, with six flats.'
  - text: ':n[G] minor'
    why: ':n[G] minor has two flats; it is the relative minor of :n[Bb] major.'
```
:::

## Another way down the white keys

Play the white keys from :n[A3] up to :n[A4]. The notes are the same as :n[C] major, but the scale sounds
different: darker, sadder to many ears. You have played a **minor scale**, the *natural minor* on :n[A].

```score caption=":n[A] natural minor: the white keys from :n[A] to :n[A]." tempo="110"
\hidetime \time 8/4 a4 b4 c'4 d'4 e'4 f'4 g'4 a'4 |
```

Its pattern of steps is **tone, semitone, tone, tone, semitone, tone, tone**. Compared with :n[A] major, three
degrees are a semitone lower: the third, the sixth and the seventh. The lowered third is the one the ear
notices most. Measured from the tonic, a major scale has a **major third** (:n[A] to :n[C#]) and a minor
scale a **minor third** (:n[A] to :n[C]), and that is where the names *major* and *minor* come from.

```ear
id: minor/major-or-minor
title: Major or minor?
prompt: 'A scale, up one octave. Major or natural minor?'
kind: scale
pool: [major, natural-minor]
range: [55, 66]
rounds: 10
pass: 9
hints:
  - 'Listen to the third note. In major it is bright and stable; in minor it is a semitone lower, and darker.'
```

Korobeiniki, the course’s running tune, is in :n[A] minor: play its opening (Chapter 3) and listen for
the minor third, :n[A] up to :n[C], in its second bar.

## Relative and parallel keys

Every major key has a **relative minor** that uses exactly the same notes and the same key signature,
starting three semitones lower (a minor third down, on the major scale’s sixth degree). :n[C] major and
:n[A] minor share no sharps or flats; :n[G] major and :n[E] minor share one sharp; :n[F] major and :n[D]
minor one flat.

::circle-of-fifths{minor}

So a key signature always stands for two keys, a major one and its relative minor. Which one a piece is in
depends on the notes it settles on, above all the first and last chords and the bass. A practical clue: in
the minor key, the raised seventh (next section) appears as an accidental.

The **parallel minor** of a major key starts on the same tonic: :n[C] minor is the parallel minor of :n[C]
major. Parallel keys share a tonic but not a signature (:n[C] minor has three flats). Music often borrows
between them, as Chapter 25 shows.

```quiz
q: 'A piece has two sharps in its signature, starts and ends on :n[B] and uses :n[A#] often. Which key is it in?'
options:
  - text: ':n[B] minor'
    correct: true
    why: 'Two sharps is :n[D] major or :n[B] minor; the tonic :n[B] and the raised seventh :n[A#] point to :n[B] minor.'
  - text: ':n[D] major'
    why: ':n[D] major has the same signature, but it would centre on :n[D] and has no use for :n[A#].'
  - text: ':n[B] major'
    why: ':n[B] major has five sharps.'
```

:::note[A stopping point]
Natural minor and the two kinds of related key. The last session explains why minor music so often
changes its own scale.
:::

## Harmonic and melodic minor

The natural minor has no :t[leading note]: its seventh degree is a whole tone below the tonic, and the pull
upwards that you heard in Chapter 6 is missing. Musicians have long wanted that pull in minor too (the habit
is older than written key signatures), so they raise the seventh degree by a semitone. In :n[A] minor, :n[G] becomes :n[G#]. The result is
the **harmonic minor** scale, named after its use in chords (Chapter 10 shows that the raised seventh makes
the chord on degree 5 major, just as in a major key).

Raising the seventh opens a gap of three semitones between degrees 6 and 7 (:n[F] to :n[G#]): an
**augmented second**, which gives harmonic minor its exotic flavour in melodies. To smooth it out, melodies
going *up* raise the sixth degree too (:n[F#]), and going *down*, when the pull to the tonic is not needed,
often return to the natural minor. That is the **melodic minor**: raised sixth and seventh ascending, natural
minor descending (in classical usage; jazz uses the raised form both ways, Chapter 34).

::scale-explorer{tonic="A" kind="harmonic-minor" kinds="natural-minor,harmonic-minor,melodic-minor" tonics="A,E,B,D,G,C,F"}

The three minors share their first five notes. Only degrees 6 and 7 move, depending on what the music needs:
a :t[leading note] for a cadence, a smooth line for a melody.

```ear
id: minor/three-minors
title: Which minor?
prompt: 'A minor scale going up. Natural, harmonic or melodic?'
kind: scale
pool: [natural-minor, harmonic-minor, melodic-minor]
range: [55, 64]
rounds: 9
pass: 7
hints:
  - 'Harmonic minor has the leap between degrees 6 and 7; melodic minor sounds like major from the fourth note up.'
```

```perform
id: minor/a-harmonic
title: A harmonic minor
prompt: 'Right hand, up and down, with the :n[G#] both ways. Fingering as :n[C] major: 1 2 3, thumb under to :n[D5], 1 2 3 4 5.'
mode: both
tempo: 66
range: [55, 84]
score: |
  \time 4/4 \key a \minor a'4 b'4 c''4 d''4 | e''4 f''4 g#''4 a''4 | g#''4 f''4 e''4 d''4 | c''4 b'4 a'2 |
```

```spell
id: minor/write
title: Write minor scales
prompt: 'Start from the natural minor (the relative major’s notes), then raise what needs raising.'
staff: treble
range: [55, 84]
items:
  - ask: ':n[G] natural minor.'
    answer: [G4, A4, Bb4, C5, D5, Eb5, F5]
  - ask: ':n[C] harmonic minor.'
    answer: [C5, D5, Eb5, F5, G5, Ab5, B5]
  - ask: ':n[B] harmonic minor.'
    answer: [B4, C#5, D5, E5, F#5, G5, A#5]
  - ask: ':n[F#] melodic minor, going up.'
    answer: [F#4, G#4, A4, B4, C#5, D#5, E#5]
hints:
  - ':n[F#] melodic minor raises :n[E] (degree 7) to :n[E#], the key usually called :n[F]: one letter per degree.'
```

:::key
- The **natural minor** goes tone, semitone, tone, tone, semitone, tone, tone; its third, sixth and seventh are
  a semitone lower than in major.
- The **relative minor** shares the major key’s notes and signature and starts a minor third lower; the
  **parallel minor** shares its tonic.
- **Harmonic minor** raises the seventh (a :t[leading note], with an augmented second below it); **melodic
  minor** raises the sixth and seventh going up and uses the natural minor coming down.
:::
