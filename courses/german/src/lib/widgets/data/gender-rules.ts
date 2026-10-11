/**
 * The German the GenderRules widget speaks: every example and exception of the ending rules in
 * $lib/de/gender.ts, with its article ("die Zeitung"), listed here so the audio collector finds
 * them.
 */
import { GENDER_RULES } from '$lib/de/gender';

const ART = { m: 'der', f: 'die', n: 'das' } as const;

export const GENDER_RULE_WORDS: string[] = GENDER_RULES.flatMap((r) => [...r.examples.map((e) => `${ART[r.gender]} ${e}`), ...(r.exceptions ?? [])]);
