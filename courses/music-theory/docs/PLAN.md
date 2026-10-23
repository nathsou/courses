# Course plan: *Music Theory*

The working plan for the course: decisions, through-lines, curriculum, the instrument and the score, exercises,
milestones and risks. Update it when a decision changes or a chapter lands.

The course teaches music theory at the piano, from the first key to jazz reharmonisation and post-tonal music. It
is written for adults who are learning the piano, can already play a little, and want the basics explained properly
rather than skipped. The reader's own keyboard, connected over Web MIDI, is the instrument the course listens to:
they play a chord and the course says which chord it heard, they play a progression in all twelve keys and the course
keeps score, they harmonise a melody and the course checks the voice leading. The backbone is common-practice
harmony and form; jazz and pop harmony are woven through it and take over in Part VI. Every idea is met four ways:
heard, named, played and written.

## Status (21 October 2026)

**Done: M0–M8, and M9 except real devices.** Prologue; Parts I–VII (chapters 1–42); the epilogue (chapter 43, Chopin's Prelude in E minor);
the practice room (17 skills); appendices A–E.
Exercise types built: `play`, `perform` (rhythm, notes, both), `ear`, `spell`, `read`, `analyse` (per chord, per
bar or per note), `realise` (four-part writing, keyboard or SATB style, and two-part species counterpoint,
checked by the rule engine `voicelead.ts`), `quiz`, and `:::check` (Check yourself). Engraver v1: grand staff, two voices per staff, tuplets, repeats, figures, chord symbols, Roman
numerals with inversion figures, note names, spacer rests, hidden time signatures; the reference scores are at
`/engraving/`. Library: voice leading by nearest
motion, non-chord-tone classification, tuning and temperaments, pitch-class sets. M9: Part VII and the epilogue proofread; every page checked at 390,
768 and 1440 px in both themes (no horizontal overflow, no console errors); the link audit and the navigation
checks pass on a prefixed build. **Still to do:** testing with at least two real MIDI keyboards (USB and
Bluetooth); so far MIDI has been tested only with a simulated input.

Where the course differs from the plan below, the plan is kept as written and the difference is recorded here:

- **Fonts:** Bravura is bundled from `src/lib/fonts/` (so the base path is handled). Petaluma (the handwritten
  lead-sheet font) is not used: lead sheets are engraved in Bravura like everything else.
- **Backing tracks** are the `improvise` exercise's own comping (bass on 1 and 3, chords on 1 and the swung "and" of 2)
  and the ProgressionPlayer's patterns (block, pulse, broken, Alberti, waltz, arpeggio, stride, comping, walking bass,
  bossa nova); there are no recorded tracks.
- **Piano:** the Salamander licence is confirmed (CC BY 3.0); 60 samples, 3.6 MB.
- **Korobeiniki:** the tune follows the folk melody as commonly known; it was not checked against a printed
  public-domain source (none could be fetched in M8). Appendix D says so, and that no arrangement was used.
- **MIDI out** is not built.
- **Dictation and sight-reading** are not separate exercise types: melodic dictation is the `ear` exercise's
  `echo` kind (hear a melody, play it back), sight-reading is `read` (single notes) and `perform` in `notes`
  mode (whole passages, untimed).
- **Chopin, Preludes Op. 28 Nos. 7 and 20** were converted from Craig Sapp's Humdrum edition (`scripts/kern2score.py`)
  or transcribed, then checked against public-domain Mutopia engravings of Edition Peters.
- **Bach, Invention No. 1** (bars 1–7): the notes follow the Bach-Gesellschaft edition (as engraved by the
  Mutopia Project, CC BY-SA, used only as a reference), checked note by note, and were cross-checked against
  David Huron's Humdrum encoding. That encoding's notice reserves derivative electronic formats, so Bach
  excerpts are not converted from it; credit both sources in appendix D.
- **Exercises answer to one exercise at a time:** the exercise last touched (or nearest the middle of the screen)
  receives the keyboard's notes (`src/lib/components/exercise/active.ts`).
- **Public-domain sources from Mutopia:** the Minuet in G (Bach-Gesellschaft), Clementi Op. 36 No. 1 (Schirmer, 1893),
  WTC I Fugue 1 and Chopin Op. 28 Nos. 4, 7 and 20 are taken from Mutopia files placed in the public domain, with
  `scripts/ly2score.py` (a small LilyPond reader) and checked against the engravings. Mozart K. 545 (CC BY-SA on
  Mutopia) and Pachelbel (CC BY) were used only as references; the excerpts were entered by hand.
