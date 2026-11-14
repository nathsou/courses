/** Format on demand with synth's formatter (`synth fmt`), applied as a minimal edit so the cursor stays put. */
import type { EditorView } from '@codemirror/view';

export type FormatOutcome = 'changed' | 'unchanged' | 'error';

/** Replaces the document with `formatted`, changing only the part that differs. */
export function applyFormatted(view: EditorView, text: string, formatted: string): FormatOutcome {
  if (view.state.doc.toString() !== text) return 'error';
  if (formatted === text) return 'unchanged';
  let start = 0;
  while (start < text.length && start < formatted.length && text[start] === formatted[start]) start++;
  let endA = text.length;
  let endB = formatted.length;
  while (endA > start && endB > start && text[endA - 1] === formatted[endB - 1]) {
    endA--;
    endB--;
  }
  view.dispatch({ changes: { from: start, to: endA, insert: formatted.slice(start, endB) }, userEvent: 'input.format' });
  return 'changed';
}
