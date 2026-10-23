---
number: 34
title: Modes as colours
summary: The modes of the major scale over a drone, modal pop and modal jazz.
duration: 50 minutes
prerequisites: [ii-v-i]
skills:
  - Modes
---

:::check
```quiz
q: 'Which mode is a major scale with a lowered seventh?'
options:
  - text: 'Mixolydian.'
    correct: true
  - text: 'Dorian.'
    why: 'Dorian is a minor mode: natural minor with a raised sixth.'
  - text: 'Lydian.'
    why: 'Lydian is major with a raised fourth.'
```
:::

## Seven scales from one

Play the white keys from :n[C] to :n[C]: the major scale. Now play the same white keys from :n[D] to :n[D]. The notes are
the same, but the pattern of tones and semitones starts in a different place, and the scale sounds quite different:
minor, but not quite the natural minor of Chapter 9. Each of the seven starting points gives a **mode**, and the
modes have Greek names, borrowed (with a historical muddle) from medieval theory:

| Mode | White keys from | Steps | Compared with |
| --- | --- | --- | --- |
| **Ionian** | :n[C] | T T S T T T S | the major scale |
| **Dorian** | :n[D] | T S T T T S T | natural minor with a raised 6th |
| **Phrygian** | :n[E] | S T T T S T T | natural minor with a lowered 2nd |
| **Lydian** | :n[F] | T T T S T T S | major with a raised 4th |
| **Mixolydian** | :n[G] | T T S T T S T | major with a lowered 7th |
| **Aeolian** | :n[A] | T S T T S T T | the natural minor scale |
| **Locrian** | :n[B] | S T T S T T T | minor with a lowered 2nd and 5th |

The useful way to think of a mode is not “the white keys from :n[D]” but as a colour of its own tonic: :n[D] Dorian,
:n[C] Dorian, :n[F#] Dorian, each a minor scale with one note changed. Ordered from brightest to darkest, each mode
flattens one more note than the last: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian.

## Over a drone

A mode only sounds like itself when its tonic is clear, and the simplest way to make it clear is a **drone**: the
tonic held underneath. Start the drone, play each mode on the same tonic, and listen for the characteristic note,
the one degree that makes it differ from plain major or minor.

::mode-drone{tonic="D" mode="dorian"}

```ear
id: modes/hear-mode
title: Which mode?
prompt: 'A mode, played up from its tonic. Which one?'
kind: scale
pool: [major, dorian, mixolydian, lydian, natural-minor, phrygian]
rounds: 10
pass: 7
hints:
  - 'First decide major or minor (listen to the third). Then listen for the characteristic note: a raised fourth (Lydian) or a lowered seventh (Mixolydian) in major; a raised sixth (Dorian) or a lowered second (Phrygian) in minor.'
```

```perform
id: modes/play-dorian
title: D Dorian, up and down
prompt: 'Right hand, at your own pace, over the drone if you like. Fingering as for :n[C] major: 1 2 3 1 2 3 4 5.'
mode: notes
range: [60, 79]
score: |
  \time 4/4 \hidetime d'4 e'4 f'4 g'4 | a'4 b'4 c''4 d''4 | c''4 b'4 a'4 g'4 | f'4 e'4 d'2 |
```

:::note[A stopping point]
Seven modes and their characteristic notes. Now: where you hear them.
:::

## Modal pop

Much popular music is modal rather than major or minor, especially music that vamps on two chords instead of
moving through a cadence. Each mode has a typical **vamp**, a pair of chords that contains its characteristic note:

| Mode | Vamp (on :n[D]) | Where you hear it |
| --- | --- | --- |
| Dorian | :c[Dm7] – :c[G7] (i – IV) | “Scarborough Fair” (traditional); Santana’s “Oye Como Va” |
| Mixolydian | :c[D] – :c[C] (I – ♭VII) | the Beatles’ “Norwegian Wood”; much rock |
| Lydian | :c[D] – :c[E] (I – II) | the theme of *The Simpsons*; film music for wonder |
| Phrygian | :c[Dm] – :c[Eb] (i – ♭II) | flamenco; heavy metal |
| Aeolian | :c[Dm] – :c[Bb] – :c[C] (i – ♭VI – ♭VII) | rock and pop ballads |

The major IV of Dorian is its fingerprint: :c[Dm7] – :c[G7] contains :n[B], the raised sixth of :n[D] minor. In flamenco, the
Phrygian colour comes through the **Andalusian cadence**, :c[Am] – :c[G] – :c[F] – :c[E], which ends on a major chord that
sounds like a tonic.

::progression-player{chords="Dm7,G7,Dm7,G7" tonics="D,A,E,G" patterns="block,charleston,bossa" tempo="104" title="A Dorian vamp" subtitle="i7 – IV7: the major IV carries the raised sixth."}

## Modal jazz

In the late 1950s jazz musicians began writing tunes with very few chords, each lasting many :t[bar]s and each
heard as a mode to improvise in, rather than a chord to be spelt out. Miles Davis’s “So What” (on *Kind of Blue*,
1959) is the classic: 32 :t[bar]s in AABA form, sixteen :t[bar]s of :n[D] Dorian, eight of :n[Eb] Dorian, eight of :n[D] Dorian
again. The pianist comps with quartal voicings like the So What chord (Chapter 32), which sound modal because they
avoid the thirds that would make them ordinary chords.

```improvise
id: modes/dorian-vamp
title: Improvise in D Dorian
prompt: 'Over a :c[Dm7] – :c[G7] vamp, play anything you like on the white keys, starting and ending phrases on :n[D]. Lean on :n[B], the Dorian sixth, when the :c[G7] sounds.'
chart: [Dm7, G7, Dm7, G7]
tempo: 96
choruses: 3
range: [55, 84]
```

:::key
- The **modes** of the major scale start it on each of its degrees: Ionian, Dorian, Phrygian, Lydian, Mixolydian,
  Aeolian, Locrian.
- Think of each as a major or minor scale with a **characteristic note**: Dorian ♮6, Phrygian ♭2, Lydian ♯4,
  Mixolydian ♭7, Locrian ♭2 and ♭5.
- Modal music vamps on chords that contain the characteristic note: Dorian i–IV, Mixolydian I–♭VII, Lydian I–II.
- **Modal jazz** improvises on long stretches of a single mode, as in “So What”.
:::
