/**
 * Markdown → Svelte compiler for course content (from The Prime Staircase, without maths or code).
 *
 * Chapters are plain Markdown (GFM) extended with directives:
 *
 *   :::note / :::tip / :::warning / :::key / :::question / :::bridge / :::exercises / …   callouts
 *   :::listen[Before reading]                a sound to hear before the explanation
 *   :::atthekeys[Try it]                     a hands-on interlude at the keyboard
 *   :::history{year=1722 title="…"}          archive card
 *   :::details[Summary text]                 collapsible
 *   :::figure{caption="…" wide}              figure wrapper
 *   :::bio{name="…" born=1685 died=1750}     biography card
 *   ::::hints + :::hint[…]                   a hint ladder
 *   ::some-widget{prop=1 other="x"}          any Svelte widget (./widgets/SomeWidget.svelte or $lib/widgets)
 *   :sidenote[margin note]  :cite[key1,key2]  :term[glossary word]{id=…}  :kbd[A]
 *   :n[C4]  :n[F#]                           a note name in the reader's chosen system (C, Do, H …)
 *   :c[Am]  :c[G7/B]                         a chord symbol in the reader's note names
 *   :t[crotchet]  :t[bar]{both}              a term in the reader's British or American set
 *
 * Fenced blocks: `score` (the course's score format, src/lib/notation/parse.ts; attributes after the
 * language: caption="…" play="false" tempo="72" names="true"), `quiz` (multiple choice), and the keyboard
 * exercises `play` (chords and notes held), `perform` (a score played or tapped, timed or not), `ear` (hear and
 * name, or play back), `spell` (write notes, spelling counts) and `read` (a note-reading drill).
 *
 * Output is a Svelte component whose `<script module>` exports metadata, toc, references and glossary,
 * so routes can render chrome around the content.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import YAML from 'yaml';
import type { Root, Nodes, Parent, Html, Code, Heading, Image, Link } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';

type Directive = ContainerDirective | LeafDirective | TextDirective;

interface ComponentUse {
  tag: string;
  props: string;
}

interface Ctx {
  file: string;
  dir: string;
  contentRoot: string;
  components: ComponentUse[];
  imports: string[];
  importCount: number;
  toc: { id: string; text: string; depth: 2 | 3 }[];
  slugs: Map<string, number>;
  cites: Set<string>;
  glossaryRefs: Set<string>;
  exercises: number;
  chapterNumber: string;
  slug: string;
  /** Ids of the exercises inside :::check blocks (Check yourself). */
  checks: string[];
  inCheck: number;
  deps: Set<string>;
  asyncJobs: Promise<void>[];
}

const CALLOUTS = new Set(['check', 'note', 'tip', 'warning', 'info', 'challenge', 'exercises', 'definition', 'key', 'question', 'aside', 'bridge', 'listen', 'atthekeys']);
const TEXT_DIRECTIVES = new Set(['sidenote', 'cite', 'term', 'kbd', 'n', 'c', 't']);
const BUILTIN_BLOCKS: Record<string, string> = {
  history: 'History',
  details: 'Details',
  figure: 'Figure',
  columns: 'Columns',
  bio: 'Bio',
  hints: 'Hints',
  hint: 'Hint',
};
const EXERCISE_BLOCKS: Record<string, string> = {
  play: 'PlayExercise',
  perform: 'PerformExercise',
  ear: 'EarExercise',
  spell: 'SpellExercise',
  read: 'ReadExercise',
};
/** Fields of exercise blocks that are data, not Markdown (passed through untouched). */
const RAW_FIELDS: Record<string, string[]> = {
  play: ['steps', 'notes', 'chords', 'key', 'range', 'match'],
  perform: ['score', 'mode', 'tempo', 'countIn', 'tolerance', 'click', 'range'],
  ear: ['kind', 'pool', 'harmonic', 'rounds', 'pass', 'range', 'white', 'items', 'options'],
  spell: ['key', 'staff', 'range'],
  read: ['staff', 'range', 'white', 'key', 'rounds', 'pass'],
};
/** YAML fields of exercise blocks that hold Markdown (rendered at build time). */
const MARKDOWN_FIELDS = new Set(['ask', 'prompt', 'text', 'solution', 'why', 'explain', 'hint', 'hints', 'lines', 'distractors', 'rubric', 'feedback', 'note', 'success', 'options', 'label']);

