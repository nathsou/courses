/**
 * Syntax highlighting shared by the editors (CodeMirror) and the static code listings in the figures: one table of
 * token colours, which come from CSS variables so they follow the light/dark theme, and the Lezer parsers that
 * the editor languages are built on, so a listing looks like the editor beside it.
 */
import { tagHighlighter, tags as t, highlightCode, type Tag } from '@lezer/highlight';
import type { Parser } from '@lezer/common';
import { javascriptLanguage, tsxLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { htmlLanguage } from '@codemirror/lang-html';
import { vueLanguage } from '@codemirror/lang-vue';
import { svelteLanguage } from '@replit/codemirror-lang-svelte';

export type CodeLang = 'ts' | 'js' | 'jsx' | 'html' | 'svelte' | 'vue' | 'json' | 'text';

interface Rule {
  tag: Tag | Tag[];
  name: string;
  color: string;
  italic?: boolean;
}

export const RULES: Rule[] = [
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], name: 'keyword', color: 'var(--code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp, t.attributeValue], name: 'string', color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], name: 'number', color: 'var(--code-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], name: 'comment', color: 'var(--code-comment)', italic: true },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], name: 'fn', color: 'var(--code-fn)' },
  { tag: [t.typeName, t.className, t.namespace, t.tagName], name: 'type', color: 'var(--code-type)' },
  { tag: [t.definition(t.variableName)], name: 'def', color: 'var(--code-def)' },
  { tag: [t.propertyName, t.attributeName], name: 'prop', color: 'var(--code-prop)' },
  { tag: [t.operator, t.punctuation, t.bracket, t.angleBracket], name: 'punct', color: 'var(--code-punct)' },
];

export const styleOf = new Map(RULES.map((r) => [r.name, r]));
const highlighter = tagHighlighter(RULES.map((r) => ({ tag: r.tag, class: r.name })));

const parsers: Record<Exclude<CodeLang, 'text'>, Parser> = {
  ts: typescriptLanguage.parser,
  js: javascriptLanguage.parser,
  jsx: tsxLanguage.parser,
  json: javascriptLanguage.parser,
  html: htmlLanguage.parser,
  svelte: svelteLanguage.parser,
  vue: vueLanguage.parser,
};

export interface Token {
  text: string;
  /** Name of a rule in RULES; empty for plain text. */
  rule: string;
}

/** The code split into lines of tokens. Plain text (or a failed parse) gives one token per line. */
export function highlightLines(code: string, lang: CodeLang): Token[][] {
  const lines: Token[][] = [[]];
  const push = (text: string, rule: string) => {
    if (text) lines[lines.length - 1]!.push({ text, rule });
  };
  if (lang === 'text') {
    code.split('\n').forEach((l, i) => (i && lines.push([]), push(l, '')));
    return lines;
  }
  try {
    highlightCode(code, parsers[lang].parse(code), highlighter, (text, cls) => push(text, cls), () => lines.push([]));
  } catch {
    return highlightLines(code, 'text');
  }
  return lines;
}
