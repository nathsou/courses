/**
 * Internal links in the content (Markdown links and widget hrefs) must point at real pages: a chapter, a part
 * essay, an appendix or a top-level route. Links to appendices that are not written yet are reported too.
 */
import { expect, test } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { PARTS, APPENDICES } from '../../content/outline';

const root = path.resolve(import.meta.dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|svelte|ts|yaml)$/.test(f) && !f.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

test('internal links point at real pages', () => {
  const chapters = new Set(PARTS.flatMap((p) => p.chapters.map((c) => c.slug)));
  const parts = new Set(PARTS.flatMap((p) => (p.essay ? [p.essay] : [])));
  const appendices = new Set(APPENDICES.map((a) => a.slug));
  const written = new Set(readdirSync(path.join(root, 'content/appendices')).map((d) => d.replace(/^[a-z]-/, '')));
  const routes = new Set(['workbench', 'chapters', 'museum', 'glossary', 'references', 'timeline', 'reading-paths']);
  const bad: string[] = [];
  for (const file of [...walk(path.join(root, 'content')), ...walk(path.join(root, 'src/routes'))]) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:\]\(|href="(?:\{base\})?)\/([a-z-]+)\/(?:([a-z0-9-]+)\/?)?/g)) {
      const [, kind, slug] = m;
      const where = `${path.relative(root, file)}: /${kind}/${slug ?? ''}`;
      if (kind === 'chapters' && slug && !chapters.has(slug)) bad.push(where);
      else if (kind === 'parts' && slug && !parts.has(slug)) bad.push(where);
      else if (kind === 'appendix' && slug && (!appendices.has(slug) || !written.has(slug))) bad.push(where);
      else if (kind === 'appendices') bad.push(`${where} (appendix pages are at /appendix/)`);
      else if (!['chapters', 'parts', 'appendix', 'appendices'].includes(kind!) && !routes.has(kind!) && !existsSync(path.join(root, 'src/routes', kind!))) bad.push(where);
    }
  }
  expect(bad).toEqual([]);
});