- **Content lint:** the tests check every keyboard-style chord score and ear progression for parallel fifths and
  octaves; it found and fixed parallels in chapters 0, 11, 13, 15, 18 and 22.
- **Practice room:** a Leitner schedule (boxes at 1 minute, 10 minutes, 1, 3, 7 and 21 days) rather than SM-2;
  skills unlock when their chapter is opened, or all at once by a switch.
- **Minor-scale fingerings** in appendix B are given only where editions agree (white-key tonics, F♯ and C♯);
  G♯, E♭ and B♭ minor are left to the reader's scale book.

## 1. Decisions

| Topic | Decision | Status | Notes |
|---|---|---|---|
| Title | **Music Theory** | agreed | Subtitle: *at the piano, from the first note to jazz harmony*. Slug `music-theory`, published at `/music-theory/`. |
| Reader | **An adult learning the piano** who can play a little and wants the basics explained properly | agreed | They can find middle C and play a simple melody with both hands, but may read slowly, may never have learnt *why* the keyboard is laid out as it is, and have gaps. Nothing is assumed: Part I starts from high and low. Each chapter opens with a short *Check yourself* (§5) so a reader who knows it can move on with evidence rather than guesswork. |
| Repertoire | **Classical spine, with jazz and pop woven in** | agreed | Parts I–V follow the common-practice sequence (fundamentals, diatonic harmony, voice leading, chromatic harmony, form). Each classical idea shows its jazz or pop form where one exists (§2, through-line 4). Part VI is jazz and pop harmony; Part VII goes beyond tonality. |
| Code | **None** | agreed | Every activity is musical: listen, name, play, write, analyse, harmonise. No editor and no code runner in the site. |
| Input | **Web MIDI keyboard** as the instrument | agreed | The reader's digital piano or MIDI keyboard over USB or Bluetooth (§6). The on-screen keyboard and the computer keyboard (QWERTY rows) are the fallback, not the main path; they are needed anyway because Safari and iOS do not support Web MIDI. |
| Microphone | **None for now** | agreed | Monophonic pitch detection for acoustic-piano owners may be revisited after M9; nothing in the design depends on it. |
| MIDI out | **Optional: play the course through the reader's own instrument** | proposed | When the device has a MIDI output, examples can sound on the reader's piano instead of the speakers. Off by default. |
| Sound | Sampled grand piano in Web Audio; synthesised bass, drums and click for backing tracks | proposed | A reduced subset of an openly licensed multisample piano (candidate: *Salamander Grand Piano*, CC BY 3.0; licence to be confirmed in M0), a few velocity layers, sampled every minor third and resampled between, compressed to at most 8 MB, lazy-loaded. No recordings of performances are shipped; every example is played from its score. |
| Notation | **Our own SVG engraver, no third-party code** | agreed | Bounded scope: single staff and grand staff, up to two voices per staff, clefs, key and time signatures, beams, ties, dots, tuplets, accidentals, chord symbols, Roman numerals and figures under the bass. The interactions draw on the score: live MIDI notes, voice-leading arrows, colouring by function, click-to-hear. Glyphs come from the SMuFL fonts Bravura and Petaluma (SIL OFL), self-hosted as font files; no notation library (§8, §14 risk 1). |
| Score source | **A compact text format** in fenced `score` blocks | proposed | LilyPond-like, small enough to read in a diff: `\key g \major \time 3/4 | d'4 g'2 b'8( a' | ...`. Parsed by `src/lib/notation/parse.ts`; every score in the course is parsed and rendered in a test. |
| Note names | **A setting**: letters (C D E, B♭ B), fixed-do solfège (Do Ré Mi / Do Re Mi … Si), or German (B = B♭, H = B♮) | agreed | One setting changes every label in the text, the keyboard and the exercises. **Default from the browser's language and region** (`navigator.languages`), never from geolocation or an IP lookup: French, Italian, Spanish, Portuguese and Romanian → solfège (accented *Ré* in French); German, Dutch, the Nordic languages, Czech, Slovak, Polish and Hungarian → German names; everything else → letters. §5a lists the full table. |
| Terms | **A setting**: British (*crotchet*, *bar*) or American (*quarter note*, *measure*) first, the other in brackets on first use per chapter | agreed | **Default from the locale**: British for en-GB, en-IE, en-AU, en-NZ, en-ZA and en-IN; American for every other locale. The glossary lists both. Jazz chapters use the jazz vocabulary (*changes*, *comping*, *voicing*) whatever the setting. |
| Copyright | **Only public-domain music, music written for the course, and chord progressions** | proposed | A melody or excerpt ships only if it is public domain in both the US and the EU (composer and lyricist both dead for more than 70 years, and published before 1931), or traditional, or written for the course. Copyrighted songs and standards are named and their progressions discussed (a progression is not protected), never notated or played. Jazz tunes are course-written contrafacts over common changes (blues, rhythm changes, ii–V–I). Each piece records its source and status in appendix D (`content/appendices/d-repertoire`). |
| Site | SvelteKit 2 + Svelte 5 (runes), `adapter-static`, TypeScript 6, the Markdown-with-directives compiler copied from *The Prime Staircase* | proposed | Single npm package. Output in `dist/`; base path from `BASE_PATH`, or `COURSES_BASE_PATH + /music-theory`. No CodeMirror and no code runner. |
| Library | `src/lib/music`: pure TypeScript, no DOM | proposed | Pitch and spelling, intervals, scales and modes, chords and chord symbols, keys, Roman-numeral analysis, voice-leading rules, rhythm and quantisation, tuning, pitch-class sets. Every module tested. Widgets and exercise checkers share it (§7). |
| Feedback | Says what was established | proposed | Per CONTRIBUTING.md: *played and checked*, *in time (±n ms)*, *answer checked*, *rules checked* (no voice-leading faults found, which is not a judgement that the music is good), *self-reviewed*. |
| Progress | `localStorage` for progress, settings and the practice schedule; export and import as JSON | proposed | No accounts, no server. |
| Charts | Our own SVG and Canvas components | proposed | No charting library. Respect `prefers-reduced-motion`; nothing auto-plays. |
| Design | **"Fallboard"**: engraved score paper by day, black lacquer and gold lettering by night | proposed | §11. Shares the collection's `theme` key. |
| Language | British English | proposed | As the rest of the collection. |

