---
number: 15
title: Progressions
summary: Harmonic rhythm, the circle of fifths, ii–V–I, pop loops and the 12-bar blues. Canon I.
duration: 50 minutes
prerequisites: [seventh-chords]
skills:
  - Common progressions
  - The 12-bar blues
---

:::check
```analyse
id: progressions/check-1
title: A circle of fifths
prompt: 'Name each chord, in :n[C] major.'
key: C major
score: |
  \time 4/4 \staff treble <c' e' a'>2 <d' f' a'>2 | <d' f' b'>2 <c' e' g'>2 | \staff bass a,2 d2 | g,2 c2 |
answers: [vi, ii, 'V|V7', I]
```
:::

## Harmonic rhythm

A progression is not only *which* chords but *when*. The speed at which chords change is the **harmonic
rhythm**. In a hymn the chords may change on every beat; in a pop ballad once a :t[bar] or slower; at a
cadence, harmonic rhythm often speeds up to drive into the ending. A good rule for accompanying: the chord
changes on strong beats, and the slower the harmonic rhythm, the more the accompaniment has to keep the
music moving (Chapter 17).

## Falling fifths

Chapter 13’s phrase T → PD → D → T has a favourite route: roots that fall by fifths. From vi to ii is a fifth
down, ii to V another, V to I another. **vi – ii – V – I** is the **circle-of-fifths progression**, and run
from the tonic it can visit every chord of the key: I – IV – vii° – iii – vi – ii – V – I.

::progression-player{romans="I,IV,vii°,iii,vi,ii,V,I" tonics="C,G,F" patterns="block,broken" title="All the way round" subtitle="Every root falls a fifth (or rises a fourth, the same note an octave away)."}

Why does it work so well? A root falling a fifth is the motion of V to I, the strongest move in harmony, and
each step of the circle borrows a little of that strength. The voices, meanwhile, hardly move: on the
piano, the right hand slides between neighbouring inversions.

### ii – V – I

The last three steps of the circle are the most important three chords in jazz and a staple of classical
music: **ii – V – I**, predominant, dominant, tonic. With sevenths it is ii7 – V7 – Imaj7, and Chapter 33
practises it in all twelve keys.

::progression-player{romans="ii7,V7,Imaj7" tonics="C,F,Bb,Eb,G,D" title="ii7 – V7 – Imaj7"}

```play
id: progressions/ii-v-i
title: ii – V – I in three keys
prompt: 'Play ii – V – I as triads in :n[F] major, :n[Bb] major and :n[D] major.'
range: [43, 79]
steps:
  - chord: Gm
    label: 'F: ii'
  - chord: C
    label: V
  - chord: F
    label: I
  - chord: Cm
    label: 'B♭: ii'
  - chord: F
    label: V
  - chord: Bb
    label: I
  - chord: Em
    label: 'D: ii'
  - chord: A
    label: V
  - chord: D
    label: I
```

## Loops

Pop music often repeats a short progression all the way through a section, a **loop**. A few loops cover a
very large share of the songs you know:

| Loop | In :n[C] major | Known as |
| --- | --- | --- |
| I – V – vi – IV | :c[C] :c[G] :c[Am] :c[F] | the prologue’s four chords |
| vi – IV – I – V | :c[Am] :c[F] :c[C] :c[G] | the same loop started on vi, darker |
| I – vi – IV – V | :c[C] :c[Am] :c[F] :c[G] | the “1950s progression” of doo-wop ballads |
| I – IV – V – IV | :c[C] :c[F] :c[G] :c[F] | rock and roll, “three chords” |

Loops bend the rules of Chapter 13. In I – V – vi – IV the dominant goes to vi and the predominant IV loops
back to I, a plagal motion. In a loop nothing has to end; the function of each chord is softened, and
the melody and the arrangement carry the music forward.

```ear
id: progressions/loops
title: Which loop?
prompt: 'Four chords in :n[C] major. Which loop?'
kind: custom
options: [I – V – vi – IV, vi – IV – I – V, I – vi – IV – V, I – IV – V – IV]
items:
  - play: [C3 C4 E4 G4, G2 B3 D4 G4, A2 C4 E4 A4, F2 C4 F4 A4]
    answer: I – V – vi – IV
  - play: [A2 C4 E4 A4, F2 C4 F4 A4, C3 C4 E4 G4, G2 B3 D4 G4]
    answer: vi – IV – I – V
  - play: [C3 C4 E4 G4, A2 C4 E4 A4, F2 C4 F4 A4, G2 B3 D4 G4]
    answer: I – vi – IV – V
  - play: [C3 C4 E4 G4, F2 C4 F4 A4, G2 B3 D4 G4, F2 C4 F4 A4]
    answer: I – IV – V – IV
rounds: 8
pass: 7
hints:
  - 'Listen to the bass and to the first chord: a loop that starts on a minor chord is vi – IV – I – V.'
```

