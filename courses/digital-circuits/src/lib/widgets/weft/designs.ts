/**
 * The reference designs of `content/designs/*.weft`, with their tests (`*.tests`, the course's test language:
 * `$lib/weft/testbench.ts`), available to widgets by path (`::weft-playground{src="designs/counter.weft"}`).
 * Loaded eagerly: they are a few kilobytes, and the server needs the text to render the code statically.
 */
const files = import.meta.glob('/content/designs/*.{weft,tests}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const base = (src: string) => src.replace(/^\/+/, '').replace(/^(content\/)?designs\//, '').replace(/\.(weft|tests)$/, '');

/** The source of a design named like `designs/counter.weft`, `counter.weft` or `counter`. */
export function designSource(src: string): string | undefined {
  return files[`/content/designs/${base(src)}.weft`];
}

/** The tests of a design, if it has a `.tests` file. */
export function designTests(src: string): string | undefined {
  return files[`/content/designs/${base(src)}.tests`];
}

export function designNames(): string[] {
  return Object.keys(files)
    .filter((f) => f.endsWith('.weft'))
    .map((f) => f.replace(/^.*\//, '').replace(/\.weft$/, ''));
}

/** The file name to show for a `src`: `designs/counter` → `counter.weft`. */
export function designFile(src: string | undefined): string {
  if (!src) return 'design.weft';
  return `${base(src).replace(/^.*\//, '')}.weft`;
}
