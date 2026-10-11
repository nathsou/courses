/**
 * The YAML shape of each exercise kind. Fields named in tools/german.ts ENGLISH_KEYS (prompt,
 * explain, en, setting, …) are English, with German inside {braces}; every other string is
 * German and gets word cards automatically. Most kinds take a list of `items`.
 */

export interface ChooseItem {
  /** The question, in English ({German} inside it is annotated). */
  prompt?: string;
  /** German shown large above the options. */
  de?: string;
  /** German to play aloud; `true` plays `de`. With `listen: true` the text stays hidden. */
  audio?: string | boolean;
  listen?: boolean;
  /** Options: German, or English with {German} inside. The first-listed language is detected. */
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Shown after answering. */
  explain?: string;
  /** Translation of `de`, shown after answering. */
  en?: string;
  /** Do not colour nouns by gender (when the gender is what is being asked). */
  noGender?: boolean;
}

export interface Choose {
  title?: string;
  items: ChooseItem[];
}

/** Choose the word that fills the gap (___). */
export interface Fill {
  title?: string;
  items: { de: string; options: string[]; answer: number; en?: string; explain?: string }[];
}

/**
 * Type the answer. `de` may contain a ___ gap; the answer replaces it. With `listen: true` it is a
 * dictation: the audio (or the answer) plays and the learner types what they hear.
 */
export interface TypeItem {
  prompt?: string;
  de?: string;
  /** Accepted answers (the first is the model answer). */
  answer: string | string[];
  en?: string;
  hint?: string;
  explain?: string;
  listen?: boolean;
  audio?: string;
}
export interface Type {
  title?: string;
  items: TypeItem[];
}

/**
 * Gapped text: [answer] marks a gap, [a/b] accepts either, [answer](hint) shows a hint such as
 * the base form: "Ich [fahre](fahren) mit [dem] Bus." With `bank: true` the answers are shown
 * as a word bank.
 */
export interface Cloze {
  title?: string;
  prompt?: string;
  bank?: boolean;
  items: { de: string; en?: string; explain?: string }[];
}

/** Put the tiles in order to translate the English. */
export interface Order {
  title?: string;
  items: {
    en: string;
    /** The answer, tiles separated by spaces; join words into one tile with _ ("ins_Kino"). */
    de: string;
    /** Wrong tiles mixed in. */
    extra?: string[];
    /** Other accepted orders (same tiles). */
    also?: string[];
    explain?: string;
  }[];
}

/** Match left to right. */
export interface Match {
  title?: string;
  pairs: [string, string][];
  /** Left items are played instead of shown (match sounds to meanings). */
  listen?: boolean;
}

/** Sort items into buckets. */
export interface Sort {
  title?: string;
  prompt?: string;
  buckets: string[];
  /** [item, bucket index] */
  items: [string, number][];
  explain?: string;
}

/** der, die or das? Nouns from the dictionary (without their article); `plural` also asks the plural. */
export interface Gender {
  title?: string;
  items: string[];
  plural?: boolean;
}

/** Conjugate verbs: the learner types each person's form; answers come from the verb tables. */
export interface Conjugate {
  title?: string;
  items: { verb: string; tense: 'present' | 'preterite' | 'perfect' | 'konj2' | 'konj1' | 'imperative'; persons?: number[] }[];
}

/** A conversation where you choose what to say. Wrong choices get an in-character reaction. */
export interface Scene {
  title: string;
  setting?: string;
  /** Who you are talking to. */
  partner: string;
  turns: {
    they?: string;
    theyEn?: string;
    options: { de: string; en?: string; ok?: boolean; reply?: string; replyEn?: string }[];
  }[];
  end?: string;
}

/** A graded reader: short paragraphs, tap any word, then comprehension questions. */
export interface Story {
  title: string;
  de?: string;
  paragraphs: { de: string; en?: string }[];
  questions?: ChooseItem[];
}

/** A true-or-false statement about a text (richtig/falsch, as in the Goethe exams). */
export interface Judge {
  claim: string;
  answer: boolean;
  explain?: string;
}

/** Reading comprehension: a short real-world text (a message, a notice, an advert), then questions. */
export interface Read {
  title?: string;
  /** What the text is and where you find it, in English. */
  setting?: string;
  /** The text. Line breaks are kept. */
  text: string;
  /** A translation, shown once the questions are done. */
  en?: string;
  questions: (ChooseItem | Judge)[];
}

/** Say it: hear the model, record yourself, compare; speech recognition where the browser has it. */
export interface Speak {
  title?: string;
  items: string[];
}

/** Optional AI conversation partner (needs the learner's API key). */
export interface Roleplay {
  title: string;
  setting: string;
  /** What you must achieve, in English. */
  goal: string;
  /** Who the AI plays. */
  partner: string;
  opener: string;
  openerEn?: string;
  /** Words to try to use. */
  words?: string[];
  /** What counts as success, for the AI's verdict. */
  checks?: string[];
}

/** Optional AI feedback on a sentence you write. */
export interface Compose {
  task: string;
  /** The grammar point being practised, for the AI's feedback. */
  target?: string;
  hints?: string[];
  examples?: string[];
}

export type ExerciseData = Choose | Fill | Type | Cloze | Order | Match | Sort | Gender | Conjugate | Scene | Story | Read | Speak | Roleplay | Compose;