## 2. Through-lines

1. **Hear it, name it, play it, write it.** Each concept appears in all four modes, and exercises move between them:
   hear a chord and play it back; see a symbol and play it; play a progression and write its numerals; read a
   score and hear it in your head before pressing play.
2. **Three pieces, at every level.** Three pieces return throughout the course, each newly arranged with
   what the reader has just learnt, and each arrangement comes in playing levels (right hand only, hands
   together simplified, full) with the course able to play either hand while the reader plays the other:
   - **Korobeiniki**, the Russian folk song (lyrics by Nekrasov, 1861; traditional melody) that the world knows
     from Tetris, is the running **melody**. It is in minor, which puts the leading note and harmonic minor
     to work early. It ends each part (*Korobeiniki I–VII*): two chords and a melody (I), sevenths and a broken-chord
     left hand (II), four voices and a two-voice canon (III), secondary dominants and a modulation (IV), a full
     arrangement in a named form (V), a swing arrangement with rootless voicings and reharmonisation (VI), and a
     whole-tone and octatonic distortion (VII). The course notates the folk melody from a public-domain source,
     never the 1989 Game Boy arrangement, and uses no Tetris name or imagery beyond saying where the reader has
     heard it.
   - **Pachelbel's Canon in D** is the running **progression**: the eight-chord ground in Part II, the
     descending-thirds sequence and the canon's three voices in Part III, variations over a ground in Part V,
     and in Part VI the pop loop that grew from it and its jazz reharmonisation (*Canon I–IV*).
   - **Chopin's Preludes, Op. 28** carry the **harmony** from simple to chromatic: No. 7 in A major (almost all
     V7 and I) in Part II, No. 20 in C minor (a chromatic bass line in block chords) in Part IV, and No. 4 in
     E minor for the epilogue.
3. **All twelve keys.** Everything that can be played is asked for in every key, not just C. The practice room
   (§5) keeps a key-by-skill heatmap, and the course points the reader at the cold cells.
4. **Classical and jazz are the same theory.** Bridges where the two meet: a sequence of descending fifths and a
   chain of ii–V's; Pachelbel's descending thirds and a pop chord loop; the German augmented sixth and the tritone
   substitution, which are the same chord spelt two ways; mixture and modal interchange; the Picardy third and the
   major tonic at the end of a minor blues.
5. **Function has a colour.** Tonic, predominant and dominant keep one colour each across the course (in the score,
   on the keyboard and in the numerals), always paired with a letter (T, PD, D) so colour is never the only cue.

## 3. Curriculum

