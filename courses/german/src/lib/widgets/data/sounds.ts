/**
 * The sounds of German for the SoundBoard widget, in five sets. Each sound has example words to
 * tap (`word`, German; `en`, gloss) and a note on making it (English, German in {braces}).
 * `pairs` are minimal pairs for the listening quiz: two words that differ only in that sound.
 */

export type SoundSetId = 'vowels' | 'umlauts' | 'diphthongs' | 'consonants' | 'endings';

export interface SoundWord {
  word: string;
  en: string;
}

export interface Sound {
  /** English-key fields: the spelling shown large, and a short name. */
  title: string;
  label: string;
  note: string;
  words: SoundWord[];
}

export interface SoundPair {
  a: SoundWord;
  b: SoundWord;
}

export interface SoundSet {
  id: SoundSetId;
  title: string;
  label: string;
  summary: string;
  sounds: Sound[];
  pairs: SoundPair[];
}

const w = (word: string, en: string): SoundWord => ({ word, en });
const pair = (a: SoundWord, b: SoundWord): SoundPair => ({ a, b });

export const SOUND_SETS: SoundSet[] = [
  {
    id: 'vowels',
    title: 'Long and short vowels',
    label: 'Vowels',
    summary:
      'Every German vowel comes long or short, and the difference changes meanings. A vowel is usually long before a single consonant, before h, or when doubled ({Tag}, {Sohn}, {Tee}), and short before two consonants ({Mann}, {Bett}). German vowels are pure: no English glide at the end.',
    sounds: [
      { title: 'a · ah · aa', label: 'long a', note: 'Like the "a" of "father", held long.', words: [w('Tag', 'day'), w('Bahn', 'railway'), w('Haar', 'hair')] },
      { title: 'a', label: 'short a', note: 'The same open a, just short. Never the "a" of "cat".', words: [w('Mann', 'man'), w('Stadt', 'town'), w('Katze', 'cat')] },
      { title: 'e · eh · ee', label: 'long e', note: 'A pure "ay" with no y at the end: smile slightly and hold it.', words: [w('Tee', 'tea'), w('Weg', 'way, path'), w('sehr', 'very')] },
      { title: 'e', label: 'short e', note: 'Like the "e" of "bed".', words: [w('Bett', 'bed'), w('Geld', 'money'), w('essen', 'to eat')] },
      { title: 'ie · ih · i', label: 'long i', note: 'Like the "ee" of "see", tense and long.', words: [w('Liebe', 'love'), w('ihr', 'you (plural)'), w('Kino', 'cinema')] },
      { title: 'i', label: 'short i', note: 'Like the "i" of "bit".', words: [w('bitte', 'please'), w('Fisch', 'fish'), w('Kind', 'child')] },
      { title: 'o · oh · oo', label: 'long o', note: 'A pure "oh" with well-rounded lips and no "w" at the end: not the English "oh-oo".', words: [w('Sohn', 'son'), w('Boot', 'boat'), w('rot', 'red')] },
      { title: 'o', label: 'short o', note: 'Short and open, like the "o" of British "hot".', words: [w('Sonne', 'sun'), w('kommen', 'to come'), w('Post', 'post')] },
      { title: 'u · uh', label: 'long u', note: 'Like the "oo" of "moon", with the lips pushed forward.', words: [w('Hut', 'hat'), w('Schuh', 'shoe'), w('gut', 'good')] },
      { title: 'u', label: 'short u', note: 'Like the "u" of "put", never the "u" of "but".', words: [w('Mutter', 'mother'), w('Hund', 'dog'), w('und', 'and')] },
    ],
    pairs: [
      pair(w('Staat', 'state'), w('Stadt', 'town')),
      pair(w('Miete', 'rent'), w('Mitte', 'middle')),
      pair(w('Ofen', 'oven'), w('offen', 'open')),
      pair(w('Beet', 'flower bed'), w('Bett', 'bed')),
      pair(w('ihn', 'him'), w('in', 'in')),
      pair(w('bieten', 'to offer'), w('bitten', 'to ask')),
      pair(w('Wahl', 'choice'), w('Wall', 'rampart')),
    ],
  },
  {
    id: 'umlauts',
    title: 'Umlauts: ä, ö, ü',
    label: 'Umlauts',
    summary:
      'The two dots change the vowel, and often the meaning: {Mutter} is one mother, {Mütter} several. ö and ü are made by saying one vowel with the tongue and another with the lips. Without the dots you may write ae, oe, ue.',
    sounds: [
      { title: 'ä · äh', label: 'ä', note: 'Short ä sounds just like short e ({Männer}). Long ä is an open "eh" ({Käse}, {spät}); many speakers simply say a long e.', words: [w('Käse', 'cheese'), w('spät', 'late'), w('Männer', 'men')] },
      { title: 'ö · öh', label: 'long ö', note: 'Say a long German e ("ay") and keep your tongue there; now round your lips as for "oh".', words: [w('schön', 'beautiful'), w('hören', 'to hear'), w('Österreich', 'Austria')] },
      { title: 'ö', label: 'short ö', note: 'Say the "e" of "bed" with rounded lips.', words: [w('können', 'can'), w('zwölf', 'twelve'), w('Löffel', 'spoon')] },
      { title: 'ü · üh · y', label: 'long ü', note: 'Say "ee", hold your tongue still, and round your lips as if to whistle.', words: [w('müde', 'tired'), w('für', 'for'), w('Tür', 'door')] },
      { title: 'ü', label: 'short ü', note: 'Say the "i" of "bit" with rounded lips.', words: [w('fünf', 'five'), w('Mütter', 'mothers'), w('Brücke', 'bridge')] },
    ],
    pairs: [
      pair(w('schon', 'already'), w('schön', 'beautiful')),
      pair(w('Mutter', 'mother'), w('Mütter', 'mothers')),
      pair(w('Bruder', 'brother'), w('Brüder', 'brothers')),
      pair(w('Kuchen', 'cake'), w('Küchen', 'kitchens')),
      pair(w('zahlen', 'to pay'), w('zählen', 'to count')),
      pair(w('drucken', 'to print'), w('drücken', 'to press')),
      pair(w('Hölle', 'hell'), w('Höhle', 'cave')),
      pair(w('fuhr', 'drove'), w('für', 'for')),
    ],
  },
  {
    id: 'diphthongs',
    title: 'Diphthongs: ei, ie, au, eu',
    label: 'Diphthongs',
    summary:
      'A trick for ei and ie: say the second letter as English names it. ei ends in i, so it sounds "eye" ({mein}); ie ends in e, so it sounds "ee" ({Liebe}). {Wein} is wine, {Wien} is Vienna.',
    sounds: [
      { title: 'ei · ai', label: '"eye"', note: 'Like English "eye", whatever English spelling habits suggest: {Stein}, {Bein}, {Mai}.', words: [w('mein', 'my'), w('Wein', 'wine'), w('Mai', 'May')] },
      { title: 'ie', label: '"ee"', note: 'Not a diphthong at all: a long "ee".', words: [w('Liebe', 'love'), w('Bier', 'beer'), w('vier', 'four')] },
      { title: 'au', label: '"ow"', note: 'Like the "ow" of "how".', words: [w('Haus', 'house'), w('Frau', 'woman'), w('auch', 'also')] },
      { title: 'eu · äu', label: '"oy"', note: 'Like the "oy" of "boy". äu sounds the same; it comes from au ({Haus}, {Häuser}).', words: [w('heute', 'today'), w('neu', 'new'), w('Häuser', 'houses')] },
    ],
    pairs: [
      pair(w('Wein', 'wine'), w('Wien', 'Vienna')),
      pair(w('leider', 'unfortunately'), w('Lieder', 'songs')),
      pair(w('Bach', 'stream'), w('Bauch', 'belly')),
      pair(w('Eile', 'hurry'), w('Eule', 'owl')),
      pair(w('Feier', 'party'), w('Feuer', 'fire')),
      pair(w('Mais', 'maize'), w('Maus', 'mouse')),
      pair(w('Weise', 'way, manner'), w('Wiese', 'meadow')),
    ],
  },
  {
    id: 'consonants',
    title: 'Consonants',
    label: 'Consonants',
    summary:
      'Most German consonants are like English ones. These are the ones that are not: two kinds of ch, w said as v, v said as f, z said as ts, and s said as sh before p and t.',
    sounds: [
      { title: 'ch · ich', label: 'ich-Laut', note: 'After e, i, ä, ö, ü, ei, eu and after consonants. Whisper the "h" of "huge" (or the y of "yes") with more breath. Not "sh", not "k".', words: [w('ich', 'I'), w('nicht', 'not'), w('Milch', 'milk')] },
      { title: 'ch · ach', label: 'ach-Laut', note: 'After a, o, u and au: a rough, breathy sound at the back of the mouth, as in Scottish "loch".', words: [w('Bach', 'stream'), w('noch', 'still'), w('Buch', 'book'), w('auch', 'also')] },
      { title: '-ig', label: '-ig said -ich', note: 'At the end of a word, -ig sounds like ich: {zwanzig} is "tsvantsich". (In the south you will hear -ik.)', words: [w('König', 'king'), w('zwanzig', 'twenty'), w('richtig', 'right')] },
      { title: 'sch', label: '"sh"', note: 'Like English "sh", with rounded lips.', words: [w('Schule', 'school'), w('Tisch', 'table'), w('schön', 'beautiful')] },
      { title: 'sp- · st-', label: '"shp", "sht"', note: 'At the start of a word or word part, s before p or t is "sh": {Sport}, {Straße}, {verstehen}. Inside a word it stays s: {Fenster}.', words: [w('Sport', 'sport'), w('Straße', 'street'), w('verstehen', 'to understand')] },
      { title: 'z · tz', label: '"ts"', note: 'Always "ts", as at the end of "cats", even at the start of a word.', words: [w('Zeit', 'time'), w('zehn', 'ten'), w('Katze', 'cat')] },
      { title: 'w', label: 'English v', note: 'German w is English v.', words: [w('Wasser', 'water'), w('Wein', 'wine'), w('wo', 'where')] },
      { title: 'v', label: 'usually f', note: 'Usually English f. In many loanwords it is v: {Vase}, {Klavier}.', words: [w('Vater', 'father'), w('viel', 'much'), w('vier', 'four')] },
      { title: 'j', label: 'English y', note: 'German j is the y of "yes".', words: [w('ja', 'yes'), w('Jahr', 'year'), w('jung', 'young')] },
      { title: 's + vowel', label: 'buzzing s', note: 'Before a vowel, s buzzes like English z.', words: [w('Sonne', 'sun'), w('sie', 'she, they'), w('Rose', 'rose')] },
      { title: 'ß · ss', label: 'hissing s', note: 'A sharp s, as in "miss". ß follows long vowels and diphthongs, ss short vowels.', words: [w('Straße', 'street'), w('heißen', 'to be called'), w('Wasser', 'water')] },
      { title: 'r', label: 'throaty r', note: 'Made at the back, like a very gentle gargle (rolled with the tongue tip in parts of the south). After a vowel it melts into "uh": see Endings.', words: [w('rot', 'red'), w('Brot', 'bread'), w('grün', 'green')] },
      { title: 'pf', label: '"p-f"', note: 'Close your lips for p and let it out as f, in one go.', words: [w('Apfel', 'apple'), w('Pferd', 'horse'), w('Kopf', 'head')] },
      { title: 'h', label: 'breathed or silent', note: 'Breathed at the start of a syllable ({Haus}); silent after a vowel, where it only makes the vowel long ({gehen}, {Sohn}).', words: [w('Haus', 'house'), w('gehen', 'to go'), w('Sohn', 'son')] },
    ],
    pairs: [
      pair(w('Kirche', 'church'), w('Kirsche', 'cherry')),
      pair(w('Nacht', 'night'), w('nackt', 'naked')),
      pair(w('dich', 'you'), w('dick', 'fat')),
      pair(w('Zeit', 'time'), w('seit', 'since')),
      pair(w('Wetter', 'weather'), w('Vetter', 'cousin')),
      pair(w('Pfanne', 'pan'), w('Panne', 'breakdown')),
      pair(w('Löcher', 'holes'), w('Löscher', 'fire extinguisher')),
    ],
  },
  {
    id: 'endings',
    title: 'Word endings',
    label: 'Endings',
    summary:
      'German swallows nothing at the end of a word, but it changes some sounds there: b, d, g lose their voice (final devoicing), an unstressed -e is a short "uh", and -er sounds like "a".',
    sounds: [
      { title: '-b · -d · -g', label: 'final devoicing', note: 'At the end of a word or syllable, b, d, g are said p, t, k: {Tag} sounds "tahk", {Hund} "hunt". Add an ending and the voice comes back: {Tage}, {Hunde}.', words: [w('Tag', 'day'), w('Tage', 'days'), w('Hund', 'dog'), w('Hunde', 'dogs'), w('gelb', 'yellow')] },
      { title: '-s', label: 'final s', note: 'Final s is always sharp; before a vowel it buzzes again: {Haus}, {Häuser}.', words: [w('Haus', 'house'), w('Häuser', 'houses'), w('Glas', 'glass')] },
      { title: '-e', label: 'unstressed e', note: 'A short, relaxed "uh". Never silent and never "ee": {bitte} is "BIT-tuh".', words: [w('bitte', 'please'), w('Name', 'name'), w('heute', 'today')] },
      { title: '-er · -r', label: 'vocalic r', note: 'An unstressed -er is a short, open "uh", much like the end of British "butter". After a long vowel, r also melts into "uh": {hier}, {Uhr}.', words: [w('Lehrer', 'teacher'), w('Mutter', 'mother'), w('aber', 'but'), w('hier', 'here')] },
      { title: '-en', label: 'weak -en', note: 'In everyday speech the e of -en nearly vanishes: {haben} sounds like "hahbm", {kommen} like "kommn".', words: [w('haben', 'to have'), w('kommen', 'to come'), w('lernen', 'to learn')] },
      { title: 'Rad = Rat', label: 'same sound', note: 'Thanks to final devoicing these sound exactly alike; only the spelling (and the plural: {Räder}, {Räte}) tells them apart.', words: [w('Rad', 'wheel, bike'), w('Rat', 'advice'), w('wird', 'becomes'), w('Wirt', 'landlord')] },
    ],
    pairs: [
      pair(w('bitte', 'please'), w('bitter', 'bitter')),
      pair(w('Lehre', 'apprenticeship'), w('Lehrer', 'teacher')),
      pair(w('Tag', 'day'), w('Tage', 'days')),
      pair(w('Hund', 'dog'), w('Hunde', 'dogs')),
      pair(w('Liebe', 'love'), w('lieber', 'rather')),
      pair(w('Kind', 'child'), w('Kinder', 'children')),
    ],
  },
];
