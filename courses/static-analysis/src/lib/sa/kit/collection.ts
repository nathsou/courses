/** Small collection helpers. Counterpart of SonarJS's `rules/helpers/collection.ts`. */
export function last<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

export function flatMap<T, U>(items: readonly T[], f: (item: T) => U[]): U[] {
  return items.flatMap(f);
}