Durations are reading-plus-playing estimates. Each chapter is one to three sessions (§4).

### Prologue
0. **Four chords.** Play I–V–vi–IV in C and hear the same loop under a dozen songs (named, not played). What
   theory is for: explaining what you already hear and giving you more to play. Connect a MIDI keyboard, choose
   note names and terms, calibrate latency with a tap-along.

### Part I: Sound and the keyboard
1. **High and low.** Pitch, the keyboard's pattern of twos and threes, the white-key names, middle C, octaves as
   a doubling of frequency, scientific pitch names (C4). *Play:* every C, then every F, on your keyboard.
2. **Semitones, tones and the black keys.** Half and whole steps, sharps and flats, enharmonic names, why E–F and
   B–C have no black key between them (answered in Ch. 6).
3. **Pulse and rhythm.** Beat, tempo, the metronome; semibreve to quaver and their rests; dots and ties.
   *Play:* rhythms on one key, scored for timing.
4. **Metre.** Bars, time signatures 2/4, 3/4, 4/4, strong and weak beats, counting aloud, the upbeat.
5. **Reading the grand staff.** Lines and spaces, treble and bass clefs, ledger lines, landmark notes, reading by
   interval rather than by letter. *Play:* a sight-reading drill that speeds up as you do.
6. **The major scale.** The pattern T–T–S–T–T–T–S, two tetrachords, degree names and numbers, the pull of the
   tonic. Standard fingering for C, G, D, A, E and F, and why the thumb crosses where it does.
7. **Keys and the circle of fifths.** Key signatures, the order of sharps and flats, all twelve major scales and
   their fingering groups.
8. **Intervals.** Number and quality, counting on the staff and on the keyboard, inversion, consonance and
   dissonance heard against the harmonic series. *Ear:* intervals, melodic and harmonic.
9. **Minor.** Natural, harmonic and melodic minor; relative and parallel keys; minor key signatures; why the
   leading note is raised.
10. **Triads.** Major, minor, diminished and augmented; triads on every degree; Roman numerals and chord symbols.
    *Play:* any triad, in any key, on request.
11. **Inversions and the hand.** First and second inversion, slash chords, figures 6 and 6/4, closest-position
    voicing so the hand barely moves, left-hand root with right-hand triad.
12. **Rhythm in more detail.** Compound metre (6/8, 9/8, 12/8), triplets, semiquavers, syncopation, swing.
    *Korobeiniki I:* the melody with i and V.

### Part II: Harmony in practice
13. **Function and cadence.** Tonic, predominant, dominant; the perfect, plagal, imperfect and interrupted
    cadences, heard and played.
14. **Seventh chords.** The five qualities, diatonic sevenths, V7 and the tritone's resolution; Chopin's
    Prelude in A major, Op. 28 No. 7, played and analysed.
15. **Progressions.** Harmonic rhythm, the circle-of-fifths progression, ii–V–I, the common pop loops, the 12-bar
    blues. *Canon I:* Pachelbel's eight-chord ground.
16. **Melody and non-chord tones.** Passing and neighbour notes, suspensions, appoggiaturas, anticipations;
    motif and phrase.
17. **Accompanying a melody.** Choosing chords for a tune, reading a lead sheet, left-hand patterns: block, broken,
    Alberti, waltz, arpeggiated ballad.
18. **Phrase and period.** Antecedent and consequent, the sentence, four- and eight-bar phrases, cadence as
    punctuation. *Korobeiniki II:* sevenths, cadences and a broken-chord left hand.

### Part III: Voice leading
19. **Four voices.** SATB and keyboard style (three in the right hand, bass in the left), spacing, doubling,
    motion between voices, parallel fifths and octaves heard rather than just forbidden.
20. **Two voices: counterpoint.** First and second species in brief; reading Bach's Invention No. 1 in C (BWV 772);
    Korobeiniki as a two-voice canon.
21. **Six-four chords and figured bass.** Cadential, passing and pedal six-fours; realising a figured bass at the
    keyboard, checked by the rule engine.
22. **Sequences.** Descending fifths, descending thirds, ascending 5–6; sequences in Bach and in pop. *Canon II:*
    the descending-thirds sequence under Pachelbel's three canonic voices. *Korobeiniki III:* in four voices.

