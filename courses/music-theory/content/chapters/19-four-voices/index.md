---
number: 19
title: Four voices
summary: SATB and keyboard style, spacing, doubling and motion between voices.
duration: 55 minutes
prerequisites: [phrase-and-period]
skills:
  - Four-part writing
  - Connecting chords
---

:::check
```realise
id: four-voices/check-1
title: I – IV – V – I in four voices
prompt: 'The bass is given. Add three voices in the right hand above each bass note, one chord at a time, so that the chords connect smoothly.'
key: C major
bass: 'c4 f g c |'
numerals: [I, IV, V, I]
example: ['C3 E4 G4 C5', 'F3 F4 A4 C5', 'G3 D4 G4 B4', 'C3 E4 G4 C5']
hints:
  - 'Keep the notes two chords share in the same voice, and move the others to the nearest note of the next chord.'
```
:::

## Four lines, not four notes

Until now a chord has been a shape under the hand. From here on it is also something else: four separate
melodies sounding together, each moving to its next note. A hymn sung by a choir works like this, and so does
almost all keyboard music of the 18th and 19th centuries, even when nobody sings it. The craft of moving those
lines well is **voice leading**, and Part III is about it.

The four voices are named after the choir: **soprano** (highest), **alto**, **tenor** and **bass** (lowest),
**SATB** for short. Written on a grand staff, soprano and alto share the treble staff (soprano stems up, alto
stems down) and tenor and bass share the bass staff.

```score caption="A phrase written for the course, in four voices (SATB): soprano and alto on the treble staff, tenor and bass on the bass staff." tempo="72"
\key d \major \time 4/4 \staff treble f#''4 g''4 e''4 d''4 | \voice a'4 b'4 a'4 f#'4 | \staff bass d'4 d'4 c#'4 d'4 | \voice d4_"I" g4_"IV" a4_"V" d4_"I" |
```

| Voice | Range | Written on |
| --- | --- | --- |
| soprano | :n[C4] to :n[G5] | treble staff, stems up |
| alto | :n[G3] to :n[D5] | treble staff, stems down |
| tenor | :n[C3] to :n[G4] | bass staff, stems up |
| bass | :n[E2] to :n[C4] | bass staff, stems down |

### Keyboard style

Pianists usually play four-part harmony in **keyboard style**: the bass alone in the left hand, the three upper
voices in the right. The right hand can only stretch about an octave, so in keyboard style the three upper
voices stay within an octave of each other. That is the style of the course’s exercises unless they say
otherwise.

```score caption="The same chords in keyboard style: three voices in the right hand, the bass in the left. Keeping the right hand together moves the inner voices, and the melody now ends on :n[F#], with the :t[leading note] rising to :n[D] beneath it." tempo="72"
\key d \major \time 4/4 \staff treble <a' d'' f#''>4 <b' d'' g''>4 <a' c#'' e''>4 <a' d'' f#''>4 | \staff bass d4 g4 a4 d4 |
```

## Spacing and doubling

A triad has three notes and there are four voices, so one note is **doubled** (sung by two voices). Two
guidelines produce a good sound most of the time:

- **Spacing:** keep adjacent upper voices (soprano–alto, alto–tenor) within an octave of each other. The bass
  may be further below the tenor. Wide gaps higher up sound hollow; gaps low down sound natural, as in the
  harmonic series (Chapter 8).
- **Doubling:** in a root-position chord, double the **root**. Never double the **leading note**: it wants to
  rise to the tonic, and two voices doing that move in octaves. In a first-inversion chord, double any note
  except the leading note; the soprano’s note is often a good choice.

The fifth is the one note that can be left out. A chord without its third is hollow, a chord without its root
is a different chord, and a chord without its fifth hardly sounds different.

```quiz
q: 'A root-position :c[G] chord in :n[C] major, in four voices. Which note should not be doubled?'
options:
  - text: ':n[B], the leading note of :n[C] major.'
    correct: true
  - text: ':n[G], the root.'
    why: 'The root is the best note to double in a root-position chord.'
  - text: ':n[D], the fifth.'
    why: 'Doubling the fifth is fine; the fifth can even be left out.'
```

:::note[A stopping point]
Four voices, their ranges, and what to double. Next: how the voices move.
:::

## Four kinds of motion

Any two voices moving from one chord to the next do one of four things:

- **parallel:** the same direction, keeping the same interval;
- **similar:** the same direction, changing the interval;
- **contrary:** opposite directions;
- **oblique:** one voice holds its note while the other moves.

```score caption="Two voices: parallel, similar, contrary and oblique motion." tempo="80"
\time 2/4 \staff treble e''4^"parallel" f''4 \bar "||" | e''4^"similar" a''4 \bar "||" | e''4^"contrary" f''4 \bar "||" | e''4^"oblique" e''4 | \voice c''4 d''4 | c''4 d''4 | c''4 a'4 | c''4 g'4 |
```

Contrary and oblique motion keep the lines independent: the ear hears two melodies. Parallel motion in thirds
and sixths is sweet and very common. The trouble is parallel motion in the **perfect** intervals.

## Parallel fifths and octaves

