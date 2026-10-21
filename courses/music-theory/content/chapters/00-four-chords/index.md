---
number: 0
title: Four chords
summary: Connect your keyboard, play the four chords under a great many songs, and see what the rest of the course will explain.
duration: 25 minutes
skills:
  - 'Chords: C, G, Am, F'
---

:::listen[Before anything else]
Press **Play** and listen. You have almost certainly heard this before, under other melodies, in other keys.

```score caption="Four chords, one bar each. Click a chord to hear it on its own." label="Four chords on the grand staff: C, G, A minor and F"
\time 4/4 \key c \major \tempo 72
\staff treble <e' g' c''>1^"C" | <d' g' b'>1^"G" | <e' a' c''>1^"Am" | <f' a' c''>1^"F" |
\staff bass c1_"I" | g,1_"V" | a,1_"vi" | f,1_"IV" |
```
:::

These four chords, :c[C], :c[G], :c[Am] and :c[F], one after another, open the verse of the Beatles’
“Let It Be”, and the same loop runs under Bob Marley’s “No Woman, No Cry”, U2’s “With or Without You”, Journey’s “Don’t Stop
Believin’” and Adele’s “Someone Like You”, each in its own key. Nothing here plays those songs; you can check
them yourself, at the piano, by the end of this chapter.

That is what music theory is for. It does not tell you what to like. It explains what you already hear (why
these four chords feel like a journey that comes home) and it gives you more to play: the same loop in any
key, a better voicing for your left hand, the chord that would surprise the listener instead.

## Your keyboard

This course listens to the keys you play. If you have a digital piano or a MIDI keyboard, connect it to this
computer with a USB cable (or pair it over Bluetooth in your system settings), then press **Connect** below.
The browser may ask whether this page can use MIDI devices: say yes. The course receives which keys go down,
when, and how hard. It does not hear the sound your instrument makes, so it works with headphones on.

::instrument-setup

No MIDI keyboard? Everything works with the keyboard drawn on the page (click or touch the keys) and with
your computer keyboard: the row :kbd[A] :kbd[S] :kbd[D] :kbd[F] … plays the white keys from :n[C4], the row
above (:kbd[W] :kbd[E] :kbd[T] …) the black keys, and :kbd[Z] and :kbd[X] move down and up an octave. Safari
and iPads cannot use MIDI keyboards at all; Chrome, Edge and Firefox can. [Appendix C](/appendix/setting-up-midi/)
covers devices, browsers and what to do when nothing arrives.

:::note[Note names]
The course writes note names in the system you choose: letters (:n[C] :n[D] :n[E] … :n[B]), fixed-do
solfège (Do Ré Mi … Si) or German names (where B means B♭ and the B a semitone above it is H). On your first
visit it picks one from your browser’s language. Octave numbers are the same in every system: middle C is
:n[C4]. Terms that differ between British and American English (:t[crotchet]{both}, :t[bar]{both}) follow
the same panel. Change either at any time with the keyboard button at the top of the page.
:::

### Tap along

Every system that turns a key press into a sound takes a little time: the keyboard, the cable, the computer
and the speakers each add a few milliseconds. For most of the course this does not matter. For the rhythm
exercises it does, so measure it once. Press **Start**, listen to four clicks, then press any key on each of
the next eight.

::tap-along

The result combines your own habit (most people press a little early or a little late) with the delay of
your equipment. The course allows for it whenever it checks your timing, and you can measure again at any time.

:::note[A stopping point]
Your keyboard is set up. The rest of the chapter plays the four chords.
:::

## Four chords

A **chord** is three or more different notes played together. The chords in this loop have three notes each,
and you can find them by shape: skip a white key, play one, skip one, play one. Start on :n[C] and you have
:c[C] (:n[C], :n[E], :n[G]); start on :n[G] and you have :c[G]; start on :n[A] and you have :c[Am], the
*minor* chord on :n[A]; start on :n[F] for :c[F]. Chapter 10 explains why three of these sound bright and one
sounds darker, and what *minor* means.

::keyboard{lo=48 hi=72 labels="white" marks='{"60":"target","64":"target","67":"target"}'}

The highlighted keys are :c[C]. Play them together, with any three fingers you like. Now play the loop.

```play
id: four-chords/loop
title: The loop
prompt: 'Play :c[C], then :c[G], then :c[Am], then :c[F]. Any octave, any order of notes within a chord, either hand. Hold each chord down until its chip turns green.'
key: C major
range: [48, 84]
steps:
  - chord: C
  - chord: G
  - chord: Am
  - chord: F
hints:
  - 'Every chord here is a stack of three white keys with one white key skipped between each: :n[C] :n[E] :n[G], :n[G] :n[B] :n[D], :n[A] :n[C] :n[E], :n[F] :n[A] :n[C].'
  - 'Tick **Show me the keys** to light up the notes of the chord you are on.'
```

