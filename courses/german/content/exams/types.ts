/**
 * Level checks in the spirit of the Goethe-Institut exams (Start Deutsch 1, Goethe-Zertifikat A2,
 * B1, B2): listening, reading and language-in-use. German is in `text`, `claim`, `de` and German
 * `options`; `question`, `instructions` and `title` are English (German in {braces}).
 */
export type Question =
  /** Richtig oder falsch? A statement about the text (heard or read). */
  | { type: 'tf'; text?: string; claim: string; answer: boolean; explain?: string }
  /** A question about the text, with options (German or English). */
  | { type: 'choose'; text?: string; question: string; options: string[]; answer: number; explain?: string }
  /** Choose the word or form for the ___ gap. */
  | { type: 'fill'; de: string; options: string[]; answer: number; explain?: string };

export interface Section {
  title: string;
  skill: 'listening' | 'reading' | 'language';
  instructions: string;
  /** A passage shared by the section's questions (read, or heard for listening). */
  text?: string;
  questions: Question[];
}

export interface Paper {
  id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  minutes: number;
  sections: Section[];
}
