/**
 * The German alphabet for the Alphabet widget. `name` is the letter's name as Germans write it,
 * `say` a spelling the speech engines pronounce as that name, `en` how it sounds to an English
 * speaker, `example` a word with the letter.
 */

export interface Letter {
  letter: string;
  name: string;
  say: string;
  en: string;
  example: string;
  /** English: why English speakers trip over it. */
  note?: string;
}

export const LETTERS: Letter[] = [
  { letter: 'A', name: 'A', say: 'Ah', en: 'ah', example: 'Apfel' },
  { letter: 'B', name: 'Be', say: 'Beh', en: 'bay', example: 'Buch' },
  { letter: 'C', name: 'Ce', say: 'Zeh', en: 'tsay', example: 'Computer', note: 'C on its own is rare: mostly in loanwords, and in ch, ck and sch.' },
  { letter: 'D', name: 'De', say: 'Deh', en: 'day', example: 'Dach' },
  { letter: 'E', name: 'E', say: 'Eh', en: 'ay (a pure vowel, no y at the end)', example: 'Esel', note: 'German E is "ay", not "ee": the classic mix-up with I when spelling.' },
  { letter: 'F', name: 'Ef', say: 'Eff', en: 'eff', example: 'Fisch' },
  { letter: 'G', name: 'Ge', say: 'Geh', en: 'gay, with a hard g', example: 'Gabel', note: 'Always a hard g, as in "go": never "jee".' },
  { letter: 'H', name: 'Ha', say: 'Hah', en: 'hah', example: 'Haus' },
  { letter: 'I', name: 'I', say: 'Ih', en: 'ee', example: 'Igel', note: 'German I is "ee". Spell Lisa: El, I, Es, A.' },
  { letter: 'J', name: 'Jott', say: 'Jott', en: 'yot', example: 'Jacke', note: 'J sounds like English y: ja, Jahr, Jonas.' },
  { letter: 'K', name: 'Ka', say: 'Kah', en: 'kah', example: 'Katze' },
  { letter: 'L', name: 'El', say: 'Ell', en: 'ell', example: 'Löffel' },
  { letter: 'M', name: 'Em', say: 'Emm', en: 'em', example: 'Maus' },
  { letter: 'N', name: 'En', say: 'Enn', en: 'en', example: 'Nase' },
  { letter: 'O', name: 'O', say: 'Oh', en: 'oh (pure, no w at the end)', example: 'Obst' },
  { letter: 'P', name: 'Pe', say: 'Peh', en: 'pay', example: 'Papier' },
  { letter: 'Q', name: 'Qu', say: 'Kuh', en: 'koo', example: 'Quark', note: 'Always qu, said "kv": Quark, Qualität.' },
  { letter: 'R', name: 'Er', say: 'Err', en: 'air, with a throaty r', example: 'Rose' },
  { letter: 'S', name: 'Es', say: 'Ess', en: 'ess', example: 'Sonne', note: 'Before a vowel s sounds like English z: Sonne, sie.' },
  { letter: 'T', name: 'Te', say: 'Teh', en: 'tay', example: 'Tisch' },
  { letter: 'U', name: 'U', say: 'Uh', en: 'oo', example: 'Uhr' },
  { letter: 'V', name: 'Vau', say: 'Fau', en: 'fow (rhymes with "how")', example: 'Vogel', note: 'V usually sounds like f: Vater, viel, Vogel.' },
  { letter: 'W', name: 'We', say: 'Weh', en: 'vay', example: 'Wasser', note: 'W sounds like English v: Wasser, Wien, Wein.' },
  { letter: 'X', name: 'Ix', say: 'Ix', en: 'iks', example: 'Xylofon' },
  { letter: 'Y', name: 'Ypsilon', say: 'Ypsilon', en: 'ÜP-si-lon', example: 'Yoga' },
  { letter: 'Z', name: 'Zett', say: 'Zett', en: 'tset', example: 'Zug', note: 'Z sounds like ts: Zug, Zeit, zehn.' },
  { letter: 'Ä', name: 'Ä', say: 'Äh', en: 'like the e in "bed", but long', example: 'Ärztin', note: 'Also called A-Umlaut. Without the dots you may write ae.' },
  { letter: 'Ö', name: 'Ö', say: 'Öh', en: 'say "ay" with rounded lips', example: 'Öl', note: 'Also called O-Umlaut; written oe without the dots.' },
  { letter: 'Ü', name: 'Ü', say: 'Üh', en: 'say "ee" with rounded lips', example: 'Übung', note: 'Also called U-Umlaut; written ue without the dots.' },
  { letter: 'ß', name: 'Eszett', say: 'Eszett', en: 'ess-tset', example: 'Straße', note: 'Also "scharfes S". Written after long vowels and diphthongs (Straße, heißen), ss after short ones (Wasser). Switzerland always writes ss.' },
];

/** Words and names for the spelling game: short, with the letters English speakers mix up. */
export const SPELLING_WORDS: string[] = [
  'Lena', 'Jonas', 'Aylin', 'Mehmet', 'Noah', 'Zeynep', 'Elias', 'Luca', 'Dragan', 'Yusuf', 'Ida', 'Eva',
  'Haus', 'Zug', 'Weg', 'Vater', 'Jahr', 'Käse', 'Straße', 'Wien', 'Bier', 'Quark', 'Wurst', 'Uhr',
  'Brezel', 'Zeit', 'Vogel', 'Möbel', 'Grüße', 'Juni', 'Hexe', 'Gabel',
];

/** The question Germans ask, and the reply that spells. */
export const SPELLING_PHRASES = [
  { de: 'Wie schreibt man das?', en: 'How do you spell that?' },
  { de: 'Können Sie das bitte buchstabieren?', en: 'Could you spell that, please?' },
];
