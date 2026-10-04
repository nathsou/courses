import { Marked } from 'marked';
import { chapters, figureIds, type FigureId } from './outline';
import { questions } from './questions';

export type Block = { kind: 'text'; html: string } | { kind: 'figure'; id: FigureId } | { kind: 'question'; id: string } | { kind: 'video'; start: number; end: number; label: string };
export interface Heading { id: string; text: string }
export const headingId = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
export function compile(source: string, duration: number) {
  const headings: Heading[] = [];
  const ids = new Set<string>();
  const markdown = new Marked({ gfm: true, renderer: { heading({ tokens, depth, text }) {
    const id = headingId(text);
    if (ids.has(id)) throw new Error(`Repeated heading: ${id}`);
    ids.add(id);
    if (depth === 2) headings.push({ id, text });
    return `<h${depth} id="${id}" tabindex="-1">${this.parser.parseInline(tokens)}</h${depth}>`;
  } } });
  const parts = source.split(/^:::(figure|question|video) ([^\n]+)\n?$/m);
  const blocks: Block[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]?.trim()) blocks.push({ kind: 'text', html: markdown.parse(parts[i]!, { async: false }) });
    const kind = parts[i + 1], arg = parts[i + 2]?.trim();
    if (!kind || !arg) continue;
    if (kind === 'figure') {
      if (!figureIds.includes(arg as FigureId)) throw new Error(`Unknown figure: ${arg}`);
      blocks.push({ kind, id: arg as FigureId });
    } else if (kind === 'question') {
      if (!questions[arg]) throw new Error(`Unknown question: ${arg}`);
      blocks.push({ kind, id: arg });
    } else {
      const [range, ...label] = arg.split(' ');
      const [start, end] = range!.split('-').map(Number);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start! < 0 || end! <= start! || end! > duration || !label.length) throw new Error(`Invalid video interval: ${arg}`);
      blocks.push({ kind: 'video', start: start!, end: end!, label: label.join(' ') });
    }
  }
  return { blocks, headings };
}
const files = import.meta.glob('../../content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const lessons = chapters.map(chapter => {
  const text = files[`../../content/${chapter.slug}.md`];
  if (!text) throw new Error(`Missing chapter: ${chapter.slug}`);
  return { ...chapter, ...compile(text, chapter.duration) };
});
