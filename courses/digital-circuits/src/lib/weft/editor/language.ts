/**
 * Language data for Weft: comment tokens, brackets to close, and indentation by nesting (four spaces per
 * open bracket, as `synth fmt` lays code out). Highlighting is `tokens.ts`; the stream parser only gives
 * CodeMirror's language features something to attach to.
 */
import { StreamLanguage, indentService } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tokenize } from '../highlight';

const stub = StreamLanguage.define<null>({
  startState: () => null,
  token(stream) {
    stream.skipToEnd();
    return null;
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', '"'] },
    indentOnInput: /^\s*[})\]]$/,
  },
});

/** The indentation of the line starting at `lineStart`: one unit per bracket open before it. */
export function indentFor(text: string, lineStart: number, unit = 4): number {
  const upTo = text.slice(0, lineStart);
  const skip = tokenize(upTo).filter((t) => t.kind === 'comment' || t.kind === 'doc' || t.kind === 'string');
  let depth = 0;
  let k = 0;
  for (let i = 0; i < upTo.length; i++) {
    while (k < skip.length && skip[k]!.to <= i) k++;
    if (k < skip.length && skip[k]!.from <= i) {
      i = skip[k]!.to - 1;
      continue;
    }
    const c = upTo[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth = Math.max(0, depth - 1);
  }
  const lineEnd = text.indexOf('\n', lineStart);
  const line = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
  if (/^\s*[)\]}]/.test(line)) depth--;
  return Math.max(0, depth) * unit;
}

export const weftLanguage: Extension = [
  stub,
  indentService.of((ctx, pos) => indentFor(ctx.state.doc.toString(), ctx.lineAt(pos).from, ctx.unit)),
];
