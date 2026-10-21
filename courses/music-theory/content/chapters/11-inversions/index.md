---
number: 11
title: Inversions and the hand
summary: Inversions, slash chords and voicings that keep the hand still.
duration: 40 minutes
prerequisites: [triads]
skills:
  - Inversions
  - Smooth voicings
---

:::check
```play
id: inversions/check-1
title: Three positions
prompt: 'Play :c[F] in root position from :n[F4], in first inversion from :n[A3], and in second inversion from :n[C4].'
range: [52, 76]
steps:
  - notes: [F4, A4, C5]
    label: F
  - notes: [A3, C4, F4]
    label: F/A
  - notes: [C4, F4, A4]
    label: F/C
```
:::

## Same notes, different order

A triad does not have to be played with its root at the bottom. :n[C] :n[E] :n[G] can be played as
:n[E] :n[G] :n[C] or :n[G] :n[C] :n[E], and it is still a :c[C] chord: the same three notes, rearranged. What
changes is the **bass**, the lowest note, and the bass decides how the chord sounds and what it can do.

- **Root position:** the root in the bass (:n[C] :n[E] :n[G]).
- **First inversion:** the third in the bass (:n[E] :n[G] :n[C]).
- **Second inversion:** the fifth in the bass (:n[G] :n[C] :n[E]).

```score caption=":c[C] in root position, first inversion and second inversion. Listen to the bass." tempo="60"
\hidetime \time 3/4 <c' e' g'>4 <e' g' c''>4 <g' c'' e''>4 |
```

Root position sounds solid and final; it is where pieces end. First inversion is lighter and smoother,
good in the middle of a phrase. Second inversion is the least stable of the three and has special jobs
(Chapter 21 is about them). What counts is the bass only: :n[C] :n[G] :n[E] with :n[C] at the bottom is
still root position, however the upper notes are arranged.

### How inversions are written

Pop and jazz musicians write an inversion as a **slash chord**: the chord, a slash, and the bass note.
:c[C/E] is :c[C] with :n[E] in the bass; :c[C/G] has :n[G] in the bass. Classical analysis adds small figures
to the Roman numeral, from figured bass (Chapter 21): **I** for root position, **I6** for first inversion
(the root is a sixth above the bass), **I64** for second inversion (a sixth and a fourth above the bass).

```quiz
q: 'Which is :c[G/B]?'
options:
  - text: 'A :c[G] major triad in first inversion: :n[B] :n[D] :n[G]'
    correct: true
    why: ':n[B] is the third of :c[G], so :n[B] in the bass is first inversion.'
  - text: 'A :c[G] major triad with an added :n[B] at the top'
    why: 'The slash names the bass, the lowest note.'
  - text: 'Two chords, :c[G] then :c[B]'
    why: 'A slash chord is one chord over a bass note.'
```

```play
id: inversions/all-positions
title: Every inversion
prompt: 'Play :c[G] in root position from :n[G3], then first inversion from :n[B3], then second inversion from :n[D4]. Then the same for :c[Am], from :n[A3].'
range: [52, 76]
steps:
  - notes: [G3, B3, D4]
    label: G
  - notes: [B3, D4, G4]
    label: G/B
  - notes: [D4, G4, B4]
    label: G/D
  - notes: [A3, C4, E4]
    label: Am
  - notes: [C4, E4, A4]
    label: Am/C
  - notes: [E4, A4, C5]
    label: Am/E
```

:::note[A stopping point]
Inversions are rearrangements; the bass names them. The rest of the chapter is about why pianists love them.
:::

## Moving less

Play I – IV – V – I in :n[C] major with every chord in root position, and the right hand jumps: :n[C] :n[E]
:n[G], up to :n[F] :n[A] :n[C], up again to :n[G] :n[B] :n[D], down to :n[C]. Now notice that each chord shares
notes with the next. :c[C] and :c[F] share :n[C]; :c[F] and :c[G] share nothing, but every note of :c[G] is a
step from a note of :c[F]; :c[G] and :c[C] share :n[G]. Keep the shared notes where they are, move the others
by the smallest step, and the right hand hardly moves at all.

::voice-motion

That is **voice leading**: treating the notes of a chord as separate voices, each moving as smoothly as it
can. It is the single most useful idea in piano harmony, and Part III is devoted to it. The left hand takes
the roots, so the chords keep their identity while the right hand glides between inversions.

```perform
id: inversions/i-iv-v-i
title: I – IV – V – I with the hands apart
prompt: 'Left hand plays the roots; right hand plays the nearest voicings. At your own pace; each chord moves on when both hands are right.'
mode: notes
range: [41, 76]
score: |
  \time 4/4 \staff treble <c' e' g'>1 | <c' f' a'>1 | <b d' g'>1 | <c' e' g'>1 | \staff bass c1 | f,1 | g,1 | c1 |
```

```perform
id: inversions/loop
title: The prologue’s loop, voiced
prompt: 'I – V – vi – IV in :n[G] major, with the left hand on the roots and the right hand moving as little as possible. In time, two beats per chord.'
mode: both
tempo: 72
range: [40, 76]
score: |
  \time 4/4 \key g \major \staff treble <b d' g'>2 <a d' f#'>2 | <b e' g'>2 <c' e' g'>2 | <b d' g'>1 | \staff bass g,2 d2 | e2 c2 | g,1 |
hints:
  - 'From :c[G] (:n[B3] :n[D4] :n[G4]) to :c[D]: :n[D4] stays, :n[B3] steps down to :n[A3], :n[G4] steps down to :n[F#4].'
```

## Close and open position

So far all three notes of each chord have been packed into one hand, as close together as possible: **close
position**. Spread them out, for instance root and fifth in the left hand and the third an octave higher in
the right, and the chord is in **open position**. Open voicings sound fuller and warmer, close voicings
brighter and tighter. A common piano texture combines the two: the left hand plays the root (or root and
fifth) low, and the right hand plays a close triad above.

```score caption="The same :c[C] chord in close position, and in open position across the hands." tempo="60"
\hidetime \time 2/4 \staff treble <c' e' g'>4 <e' c''>4 | \staff bass s4 <c g>4 |
```

```play
id: inversions/open
title: Open position
prompt: 'Play :c[F] in open position: :n[F2] and :n[C3] in the left hand, :n[A3] :n[F4] :n[C5]… or any spread voicing you like with :n[F] in the bass.'
range: [36, 84]
steps:
  - chord: F
    label: F, any voicing
```

:::key
- An **inversion** puts a note other than the root in the bass: the third (first inversion) or the fifth (second).
- Slash chords name the bass: :c[C/E] is :c[C] in first inversion. Figures do the same for numerals: I6, I64.
- Choosing inversions so that each note moves as little as possible is **voice leading**; on the piano it
  keeps the hand nearly still.
- **Close position** packs a chord within an octave; **open position** spreads it out.
:::
