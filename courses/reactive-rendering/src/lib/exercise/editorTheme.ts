import { HighlightStyle } from '@codemirror/language';
import { RULES } from '$lib/code/highlight';

/** Syntax colours come from CSS variables so the editor follows the light/dark theme; the table is shared with the static listings. */
export const highlightStyle = HighlightStyle.define(RULES.map((r) => ({ tag: r.tag, color: r.color, ...(r.italic ? { fontStyle: 'italic' } : {}) })));
