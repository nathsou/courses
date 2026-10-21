---
number: 30
title: Fugue
summary: Subject, answer, episode and stretto in Bach’s C major fugue. Korobeiniki V.
duration: 55 minutes
prerequisites: [sonata-rondo-variations]
skills:
  - Fugue
  - Ternary arrangement
---

:::check
```quiz
q: 'In a fugue, what is the answer?'
options:
  - text: 'The subject played by the second voice to enter, usually transposed to the dominant.'
    correct: true
  - text: 'A contrasting theme that replies to the subject in the tonic.'
    why: 'The answer is the subject itself, in another voice and usually at the dominant, not a new theme.'
  - text: 'The final cadence.'
    why: 'The answer comes at the very start: it is the second entry of the subject.'
```
:::

## Imitation made into a form

A **fugue** is a contrapuntal piece built on one theme, the **subject**, which the voices take up one after another.
It is less a fixed form than a procedure, and Bach is its master: his *Well-Tempered Clavier* (Book I 1722,
Book II about 1742) has a prelude and fugue in every major and minor key, 48 of each. Chapter 20’s canon was strict
imitation all the way through; a fugue imitates only the subject, and lets the voices go their own way in between.

The vocabulary:

- **Subject:** the theme, stated alone by the first voice.
- **Answer:** the subject in the second voice, transposed to the dominant. A **real answer** is an exact
  transposition; a **tonal answer** alters a note or two so that the answer stays close to the home key.
- **Countersubject:** a line that the first voice plays against the answer, and that returns with later entries.
- **Exposition:** the opening, until every voice has entered with the subject or answer.
- **Episode:** a passage without the complete subject, often a sequence (Chapter 22) built from a fragment of it,
  usually modulating to the key of the next entry.
- **Stretto:** entries that overlap, a new voice starting the subject before the last has finished. Often saved
  for the end, for intensity.

## Bach, Fugue in C major (WTC I)

The first fugue of the *Well-Tempered Clavier*, BWV 846, is for four voices. Its subject is a long rising and
falling line:

```perform
id: fugue/subject
title: Play the subject
prompt: 'The subject alone, right hand, at your own pace. Take the quick turn (:n[F] :n[G] :n[F]) lightly, then lean on the :n[A].'
mode: notes
range: [55, 79]
score: |
  \key c \major \time 4/4 r8 c'8 d'8 e'8 f'8. g'32 f'32 e'8 a'8 | d'8 g'8~ g'16 a'16 g'16 f'16 e'2 |
```

```score caption="Bach, Fugue in C major, BWV 846, bars 1–7: alto (subject), soprano (answer), tenor (answer), bass (subject), and the first stretto. Notes from the Mutopia Project’s public-domain edition." tempo="60"
\key c \major \time 4/4 \staff treble r1 | r2 r8 g'8^"answer" a'8 b'8 | c''8. d''32 c''32 b'8 e''8 a'8 d''8~ d''16 e''16 d''16 c''16 | b'16 g'16 a'16 b'16 c''16 b'16 c''16 d''16 e''16 d''16 e''16 f#''16 g''8 b'8 | c''8 a'8 d''16 c''16 b'16 a'16 g'8. g'16 f'16 e'16 f'16 g'16 | a'16 g'16 a'16 b'16 c''2 b'4 | r8 c''8^"stretto" d''8 e''8 f''8. g''32 f''32 e''8 a''8 | \voice r8 c'8^"subject" d'8 e'8 f'8. g'32 f'32 e'8 a'8 | d'8 g'8~ g'16 a'16 g'16 f'16 e'16 f'16 e'16 d'16 c'16 d'16 c'16 b16 | a8 f#'8 g'4~ g'8 f#'16 e'16 f#'8 d'8 | g'8 f'8 e'8 d'8 c'8 r8 r8 g'8~ | g'8 f'16 e'16 f'4~ f'16 f'16 e'8 d'4 | c'8 f'8 r16 g'16 f'16 e'16 f'8 d'8 g'4~ | g'4 r4 r2 | \staff bass r1 | r1 | r1 | r8 g8_"answer" a8 b8 c'8. d'32 c'32 b8 e'8 | a8 d'8~ d'16 e'16 d'16 c'16 b8 c'8~ c'8 bb8 | a8 d'8 g8 c'8 r16 a16 b16 c'16 d'4 | g4 r8 g8 a8 b8 c'8. d'32 c'32 | \voice r1 | r1 | r1 | r1 | r2 r8 c8_"subject" d8 e8 | f8. g32 f32 e8 a8 d8 g8~ g16 a16 g16 f16 | e16 f16 e16 d16 c16 d16 c16 b,16 a,8 d8 a8 f#8 |
```