/**
 * A deterministic shuffle of quiz options, seeded by the question text, so that authors can list the correct
 * answer first without readers learning that it always comes first. Same order on every build.
 */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const pascal = (s: string) => s.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase());
const camel = (s: string) => s.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());

/** Serialise directive attributes as Svelte props. Numbers, booleans and JSON literals stay typed. */
function props(attrs: Record<string, string | null | undefined> | null | undefined, extra: Record<string, unknown> = {}): string {
  const out: string[] = [];
  for (const [k, raw] of Object.entries(attrs ?? {})) {
    const key = k === 'class' ? 'class' : camel(k);
    if (raw == null || raw === '') {
      out.push(`${key}={true}`);
      continue;
    }
    let expr = JSON.stringify(raw);
    if (/^(-?\d+(\.\d+)?(e-?\d+)?|true|false)$/.test(raw) || /^[[{]/.test(raw)) {
      try {
        expr = JSON.stringify(JSON.parse(raw));
      } catch {
        /* keep as string */
      }
    }
    out.push(`${key}={${expr}}`);
  }
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) out.push(`${k}={${JSON.stringify(v)}}`);
  return out.join(' ');
}

function marker(kind: 'open' | 'close' | 'leaf', i: number): Html {
  return { type: 'html', value: `<!--§${kind}:${i}-->` };
}

function slugify(ctx: Ctx, text: string): string {
  const base =
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';
  const n = ctx.slugs.get(base) ?? 0;
  ctx.slugs.set(base, n + 1);
  return n ? `${base}-${n}` : base;
}

function addImport(ctx: Ctx, spec: string, prefix: string): string {
  const name = `__${prefix}${ctx.importCount++}`;
  ctx.imports.push(`import ${name} from ${JSON.stringify(spec)};`);
  return name;
}

const widgetIndex = (ctx: Ctx) => path.join(ctx.contentRoot, '..', 'src/lib/widgets/index.ts');

/** Resolve a directive name to a component tag, adding imports as needed. */
function resolveComponent(ctx: Ctx, name: string): string {
  const Name = pascal(name);
  const local = path.join(ctx.dir, 'widgets', `${Name}.svelte`);
  if (existsSync(local)) {
    const existing = ctx.imports.find((l) => l.startsWith(`import ${Name} `));
    if (!existing) ctx.imports.push(`import ${Name} from './widgets/${Name}.svelte';`);
    return Name;
  }
  const index = widgetIndex(ctx);
  ctx.deps.add(index);
  const src = existsSync(index) ? readFileSync(index, 'utf8') : '';
  if (new RegExp(`\\b(as|default as)\\s+${Name}\\b|export \\{[^}]*\\b${Name}\\b`).test(src)) return `W.${Name}`;
  throw new Error(`${ctx.file}: unknown directive/widget "${name}" — expected ./widgets/${Name}.svelte or an export named ${Name} in src/lib/widgets/index.ts`);
}

const inlineProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

/** Render a short Markdown string (quiz text, exercise prompts) to HTML. */
async function renderInline(md: string | undefined): Promise<string | undefined> {
  if (md == null) return undefined;
  const tree = inlineProcessor.parse(String(md)) as Root;
  visit(tree, (node, index, parent) => {
    if (node.type === 'link' && node.url.startsWith('/') && !node.url.startsWith('//')) node.url = `__COURSE_BASE__${node.url}`;
    // Note names and terms inside prompts depend on the reader's settings: leave a placeholder the
    // exercise components fill in.
    if (node.type === 'textDirective' && parent && index !== undefined && (node.name === 'n' || node.name === 'c' || node.name === 't')) {
      const both = node.attributes && 'both' in node.attributes ? ' data-both' : '';
      const attr = { n: 'note', c: 'chord', t: 'word' }[node.name];
      parent.children[index] = { type: 'html', value: `<span data-${attr}="${toString(node).replace(/"/g, '&quot;')}"${both}>${toString(node)}</span>` } as never;
    }
  });
  const hast = await unified().use(remarkRehype, { allowDangerousHtml: true }).run(tree);
  let html = unified().use(rehypeStringify, { allowDangerousHtml: true }).stringify(hast as never);
  const single = /^<p>([\s\S]*)<\/p>$/.exec(html.trim());
  if (single && !single[1]!.includes('<p>')) html = single[1]!;
  return html;
}

/** Render the Markdown fields of an exercise spec (recursively through arrays and objects). */
async function renderFields(data: Record<string, unknown>, inMarkdown = false, raw: string[] = []): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) out[k] = raw.includes(k) ? v : await renderValue(v, inMarkdown || MARKDOWN_FIELDS.has(k));
  return out;
}

