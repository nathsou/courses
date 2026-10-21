---
number: 33
title: ii–V–I everywhere
summary: In all twelve keys, major and minor; turnarounds, rhythm changes and the jazz blues.
duration: 55 minutes
prerequisites: [piano-voicings]
skills:
  - ii–V–I
  - Jazz forms
---

:::check
```quiz
q: 'What is ii–V–I in :n[Eb] major?'
options:
  - text: ':c[Fm7] – :c[Bb7] – :c[Ebmaj7].'
    correct: true
  - text: ':c[Fm7] – :c[B7] – :c[Emaj7].'
    why: 'The fifth degree of :n[Eb] major is :n[Bb], not :n[B]: count up the :n[Eb] major scale, :n[Eb] :n[F] :n[G] :n[Ab] :n[Bb].'
  - text: ':c[F7] – :c[Bb7] – :c[Ebmaj7].'
    why: ':c[F7] would be V7/V, a secondary dominant (Chapter 23). The diatonic ii in :n[Eb] major is minor: :c[Fm7].'
```
:::

## The progression of jazz

Chapter 15 met ii – V – I as the last three steps of the circle of fifths. In jazz it is the basic unit: most
standards are chains of ii–V–I’s, some resolving, some not, in a string of keys. A jazz musician hears a tune
less as a list of chords than as a route through ii–V’s, and practises ii–V–I until it is automatic in every key.

::progression-player{chords="Dm7,G7,Cmaj7,Cmaj7" tonics="C,F,Bb,Eb,Ab,Db,Gb,B,E,A,D,G" patterns="block,charleston,walking" tempo="112" title="ii – V – I in twelve keys" subtitle="Round the circle of fifths: C, F, B♭, E♭ … The key moves down a fifth each time."}

```play
id: ii-v-i/six-keys
title: ii – V – I in the flat keys
prompt: 'Any voicing (the rootless shapes of Chapter 32 are ideal), in :n[F], :n[Bb], :n[Eb], :n[Ab], :n[Db] and :n[Gb] major.'
range: [36, 84]
steps:
  - chord: Gm7
  - chord: C7
  - chord: Fmaj7
  - chord: Cm7
  - chord: F7
  - chord: Bbmaj7
  - chord: Fm7
  - chord: Bb7
  - chord: Ebmaj7
  - chord: Bbm7
  - chord: Eb7
  - chord: Abmaj7
  - chord: Ebm7
  - chord: Ab7
  - chord: Dbmaj7
  - chord: Abm7
  - chord: Db7
  - chord: Gbmaj7
```

## The minor ii – V – i

In a minor key the ii chord is half-diminished and the V is usually altered: **iiø7 – V7♭9 – i**. In :n[C] minor:
:c[Dm7b5] – :c[G7b9] – :c[Cm6] (or :c[Cm(maj7)], or plain :c[Cm7]). The ♭9 of the dominant, :n[Ab], is the sixth degree of the minor
key, so the whole progression stays inside harmonic minor (Chapter 9).

::progression-player{chords="Dm7b5,G7b9,Cm6,Cm6" tonic="C" mode="minor" tonics="C,F,G,D,A" patterns="block,charleston,walking" tempo="104" title="iiø7 – V7♭9 – i"}

```ear
id: ii-v-i/major-or-minor
title: Major or minor?
prompt: 'A ii – V – I. Does it resolve to a major or a minor tonic?'
kind: custom
options: [Major, Minor]
items:
  - play: [D3 F3 A3 C4 E4, G2 F3 A3 B3 E4, C3 E3 G3 B3 D4]
    answer: Major
  - play: [D3 F3 Ab3 C4, G2 F3 Ab3 B3, C3 Eb3 G3 A3]
    answer: Minor
  - play: [G2 Bb3 D4 F4 A4, C3 Bb3 D4 E4 A4, F2 A3 C4 E4 G4]
    answer: Major
  - play: [G2 Bb3 Db4 F4, C3 Bb3 Db4 E4, F2 Ab3 C4 D4]
    answer: Minor
rounds: 8
pass: 7
```

