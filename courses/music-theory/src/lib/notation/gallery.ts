/**
 * Reference scores for the engraver (docs/PLAN.md §14, risk 1): every feature in §8, reviewed by eye at
 * /engraving/ at several widths, and parsed and laid out in the tests.
 */
export const GALLERY: { title: string; src: string }[] = [
  { title: 'Note values and rests', src: String.raw`\time 4/4 c''1 | c''2 r2 | c''4 r4 c''8 r8 c''16 r16 c''16 r16 | c''4. c''8 c''2 |` },
  { title: 'Ledger lines above and below', src: String.raw`a,4 c'4 e'''4 c''''4 | \staff bass e,4 c4 e'4 g'4 |` },
  { title: 'Key signatures (sharps)', src: String.raw`\key e \major e'4 f#'4 g#'4 a'4 | b'4 c#''4 d#''4 e''4 |` },
  { title: 'Key signatures (flats), bass clef', src: String.raw`\clef bass \key ab \major ab,4 bb,4 c4 db4 | eb4 f4 g4 ab4 |` },
  { title: 'Accidentals within a bar', src: String.raw`\key g \major f'4 f#'4 f'4 fn'4 | c''4 c#''4 c''4 c##''4 |` },
  { title: 'Chords with seconds', src: String.raw`<c' d' g'>2 <f' g' a'>2 | <b d' f' g'>1 |` },
  { title: 'Beams in 4/4', src: String.raw`c''8 d''8 e''8 f''8 g''8 a''8 b''8 c'''8 | c'8 e'8 g'8 c''8 e'8 g'8 c''8 e''8 |` },
  { title: 'Semiquavers and dotted rhythms', src: String.raw`c''16 d'' e'' f'' g''8. a''16 b''16 a'' g'' f'' e''4 |` },
  { title: 'Compound metre', src: String.raw`\time 6/8 c''8 d'' e'' f''4 g''8 | a''4. g''4. |` },
  { title: 'Triplets', src: String.raw`\tuplet 3/2 { c''8 d'' e'' } \tuplet 3/2 { f'' g'' a'' } b''2 | \tuplet 3/2 { c''4 b' a' } g'2 |` },
  { title: 'Ties and slurs', src: String.raw`c''2~ c''8 d''( e'' f'' | g''1~ | g''2 e''4( c''4) |` },
  { title: 'Upbeat', src: String.raw`\time 3/4 \partial 4 d'4 | g'2 b'8 a'8 | g'2 e'4 |` },
  { title: 'Grand staff with chord symbols and numerals', src: String.raw`\key g \major \staff treble <b' d'' g''>2^"G" <a' c'' d''>2^"D7" | <b' d'' g''>1^"G" | \staff bass g2_"I" d2_"V7" | g,1_"I" |` },
  { title: 'Four voices', src: String.raw`\staff treble e''2 d''2 | c''1 | \voice c''2 b'2 | g'1 | \staff bass g2 g2 | e1 | \voice c2_"I" g,2_"V" | c1_"I" |` },
  { title: 'Figured bass', src: String.raw`\clef bass c2_"6|4" g,2_"5|3" | c1 |` },
  { title: 'Inversion figures', src: String.raw`\staff treble <e' g' c''>2 <d' f' b'>2 | <e' g' c''>1 | \staff bass c2_"I" g,2_"V65" | c1_"I" |` },
  { title: 'Repeats and double bars', src: String.raw`\bar "|:" c''2 d''2 | e''1 \bar ":|" | f''2 g''2 \bar "||" | c''1 |` },
  { title: 'Long melody that breaks into systems', src: String.raw`\time 4/4 \key a \minor e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 | r8 d''4 f''8 a''4 g''8 f''8 | e''4. c''8 e''4 d''8 c''8 | b'4 b'8 c''8 d''4 e''4 | c''4 a'4 a'2 |` },
];
