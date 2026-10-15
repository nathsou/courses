/**
 * Build-time renderers for maths (KaTeX) and code (Shiki).
 */
import katex from 'katex';
import { bundledLanguages, createHighlighter, type Highlighter, type ThemeRegistration } from 'shiki';

/**
 * Macros available in every equation.
 * `\term{id}{tex}` marks a symbol as hoverable; its documentation comes from a ```terms block
 * in the chapter or from content/terms.yaml.
 */
export const MACROS: Record<string, string> = {
  '\\term': '\\htmlData{term=#1}{#2}',
  '\\R': '\\mathbb{R}',
  '\\E': '\\mathbb{E}',
  '\\softmax': '\\operatorname{softmax}',
  '\\argmax': '\\operatorname*{arg\\,max}',
  '\\argmin': '\\operatorname*{arg\\,min}',
  '\\T': '^{\\top}',
  '\\Z': '\\mathbb{Z}',
  '\\N': '\\mathbb{N}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
  '\\F': '\\mathbb{F}',
  '\\Re': '\\operatorname{Re}',
  '\\Im': '\\operatorname{Im}',
  '\\li': '\\operatorname{li}',
  '\\Li': '\\operatorname{Li}',
  '\\ord': '\\operatorname{ord}',
  '\\lcm': '\\operatorname{lcm}',
  '\\leg': '\\left(\\frac{#1}{#2}\\right)',
};

export function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    trust: (ctx) => ctx.command === '\\htmlData' || ctx.command === '\\htmlClass',
    macros: { ...MACROS },
    output: 'htmlAndMathml',
  });
}

/** Term ids referenced with \term{id}{…} in a TeX string. */
export function termRefs(tex: string): string[] {
  return [...tex.matchAll(/\\term\{([^}]+)\}/g)].map((m) => m[1]!);
}

/**
 * Ledger code themes: the same token roles as GitHub's (keyword, string, number, comment, function,
 * type), re-coloured for the paper and night-ledger pages. Every role keeps its own hue and at least
 * 4.5:1 contrast on the code panel (--pn), so tokens stay distinct in both themes.
 */
function ledgerTheme(name: string, type: 'light' | 'dark', c: Record<'fg' | 'bg' | 'keyword' | 'string' | 'number' | 'comment' | 'fn' | 'type' | 'prop' | 'punct', string>): ThemeRegistration {
  return {
    name,
    type,
    colors: { 'editor.foreground': c.fg, 'editor.background': c.bg },
    fg: c.fg,
    bg: c.bg,
    settings: [
      { settings: { foreground: c.fg, background: c.bg } },
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
      { scope: ['keyword', 'storage', 'storage.type', 'keyword.operator.new', 'keyword.control'], settings: { foreground: c.keyword } },
      { scope: ['keyword.operator', 'punctuation', 'meta.brace'], settings: { foreground: c.punct } },
      { scope: ['string', 'string.quoted', 'punctuation.definition.string', 'constant.other.symbol'], settings: { foreground: c.string } },
      { scope: ['constant.numeric', 'constant.language', 'constant.character', 'support.constant'], settings: { foreground: c.number } },
      { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: c.fn } },
      { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: c.type } },
      { scope: ['variable.other.property', 'meta.object-literal.key', 'support.type.property-name', 'entity.name.tag', 'entity.other.attribute-name'], settings: { foreground: c.prop } },
      { scope: ['markup.inserted'], settings: { foreground: c.string } },
      { scope: ['markup.deleted', 'invalid'], settings: { foreground: c.keyword } },
    ],
  };
}
const THEME_LIGHT = ledgerTheme('ledger-light', 'light', { fg: '#1b1d22', bg: '#ece7d8', keyword: '#a52b19', string: '#235287', number: '#7a4f00', comment: '#5c606a', fn: '#6a3f8f', type: '#1d6470', prop: '#235287', punct: '#3a3d45' });
const THEME_DARK = ledgerTheme('ledger-dark', 'dark', { fg: '#e9e4d7', bg: '#1b212b', keyword: '#ff8a73', string: '#7ba7d8', number: '#f0b45a', comment: '#a19d92', fn: '#c6a8f0', type: '#62c2cf', prop: '#7ba7d8', punct: '#cdc8bb' });

let highlighter: Promise<Highlighter> | undefined;

export async function highlight(code: string, lang: string | null | undefined): Promise<string> {
  highlighter ??= createHighlighter({ themes: [THEME_LIGHT, THEME_DARK], langs: [] });
  const h = await highlighter;
  // Load any bundled grammar (including aliases) instead of silently losing highlighting.
  const requested = lang?.trim().toLowerCase() ?? 'text';
  const l = Object.hasOwn(bundledLanguages, requested) ? requested : 'text';
  if (l !== 'text') await h.loadLanguage(bundledLanguages[l as keyof typeof bundledLanguages]);
  // Shiki makes <pre> focusable (tabindex=0) so wide code can be scrolled from the keyboard,
  // which is right for accessibility, but trips Svelte's generic a11y lint.
  const html = h.codeToHtml(code, {
    lang: l,
    themes: { light: 'ledger-light', dark: 'ledger-dark' },
    defaultColor: false,
  });
  return `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->${html}`;
}
