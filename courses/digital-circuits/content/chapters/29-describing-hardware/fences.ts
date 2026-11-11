/** Fenced code blocks of a Markdown text, for the chapter's tests. */
export interface Block {
  lang: string;
  meta: string;
  code: string;
  line: number;
  /** The ```tests block that follows this one directly, if any. */
  tests?: string;
}

export function fencedBlocks(text: string, lang: string): Block[] {
  const all: (Block & { end: number })[] = [];
  const re = /^```(\w+)([^\n]*)\n([\s\S]*?)\n```$/gm;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    all.push({ lang: m[1]!, meta: m[2]!.trim(), code: m[3]! + '\n', line: text.slice(0, m.index).split('\n').length, end: m.index + m[0].length });
  }
  const out: Block[] = [];
  all.forEach((b, i) => {
    if (b.lang !== lang) return;
    const next = all[i + 1];
    const between = next ? text.slice(b.end, text.indexOf('```', b.end)) : '';
    out.push({ lang: b.lang, meta: b.meta, code: b.code, line: b.line, tests: next && next.lang === 'tests' && between.trim() === '' ? next.code : undefined });
  });
  return out;
}
