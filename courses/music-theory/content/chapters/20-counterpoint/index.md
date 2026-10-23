---
number: 20
title: 'Two voices: counterpoint'
summary: First and second species, Bach’s Invention in C, and Korobeiniki as a canon.
duration: 55 minutes
prerequisites: [four-voices]
skills:
  - Two-part counterpoint
  - Imitation
---

:::check
```quiz
q: 'Two voices, note against note. Which of these intervals between them is a dissonance?'
options:
  - text: 'A fourth.'
    correct: true
  - text: 'A sixth.'
    why: 'Thirds and sixths are the imperfect consonances, the sweetest intervals in two voices.'
  - text: 'A fifth.'
    why: 'The fifth is a perfect consonance (Chapter 8).'
  - text: 'A tenth.'
    why: 'A tenth is a third plus an octave: a consonance.'
```
:::

## Point against point

Chapter 19 built music from chords and then moved their notes. **Counterpoint** works the other way round: it
starts from melodies, two or more of them at once, each a good tune on its own, and lets the harmony arise
where they meet. The name comes from the Latin *punctus contra punctum*, note against note.

For about two hundred years composers learnt it from one book, Johann Joseph Fux’s *Gradus ad Parnassum*
(1725). Fux sets a slow given melody, the **cantus firmus** (fixed song), and asks the student to write a
second line against it, first one note against each of its notes, then two, then four, then with
syncopations. These steps are the **species** of counterpoint. The first two are enough to hear what makes
two lines independent.

## First species: note against note

One note in the counterpoint for each note of the cantus firmus. Every interval between them must be a
**consonance**, and consonances come in two kinds:

| Perfect consonances | Imperfect consonances | Dissonances |
| --- | --- | --- |
| unison, fifth, octave | thirds, sixths | seconds, fourths, sevenths, the tritone |

The fourth counts as a dissonance here: between two voices it is the interval above the bass that wants to
resolve (Chapter 21 shows where that comes from). Then a handful of rules, all aimed at independence:

- Begin on a perfect consonance and end on an octave (or unison), the last step being the :t[leading note]
  rising to the tonic in one voice while the other falls from the second degree.
- Prefer **imperfect consonances** in the middle: they keep the voices distinct. Use the unison only at the ends.
- Never move from one perfect consonance to another of the same size in parallel (Chapter 19), and approach
  perfect consonances by contrary or oblique motion.
- Prefer **contrary motion**. Keep each line singable: mostly steps, a few leaps, each leap followed by a step
  the other way, one high point.

```score caption="First species: a cantus firmus written for the course (lower voice) and a counterpoint above it. The numbers are the intervals between the voices." tempo="80"
\time 4/4 \staff treble c'1^"8" | b1^"6" | d'1^"6" | e'1^"8" | c'1^"3" | b1^"3" | a1^"3" | c'1^"6" | b1^"6" | c'1^"8" | \staff bass c1 | d1 | f1 | e1 | a1 | g1 | f1 | e1 | d1 | c1 |
```

Read the intervals: an octave, two sixths, an octave reached by contrary motion, three thirds, two sixths, and
the final octave, also approached by contrary motion (:n[B3] up to :n[C4] above, :n[D3] down to :n[C3] below).
Three thirds in a row are fine; three fifths would not be. The upper line has one high point, :n[E4].

```realise
id: counterpoint/first-species
title: Write a counterpoint
prompt: 'Write your own first-species counterpoint above the cantus firmus: one note against each of its notes, both played together. Start on an octave or a fifth above :n[C3], end on the octave.'
key: C major
style: species
bass: 'c1 | d | f | e | a | g | f | e | d | c |'
range: [43, 79]
tempo: 80
example: ['C4 C3', 'B3 D3', 'D4 F3', 'E4 E3', 'C4 A3', 'B3 G3', 'A3 F3', 'C4 E3', 'B3 D3', 'C4 C3']
hints:
  - 'Work backwards from the end: the last two notes are :n[B3] then :n[C4] (a sixth, then the octave).'
  - 'When the cantus firmus goes up, try going down. Thirds and sixths are always safe; check every fifth and octave for parallels.'
```