### Part IV: Chromatic harmony
23. **Secondary dominants.** V/V, V/vi and friends; tonicisation; secondary leading-note chords.
24. **Modulation.** Closely related keys, pivot chords, direct modulation, the pop key change up a semitone.
25. **Mixture.** Borrowed iv, ♭VI, ♭VII and ♭III; the Picardy third; modal interchange in pop.
26. **The Neapolitan and augmented sixths.** ♭II6; Italian, French and German sixths; the German sixth as a
    tritone substitute (bridge to Ch. 36).
27. **Diminished sevenths and chromatic mediants.** The diminished seventh as a pivot, enharmonic modulation,
    third relations in Schubert and in film music; Chopin's Prelude in C minor, Op. 28 No. 20, chord by chord.
    *Korobeiniki IV:* secondary dominants and a modulation to the relative major.

### Part V: Form
28. **Small forms.** Binary, rounded binary, ternary; song forms AABA and verse–chorus; the blues as a form.
29. **Sonata, rondo and variations.** Clementi's Sonatina Op. 36 No. 1 and Mozart's Sonata K. 545 analysed at the
    keyboard; rondo; theme and variations. *Canon III:* variations over a ground bass.
30. **Fugue** *(optional).* Subject, answer, countersubject, episode, stretto, in the C major fugue of the
    *Well-Tempered Clavier*, Book I. *Korobeiniki V:* a complete arrangement in rounded binary form.

### Part VI: Jazz and pop harmony
31. **Lead sheets and extensions.** Chord symbols in full; 9ths, 11ths and 13ths; altered tones; which notes a
    pianist leaves out.
32. **Piano voicings.** Shells, rootless A and B voicings, drop 2, quartal voicings, upper structures; voice
    leading through ii–V–I with the hands barely moving.
33. **ii–V–I everywhere.** In all twelve keys, major and minor; turnarounds; rhythm changes; the jazz blues.
34. **Modes as colours.** The modes of the major scale heard as colours over a drone; modal pop and modal jazz;
    modes versus modal interchange.
35. **Improvising.** Guide tones, chord tones on strong beats, approach notes, the pentatonic and blues scales,
    bebop scales. *Play:* improvise over a blues; the course shows where your notes fell against the changes;
    self-reviewed.
36. **Reharmonisation.** Tritone substitution, backdoor ii–V, diminished passing chords, chromatic approach chords,
    Coltrane changes (the progression only). *Canon IV:* the pop loop, then reharmonised as a jazz ballad.
37. **Groove and accompaniment.** Comping rhythms, stride, bossa nova, the pop ballad, gospel left hands.
    *Korobeiniki VI:* swung, with rootless voicings and substitutions.

### Part VII: Beyond tonality
38. **Colour harmony.** Debussy and Satie: planing, added-note chords, whole-tone and pentatonic harmony, the
    unresolved seventh.
39. **Symmetry.** Whole-tone and octatonic scales; why symmetric scales blur the sense of key.
40. **Neo-Riemannian harmony.** P, L and R, the Tonnetz, hexatonic cycles from Liszt to film scores.
41. **Pitch-class sets and twelve-tone music.** Integer notation, normal form, set classes, rows and the matrix;
    Schoenberg's Op. 33a named (see open question 1); the course row instead.
42. **Why twelve notes?** The harmonic series, Pythagorean tuning and its comma, just intonation, meantone, equal
    temperament; hear each on the course piano. *Bridge* to *The Prime Staircase*: no power of 3/2 is a power of
    2, by unique factorisation. *Korobeiniki VII:* the melody over whole-tone, octatonic and planed harmony.

### Epilogue
43. **One piece, all the way down.** Chopin's Prelude in E minor, Op. 28 No. 4, analysed with everything in the
    course, then played.

### Appendices
- **A · Reading music: quick reference.** Every symbol the course uses, with its name in both term sets.
- **B · The pianist's minimum.** Posture, fingering principles, scale and arpeggio fingerings for all keys, the
  sustain pedal and harmony-led pedalling.
- **C · Setting up MIDI.** Devices, browsers, USB and Bluetooth, latency, troubleshooting.
- **D · Repertoire.** Every piece and excerpt, its source and its copyright status.
- **E · Glossary, timeline and bibliography.**

## 4. Chapter template

Front matter: `number`, `title`, `summary`, `duration`, `prerequisites` (slugs), `skills` (practice-room items it
unlocks). Then, in order:

1. *Check yourself*: three to five played or heard items. Passing all of them marks the chapter as known (with
   that wording, not "complete") and suggests the next one.
2. An opening sound: something to hear or play before any definition.
3. Named sessions (`##`), each with an outcome, ending at a stopping point.
4. One to three activities that reveal the central idea. Before writing one, say what the reader discovers by
   doing it (CONTRIBUTING.md).
