/** Syntax highlighting for the course's HDL: keywords, numbers, comments and operators, as HTML spans. */

const KEYWORDS = new Set(['input', 'output', 'reg', 'wire', 'assert', 'assume']);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlightHdl(src: string): string {
  const out: string[] = [];
  const re = /(\/\/[^\n]*)|(\b0[bx][0-9a-fA-F_]+\b|\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)|(<=|==|!=|>=|&&|\|\||<<|>>|[-+*&|^~!?:<>=])|(\s+|.)/g;
  for (const m of src.matchAll(re)) {
    if (m[1]) out.push(`<span class="com">${esc(m[1])}</span>`);
    else if (m[2]) out.push(`<span class="num">${m[2]}</span>`);
    else if (m[3]) out.push(KEYWORDS.has(m[3]) ? `<span class="kw">${m[3]}</span>` : m[3]);
    else if (m[4]) out.push(`<span class="op">${esc(m[4])}</span>`);
    else out.push(esc(m[5] ?? ''));
  }
  return out.join('');
}
