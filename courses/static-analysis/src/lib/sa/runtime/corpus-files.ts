/** Corpus sources, keyed `/<project>/<path>` (text only: safe to import on the page). */
export const CORPUS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob(['/content/corpus/*/**/*.ts', '/content/corpus/*/**/*.js', '!/content/corpus/**/*.d.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>).map(([p, src]) => [
    p.replace('/content/corpus', ''),
    src,
  ]),
);

export function corpusProjects(): string[] {
  return [...new Set(Object.keys(CORPUS).map((p) => p.split('/')[1]!))].sort();
}

/** Expected issues per rule key (file → lines), as produced by `npm run corpus:sync`. */
const EXPECTED = import.meta.glob('/content/corpus/expected/*.json', { import: 'default' }) as Record<string, () => Promise<Record<string, number[]>>>;

export async function expectedIssues(key: string): Promise<Record<string, number[]> | undefined> {
  const load = EXPECTED[`/content/corpus/expected/${key}.json`];
  return load ? load() : undefined;
}
