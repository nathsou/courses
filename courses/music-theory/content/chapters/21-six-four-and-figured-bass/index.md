---
number: 21
title: Six-four chords and figured bass
summary: Cadential, passing and pedal six-fours, and realising a figured bass at the keyboard.
duration: 55 minutes
prerequisites: [counterpoint]
skills:
  - Six-four chords
  - Figured bass
---

:::check
```quiz
q: 'A bass note :n[E3] has the figure 6 under it, in :n[C] major. Which chord should you play?'
options:
  - text: ':n[E] :n[G] :n[C]: a :c[C] major chord in first inversion.'
    correct: true
  - text: ':n[E] :n[G#] :n[B]: an :c[E] major chord.'
    why: 'A figure counts up from the bass and takes notes from the key: a 6 asks for a third and a sixth above :n[E], so :n[G] and :n[C].'
  - text: ':n[E] :n[G] :n[B]: an :c[Em] chord.'
    why: 'That would be figured 5/3, or left without figures. The 6 replaces the fifth, :n[B], with a sixth, :n[C].'
```
:::

## The unstable inversion

Chapter 11 introduced the second inversion, the **six-four chord**, so called because its upper notes are a sixth
and a fourth above the bass: :n[G] :n[C] :n[E] is :c[C] major with :n[G] at the bottom. In four-part harmony it is
treated with care, because of the fourth. Above the bass a fourth is a dissonance (Chapter 20), so a six-four
chord sounds unsettled, as if it wanted to move. Common-practice composers used it in a few set patterns, and
almost every six-four you meet in that music is one of them.

### The cadential six-four

The most important by far. Just before a cadence, over the dominant in the bass, the upper voices hold notes
of the tonic chord, then fall to the dominant chord: the sixth falls to the fifth and the fourth to the third.
Over :n[G] in :n[C] major, :n[E] falls to :n[D] and :n[C] to :n[B].

```score caption="The cadential six-four in :n[C] major: ii6, then the six-four over :n[G], resolving 6–5 and 4–3 into V7, then I." tempo="66"
\time 4/4 \staff treble <f' a' d''>4 <e' g' c''>4 <d' f' b'>4 <c' e' c''>4 | \staff bass f4_"ii6" g4_"I64" g4_"V7" c4_"I" |
```

The six-four sits on a strong beat, the bass does not move, and the ear hears the whole two-chord gesture as
one dominant whose upper notes arrive late, like a double appoggiatura (Chapter 16). That is why many
musicians label it **V6/4–5/3** rather than I6/4: it is the dominant in disguise, not a tonic chord. Listen for it
before the soloist’s cadenza in a Classical concerto: the orchestra stops on a cadential six-four, the soloist
improvises over the suspense and ends with a trill over the dominant, and the orchestra comes back in on the
tonic.

### The passing six-four

The bass moves by step through the six-four between two positions of the same chord, usually I and I6, on a
weak beat. The upper voices move little; often one of them moves against the bass in the other direction.

### The pedal six-four

The bass stays put (a **pedal**) while two upper voices step up and back: I – IV6/4 – I. It decorates a held
chord without leaving it.

```score caption="A passing six-four (I – V64 – I6 over a rising bass) and a pedal six-four (I – IV64 – I over a held bass), in :n[G] major." tempo="72"
\key g \major \time 4/4 \staff treble <b d' g'>4 <a d' f#'>4 <g d' g'>4 r4 | <b d' g'>4 <c' e' g'>4 <b d' g'>2 | \staff bass g,4_"I" a,4_"V64" b,4_"I6" r4 | g,4_"I" g,4_"IV64" g,2_"I" |
```

```ear
id: six-four-and-figured-bass/hear-cadential
title: Hear the cadential six-four
prompt: 'Two cadences in :n[C] major. Does the dominant arrive plain, or delayed by a six-four first?'
kind: custom
options: [Plain V – I, With a cadential six-four]
items:
  - play: [F3 F4 A4 D5, G3 E4 G4 C5, G3 D4 F4 B4, C3 C4 E4 C5]
    answer: With a cadential six-four
  - play: [F3 F4 A4 D5, G3 D4 G4 B4, G3 D4 F4 B4, C3 C4 E4 C5]
    answer: Plain V – I
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, G3 E4 G4 C5, G3 D4 G4 B4, C3 E4 G4 C5]
    answer: With a cadential six-four
  - play: [C3 E4 G4 C5, F3 F4 A4 C5, G3 D4 G4 B4, G3 D4 F4 B4, C3 E4 G4 C5]
    answer: Plain V – I
rounds: 6
pass: 5
```

:::note[A stopping point]
Three six-fours: cadential, passing and pedal. Next: the Baroque shorthand that names chords by their bass.
:::

## Figured bass

In the 17th and 18th centuries a keyboard player in an ensemble rarely had the full harmony written out. The
part showed only the bass line, with small numbers above or below the notes: a **figured bass**, or **basso
continuo**. The player improvised the chords, in keyboard style, as the figures directed. Realising a figured
bass was the everyday skill of every Baroque keyboard player, and it is still one of the best ways to learn
harmony at the keyboard, because it trains your hands and your ears at once.