- **Bar 1:** the alto states the subject, from :n[C4].
- **Bar 2:** the soprano answers on :n[G4]: a real answer, every interval the same.
- **Bar 4:** the tenor enters on :n[G3]; **bar 5:** the bass on :n[C3]. With four entries the exposition is complete.
- **Bar 7:** the soprano starts the subject again, and a beat and a half later the tenor starts it too: a stretto.

This fugue is unusual in having no regular countersubject and almost no episodes: the subject is nearly always
sounding somewhere, often in stretto. Many other fugues of the *Well-Tempered Clavier* are built the other way,
with clear episodes between groups of entries.

```ear
id: fugue/count-entries
title: Subject or answer?
prompt: 'The opening of the subject, from :n[C], or the same shape from another note. Is it the subject (from :n[C]) or the answer (from :n[G])?'
kind: custom
options: [Subject (from C), Answer (from G)]
items:
  - play: [C4, D4, E4, F4, E4, A4, D4, G4]
    answer: Subject (from C)
  - play: [G4, A4, B4, C5, B4, E5, A4, D5]
    answer: Answer (from G)
  - play: [C5, D5, E5, F5, E5, A5, D5, G5]
    answer: Subject (from C)
  - play: [G3, A3, B3, C4, B3, E4, A3, D4]
    answer: Answer (from G)
rounds: 6
pass: 5
hints:
  - 'Sing the first note back, then find it on the keyboard: :n[C] or :n[G]?'
```

:::note[A stopping point]
Subject, answer, exposition, episode, stretto. Last, Korobeiniki in a named form.
:::

## Korobeiniki V: ternary form

The fifth arrangement puts Korobeiniki into a ternary form (Chapter 28). **A** is the tune in :n[A] minor, played as in
Korobeiniki III or IV. **B** is a contrasting middle section written for the course: in :n[C] major (the relative
major), in long notes instead of quick ones, and ending on :c[E7], the dominant of :n[A] minor, ready for the return.
Then **A** again.

```score caption="Korobeiniki V, the B section: :n[C] major, slow notes, ending on the dominant of :n[A] minor." tempo="84"
\time 4/4 \staff treble g''2 e''2 | f''2 d''2 | e''4 g''4 c'''4 g''4 | a''2 f''2 | f''4 a''4 d''4 f''4 | e''4 g''4 c''4 e''4 | d''4 b'4 g#'4 b'4 | e''1 | \staff bass c2_"I" g2 | g,2_"V7" d2 | c2_"I" e2 | f,2_"IV" c2 | d2_"ii" a2 | c2_"I" g2 | e,2_"a: V7" b,2 | <e, b, d>1 |
```

```perform
id: fugue/korobeiniki-5
title: Korobeiniki V
prompt: 'Play A (Korobeiniki III or IV, :n[A] minor), then this B section, then A again. Here: the B section, hands together, at your own pace.'
mode: notes
range: [40, 84]
score: |
  \time 4/4 \staff treble g''2 e''2 | f''2 d''2 | e''4 g''4 c'''4 g''4 | a''2 f''2 | f''4 a''4 d''4 f''4 | e''4 g''4 c''4 e''4 | d''4 b'4 g#'4 b'4 | e''1 | \staff bass c2 g2 | g,2 d2 | c2 e2 | f,2 c2 | d2 a2 | c2 g2 | e,2 b,2 | <e, b, d>1 |
```

:::key
- A **fugue** develops one **subject** through imitation: the **answer** at the dominant, an **exposition** in which
  every voice enters, **episodes** without the subject, and **strettos** where entries overlap.
- A **real answer** transposes the subject exactly; a **tonal answer** adjusts it to stay near the home key.
- Bach’s C major fugue (WTC I) has four voices, a real answer, almost no episodes and many strettos.
- **Ternary form** (ABA) frames a contrasting middle between two statements of the same music.
:::