:::note[A stopping point]
Consonance, independence and the first species. Next: letting a dissonance in.
:::

## Second species: two against one

Now the counterpoint has two notes for each note of the cantus firmus. On the strong beat (the first of the two)
the interval must still be a consonance. On the weak beat a dissonance is allowed, on one condition: it is a
**passing note**, reached by step and left by step in the same direction (Chapter 16). This is the first
dissonance tonal music tames, and the rule behind it, *dissonance on the weak beat, moving by step*, holds for
centuries of music after Fux.

```score caption="Second species over the same cantus firmus. P marks a passing dissonance; every strong beat is a consonance." tempo="88"
\time 4/4 \staff treble c'2 b2^"P" | a2 b2 | c'2 d'2 | e'2 d'2^"P" | c'2 f'2 | e'2 d'2 | a2 b2^"P" | c'2 g2 | a2 b2 | c'1 | \staff bass c1 | d1 | f1 | e1 | a1 | g1 | f1 | e1 | d1 | c1 |
```

```analyse
id: counterpoint/second-species
title: Consonant or passing?
prompt: 'Label each note of the upper voice: C if it makes a consonance with the cantus firmus, P if it is a passing dissonance.'
instruction: 'One label per note: C or P.'
per: note
score: |
  \time 4/4 \staff treble c'2 b2 | a2 b2 | c'2 d'2 | e'2 d'2 | c'2 f'2 | e'2 d'2 | a2 b2 | c'2 g2 | a2 b2 | c'1 | \staff bass c1 | d1 | f1 | e1 | a1 | g1 | f1 | e1 | d1 | c1 |
answers: [C, P, C, C, C, C, C, P, C, C, C, C, C, P, C, C, C, C, C]
hints:
  - 'Work out the interval above the lower note, counting letters: :n[B3] over :n[C3] is a seventh, a dissonance; :n[A3] over :n[D3] is a fifth.'
```

## Bach’s Invention in C

Johann Sebastian Bach wrote his fifteen two-part **Inventions** (1723) for his son Wilhelm Friedemann and his
pupils, “to learn to play cleanly in two parts” and “to acquire a strong foretaste of composition”, as his
title page says. The first, in :n[C] major (BWV 772), grows almost entirely from the half :t[bar] it starts with.

```score caption="Bach, Invention No. 1 in C major, BWV 772, bars 1–7 (ornaments omitted). Notes from the Bach-Gesellschaft edition." tempo="66"
\key c \major \time 4/4 \staff treble r16 c'16^"subject" d'16 e'16 f'16 d'16 e'16 c'16 g'8 c''8 b'8 c''8 | d''16 g'16 a'16 b'16 c''16 a'16 b'16 g'16 d''8 g''8 f''8 g''8 | e''16 a''16^"inverted" g''16 f''16 e''16 g''16 f''16 a''16 g''16 f''16 e''16 d''16 c''16 e''16 d''16 f''16 | e''16 d''16 c''16 b'16 a'16 c''16 b'16 d''16 c''16 b'16 a'16 g'16 f#'16 a'16 g'16 b'16 | a'8 d'8 c''8. d''16 b'16 a'16 g'16 f#'16 e'16 g'16 f#'16 a'16 | g'16 b'16 a'16 c''16 b'16 d''16 c''16 e''16 d''16 b'32 c''32 d''16 g''16 b'8 a'16 g'16 | g'8 r8 r4 r16 g'16 a'16 b'16 c''16 a'16 b'16 g'16 | \staff bass r2 r16 c16_"subject" d16 e16 f16 d16 e16 c16 | g8 g,8 r4 r16 g16 a16 b16 c'16 a16 b16 g16 | c'8 b8 c'8 d'8 e'8 g8 a8 b8 | c'8 e8 f#8 g8 a8 b8 c'4~ | c'16 d16 e16 f#16 g16 e16 f#16 d16 g8 b,8 c8 d8 | e8 f#8 g8 e8 b,8. c16 d8 d,8 | r16 g,16 a,16 b,16 c16 a,16 b,16 g,16 d8 g8 f#8 g8 |
```