The figures are intervals above the bass, counted in letters and taken from the key signature. Only the
distinctive ones are written:

| Figures | In full | What it is | In :n[C] major, over :n[G] |
| --- | --- | --- | --- |
| (none) | 5/3 | root position triad | :n[G] :n[B] :n[D] |
| 6 | 6/3 | first inversion | :n[G] :n[B] :n[E] (:c[Em/G]) |
| 6/4 | 6/4 | second inversion | :n[G] :n[C] :n[E] (:c[C/G]) |
| 7 | 7/5/3 | seventh chord, root position | :n[G] :n[B] :n[D] :n[F] |
| 6/5 | 6/5/3 | seventh chord, first inversion | :n[G] :n[B] :n[D] :n[E] (:c[Em7/G]) |
| 4/3 | 6/4/3 | seventh chord, second inversion | :n[G] :n[B] :n[C] :n[E] (:c[Cmaj7/G]) |
| 4/2 or 2 | 6/4/2 | seventh chord, third inversion | :n[G] :n[A] :n[C] :n[E] (:c[Am7/G]) |

An **accidental** in the figures alters a note: on its own it means the third above the bass (a ♯ under :n[E] in
:n[A] minor asks for :n[G#], the raised :t[leading note]); next to a number it alters that interval (♯6, ♭7). A
slash through a number, or a plus, also means raised. The figures say which notes, never which octave or which
voice: that is the player’s choice, guided by the voice-leading rules of Chapter 19.

### Realising a figured bass

1. **Read the figure** and work out the chord. Name its root and its function.
2. **Place the right hand** close above, three notes, in keyboard style.
3. **Connect** to the next chord: common tones held, other voices to the nearest note, upper voices against the
   bass when there are no common tones.
4. **Resolve** the tendency tones: the :t[leading note] up, sevenths down, the cadential 6/4 down by step into 5/3.

```realise
id: six-four-and-figured-bass/realise-c
title: A figured bass in C major
prompt: 'Realise the figured bass in keyboard style: three notes in the right hand above each bass note. ii6, a cadential six-four, V7, I.'
key: C major
bass: 'c4 f g g | c1 |'
figures: ['', '6', '64', '7', '']
example: ['C3 E4 G4 C5', 'F3 F4 A4 D5', 'G3 E4 G4 C5', 'G3 D4 F4 B4', 'C3 C4 E4 C5']
hints:
  - 'The 6 over :n[F3] is :n[F] :n[A] :n[D]: ii in first inversion. Double the bass, :n[F].'
  - 'Over the two :n[G3]s, the right hand plays :n[C] :n[E] :n[G] then falls to :n[B] :n[D] :n[F]: each note moves down one step.'
  - 'From V7 to I: :n[B] rises to :n[C], :n[F] falls to :n[E].'
```

```realise
id: six-four-and-figured-bass/realise-g
title: A passing six-four in G major
prompt: 'I – V64 – I6 over a rising bass, then IV – V – I.'
key: G major
bass: 'g,4 a, b, c | d2 g, |'
figures: ['', '64', '6', '', '', '']
example: ['G2 B3 D4 G4', 'A2 A3 D4 F#4', 'B2 G3 D4 G4', 'C3 C4 E4 G4', 'D3 A3 D4 F#4', 'G2 B3 D4 G4']
hints:
  - 'The 6/4 over :n[A2] is :n[A] :n[D] :n[F#]: V in second inversion. Keep :n[D4] in the same voice for the first three chords.'
```

```realise
id: six-four-and-figured-bass/realise-a-minor
title: A figured bass in A minor
prompt: 'In :n[A] minor. The ♯ alone means a raised third above the bass: :n[G#], the :t[leading note].'
key: A minor
bass: 'a,4 d e e | a,1 |'
figures: ['', '6', '64', '#', '']
example: ['A2 E4 A4 C5', 'D3 F4 B4 D5', 'E3 E4 A4 C5', 'E3 E4 G#4 B4', 'A2 E4 A4 C5']
hints:
  - 'The 6 over :n[D3] is :n[D] :n[F] :n[B]: ii° in first inversion, the usual predominant in minor.'
  - 'Over :n[E3], first :n[A] :n[C] :n[E] (the six-four), then :n[G#] :n[B] :n[E]. Every note of the six-four that moves, moves down by step.'
```

:::key
- The **six-four chord** has a fourth above the bass, a dissonance, so it appears in set patterns: **cadential**
  (over the dominant, resolving 6–5 and 4–3), **passing** (bass moving by step) and **pedal** (bass held).
- A **figured bass** gives the bass line and the intervals above it: none = 5/3, 6, 6/4, 7, 6/5, 4/3, 4/2. An
  accidental alone alters the third.
- To realise one: read the chord, place the right hand close, connect smoothly, resolve tendency tones.
:::
