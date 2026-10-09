/** Small collection helpers. Counterpart of SonarJS's `rules/helpers/collection.ts`. */
export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

export function flatMap<T, U>(items: readonly T[], f: (item: T) => U[]): U[] {
  return items.flatMap(f);
}

/** The names of mutating sort methods, as written in a member access: `a.sort`, `a["sort"]`, `a['sort']`. */
export const sortLike = ['sort', '"sort"', "'sort'"];

/** The names of copying sort methods (ES2023). */
export const copyingSortLike = ['toSorted', '"toSorted"', "'toSorted'"];