Follow the **subject**, the seven semiquavers after the opening rest (:n[C] :n[D] :n[E] :n[F] :n[D] :n[E] :n[C]):

- **Bar 1:** the right hand states it; two beats later the left hand **imitates** it an octave lower, while the
  right hand plays a quaver figure against it.
- **Bar 2:** both hands do the same again, starting on :n[G], the dominant.
- **Bars 3–4:** the right hand turns the subject upside down (**inversion**: every step up becomes a step down)
  and plays it four times, each a third lower than the last: a **sequence** (Chapter 22). The left hand
  accompanies in quavers.
- **Bars 5–7:** the music settles into :n[G] major, with :n[F#] as its :t[leading note], and comes to rest on
  :n[G] at the start of bar 7: the first section has modulated to the dominant (Chapter 24).

Listen for the two lines as two people talking: when one has the subject, the other answers or comments, and
they rarely move in the same rhythm at the same time.

```perform
id: counterpoint/invention-opening
title: The first two bars
prompt: 'Bars 1–2 of the Invention, hands together, at your own pace. Fingering for the subject in the right hand: 1 2 3 4 2 3 1, then 5 for :n[G4].'
mode: notes
range: [43, 84]
score: |
  \key c \major \time 4/4 \staff treble r16 c'16 d'16 e'16 f'16 d'16 e'16 c'16 g'8 c''8 b'8 c''8 | d''16 g'16 a'16 b'16 c''16 a'16 b'16 g'16 d''8 g''8 f''8 g''8 | \staff bass r2 r16 c16 d16 e16 f16 d16 e16 c16 | g8 g,8 r4 r16 g16 a16 b16 c'16 a16 b16 g16 |
```

:::note[A stopping point]
Imitation, inversion and a sequence, in seven bars of Bach. Last, the strictest kind of imitation.
:::

## Korobeiniki as a canon

A **canon** is imitation kept up all the way through: the second voice plays exactly the same melody as the
first, starting later, sometimes at a different pitch. *Frère Jacques* and *Row, Row, Row Your Boat* are canons
(rounds) at the unison; Pachelbel’s Canon is a canon in three violins (Chapter 22).

Not every melody makes a canon. Try Korobeiniki against itself, the second voice starting one beat later and
two octaves lower: on every strong beat the two voices meet in a consonance, and the clashes fall on weak beats
and pass quickly, like the passing notes of second species. The two voices never move in parallel fifths or
octaves.

```score caption="Korobeiniki as a canon at the double octave, one beat apart: the left hand plays the melody a beat after the right." tempo="88"
\time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass r4 e4 b,8 c8 d4 | c8 b,8 a,4 a,8 c8 e4 | d8 c8 b,4. c8 d4 | e4 c4 a,4 a,4~ | a,4 r8 d4 f8 a4 | g8 f8 e4. c8 e4 | d8 c8 b,4 b,8 c8 d4 | e4 c4 a,4 a,4 |
```

```perform
id: counterpoint/korobeiniki-canon
title: Play the canon
prompt: 'Hands together, at your own pace: the left hand is the right hand’s melody, a beat late and two octaves down. Practise the left hand alone first; then try it in time.'
mode: notes
range: [40, 84]
score: |
  \time 4/4 \key a \minor \staff treble e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 | \staff bass r4 e4 b,8 c8 d4 | c8 b,8 a,4 a,8 c8 e4 | d8 c8 b,4. c8 d4 | e4 c4 a,4 a,4~ | a,4 r8 d4 f8 a4 | g8 f8 e4. c8 e4 | d8 c8 b,4 b,8 c8 d4 | e4 c4 a,4 a,4 |
```

:::key
- **Counterpoint** combines independent melodies. Fux’s **species** teach it step by step against a
  **cantus firmus**.
- **First species:** note against note, consonances only, perfect consonances at the ends, imperfect ones in
  the middle, contrary motion preferred, no parallel fifths or octaves.
- **Second species:** two notes against one; the weak beat may be a dissonant **passing note**.
- **Imitation** repeats a subject in another voice; **inversion** turns it upside down; a **canon** imitates a
  whole melody.
:::