:::note[A stopping point]
ii–V–I, major and minor. The rest of the chapter is three progressions built from it.
:::

## Turnarounds

A **turnaround** fills the last two :t[bar]s of a section and leads back to the top. The plainest is **I – vi – ii – V**,
the 1950s progression of Chapter 15 in jazz clothing; variants make each chord a dominant, so every arrival is
approached by its own V:

| Turnaround | In :n[C] |
| --- | --- |
| I – vi – ii – V | :c[Cmaj7] :c[Am7] :c[Dm7] :c[G7] |
| I – VI7 – ii – V | :c[Cmaj7] :c[A7] :c[Dm7] :c[G7] |
| iii – VI7 – ii – V | :c[Em7] :c[A7] :c[Dm7] :c[G7] |
| III7 – VI7 – II7 – V7 | :c[E7] :c[A7] :c[D7] :c[G7] (the ragtime progression, Chapter 23) |

::progression-player{chords="Cmaj7,A7,Dm7,G7" tonics="C,F,Bb,G" patterns="charleston,walking" tempo="120" title="I – VI7 – ii – V" subtitle="VI7 is V7/ii: a secondary dominant pointing at the ii."}

## Rhythm changes

George Gershwin’s “I Got Rhythm” (1930) gave jazz its second most common form after the blues: **rhythm changes**,
32 :t[bar]s in AABA form (Chapter 28), traditionally in :n[Bb]. The A sections are turnarounds, two chords to a :t[bar]; the
bridge is a chain of dominants, two :t[bar]s each, falling by fifths back to the tonic’s dominant:

| Section | Chords (one common version) |
| --- | --- |
| A | :c[Bbmaj7] :c[G7] · :c[Cm7] :c[F7] · :c[Dm7] :c[G7] · :c[Cm7] :c[F7] · :c[Fm7] :c[Bb7] · :c[Ebmaj7] :c[Ab7] · :c[Dm7] :c[G7] · :c[Cm7] :c[F7] |
| B (bridge) | :c[D7] · :c[D7] · :c[G7] · :c[G7] · :c[C7] · :c[C7] · :c[F7] · :c[F7] |

Hundreds of bebop tunes were written over these chords. The bridge is the ragtime chain of Chapter 23, slowed down:
III7 – VI7 – II7 – V7.

## The jazz blues

Jazz musicians play the 12-:t[bar] blues (Chapter 15) with more chords: ii–V’s into IV and into the turnaround, a
passing diminished chord, a secondary dominant. One common version in :n[F]:

| :t[Bar]s 1–4 | :t[Bar]s 5–8 | :t[Bar]s 9–12 |
| --- | --- | --- |
| :c[F7] · :c[Bb7] · :c[F7] · :c[Cm7] :c[F7] | :c[Bb7] · :c[Bdim7] · :c[F7] · :c[D7] | :c[Gm7] · :c[C7] · :c[F7] :c[D7] · :c[Gm7] :c[C7] |

:t[Bar] 2 visits IV early (the “quick change”); :t[bar] 4 is a ii–V into IV; :t[bar] 6 is a passing diminished chord that
leads back to :c[F7] (Chapter 36); :t[bar] 8 is V7/ii, and :t[bar]s 9–10 the ii–V home; the last two :t[bar]s are a turnaround.

::progression-player{chords="F7,Bb7,F7,F7,Bb7,Bdim7,F7,D7,Gm7,C7,F7,C7" tonics="F,Bb,C" patterns="walking,charleston" tempo="120" title="A jazz blues in F" subtitle="One chord per :t[bar], simplified: bars 4, 11 and 12 keep one chord each."}

:::key
- **ii–V–I** is the basic unit of jazz harmony; practise it in all twelve keys, round the circle of fifths.
- In minor: **iiø7 – V7♭9 – i**, all inside harmonic minor.
- **Turnarounds** (I–vi–ii–V and its dominant variants) lead back to the top of a section.
- **Rhythm changes:** AABA, turnarounds in the A sections, a chain of dominants in the bridge. The **jazz blues** adds
  ii–V’s and passing chords to the 12-bar form.
:::
