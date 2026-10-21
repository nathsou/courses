/**
 * Spaced repetition for the practice room: a Leitner-style schedule. Each item (a skill, in one key for
 * keyed skills) sits in a box; a right answer moves it up a box and further into the future, a wrong
 * answer back to the first box. Pure functions over plain data, so they are tested directly.
 */

export interface ItemState {
  box: number;
  /** When the item is next due (ms since epoch). */
  due: number;
  right: number;
  wrong: number;
  /** Median-ish answer time in seconds (exponential average). */
  seconds?: number;
}

/** Waiting time after reaching each box: a minute (after a miss), 10 minutes, 1 day, 3 days, a week, three weeks. */
export const BOX_WAIT = [60e3, 10 * 60e3, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];

export function answer(s: ItemState | undefined, right: boolean, now: number, seconds?: number): ItemState {
  const prev = s ?? { box: 0, due: now, right: 0, wrong: 0 };
  const box = right ? Math.min(BOX_WAIT.length - 1, prev.box + 1) : 0;
  return {
    box,
    due: now + BOX_WAIT[box]!,
    right: prev.right + (right ? 1 : 0),
    wrong: prev.wrong + (right ? 0 : 1),
    seconds: seconds === undefined ? prev.seconds : prev.seconds === undefined ? seconds : 0.7 * prev.seconds + 0.3 * seconds,
  };
}

/**
 * Choose the next item: the most overdue item first; failing that, a new item (never seen) from the skill
 * with the fewest items tried so far (so new material is spread across skills; within a skill, items come
 * in the order given); failing that, the item due soonest. Avoids repeating the last item when there is a choice.
 * Item ids are "skill" or "skill:key".
 */
export function nextItem(candidates: string[], states: Record<string, ItemState>, now: number, last?: string): string | undefined {
  const pool = candidates.length > 1 ? candidates.filter((c) => c !== last) : candidates;
  const due = pool.filter((c) => states[c] && states[c]!.due <= now).sort((a, b) => states[a]!.due - states[b]!.due);
  if (due.length) return due[0];
  const fresh = pool.filter((c) => !states[c]);
  if (fresh.length) {
    const skill = (id: string) => id.split(':')[0]!;
    const tried = (sk: string) => candidates.filter((c) => skill(c) === sk && states[c]).length;
    const lastSkill = last ? skill(last) : undefined;
    const skills = [...new Set(fresh.map(skill))].sort((a, b) => tried(a) - tried(b) || Number(a === lastSkill) - Number(b === lastSkill));
    return fresh.find((c) => skill(c) === skills[0]);
  }
  return [...pool].sort((a, b) => states[a]!.due - states[b]!.due)[0];
}

/** Strength 0 (untried) to 5 (long-term), for the heatmap. */
export const strength = (s: ItemState | undefined): number => (s ? s.box : -1);
