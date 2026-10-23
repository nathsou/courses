---
number: 41
title: Pitch-class sets and twelve-tone music
summary: Integer notation, set classes, rows and the matrix.
duration: 55 minutes
prerequisites: [neo-riemannian]
skills:
  - Pitch-class sets
  - Twelve-tone rows
---

:::check
```quiz
q: 'In integer notation (C = 0), what is the prime form of :n[C] :n[E] :n[G#]?'
options:
  - text: '(048), the augmented triad.'
    correct: true
  - text: '(047).'
    why: ':n[G#] is 8, not 7: (047) is the major triad.'
  - text: '(037).'
    why: '(037) is the prime form of all major and minor triads. :n[C] :n[E] :n[G#] divides the octave into three equal parts: (048).'
```
:::

## Music without a key

By 1908 Arnold Schoenberg (1874–1951) was writing music that avoided any key at all: his Three Piano Pieces, Op. 11
(1909), are among the first **atonal** works. Without a tonic, the names tonic, dominant, cadence and Roman numeral
mean nothing, and theorists later needed new tools. Two are the subject of this chapter: **pitch-class set theory**, for
describing any group of notes, and the **twelve-tone method**, Schoenberg’s own way of organising atonal music from
the early 1920s.

## Integer notation

Number the pitch classes from :n[C]: :n[C] = 0, :n[C#]/:n[Db] = 1, … :n[B] = 11, ignoring octaves and spelling. (Ten and eleven are
often written T and E.) Intervals become differences, counted modulo 12: from :n[E] (4) up to :n[C] (0) is 8 semitones. An
interval and its inversion (4 and 8, a major third and a minor sixth) are grouped as one **interval class**, so there are
six: 1 to 6.

Transposition adds a number to every member (T₄ moves :n[C] :n[E] :n[G] to :n[E] :n[G#] :n[B]); inversion subtracts every member
from a number (I₀ turns 0 4 7 into 0 8 5, a minor triad).

## Set classes

A **pitch-class set** is any collection of pitch classes. Sets related by transposition or inversion are said to
belong to the same **set class**, named by its **prime form**: the most compact arrangement, transposed to start on 0.

- **Normal form:** write the set in ascending order, starting on the member that makes the span from first to last
  the smallest. :n[E] :n[C] :n[G] → [0 4 7].
- **Prime form:** compare the normal forms of the set and of its inversion, transpose both to start on 0, and take the
  one packed more tightly at the start. [0 4 7] and its inversion [0 3 7]: prime form **(037)**.

So every major and every minor triad belongs to one set class, (037), which Allen Forte’s catalogue (*The Structure of
Atonal Music*, 1973) calls **3-11**. The **interval vector** counts the interval classes a set contains: (037) has
one minor third, one major third and one perfect fourth or fifth, written ⟨001110⟩.

| Prime form | Forte | Examples |
| --- | --- | --- |
| (012) | 3-1 | three adjacent semitones, a cluster |
| (014) | 3-3 | a major and a minor third sharing a note: :n[C] :n[Db] :n[E] |
| (016) | 3-5 | a semitone and a tritone: Viennese favourite |
| (027) | 3-9 | two fifths stacked: :n[C] :n[G] :n[D], a sus chord |
| (036) | 3-10 | the diminished triad |
| (037) | 3-11 | all major and minor triads |
| (048) | 3-12 | the augmented triad |

::pc-set-lab

:::note[A stopping point]
Integer notation and set classes. Now Schoenberg’s method.
:::

## Twelve-tone rows

In Schoenberg’s **twelve-tone method** a piece is built on a **row** (or series): an ordering of all twelve pitch
classes, each used once. The row is not a melody; it is a source. It can be used in four forms, each at any of twelve
transpositions, 48 in all:

- **prime** (P): the row as it is;
- **retrograde** (R): backwards;
- **inversion** (I): every interval turned upside down;
- **retrograde inversion** (RI): the inversion backwards.

Notes of a row form can appear as melody or be stacked into chords, in any octave. Schoenberg’s Suite for Piano,
Op. 25 (1921–23), is among the first works composed entirely this way; his pupils Alban Berg and Anton Webern adopted
the method in their own very different styles. The short Piano Piece Op. 33a (1929) is a compact example, a sonata form
built on one row and its inversion.

Here is a row written for the course: :n[C] :n[B] :n[Eb] :n[E] :n[Ab] :n[G] :n[A] :n[F] :n[F#] :n[C#] :n[D] :n[Bb], in integers
0 E 3 4 8 7 9 5 6 1 2 T. Cut it into four groups of three and each group is the same set class, (014): rows built from
one small cell like this are typical of Webern.

```score caption="The course row as a melody, in four groups of three notes, each of set class (014)." tempo="80"
\time 3/4 c''4 b'4 eb''4 | e'4 ab'4 g'4 | a''4 f''4 f#''4 | c#'4 d'4 bb'4 |
```

::row-matrix{row="0,11,3,4,8,7,9,5,6,1,2,10"}

```perform
id: pitch-class-sets/play-row
title: Play the row
prompt: 'The row as written above, right hand, at your own pace. Then try it backwards (R0), reading the matrix.'
mode: notes
range: [60, 84]
score: |
  \time 3/4 c''4 b'4 eb''4 | e'4 ab'4 g'4 | a''4 f''4 f#''4 | c#'4 d'4 bb'4 |
```

:::key
- **Integer notation** numbers pitch classes 0–11 from :n[C]; intervals count modulo 12; there are six **interval classes**.
- Sets related by transposition or inversion form a **set class**, named by its **prime form** (and Forte number); the
  **interval vector** counts its interval classes.
- A **twelve-tone row** orders all twelve pitch classes; its 48 forms are P, R, I and RI at twelve transpositions, laid
  out in the **matrix**.
:::