async function renderValue(v: unknown, md: boolean): Promise<unknown> {
  // In a Markdown list, "- Divide by $a - b$: …" is a YAML mapping; authors mean the text.
  if (md && v && typeof v === 'object' && !Array.isArray(v)) {
    const entries = Object.entries(v);
    if (entries.length === 1 && (typeof entries[0]![1] === 'string' || typeof entries[0]![1] === 'number')) v = `${entries[0]![0]}: ${entries[0]![1]}`;
  }
  if (typeof v === 'number' && md) v = String(v);
  if (typeof v === 'string') return md ? await renderInline(v) : v;
  if (Array.isArray(v)) return Promise.all(v.map((x) => renderValue(x, md)));
  if (v && typeof v === 'object') return renderFields(v as Record<string, unknown>, md);
  return v;
}

/** Parse a fenced YAML block with an error message that points at the chapter and the usual culprit. */
function parseYamlBlock<T>(ctx: Ctx, src: string, kind: string): T {
  // Prose fields often contain “: ” (which YAML reads as a nested mapping). Turn an unquoted
  // single-line prose value that contains one into a block scalar.
  src = src.replace(
    /^(\s*)(why|prompt|solution|explain|hint|text|title|note|q|success|feedback):[ \t]+(?![|>'"])(.*: .*)$/gm,
    (_, indent: string, key: string, value: string) => `${indent}${key}: |\n${indent}  ${value}`,
  );
  try {
    return YAML.parse(src) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `${path.relative(ctx.contentRoot, ctx.file)}: invalid YAML in a \`\`\`${kind} block — ${msg}\n` +
        `Hint: quote values that contain ": " or start with a special character.`,
    );
  }
}

function loadYaml<T>(file: string, ctx: Ctx): T {
  ctx.deps.add(file);
  return existsSync(file) ? ((YAML.parse(readFileSync(file, 'utf8')) ?? {}) as T) : ({} as T);
}

async function buildReferenceList(ctx: Ctx, name: string, i: number): Promise<void> {
  if (name === 'all-references') {
    const bib = loadYaml<Record<string, { authors: string; year: number | string } & Record<string, unknown>>>(path.join(ctx.contentRoot, 'bibliography.yaml'), ctx);
    const items = Object.entries(bib)
      .map(([key, r]) => ({ key, ...r }))
      .sort((a, b) => String(a.authors).localeCompare(String(b.authors)) || Number(a.year) - Number(b.year));
    ctx.components[i] = { tag: 'B.ReferenceList', props: `items={withBase(${JSON.stringify(items)})}` };
  } else if (name === 'all-glossary') {
    const g = loadYaml<Record<string, { term: string; definition: string; chapter?: string }>>(path.join(ctx.contentRoot, 'glossary.yaml'), ctx);
    const items = await Promise.all(
      Object.entries(g).map(async ([id, e]) => ({ id, term: e.term, chapter: e.chapter, definition: await renderInline(e.definition) })),
    );
    items.sort((a, b) => a.term.localeCompare(b.term));
    ctx.components[i] = { tag: 'B.GlossaryList', props: `items={withBase(${JSON.stringify(items)})}` };
  } else {
    const t = loadYaml<{ year: number; title: string; people?: string; chapter?: string; text: string }[]>(path.join(ctx.contentRoot, 'timeline.yaml'), ctx);
    const items = await Promise.all((Array.isArray(t) ? t : []).map(async (e) => ({ ...e, text: await renderInline(e.text) })));
    items.sort((a, b) => a.year - b.year);
    ctx.components[i] = { tag: 'B.Timeline', props: `items={withBase(${JSON.stringify(items)})}` };
  }
}

function transformDirective(ctx: Ctx, node: Directive, parent: Parent, index: number): number | void {
  const name = node.name;
  const attrs = { ...(node.attributes ?? {}) };

  // Unknown text directives are almost always prose like "ratio 3:1" — put the text back.
  if (node.type === 'textDirective' && !TEXT_DIRECTIVES.has(name)) {
    const label = node.children.length ? `[${toString(node)}]` : '';
    parent.children.splice(index, 1, { type: 'text', value: `:${name}${label}` } as never);
    return index + 1;
  }

  // Container label ([…] right after the name) becomes the title.
  let title: string | undefined;
  if (node.type === 'containerDirective') {
    const first = node.children[0];
    if (first && first.type === 'paragraph' && (first.data as { directiveLabel?: boolean } | undefined)?.directiveLabel) {
      title = toString(first);
      node.children.shift();
    }
  } else if (node.type === 'leafDirective' && node.children.length) {
    title = toString(node);
    node.children = [];
  }

  let tag: string;
  const extra: Record<string, unknown> = {};
  if (title !== undefined && attrs.title == null) extra.title = title;

  if (node.type === 'textDirective') {
    if (name === 'cite') {
      const keys = toString(node).split(',').map((k) => k.trim()).filter(Boolean);
      keys.forEach((k) => ctx.cites.add(k));
      ctx.components.push({ tag: 'B.Cite', props: props(attrs, { keys }) });
      parent.children.splice(index, 1, marker('leaf', ctx.components.length - 1));
      return index + 1;
    }
    if (name === 'n') {
      tag = 'B.NoteName';
      extra.note = toString(node);
      node.children = [];
    } else if (name === 'c') {
      tag = 'B.ChordName';
      extra.chord = toString(node);
      node.children = [];
    } else if (name === 't') {
      tag = 'B.Term';
      extra.word = toString(node);
      node.children = [];
    } else if (name === 'term') {
      const id = attrs.id ?? toString(node).toLowerCase();
      delete attrs.id;
      ctx.glossaryRefs.add(id);
      extra.id = id;
      tag = 'B.GlossaryTerm';
    } else if (name === 'kbd') {
      tag = 'B.Kbd';
    } else {
      tag = 'B.Sidenote';
    }
  } else if (name === 'all-references' || name === 'all-glossary' || name === 'timeline') {
    // Whole-course reference lists, embedded at build time (Appendix J).
    const i = ctx.components.push({ tag: '', props: '' }) - 1;
    ctx.asyncJobs.push(buildReferenceList(ctx, name, i));
    parent.children.splice(index, 1, marker('leaf', i));
    return index + 1;
  } else if (CALLOUTS.has(name)) {
    tag = 'B.Callout';
    extra.kind = name;
  } else if (BUILTIN_BLOCKS[name]) {
    tag = `B.${BUILTIN_BLOCKS[name]}`;
  } else {
    tag = resolveComponent(ctx, name);
  }

  ctx.components.push({ tag, props: props(attrs, extra) });
  const i = ctx.components.length - 1;
  if (node.type === 'leafDirective') {
    parent.children.splice(index, 1, marker('leaf', i));
    return index + 1;
  }
  parent.children.splice(index, 1, marker('open', i), ...(node.children as never[]), marker('close', i));
  return index + 1;
}

/** Whether a node lies inside a :::check container (marked before the containers are flattened). */
function isInCheck(node: Nodes): boolean {
  return (node.data as { inCheck?: boolean } | undefined)?.inCheck === true;
}

async function transform(tree: Root, ctx: Ctx): Promise<void> {
  // Mark everything inside :::check before directives are replaced by markers.
  visit(tree, (node) => {
    if (node.type === 'containerDirective' && node.name === 'check') {
      const mark = (n: Nodes) => {
        n.data = { ...(n.data ?? {}), inCheck: true } as never;
        if ('children' in n) for (const c of n.children as Nodes[]) mark(c);
      };
      mark(node as Nodes);
    }
  });
  visit(tree, (node: Nodes, index, parent) => {
    if (index === undefined || !parent) return;
    switch (node.type) {
      case 'containerDirective':
      case 'leafDirective':
      case 'textDirective':
        return transformDirective(ctx, node, parent, index);

      case 'heading': {
        const h = node as Heading;
        const text = toString(h);
        const id = slugify(ctx, text);
        h.data = { ...h.data, hProperties: { id } };
        if (h.depth === 2 || h.depth === 3) ctx.toc.push({ id, text, depth: h.depth });
        return;
      }

      case 'code': {
        const code = node as Code;
        const meta = Object.fromEntries([...(code.meta ?? '').matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
        if (code.lang === 'score') {
          const extra: Record<string, unknown> = { src: code.value };
          if (meta.label) extra.label = meta.label;
          if (meta.play === 'false') extra.play = false;
          if (meta.tempo) extra.tempo = Number(meta.tempo);
          if (meta.names === 'true') extra.names = true;
          const i = ctx.components.push({ tag: 'B.Score', props: props({}, extra) }) - 1;
          // Captions may hold :n[…], :c[…] and :t[…]: render them, like exercise prompts.
          if (meta.caption)
            ctx.asyncJobs.push(
              renderInline(meta.caption).then((html) => {
                ctx.components[i]!.props += ` caption={withBase(${JSON.stringify(html)})}`;
              }),
            );
          parent.children[index] = marker('leaf', i);
          return;
        }
        if (code.lang === 'quiz') {
          const data = parseYamlBlock<{ q: string; options: { text: string; correct?: boolean; why?: string }[] }>(ctx, code.value, 'quiz');
          const i = ctx.components.push({ tag: 'B.Quiz', props: '' }) - 1;
          ctx.asyncJobs.push(
            (async () => {
              const rendered = {
                question: await renderInline(data.q),
                options: await Promise.all(
                  shuffled(data.options, data.q).map(async (o) => ({ text: await renderInline(o.text), correct: !!o.correct, why: await renderInline(o.why) })),
                ),
              };
              ctx.components[i]!.props = `data={withBase(${JSON.stringify(rendered)})}`;
            })(),
          );
          parent.children[index] = marker('leaf', i);
          return;
        }
        if (code.lang && EXERCISE_BLOCKS[code.lang]) {
          const kind = code.lang;
          const data = parseYamlBlock<Record<string, unknown>>(ctx, code.value, kind);
          const id = String(data.id ?? `${ctx.slug}/${kind}-${++ctx.exercises}`);
          if (isInCheck(code) && !ctx.checks.includes(id)) ctx.checks.push(id);
          const i = ctx.components.push({ tag: `B.${EXERCISE_BLOCKS[kind]}`, props: '' }) - 1;
          ctx.asyncJobs.push(
            (async () => {
              const rendered = await renderFields(data, false, RAW_FIELDS[kind]);
              ctx.components[i]!.props = `spec={withBase(${JSON.stringify({ ...rendered, id })})}`;
            })(),
          );
          parent.children[index] = marker('leaf', i);
          return;
        }
        const escaped = code.value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        parent.children[index] = { type: 'html', value: `<pre class="plain"><code>${escaped}</code></pre>` } as never;
        return;
      }

      case 'image': {
        const img = node as Image;
        if (/^(https?:)?\/\//.test(img.url) || img.url.startsWith('/')) return;
        const imp = addImport(ctx, img.url.startsWith('.') ? img.url : `./${img.url}`, 'img');
        const i = ctx.components.push({ tag: 'img', props: `src={${imp}} alt=${JSON.stringify(img.alt ?? '')} loading="lazy"` }) - 1;
        parent.children[index] = marker('leaf', i) as never;
        return;
      }

      case 'link': {
        const link = node as Link;
        if (link.url.startsWith('/') && !link.url.startsWith('//')) link.url = `__COURSE_BASE__${link.url}`;
        return;
      }
    }
  });
  await Promise.all(ctx.asyncJobs);
}

export interface CompileResult {
  code: string;
  dependencies: string[];
}

export async function compileMarkdown(source: string, file: string): Promise<CompileResult> {
  const contentRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../content');
  const ctx: Ctx = {
    file,
    dir: path.dirname(file),
    contentRoot,
    components: [],
    imports: [],
    importCount: 0,
    toc: [],
    slugs: new Map(),
    cites: new Set(),
    glossaryRefs: new Set(),
    exercises: 0,
    chapterNumber: '',
    slug: '',
    checks: [],
    inCheck: 0,
    deps: new Set(),
    asyncJobs: [],
  };

  // Front matter.
  let body = source;
  let front: Record<string, unknown> = {};
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (fm) {
    front = YAML.parse(fm[1]!) ?? {};
    body = source.slice(fm[0].length);
  }
  const dirName = path.basename(ctx.dir);
  const metadata = {
    slug: (front.slug as string) ?? dirName.replace(/^[0-9a-z]{1,2}-/, ''),
    kind: file.includes(`${path.sep}appendices${path.sep}`) ? 'appendix' : 'chapter',
    ...front,
    number: String(front.number ?? ''),
  };
  ctx.chapterNumber = metadata.number;
  ctx.slug = metadata.slug as string;

  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(body) as Root;
  visit(tree, (node) => {
    if (node.type === 'containerDirective' && node.name === 'figure' && node.attributes?.id) ctx.slugs.set(node.attributes.id, 1);
  });
  await transform(tree, ctx);
  const hast = await unified().use(remarkRehype, { allowDangerousHtml: true }).run(tree);
  let html = unified().use(rehypeStringify, { allowDangerousHtml: true }).stringify(hast as never);

  html = html.replace(/<table[\s>][\s\S]*?<\/table>/g, (table) => `<div class="table-scroll">${table}</div>`);

  // Everything that is still HTML is static: neutralise Svelte's { } before inserting components.
  html = html.replace(/[{}]/g, (c) => (c === '{' ? '&#123;' : '&#125;'));
  html = html.replaceAll('__COURSE_BASE__', '{base}');
  html = html.replace(/<!--§(open|close|leaf):(\d+)-->/g, (_, kind: string, i: string) => {
    const c = ctx.components[Number(i)]!;
    const p = c.props ? ` ${c.props}` : '';
    if (kind === 'open') return `<${c.tag}${p}>`;
    if (kind === 'close') return `</${c.tag}>`;
    return `<${c.tag}${p} />`;
  });

  const bib = loadYaml<Record<string, Omit<import('../../src/lib/content/types.ts').Reference, 'key'>>>(path.join(contentRoot, 'bibliography.yaml'), ctx);
  const references = [...ctx.cites].map((key) => {
    if (!bib[key]) console.warn(`[course] missing bibliography entry "${key}"`);
    return { key, ...(bib[key] ?? { authors: '?', year: '?', title: key }) };
  });

  const glossarySrc = loadYaml<Record<string, { term: string; definition: string; chapter?: string }>>(path.join(contentRoot, 'glossary.yaml'), ctx);
  const glossary: Record<string, unknown> = {};
  for (const id of ctx.glossaryRefs) {
    const g = glossarySrc[id];
    if (!g) {
      console.warn(`[course] missing glossary entry "${id}"`);
      continue;
    }
    glossary[id] = { ...g, definition: await renderInline(g.definition) };
  }

  const code = `<script module>
import { base } from '$app/paths';
/** @param {any} value @returns {any} */
function withBase(value) {
  if (typeof value === 'string') return value.replaceAll('__COURSE_BASE__', base);
  if (Array.isArray(value)) return value.map(withBase);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, withBase(val)]));
  return value;
}
export const metadata = ${JSON.stringify(metadata)};
export const toc = ${JSON.stringify(ctx.toc)};
export const references = ${JSON.stringify(references)};
export const glossary = withBase(${JSON.stringify(glossary)});
export const checks = ${JSON.stringify(ctx.checks)};
</script>
<script>
import * as B from '$lib/components/content';
import * as W from '$lib/widgets';
${ctx.imports.join('\n')}
</script>
${html}
`;
  return { code, dependencies: [...ctx.deps] };
}
