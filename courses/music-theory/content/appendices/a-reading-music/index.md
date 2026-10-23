---
number: A
title: 'Reading music: quick reference'
summary: Every symbol the course uses, with its British and American names.
duration: Reference
---

Each entry links back to the chapter that explains it. Names follow your settings (the keyboard button at
the top of the page): note names in letters, solfège or German, terms in British or American English.

## The staff and clefs

```score caption="The grand staff: treble clef above, bass clef below, middle C on a ledger line between them." play="false"
\hidetime \staff treble c'1 | \staff bass c'1 |
```

| Symbol | Name | Meaning | Chapter |
| --- | --- | --- | --- |
| five lines | staff (stave) | pitch: higher on the staff is higher in sound | [5](/chapters/grand-staff/) |
| 𝄞 | treble clef, G clef | the second line up is :n[G4] | [5](/chapters/grand-staff/) |
| 𝄢 | bass clef, F clef | the second line down is :n[F3] | [5](/chapters/grand-staff/) |
| short extra line | ledger line | extends the staff for one note | [5](/chapters/grand-staff/) |
| brace | grand staff | two staves played by one pianist | [5](/chapters/grand-staff/) |

## Note values and rests

```score caption="From the top: :t[semibreve], :t[minim], :t[crotchet], :t[quaver] and :t[semiquaver], each followed by its rest." play="false"
\time 4/4 c''2 r2 | c''4 r4 c''8 r8 c''16 r16 r8 | c''1 | r1 |
```

| British | American | Beats in 4/4 | Chapter |
| --- | --- | --- | --- |
| semibreve | whole note | 4 | [3](/chapters/pulse-and-rhythm/) |
| minim | half note | 2 | [3](/chapters/pulse-and-rhythm/) |
| crotchet | quarter note | 1 | [3](/chapters/pulse-and-rhythm/) |
| quaver | eighth note | ½ | [3](/chapters/pulse-and-rhythm/) |
| semiquaver | sixteenth note | ¼ | [3](/chapters/pulse-and-rhythm/) |
| demisemiquaver | thirty-second note | ⅛ | |

- A **dot** adds half the note’s value; a **tie** (a curve between two notes of the same pitch) joins them
  into one. A **slur** (a curve over different pitches) means play smoothly, *legato*. ([3](/chapters/pulse-and-rhythm/))
- A **triplet** (3 over a group) fits three notes in the time of two. ([12](/chapters/rhythm-in-detail/))
- A **beam** joins the flags of :t[quaver]s and shorter notes within a beat. ([3](/chapters/pulse-and-rhythm/))

## Accidentals and key signatures

```score caption="Sharp, flat, natural, double sharp and double flat." play="false"
\hidetime \time 5/4 f#'4 bb'4 bn'4 c##''4 ebb''4 |
```

- ♯ raises a note a semitone, ♭ lowers it, ♮ cancels either, 𝄪 raises two semitones, 𝄫 lowers two. An
  accidental lasts until the end of the :t[bar], for that note in that octave. ([2](/chapters/semitones-and-tones/))
- A **key signature** after the clef applies its sharps or flats to every octave, for the whole piece. Sharps
  come in the order F C G D A E B; flats in B E A D G C F. ([7](/chapters/circle-of-fifths/))

## Time signatures and bar lines

```score caption="A time signature, a double bar line, and repeat signs." play="false"
\time 3/4 \bar "|:" c''2. | d''2. \bar ":|" | e''2. \bar "||" | c''2. |
```

- The top number is the beats per :t[bar], the bottom the note value of one beat (4 = :t[crotchet], 8 =
  :t[quaver]). 6/8, 9/8 and 12/8 are compound: their beats are dotted :t[crotchet]s. ([4](/chapters/metre/), [12](/chapters/rhythm-in-detail/))
- A **double bar line** marks the end of a section; a thin and a thick line, the end of the piece.
- **Repeat signs** (two dots beside a double bar) enclose a passage to be played twice.

## Words and signs you will meet in printed music

| Sign | Meaning |
| --- | --- |
| *pp, p, mp, mf, f, ff* | very soft, soft, moderately soft, moderately loud, loud, very loud |
| *cresc.*, < | getting louder |
| *dim.*, *decresc.*, > | getting softer |
| dot over or under a note | *staccato*: short, detached |
| > over a note | accent: louder than its neighbours |
| *Ped.* … ✱ | press the sustain pedal … let it up |
| *rit.*, *rall.* | slowing down |
| *a tempo* | back to the main tempo |
| 𝄐 | fermata: hold the note longer than its value |

## Chord symbols and Roman numerals

| Symbol | Chord | Chapter |
| --- | --- | --- |
| :c[C] | major triad | [10](/chapters/triads/) |
| :c[Cm] | minor triad | [10](/chapters/triads/) |
| :c[Cdim], C° | diminished triad | [10](/chapters/triads/) |
| :c[Caug], C+ | augmented triad | [10](/chapters/triads/) |
| :c[C/E] | :c[C] with :n[E] in the bass | [11](/chapters/inversions/) |
| :c[C7] | dominant seventh | [14](/chapters/seventh-chords/) |
| :c[Cmaj7] | major seventh | [14](/chapters/seventh-chords/) |
| :c[Cm7] | minor seventh | [14](/chapters/seventh-chords/) |
| :c[Cm7b5], Cø | half-diminished seventh | [14](/chapters/seventh-chords/) |
| :c[Cdim7], C°7 | diminished seventh | [14](/chapters/seventh-chords/) |

Roman numerals name a chord by the scale degree of its root: upper case for major, lower case for minor,
° for diminished, + for augmented. Figures after the numeral show the inversion: 6 and 64 for triads, 7, 65,
43 and 42 for seventh chords. ([10](/chapters/triads/), [11](/chapters/inversions/))