Two voices a perfect fifth apart that both move to another perfect fifth make **parallel fifths**; the same with
octaves (or unisons) makes **parallel octaves**. Common-practice composers avoided both between any two voices.
The reason is in the sound: the perfect fifth and the octave are the most blended intervals (Chapter 8), and two
voices moving in them fuse into one thicker line, so four voices momentarily sound like three. Parallel octaves
make one voice a mere copy of another.

Hear it. In the first pair the right hand moves up with the bass from IV to V: soprano and bass move in
fifths, so do soprano and tenor, and tenor and bass move in octaves. In the second pair the right hand moves
down instead, against the bass, and every pair changes its interval:

```score caption="IV – V twice in :n[C] major: with parallel octaves and fifths (the right hand follows the bass up), then without (it moves down, against the bass)." tempo="60"
\time 4/4 \staff treble <f' a' c''>2 <g' b' d''>2 \bar "||" <f' a' c''>2 <d' g' b'>2 | \staff bass f2_"IV" g2_"V" | f2_"IV" g2_"V" |
```

The rule is about **perfect** intervals moving in parallel; parallel thirds and sixths are fine, and so is a
fifth held still or a fifth followed by a different interval. Two relatives of the rule are worth knowing:

- **Consecutive fifths or octaves by contrary motion** (a fifth to a twelfth, voices moving apart) are heard
  much like parallels. Avoid them except at a final cadence, where the bass often leaps an octave.
- **Hidden** (or **direct**) **fifths and octaves:** the outer voices moving the same way *into* a fifth or
  octave, with the soprano leaping. The arrival is exposed. With the soprano moving by step, the effect is mild
  and allowed.

:::history[Rules from the singers]
The ban on parallel perfect intervals goes back to the late Middle Ages, when composers wanted the voices of a
mass or a motet to be heard as independent lines. Its classic statement is Johann Joseph Fux’s counterpoint
textbook *Gradus ad Parnassum* (1725), from which Haydn taught himself and, later, taught Beethoven. Pop and rock break it constantly:
the power chord is a parallel fifth by design. The rule describes a style, not a law of sound.
:::

## Connecting chords

A reliable procedure gets you from any chord to the next in four voices:

1. **Write the bass.** It moves freely, by step or by leap.
2. **Keep the common tones.** If the two chords share a note, keep it in the same voice.
3. **Move the other voices to the nearest note** of the new chord, by step if possible.
4. **Check the outer voices and the tendency tones.** The leading note in the soprano rises to the tonic; the
   seventh of a seventh chord falls by step (Chapter 14).
5. **Look for parallels** between every pair of voices, and fix them by moving the upper voices in contrary
   motion to the bass.

When the chords share no notes (IV to V, say), step 2 gives nothing, and step 3 can make the voices move with
the bass in parallels. That is why step 5 says to move the upper voices against the bass: down when the bass
goes up.

```realise
id: four-voices/g-major
title: A phrase in G major
prompt: 'I – vi – IV – V – I over the given bass, in keyboard style. Watch the step from IV to V.'
key: G major
bass: 'g,2 e, | c d | g,1 |'
numerals: [I, vi, IV, V, I]
example: ['G2 D4 G4 B4', 'E2 E4 G4 B4', 'C3 E4 G4 C5', 'D3 D4 F#4 A4', 'G2 D4 G4 B4']
hints:
  - 'From I to vi, two notes stay put: :n[G] and :n[B]. Only one voice moves, :n[D] up to :n[E].'
  - 'From IV (:n[C] :n[E] :n[G]) to V (:n[D] :n[F#] :n[A]) there are no common tones. The bass goes up, so move the right hand down.'
```

```realise
id: four-voices/harmonise
title: Harmonise a melody, SATB
prompt: 'The soprano is given. Add alto, tenor and bass for I – IV – V – I in :n[D] major, in vocal ranges and spacing. Play each chord with both hands.'
key: D major
style: satb
soprano: "f#''4 g'' e'' d'' |"
numerals: [I, IV, V, I]
range: [36, 84]
example: ['D3 D4 A4 F#5', 'G3 D4 B4 G5', 'A3 C#4 A4 E5', 'D3 D4 F#4 D5']
hints:
  - 'Start with the bass: the roots :n[D], :n[G], :n[A], :n[D]. Then the inner voices, nearest note first.'
  - 'In V, the tenor can take the :t[leading note] :n[C#4] and rise to :n[D4] in the last chord.'
```

```perform
id: four-voices/play-phrase
title: Play the phrase
prompt: 'The SATB phrase from the start of the chapter, at your own pace: soprano and alto in the right hand, tenor and bass in the left.'
mode: notes
range: [40, 84]
score: |
  \key d \major \time 4/4 \staff treble f#''4 g''4 e''4 d''4 | \voice a'4 b'4 a'4 f#'4 | \staff bass d'4 d'4 c#'4 d'4 | \voice d4 g4 a4 d4 |
```

:::key
- Four-part harmony is four melodies: **soprano, alto, tenor, bass** (SATB). In **keyboard style** the right hand
  plays the upper three.
- Keep adjacent upper voices within an octave. Double the **root** of a root-position chord; never the
  **leading note**. The fifth may be left out.
- Motion is **parallel, similar, contrary or oblique**. Avoid **parallel fifths and octaves**; watch hidden ones
  in the outer voices.
- To connect chords: bass first, keep common tones, move the rest to the nearest note, resolve tendency tones,
  move against the bass when there are no common tones.
:::
