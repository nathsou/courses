/**
 * The course outline: single source of truth for navigation (docs/PLAN.md §3). A chapter becomes readable
 * when a matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned. Slugs are fixed.
 */

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  milestone: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Music Theory';
export const COURSE_SUBTITLE = 'At the piano, from the first note to jazz harmony';

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    blurb: 'Four chords, your keyboard, and what theory is for.',
    chapters: [{ slug: 'four-chords', number: '0', title: 'Four chords', summary: 'Connect your keyboard, play the four chords under a great many songs, and see what the rest of the course will explain.', milestone: 'M0' }],
  },
  {
    id: 'I',
    title: 'Sound and the keyboard',
    blurb: 'Pitch, rhythm, reading the grand staff, scales, keys, intervals and chords, from the very beginning.',
    chapters: [
      { slug: 'high-and-low', number: '1', title: 'High and low', summary: 'Pitch, the keyboard’s pattern of twos and threes, the white-key names, middle C and the octave.', milestone: 'M1' },
      { slug: 'semitones-and-tones', number: '2', title: 'Semitones, tones and the black keys', summary: 'Half and whole steps, sharps and flats, and why some white keys have no black key between them.', milestone: 'M1' },
      { slug: 'pulse-and-rhythm', number: '3', title: 'Pulse and rhythm', summary: 'Beat, tempo and the metronome; note values, rests, dots and ties.', milestone: 'M1' },
      { slug: 'metre', number: '4', title: 'Metre', summary: 'Bars and time signatures, strong and weak beats, counting aloud and the upbeat.', milestone: 'M1' },
      { slug: 'grand-staff', number: '5', title: 'Reading the grand staff', summary: 'Lines and spaces, treble and bass clefs, ledger lines, landmark notes and reading by interval.', milestone: 'M1' },
      { slug: 'major-scale', number: '6', title: 'The major scale', summary: 'The pattern of tones and semitones, scale degrees, the pull of the tonic and the first fingerings.', milestone: 'M1' },
      { slug: 'circle-of-fifths', number: '7', title: 'Keys and the circle of fifths', summary: 'Key signatures, the order of sharps and flats, and all twelve major scales.', milestone: 'M2' },
      { slug: 'intervals', number: '8', title: 'Intervals', summary: 'Number and quality, inversion, and consonance heard against the harmonic series.', milestone: 'M2' },
      { slug: 'minor', number: '9', title: 'Minor', summary: 'Natural, harmonic and melodic minor; relative and parallel keys.', milestone: 'M2' },
      { slug: 'triads', number: '10', title: 'Triads', summary: 'Four kinds of triad, triads on every degree, Roman numerals and chord symbols.', milestone: 'M2' },
      { slug: 'inversions', number: '11', title: 'Inversions and the hand', summary: 'Inversions, slash chords and voicings that keep the hand still.', milestone: 'M2' },
      { slug: 'rhythm-in-detail', number: '12', title: 'Rhythm in more detail', summary: 'Compound metre, triplets, semiquavers, syncopation and swing. Korobeiniki I.', milestone: 'M2' },
    ],
  },
  {
    id: 'II',
    title: 'Harmony in practice',
    blurb: 'Function, cadences, seventh chords, progressions, melody and accompaniment.',
    chapters: [
      { slug: 'function-and-cadence', number: '13', title: 'Function and cadence', summary: 'Tonic, predominant and dominant, and the cadences that end phrases.', milestone: 'M3' },
      { slug: 'seventh-chords', number: '14', title: 'Seventh chords', summary: 'Five qualities, the diatonic sevenths, V7 and the tritone. Chopin’s Prelude in A major.', milestone: 'M3' },
      { slug: 'progressions', number: '15', title: 'Progressions', summary: 'Harmonic rhythm, the circle of fifths, ii–V–I, pop loops and the 12-bar blues. Canon I.', milestone: 'M3' },
      { slug: 'non-chord-tones', number: '16', title: 'Melody and non-chord tones', summary: 'Passing and neighbour notes, suspensions, appoggiaturas, motif and phrase.', milestone: 'M3' },
      { slug: 'accompanying', number: '17', title: 'Accompanying a melody', summary: 'Choosing chords for a tune, reading a lead sheet and left-hand patterns.', milestone: 'M3' },
      { slug: 'phrase-and-period', number: '18', title: 'Phrase and period', summary: 'Antecedent and consequent, the sentence, and cadences as punctuation. Korobeiniki II.', milestone: 'M3' },
    ],
  },
  {
    id: 'III',
    title: 'Voice leading',
    blurb: 'Four voices, counterpoint, six-four chords, figured bass and sequences.',
    chapters: [
      { slug: 'four-voices', number: '19', title: 'Four voices', summary: 'SATB and keyboard style, spacing, doubling and motion between voices.', milestone: 'M4' },
      { slug: 'counterpoint', number: '20', title: 'Two voices: counterpoint', summary: 'First and second species, Bach’s Invention in C, and Korobeiniki as a canon.', milestone: 'M4' },
      { slug: 'six-four-and-figured-bass', number: '21', title: 'Six-four chords and figured bass', summary: 'Cadential, passing and pedal six-fours, and realising a figured bass at the keyboard.', milestone: 'M4' },
      { slug: 'sequences', number: '22', title: 'Sequences', summary: 'Descending fifths and thirds, the ascending 5–6, in Bach and in pop. Canon II, Korobeiniki III.', milestone: 'M4' },
    ],
  },
  {
    id: 'IV',
    title: 'Chromatic harmony',
    blurb: 'Secondary dominants, modulation, mixture, augmented sixths and chromatic mediants.',
    chapters: [
      { slug: 'secondary-dominants', number: '23', title: 'Secondary dominants', summary: 'V/V and its relatives, tonicisation, and secondary leading-note chords.', milestone: 'M5' },
      { slug: 'modulation', number: '24', title: 'Modulation', summary: 'Closely related keys, pivot chords, direct modulation and the pop key change.', milestone: 'M5' },
      { slug: 'mixture', number: '25', title: 'Mixture', summary: 'Chords borrowed from the parallel minor, the Picardy third and modal interchange.', milestone: 'M5' },
      { slug: 'neapolitan-and-augmented-sixths', number: '26', title: 'The Neapolitan and augmented sixths', summary: '♭II6 and the Italian, French and German sixths.', milestone: 'M5' },
      { slug: 'diminished-and-mediants', number: '27', title: 'Diminished sevenths and chromatic mediants', summary: 'Enharmonic modulation and third relations. Chopin’s Prelude in C minor, Korobeiniki IV.', milestone: 'M5' },
    ],
  },
  {
    id: 'V',
    title: 'Form',
    blurb: 'How pieces are put together, from binary form to the fugue.',
    chapters: [
      { slug: 'small-forms', number: '28', title: 'Small forms', summary: 'Binary, rounded binary and ternary forms, AABA and verse–chorus, and the blues.', milestone: 'M6' },
      { slug: 'sonata-rondo-variations', number: '29', title: 'Sonata, rondo and variations', summary: 'Clementi and Mozart analysed at the keyboard. Canon III.', milestone: 'M6' },
      { slug: 'fugue', number: '30', title: 'Fugue', summary: 'Subject, answer, episode and stretto in Bach’s C major fugue. Korobeiniki V.', milestone: 'M6' },
    ],
  },
  {
    id: 'VI',
    title: 'Jazz and pop harmony',
    blurb: 'Lead sheets, voicings, ii–V–I, modes, improvising, reharmonisation and groove.',
    chapters: [
      { slug: 'lead-sheets-and-extensions', number: '31', title: 'Lead sheets and extensions', summary: 'Chord symbols in full, ninths, elevenths and thirteenths, and what a pianist leaves out.', milestone: 'M7' },
      { slug: 'piano-voicings', number: '32', title: 'Piano voicings', summary: 'Shells, rootless voicings, drop 2, quartal voicings and upper structures.', milestone: 'M7' },
      { slug: 'ii-v-i', number: '33', title: 'ii–V–I everywhere', summary: 'In all twelve keys, major and minor; turnarounds, rhythm changes and the jazz blues.', milestone: 'M7' },
      { slug: 'modes', number: '34', title: 'Modes as colours', summary: 'The modes of the major scale over a drone, modal pop and modal jazz.', milestone: 'M7' },
      { slug: 'improvising', number: '35', title: 'Improvising', summary: 'Guide tones, chord tones on strong beats, approach notes and the blues scale.', milestone: 'M7' },
      { slug: 'reharmonisation', number: '36', title: 'Reharmonisation', summary: 'Tritone substitution, the backdoor ii–V, passing diminished chords and Coltrane changes. Canon IV.', milestone: 'M7' },
      { slug: 'groove', number: '37', title: 'Groove and accompaniment', summary: 'Comping, stride, bossa nova, the pop ballad and gospel left hands. Korobeiniki VI.', milestone: 'M7' },
    ],
  },
  {
    id: 'VII',
    title: 'Beyond tonality',
    blurb: 'Colour harmony, symmetric scales, neo-Riemannian moves, twelve-tone music and tuning.',
    chapters: [
      { slug: 'colour-harmony', number: '38', title: 'Colour harmony', summary: 'Debussy and Satie: planing, added notes, whole-tone and pentatonic harmony.', milestone: 'M8' },
      { slug: 'symmetry', number: '39', title: 'Symmetry', summary: 'Whole-tone and octatonic scales, and why they blur the key.', milestone: 'M8' },
      { slug: 'neo-riemannian', number: '40', title: 'Neo-Riemannian harmony', summary: 'P, L and R, the Tonnetz and hexatonic cycles.', milestone: 'M8' },
      { slug: 'pitch-class-sets', number: '41', title: 'Pitch-class sets and twelve-tone music', summary: 'Integer notation, set classes, rows and the matrix.', milestone: 'M8' },
      { slug: 'why-twelve-notes', number: '42', title: 'Why twelve notes?', summary: 'The harmonic series, Pythagorean tuning, just intonation, meantone and equal temperament. Korobeiniki VII.', milestone: 'M8' },
    ],
  },
  {
    id: 'E',
    title: 'Epilogue',
    blurb: 'One piece, analysed with everything in the course.',
    chapters: [{ slug: 'one-piece', number: '43', title: 'One piece, all the way down', summary: 'Chopin’s Prelude in E minor, Op. 28 No. 4, analysed and played.', milestone: 'M8' }],
  },
];

export const APPENDICES: OutlineEntry[] = [
  { slug: 'reading-music', number: 'A', title: 'Reading music: quick reference', summary: 'Every symbol the course uses, with its British and American names.', milestone: 'M2' },
  { slug: 'pianists-minimum', number: 'B', title: 'The pianist’s minimum', summary: 'Posture, fingering, scale and arpeggio fingerings, and the sustain pedal.', milestone: 'M2' },
  { slug: 'setting-up-midi', number: 'C', title: 'Setting up MIDI', summary: 'Devices, browsers, USB and Bluetooth, latency and troubleshooting.', milestone: 'M0' },
  { slug: 'repertoire', number: 'D', title: 'Repertoire', summary: 'Every piece and excerpt in the course, its source and its copyright status.', milestone: 'M8' },
  { slug: 'reference', number: 'E', title: 'Glossary, timeline and bibliography', summary: 'Terms, dates and sources.', milestone: 'M8' },
];
