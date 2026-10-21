---
number: 39
title: Symmetry
summary: Whole-tone and octatonic scales, and why they blur the key.
duration: 45 minutes
prerequisites: [colour-harmony]
skills:
  - Symmetrical scales
---

:::check
```quiz
q: 'How many different whole-tone scales are there (counting scales with the same notes as the same scale)?'
options:
  - text: 'Two.'
    correct: true
  - text: 'Twelve, one on each note.'
    why: 'The whole-tone scale on :n[D] has the same notes as the one on :n[C]. Start on any of its six notes and you get the same set; only the scale on :n[C#] is different.'
  - text: 'Six.'
    why: 'Each scale has six notes, and starting on any of them gives back the same scale, so twelve starting notes give two scales.'
```
:::

## Dividing the octave equally

The major and minor scales are lopsided: tones and semitones in an irregular pattern, which is exactly what lets the ear
find the tonic and the leading note. Divide the octave into equal parts instead and you get shapes with no
landmarks:

| Divide the octave into | Interval | Shape | Different transpositions |
| --- | --- | --- | --- |
| 2 | tritones | :n[C] :n[F#] | 6 |
| 3 | major thirds | the augmented triad :n[C] :n[E] :n[G#] | 4 |
| 4 | minor thirds | the diminished seventh :n[C] :n[Eb] :n[Gb] :n[A] | 3 |
| 6 | whole tones | the whole-tone scale | 2 |

Each shape maps onto itself when transposed by its interval, so it has fewer distinct transpositions than an
ordinary chord or scale, and no note in it is more important than any other. That is why such music sounds
suspended: there is no home to go to, or every note is equally home. Chapter 27 used the same property of the
diminished seventh to modulate anywhere.

## The octatonic scale

Alternate semitones and tones and you get an eight-note scale, the **octatonic** (or **diminished**) scale: :n[C] :n[Db] :n[Eb]
:n[E] :n[F#] :n[G] :n[A] :n[Bb] (starting with a semitone, “half–whole”) or :n[C] :n[D] :n[Eb] :n[F] :n[Gb] :n[Ab] :n[A] :n[B] (“whole–half”). It
repeats every minor third, so there are only **three** different octatonic scales. Inside each are two diminished
seventh chords and four major triads a minor third apart (:c[C], :c[Eb], :c[F#], :c[A] in the first one), along with their
minor triads and dominant sevenths.

::scale-explorer{tonic="C" kind="octatonic-hw" kinds="octatonic-hw,octatonic-wh,whole-tone" tonics="C,Db,D" title="Symmetrical scales" subtitle="Half–whole, whole–half, whole-tone. Try the three starting notes: from :n[Eb] the octatonic scale would repeat the one on :n[C]."}

Russian composers loved it: Rimsky-Korsakov used it so often that it is sometimes called the Rimsky-Korsakov scale, and
his pupil Stravinsky built the famous **Petrushka chord** (in *Petrushka*, 1911) from two of its triads at once, :c[C]
major and :c[F#] major, a tritone apart. Olivier Messiaen later catalogued the whole-tone and octatonic scales among his
“modes of limited transposition”.

```play
id: symmetry/petrushka
title: The Petrushka chord
prompt: ':c[C] major in the left hand, :c[F#] major in the right, together: exactly these keys.'
range: [48, 79]
steps:
  - notes: [C4, E4, G4, F#4, A#4, C#5]
    label: C + F♯
```

## In jazz

Jazz musicians call the half–whole octatonic scale the **diminished scale** and play it over altered dominant chords:
on :n[C], its notes include the root, third, fifth and seventh of :c[C7] and the tensions ♭9, ♯9, ♯11 and 13 (Chapter 31),
so it fits :c[C7b9] exactly. The whole-tone scale fits a dominant with a ♯5 (:c[C7#5]).

```improvise
id: symmetry/diminished
title: The diminished scale over C7♭9
prompt: 'Over :c[C7b9] and :c[F7b9], two :t[bar]s each, try the half–whole scale on each root: :n[C] :n[Db] :n[Eb] :n[E] :n[F#] :n[G] :n[A] :n[Bb], then the same from :n[F].'
chart: [C7b9, C7b9, F7b9, F7b9]
tempo: 96
choruses: 3
range: [55, 84]
```

:::key
- Dividing the octave equally gives **symmetrical** shapes: the tritone, the augmented triad, the diminished seventh,
  the **whole-tone scale** (two transpositions) and the **octatonic scale** (three).
- With no unique tonic and no leading note, symmetrical harmony blurs the key.
- The octatonic scale contains triads a minor third apart (the Petrushka chord); jazz uses it as the **diminished
  scale** over 7♭9 chords.
:::