:::note[A stopping point]
Falling fifths, ii – V – I and four loops. Two famous progressions remain: one from the blues, one from the
1600s.
:::

## The 12-bar blues

The **blues** is a twelve-:t[bar] progression on three chords, I, IV and V, usually all dominant sevenths
(which is part of its sound: the tonic chord itself has a bluesy seventh). Its standard form:

| :t[Bar]s 1–4 | :t[Bar]s 5–8 | :t[Bar]s 9–12 |
| --- | --- | --- |
| I · I · I · I | IV · IV · I · I | V · IV · I · I (or V) |

The first line states the tonic, the second visits IV and comes home, the third climbs to V and falls back
through IV. A blues in :n[C] uses :c[C7], :c[F7] and :c[G7]. Chapter 33 adds the jazz version with more chords.

::progression-player{chords="C7,C7,C7,C7,F7,F7,C7,C7,G7,F7,C7,G7" tonic="C" tonics="C,F,G,Bb" patterns="block,pulse,broken" tempo="100" title="The 12-bar blues" subtitle="Dominant sevenths on I, IV and V. The last :t[bar] is the turnaround: V, leading back to the top."}

```perform
id: progressions/blues-left-hand
title: A blues in C, left hand
prompt: 'The left hand alone: root and seventh of each chord, one shape per :t[bar], held. At your own pace, then try the right-hand chords above it.'
mode: notes
range: [36, 64]
score: |
  \clef bass \time 4/4 <c bb>1 | <c bb>1 | <c bb>1 | <c bb>1 | <f eb'>1 | <f eb'>1 | <c bb>1 | <c bb>1 | <g, f>1 | <f eb'>1 | <c bb>1 | <g, f>1 |
```

## Canon I: Pachelbel’s ground

Johann Pachelbel (1653–1706) wrote a canon for three violins over a repeating bass line (a **ground bass**)
in :n[D] major. The ground is eight notes long and harmonised by eight chords:

**I – V – vi – iii – IV – I – IV – V**

It starts like the prologue’s loop, but where the loop went from vi to IV, Pachelbel steps down by thirds
through iii. The bass falls by a fourth and rises by a step, over and over. The progression has outlived
its canon: pop songs have used it for decades, often without anyone noticing.

```score caption="Pachelbel’s ground bass in :n[D] major, with its chords: the first appearance of the course’s running progression." tempo="66"
\key d \major \time 4/4 \staff treble <f#' a' d''>4^"D" <e' a' c#''>4^"A" <d' f#' b'>4^"Bm" <c#' f#' a'>4^"F#m" | <b d' g'>4^"G" <a d' f#'>4^"D" <b d' g'>4^"G" <c#' e' a'>4^"A" | \staff bass d4_"I" a,4_"V" b,4_"vi" f#,4_"iii" | g,4_"IV" d,4_"I" g,4_"IV" a,4_"V" |
```

```perform
id: progressions/canon-ground
title: Canon I
prompt: 'Play the ground in the left hand and the chords in the right, at your own pace, then in time. The right hand barely moves.'
mode: notes
range: [36, 79]
score: |
  \key d \major \time 4/4 \staff treble <f#' a' d''>4 <e' a' c#''>4 <d' f#' b'>4 <c#' f#' a'>4 | <b d' g'>4 <a d' f#'>4 <b d' g'>4 <c#' e' a'>4 | \staff bass d4 a,4 b,4 f#,4 | g,4 d,4 g,4 a,4 |
```

```perform
id: progressions/canon-ground-timed
title: Canon I, in time
mode: both
tempo: 56
range: [36, 79]
score: |
  \key d \major \time 4/4 \staff treble <f#' a' d''>4 <e' a' c#''>4 <d' f#' b'>4 <c#' f#' a'>4 | <b d' g'>4 <a d' f#'>4 <b d' g'>4 <c#' e' a'>4 | \staff bass d4 a,4 b,4 f#,4 | g,4 d,4 g,4 a,4 |
```

:::key
- **Harmonic rhythm** is how often the chords change.
- Roots falling by fifths make the strongest progressions: vi – ii – V – I, and **ii – V – I** above all.
- Pop **loops** (I–V–vi–IV, vi–IV–I–V, I–vi–IV–V) repeat four chords; function softens in a loop.
- The **12-bar blues**: I I I I · IV IV I I · V IV I I, usually all dominant sevenths.
- Pachelbel’s ground: I – V – vi – iii – IV – I – IV – V.
:::