### Moving less

Played as stacks from :n[C], :n[G], :n[A] and :n[F], the four chords make your hand jump about. Pianists
rarely play them that way. Each chord shares notes with the next, so you can keep the shared notes where they
are and move the others by a step:

```score caption="The same four chords, each note moving as little as it can. Click a chord to hear it." label="The four chords voiced close together"
\time 4/4 \key c \major \tempo 72
<c' e' g'>1^"C" | <b d' g'>1^"G" | <c' e' a'>1^"Am" | <c' f' a'>1^"F" |
```

:n[G4] stays put from :c[C] to :c[G]; :n[C4] and :n[E4] come back for :c[Am]; :n[C4] and :n[A4] stay for
:c[F]. Rearranging the notes of a chord like this is called **voicing** it, and Chapter 11 is about doing it
well. Try it.

```play
id: four-chords/close
title: The loop without the jumps
prompt: 'Play exactly these keys: :n[C4] :n[E4] :n[G4], then :n[B3] :n[D4] :n[G4], then :n[C4] :n[E4] :n[A4], then :n[C4] :n[F4] :n[A4].'
key: C major
range: [48, 76]
steps:
  - notes: [C4, E4, G4]
    label: 'C'
  - notes: [B3, D4, G4]
    label: 'G'
  - notes: [C4, E4, A4]
    label: 'Am'
  - notes: [C4, F4, A4]
    label: 'F'
hints:
  - 'Use your thumb, middle finger and little finger for the first chord. For the second, only the thumb and middle finger move, each down one white key.'
```

## The same loop in every key

Musicians do not remember this loop as :c[C] :c[G] :c[Am] :c[F]. They remember it as **I – V – vi – IV**:
the chords built on the first, fifth, sixth and fourth notes of the scale. Upper-case numerals are major
chords, lower-case ones minor. The numbers describe where each chord sits in the **key**, so they stay the
same when you move the whole loop somewhere else: in the key of :n[G] major, I – V – vi – IV is :c[G] :c[D]
:c[Em] :c[C].

```play
id: four-chords/in-g
title: I – V – vi – IV in G major
prompt: 'Play the loop in G major: :c[G], :c[D], :c[Em], :c[C]. :c[D] has a black key in it: :n[F#].'
key: G major
range: [48, 84]
steps:
  - chord: G
  - chord: D
  - chord: Em
  - chord: C
hints:
  - ':c[D] is :n[D] :n[F#] :n[A]: the same skip-one shape, but the middle note is the black key just right of :n[F].'
```

Why :n[F#]? Why does the loop pull towards :c[C] in the first key and towards :c[G] in the second? Why do V
and I sound like an ending? Each of those questions is a chapter of this course.

:::question
Which of the four chords sounds most like home, the place the loop could stop for good? Play the loop again
and stop on each chord in turn.
:::

## How the course works

Every idea in the course comes four ways: you **hear** it, **name** it, **play** it and **write** it. The parts
follow the order most music courses use, from the keyboard and the staff (Part I) through harmony, voice
leading, chromatic harmony and form, to jazz and pop harmony (Part VI) and music beyond the major and minor keys
(Part VII). Jazz and pop are not saved for the end: whenever a classical idea has a jazz or pop form, the
chapter shows both.

Three pieces come back again and again, each time arranged with what you have just learnt and each at several
playing levels: **Korobeiniki**, the Russian folk song you may know from Tetris, as the running melody;
**Pachelbel’s Canon** as the running chord progression; and **Chopin’s Preludes** for harmony that grows from
two chords to a chromatic bass line.

Each chapter opens with a short *Check yourself*: if you can already play and name what it asks for, the
chapter says so and you can move on. Sessions within a chapter end at stopping points, like the one above.
When the course checks something you played, it tells you what it checked: **played and checked** means every
note you held matched the step; **in time** means your timing was within the stated margin; **answer checked**
means a written answer was compared with the right one. It never claims more than it checked.

:::key
- These four chords, I – V – vi – IV, are the loop under a great many songs; in C major they are :c[C], :c[G],
  :c[Am] and :c[F].
- A chord is three or more notes together; these have three, built by skipping a key between each.
- Voicing a chord means choosing which of its notes go where; good voicings move each note as little as
  possible.
- Roman numerals name chords by their place in the key, so the same numerals work in every key.
:::
