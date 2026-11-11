/**
 * Highlighting as a ViewPlugin: the whole text is re-tokenised when it changes (designs are small, and
 * block comments and strings cross lines), with the names the latest analysis knows coloured by what they
 * are (registers, ports, instances, domains).
 */
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { tokenize, type HighlightKind } from '../highlight';

const marks = new Map<HighlightKind, Decoration>();
const mark = (k: HighlightKind) => {
  let m = marks.get(k);
  if (!m) marks.set(k, (m = Decoration.mark({ class: `cm-weft-${k}` })));
  return m;
};

/** New semantic kinds (start index → kind) from an analysis of the current text. */
export const setKinds = StateEffect.define<Map<number, string>>();

function build(text: string, kinds?: Map<number, string>): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  let pos = 0;
  for (const t of tokenize(text, 'weft', kinds)) {
    if (t.from < pos || t.to > text.length || t.to <= t.from) continue;
    b.add(t.from, t.to, mark(t.kind));
    pos = t.to;
  }
  return b.finish();
}

export const weftTokens: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    kinds: Map<number, string> | undefined;
    constructor(view: EditorView) {
      this.decorations = build(view.state.doc.toString());
    }
    update(u: ViewUpdate) {
      let changed = u.docChanged;
      if (u.docChanged) this.kinds = undefined;
      for (const tr of u.transactions)
        for (const e of tr.effects)
          if (e.is(setKinds)) {
            this.kinds = e.value;
            changed = true;
          }
      if (changed) this.decorations = build(u.state.doc.toString(), this.kinds);
    }
  },
  { decorations: (v) => v.decorations },
);