5. *Bridges* between classical and jazz or pop where they exist (§2, through-line 4).
6. A short summary (`:::key`) and exercises at the end.

## 5. Exercises and practice

### Exercise types (fenced YAML blocks, as in the other SvelteKit courses)

| Type | The reader | Checked by | Feedback |
|---|---|---|---|
| `quiz` | chooses an answer | the answer | *answer checked* |
| `play` | plays notes, a chord, a scale or a progression | pitch classes or exact pitches, order, optionally hand split at a given key, optionally timing against a click | *played and checked*, *in time (±n ms)* |
| `rhythm` | taps or plays a rhythm | onset times against the score after latency correction | *in time (±n ms)*, with a timeline of early and late notes |
| `ear` | hears something and names it or plays it back | the answer, or the notes played back | *answer checked*, *played and checked* |
| `dictation` | hears a melody or a progression and writes it | pitches and durations, or numerals | *answer checked*, with the differences shown on the staff |
| `spell` | writes notes on the staff (from MIDI or by clicking) | pitch and spelling (E♭ is not D♯ here) | *answer checked* |
| `analyse` | writes Roman numerals or labels under a score | the reference analysis, with listed alternatives | *answer checked*, plus "also accepted" when an alternative matched |
| `realise` | completes a figured bass or harmonises a melody in four voices | the voice-leading rule engine | *rules checked*: the faults found, or "no faults found", never "correct" |
| `sightread` | plays a short passage at sight | pitches and timing | *played and checked*, accuracy and speed |
| `improvise` | plays over a backing track | nothing is graded; the course plots chord tones, tensions and outside notes against the changes | *self-reviewed* |

A result is bound to what was played: replaying an exercise clears its result first, and *Check yourself*
results expire after 30 days in the practice room's view.

### 5a. Note names and terms by locale

On the first visit the course reads `navigator.languages` (language and, where given, region) and picks both
settings from the table below, then says so in one line under the header ("Note names: Do Ré Mi, from your
browser's language. Change"). The choice is stored and never re-derived once the reader has changed it. No
geolocation or network lookup is used.

| Locale | Note names | Terms first |
|---|---|---|
| fr | Do Ré Mi Fa Sol La Si | American |
| it, es, pt, ro | Do Re Mi Fa Sol La Si | American |
| de, nl, da, nb, nn, sv, fi, cs, sk, pl, hu | C D E F G A H (B = B♭) | American |
| en-GB, en-IE, en-AU, en-NZ, en-ZA, en-IN | C D E F G A B | British |
| every other locale (including en-US, en-CA) | C D E F G A B | American |

Solfège is fixed do (Do is always C), as taught in the countries that use it. Movable-do degree syllables are not
used; scale degrees are numbers (1̂–7̂) whatever the setting. The table is tested in `src/lib/settings`.

### The practice room (`#/practice`)

Short daily sessions drawn from the skills the reader has met: note reading, keys, intervals, chord qualities,
chord spelling in all keys, voicings, cadences, ii–V–I. Items are scheduled by spaced repetition (SM-2 family) and
answered at the keyboard where possible. A heatmap of twelve keys by skill shows where the reader is fast, slow or
untried. Sessions have a fixed length the reader chooses (5, 10 or 20 minutes) and end there.

## 6. The instrument (`src/lib/midi`, `src/lib/audio`)

- **Input.** Web MIDI in Chromium-based browsers and Firefox (which asks for a site permission); note on and off,
  velocity, sustain pedal (CC 64). One device at a time, chosen in settings, remembered. A status chip in the
  header shows the connected device; every exercise works without one through the on-screen keyboard and QWERTY.
  Safari and iOS have no Web MIDI: appendix C says so plainly.
- **Latency.** A tap-along calibration in the prologue measures the round trip (audio out to MIDI in) and offsets
  timing checks. Tolerances are generous by default (±60 ms) and tighten in later chapters and on request.
- **Matching.** A chord is the set of notes held together within a short window (default 80 ms), so rolled chords
  still count. Pitch-class matching unless the exercise asks for a voicing. Wrong notes are shown, not just
  counted.
- **Output.** A look-ahead scheduler on the audio clock drives the sampled piano, the click and backing tracks
  (bass and drums synthesised). Optional MIDI output to the reader's instrument.
- **Shared keyboard widget.** Shows live input, highlights, fingering numbers, note names in the chosen system,
  and function colours; scrolls and resizes from 25 keys on a phone to 88 on a desktop.

## 7. The library (`src/lib/music`)

Pure TypeScript, no DOM, every module tested with Vitest.

- `pitch`: pitch, pitch class, spelling (letter plus alteration), MIDI number, frequency; enharmonic respelling.
- `interval`: number and quality from two spelt pitches; inversion; compound intervals.
- `scale`: major, the three minors, modes, pentatonic, blues, bebop, whole-tone, octatonic.
- `key`: key signatures, the circle of fifths, closely related keys.
- `chord`: qualities, inversions, a chord-symbol parser and printer (round-trip tested), identification from a
  set of MIDI notes with spelling chosen by key context.
- `roman`: Roman numerals in a key, including applied chords, mixture, Neapolitan and augmented sixths; an
  analyser that proposes numerals for a chorale-style texture, used for hints and never as the only answer.
- `voicelead`: the rule engine for four-voice writing: ranges, spacing, crossing, overlap, parallel and hidden
  fifths and octaves, doubling, resolution of tendency tones. Each rule has an id, a severity and a sentence of
  explanation; the course decides per exercise which rules apply.
- `rhythm`: durations, metre, beaming groups, quantisation of played onsets, swing.
- `tuning`: ratios, cents, the commas, temperaments.
- `pcset`: normal and prime form, interval vectors, Forte names, twelve-tone matrices.
- `neo`: P, L, R and their compositions; Tonnetz coordinates.

## 8. The score (`src/lib/notation`)

No third-party code: parser, layout and renderer are the course's own. Parser for the text format; a layout engine (horizontal spacing by duration, accidentals, beams, ties, two
voices, systems that reflow to the column width); an SVG renderer using Bravura (Petaluma for lead sheets).
Hooks for highlighting notes as they sound, drawing live MIDI input onto the staff, arrows between notes for
voice-leading faults, function colours and click-to-hear. Out of scope: lyrics beyond one line, more than two
staves, cross-staff beams, grace-note groups (single grace notes only), page layout.

