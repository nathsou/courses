/** The kit's sources as text, for the editor (read-only files under /rules/helpers/). No code is imported. */
export const KIT_SOURCES = import.meta.glob(['./*.ts', '!./index.ts', '!./sources.ts', '!./*.test.ts'], { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

/** The kit file names (e.g. `ast.ts`). */
export const KIT_FILES = Object.keys(KIT_SOURCES).map((p) => p.replace('./', '')).sort();

export async function kitSource(name: string): Promise<string | undefined> {
  const load = KIT_SOURCES[`./${name}`];
  return load ? load() : undefined;
}
