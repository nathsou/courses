---
number: 35
title: Improvising
summary: Guide tones, chord tones on strong beats, approach notes and the blues scale.
duration: 60 minutes
prerequisites: [modes]
skills:
  - Improvising
---

:::check
```quiz
q: 'Over :c[G7], which note makes a chromatic approach to its third, from below?'
options:
  - text: ':n[A#] (or :n[Bb]), a semitone below :n[B].'
    correct: true
  - text: ':n[C], a semitone above :n[B].'
    why: ':n[C] approaches :n[B] from above, and by a diatonic semitone; “from below” means the semitone underneath.'
  - text: ':n[A], a tone below :n[B].'
    why: ':n[A] is a scale step below :n[B]: a diatonic approach, not a chromatic one.'
```
:::

## Composing in real time

Improvising is composing on the spot, and it uses everything in this course: the chords tell you which notes are
stable, the scale fills the gaps, rhythm and phrasing make it music. Nobody starts with fast runs. Start with a few
notes, plenty of space, and a clear relation to the chords; this chapter gives four tools for that, and two
backing tracks to try them on.

## Guide tones

Chapter 32 found the **guide tones**, the thirds and sevenths, moving by step through ii–V–I. They make the best
skeleton for a solo: a line of long notes that spells out every chord change even with no accompaniment at all.

```perform
id: improvising/guide-tones
title: The guide tones of ii – V – I
prompt: 'Right hand: the two guide-tone lines together, one chord per :t[bar]. Left hand: the roots. At your own pace, then sing or play just the top line over the backing below.'
mode: notes
range: [48, 79]
score: |
  \time 4/4 \staff treble <f' c''>1 | <f' b'>1 | <e' b'>1 | <e' b'>1 | \staff bass d1 | g,1 | c1 | c1 |
```

## Chord tones on strong beats

Lines sound “inside” the harmony when chord tones fall on the strong beats (1 and 3) and the notes between them move
by step: exactly the passing notes of Chapter 16. Arpeggios give the chord tones; scales give the steps between.

## Approach notes

A note just before a chord tone, a step away, is an **approach note**. From below, a semitone under the target, it can
be **chromatic** (outside the key); from above it is usually a scale step. Two approach notes around a target, one
above and one below, make an **enclosure**. Because they resolve at once, approach notes can be “wrong” notes: the ear
hears where they are going.

```score caption="A line over ii – V – I in :n[C], written for the course. Chord tones fall on beats 1 and 3; the :n[D#] at the end of :t[bar] 2 is a chromatic approach to :n[E], the third of :c[Cmaj7]." tempo="120"
\time 4/4 \staff treble f''8^"Dm7" e''8 d''8 c''8 a'8 c''8 e''8 g''8 | f''8^"G7" e''8 d''8 b'8 g'8 b'8 d''8 d#''8 | e''4^"Cmaj7" b'8 c''8 b'8 g'8 e'8 g'8 | c''1 | \staff bass d2 a,2 | g,2 d2 | c2 g,2 | c1 |
```

```improvise
id: improvising/ii-v-i
title: Improvise over ii – V – I
prompt: 'Over :c[Dm7] – :c[G7] – :c[Cmaj7] – :c[Cmaj7], start with the guide tones in long notes; then add chord tones on beats 1 and 3, and approach notes into them. Leave gaps.'
chart: [Dm7, G7, Cmaj7, Cmaj7]
tempo: 100
choruses: 4
range: [55, 84]
hints:
  - 'A first take: one note per :t[bar], the guide tone :n[C] – :n[B] – :n[B] – :n[B], in any rhythm. A second take: two notes per :t[bar]. Then let go.'
```

:::note[A stopping point]
Guide tones, chord tones, approach notes. Last, the blues.
:::

## The blues scale

Start from the **minor pentatonic**, a five-note scale with no semitones: the natural minor scale without its second
and sixth, :n[C] :n[Eb] :n[F] :n[G] :n[Bb] on :n[C]. (Its relative, the **major pentatonic**, :n[C] :n[D] :n[E] :n[G] :n[A], has the
same shape as the five black keys, and is the scale of a great many folk tunes.) Add one note, the flattened fifth, and you have the
**blues scale**: :n[C] :n[Eb] :n[F] :n[Gb] :n[G] :n[Bb]. Its :n[Eb], :n[Gb] and :n[Bb] are the **blue notes**, ♭3, ♭5 and ♭7, sung and played between major and
minor; on the piano, which cannot bend a note, players often crush a blue note against the note above (:n[Eb] into
:n[E]) or slide off it.

::scale-explorer{tonic="C" kind="blues" kinds="blues,minor-pentatonic,major-pentatonic" tonics="C,F,G,A,E" title="The blues scale" subtitle="The minor pentatonic with a flattened fifth added. Over a whole 12-:t[bar] blues one blues scale, on the tonic, fits every chord."}

The blues scale’s great convenience is that one scale, on the key’s tonic, works over the whole 12-:t[bar] blues: its
clashes with the major thirds of the chords are exactly the blues sound. As your ear grows, mix it with the chord
tones of each chord, especially the third of :c[F7] (:n[A]) and of :c[G7] (:n[B]), where the harmony changes.

```improvise
id: improvising/blues
title: A blues in C
prompt: 'Twelve :t[bar]s of blues in :n[C]. Use the :n[C] blues scale throughout. Try a short phrase, repeat it, then answer it: the AAB of the blues lyric (Chapter 28).'
chart: [C7, F7, C7, C7, F7, F7, C7, C7, G7, F7, C7, G7]
tempo: 96
choruses: 2
range: [55, 84]
```

:::key
- **Guide tones** (thirds and sevenths) make a skeleton line that spells out the changes.
- Put **chord tones on strong beats** and connect them by step.
- **Approach notes**, chromatic from below or diatonic from above, and **enclosures** resolve into chord tones.
- The **blues scale** (1 ♭3 4 ♭5 5 ♭7) fits a whole blues; its **blue notes** are ♭3, ♭5 and ♭7.
:::
