/**
 * The Weft editor: CodeMirror 6 with synth behind it.
 *
 * - **Highlighting** as synth highlights Weft (`../highlight.ts`), with registers, ports, instances and
 *   domains coloured by what the analysis says they are.
 * - **Diagnostics** from synth's `analyze` (in a Web Worker, `../../synth/client.ts`) after a pause in typing,
 *   as underlines, in the gutter and in tooltips, with synth's notes and suggested fixes.
 * - **Hover**: the type, value range, width and clock domain synth gives for the name under the pointer.
 * - **Format** with Shift-Alt-F (synth's formatter), **go to definition** with F12, indentation by nesting,
 *   bracket matching and closing, search, undo.
 * - **Cross-probing** hooks for the widgets: `setProbe` marks source ranges, `onPointer` reports the offset
 *   under the pointer.
 */
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { lintGutter, lintKeymap, linter } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Annotation, Compartment, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, type DecorationSet } from '@codemirror/view';
import { refAt, type WeftAnalysis } from '../analysis';
import { applyFormatted, type FormatOutcome } from './format';
import { weftHover } from './hover';
import { weftLanguage } from './language';
import { toCmDiagnostics } from './lint';
import { weftTheme } from './theme';
import { setKinds, weftTokens } from './tokens';

export type { FormatOutcome } from './format';

export interface Range {
  from: number;
  to: number;
}

export interface WeftEditorOptions {
  doc?: string;
  onChange?: (doc: string) => void;
  readOnly?: boolean;
  /** Analyses the text after `delay` ms without typing; resolve to undefined to skip (superseded). */
  analyze?: (source: string) => Promise<WeftAnalysis | undefined>;
  onAnalysis?: (a: WeftAnalysis) => void;
  /** Formats a text (synth's formatter); a text with syntax errors comes back unchanged. */
  formatter?: (source: string) => Promise<string>;
  onFormat?: (outcome: FormatOutcome) => void;
  onPointer?: (hit: { offset: number; line: number; gutter?: boolean } | null) => void;
  ariaLabel?: string;
  lineNumbers?: boolean;
  delay?: number;
}

export interface WeftEditor {
  readonly view: EditorView;
  getDoc(): string;
  setDoc(text: string): void;
  focus(): void;
  destroy(): void;
  setProbe(ranges: Range[]): void;
  setReadOnly(readOnly: boolean): void;
  format(): Promise<FormatOutcome>;
  analysis(): WeftAnalysis | undefined;
  reveal(offset: number): void;
}

const external = Annotation.define<boolean>();
const setProbeEffect = StateEffect.define<Range[]>();
const probeMark = Decoration.mark({ class: 'cm-weft-probe' });
const probeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let v = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setProbeEffect)) {
        const len = tr.state.doc.length;
        v = Decoration.set(
          e.value
            .filter((r) => r.to > r.from && r.from >= 0 && r.to <= len)
            .sort((a, b) => a.from - b.from)
            .map((r) => probeMark.range(r.from, r.to)),
          true,
        );
      }
    }
    return v;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function createWeftEditor(parent: HTMLElement, options: WeftEditorOptions = {}): WeftEditor {
  let latest: WeftAnalysis | undefined;
  const readOnly = new Compartment();
  let view: EditorView;

  const analysisOf = options.analyze;
  const source = analysisOf
    ? linter(
        async (v) => {
          const text = v.state.doc.toString();
          const a = await analysisOf(text);
          if (!a) return [];
          latest = a;
          options.onAnalysis?.(a);
          if (v.state.doc.toString() !== text) return [];
          queueMicrotask(() => view.dispatch({ effects: setKinds.of(a.kinds) }));
          return toCmDiagnostics(a, v.state.doc.length);
        },
        { delay: options.delay ?? 300 },
      )
    : [];

  const doFormat = async (): Promise<FormatOutcome> => {
    if (!options.formatter) return 'unchanged';
    const text = view.state.doc.toString();
    let out: FormatOutcome;
    try {
      out = applyFormatted(view, text, await options.formatter(text));
    } catch {
      out = 'error';
    }
    options.onFormat?.(out);
    return out;
  };

  const extensions: Extension[] = [
    options.lineNumbers === false
      ? []
      : lineNumbers({
          domEventHandlers: {
            mouseover(v, line) {
              options.onPointer?.({ offset: line.from, line: v.state.doc.lineAt(line.from).number, gutter: true });
              return false;
            },
            mouseout() {
              options.onPointer?.(null);
              return false;
            },
          },
        }),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    indentUnit.of('    '),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    weftLanguage,
    weftTokens,
    probeField,
    weftTheme,
    source,
    lintGutter(),
    weftHover(() => latest),
    keymap.of([
      { key: 'Shift-Alt-f', preventDefault: true, run: () => (void doFormat(), true) },
      {
        key: 'F12',
        run: (v) => {
          const a = latest;
          if (!a || a.source !== v.state.doc.toString()) return false;
          const r = refAt(a, v.state.selection.main.head);
          const decl = r?.item.decl;
          if (!decl || decl.file !== a.file) return false;
          const at = a.refs.find((x) => x.item.start === decl.start)?.from ?? r.from;
          v.dispatch({ selection: { anchor: at }, scrollIntoView: true });
          return true;
        },
      },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      indentWithTab,
      ...searchKeymap,
      ...historyKeymap,
      ...lintKeymap,
    ]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged && !u.transactions.every((t) => t.annotation(external))) options.onChange?.(u.state.doc.toString());
    }),
    EditorView.domEventHandlers({
      mousemove(ev, v) {
        if (!options.onPointer) return false;
        const pos = v.posAtCoords({ x: ev.clientX, y: ev.clientY }, false);
        if (pos === null) return false;
        options.onPointer({ offset: pos, line: v.state.doc.lineAt(pos).number });
        return false;
      },
      mouseleave() {
        options.onPointer?.(null);
        return false;
      },
    }),
    EditorView.contentAttributes.of({ 'aria-label': options.ariaLabel ?? 'Weft source code', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
    readOnly.of([EditorState.readOnly.of(!!options.readOnly), EditorView.editable.of(!options.readOnly)]),
  ];

  view = new EditorView({ parent, state: EditorState.create({ doc: options.doc ?? '', extensions }) });

  return {
    view,
    getDoc: () => view.state.doc.toString(),
    setDoc(text) {
      if (text === view.state.doc.toString()) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, annotations: external.of(true) });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
    setProbe: (ranges) => view.dispatch({ effects: setProbeEffect.of(ranges) }),
    setReadOnly: (ro) => view.dispatch({ effects: readOnly.reconfigure([EditorState.readOnly.of(ro), EditorView.editable.of(!ro)]) }),
    format: doFormat,
    analysis: () => latest,
    reveal(offset) {
      const at = Math.max(0, Math.min(offset, view.state.doc.length));
      view.dispatch({ selection: { anchor: at }, effects: EditorView.scrollIntoView(at, { y: 'center' }) });
    },
  };
}