## 9. Widgets

Cross-cutting: `Keyboard`, `Score`, `Player` (play, loop, tempo, mute hands), `ChordSymbol`, `Numerals`,
`CircleOfFifths`, `KeyHeatmap`. Flagship chapter widgets:

- **The harmonic series** (Ch. 8, 42): build a tone from its partials; hear consonance as shared partials.
- **Circle of fifths** (Ch. 7, 15): rotate it, light up a key's chords, trace a progression around it.
- **Chord lab** (Ch. 10–14): hold notes, see the chord named, spelt and placed in every key it belongs to.
- **Voice-leading board** (Ch. 19–22): four voices on the grand staff, faults drawn as you write.
- **Function map** (Ch. 13–27): a progression drawn as moves between T, PD and D, with applied chords as detours.
- **Voicing explorer** (Ch. 32): the same ii–V–I in shells, rootless A/B, drop 2 and quartal, with the hands'
  movement measured in semitones.
- **Reharmonisation lab** (Ch. 36): a melody with substitutions you can toggle bar by bar.
- **Tonnetz** (Ch. 40): play triads and watch P, L and R paths.
- **Temperament piano** (Ch. 42): the same chord in Pythagorean, just, meantone and equal tuning.

## 10. Content and components

Directives copied from the Prime Staircase compiler, with music additions: `:::bridge`, `:::key`, `:::note`,
`:::history{year title people}`, `:::bio{name born died}`, `::::hints`, `:::listen` (a sound before the
explanation), `:::atthekeys` (a hands-on interlude), and `::widget-name{props}`. Score blocks are fenced
` ```score ` with optional `play`, `numerals` and `chords` attributes. Glossary, timeline, bibliography and
repertoire are YAML in `content/`.

Facts: every date, attribution and claim about a piece is cited in `content/bibliography.yaml`. Every score is
checked against a public-domain edition (Mutopia, with the edition recorded in appendix D).

## 11. Look and feel: "Fallboard"

Day: engraved score paper, warm off-white, black ink, thin staff-line rules as section dividers. Night: the black
lacquer of a grand piano, ivory text, the gold of the fallboard lettering as the accent. Function colours are
chosen to be distinct for common colour-vision deficiencies in both themes and are always paired with a letter.
Fonts: Cormorant Garamond (display), Source Serif 4 (prose), IBM Plex Sans (UI), Bravura and Petaluma (music).
Shares the collection's `theme` key.

## 12. Architecture, testing and integration

- `courses/music-theory/`: SvelteKit app; `content/chapters/<nn>-<slug>/index.md` + `widgets/*.svelte`;
  navigation in `content/outline.ts` (slugs fixed).
- Tests: the library (unit tests, including spelling and analysis on hand-written cases); every score parses and
  renders; every exercise's reference answer passes its own checker and a wrong answer fails; the voice-leading
  engine against a bank of textbook faults and fault-free chorales; Playwright workflows with a fake `MIDIAccess`
  injected into the page (play a chord, fail, retry, pass, reload, move on), plus the keyboard-only and touch paths.
- Checks before finishing: `npm test`, `npm run check`, the prefixed build; then the collection's `npm run audit`
  and `scripts/check-course-navigation.py`.
- Collection wiring: `scripts/build.mjs`, `.github/workflows/deploy.yml`, a `music-theory.yml` workflow, a card on
  `site/index.html` (new topic: music), the README table and install line.

## 13. Milestones

| | Scope |
|---|---|
| M0 | *(done)* Scaffold (site, compiler, design "Fallboard"), MIDI input with fallbacks, latency calibration, audio scheduler and sampled piano, `Keyboard`, engraver v0 (one staff), library skeleton, Prologue, collection wiring, PR |
| M1 | *(done)* Part I, Ch. 1–6; engraver v1 (grand staff, rhythm, beams); `play`, `rhythm`, `ear`, `quiz`, `spell` exercises |
| M2 | *(done)* Part I, Ch. 7–12; the practice room; appendix A and B |
| M3 | *(done)* Part II; `analyse`, `dictation`, `sightread`; lead-sheet reading |
| M4 | *(done)* Part III; the voice-leading engine and `realise` |
| M5 | *(done)* Part IV |
| M6 | *(done)* Part V |
| M7 | *(done)* Part VI; Petaluma lead sheets, backing tracks, `improvise` |
| M8 | *(done)* Part VII, Epilogue, appendices C–E; repertoire status re-checked |
| M9 | *(done, except real MIDI devices)* Proofread; UX review at phone and desktop widths in both themes; tests with at least two real MIDI devices; final checks |

## 14. Risks

1. **The engraver.** Notation layout is a deep problem and there is no library to fall back on. Mitigation: a
   hard scope (§8); excerpts kept short; a reference set of about 30 test scores covering every feature in §8,
   rendered in a visual test at three widths and reviewed at the end of M1 before any part builds on the engraver.
2. **Spelling from MIDI.** MIDI carries no spelling. Mitigation: spell by key and chord context in `pitch`, show
   the spelling chosen, and let the reader flip it in `spell` exercises.
3. **Latency and timing.** Bluetooth MIDI and audio output add tens of milliseconds. Mitigation: calibration,
   generous defaults, timing reported rather than failed when within a looser band.
4. **Browser support.** No Web MIDI in Safari or iOS. Mitigation: every exercise works with the on-screen keyboard;
   appendix C names the browsers that work.
5. **Sample size and licence.** Mitigation: a small multisample subset, lazy-loaded, licence recorded in the
   repertoire appendix; a synthesised piano if the licence does not hold.
6. **Copyright.** Mitigation: the rule in §1 and appendix D with a status for each piece, re-checked
   in M8. Korobeiniki is notated from the folk melody, not from any game arrangement.
7. **Over-strict rule checking.** Voice-leading rules are style conventions, not laws. Mitigation: per-exercise
   rule sets, faults explained and heard, "no faults found" never presented as "correct".

## 15. Open questions

1. *(Resolved 21 October 2026.)* **Schoenberg Op. 33a.** Its row could not be checked against a printed edition
   in this session, so Chapter 41 uses a row written for the course and only names Op. 33a. Schoenberg died in
   1951, so his music is public domain in the EU from 2022; a later revision could quote Op. 33a once its row is
   checked.
2. *(Resolved 21 October 2026.)* **The Chopin sources.** No. 7 was checked bar by bar against the Mutopia Project's
   engraving, placed in the public domain by its typesetter (two corrections made); No. 20 follows Edition Peters
   as engraved by Mutopia (public domain); No. 4 is available the same way (Peters, 1879). Craig Sapp's Humdrum
   files were a cross-check only. Credit both in appendix D.

Decided on 2026-10-19: title *Music Theory*; our own engraver with no third-party code; no microphone for now;
Korobeiniki, Pachelbel's Canon and Chopin's Preludes as the recurring pieces; note names and terms as settings
with a default from the browser's locale.
