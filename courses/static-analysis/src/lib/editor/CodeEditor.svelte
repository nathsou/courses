<!--
  A CodeMirror 6 editor themed with the course tokens. With `lspUri`, it talks to the TypeScript language server
  (completion, hover, signature help, F12 definition, Shift-F12 references, F2 rename, diagnostics). `marks` draws
  test results on the code (underlines and gutter markers); `highlight` shows a range picked in the inspector.
  Mod-Enter runs. CodeMirror is loaded lazily.
-->
<script lang="ts" module>
  export interface EditorMark {
    from: number;
    to: number;
    kind: 'ok' | 'bad' | 'warn' | 'secondary' | 'info';
    message?: string;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { EditorView } from '@codemirror/view';

  let {
    value,
    lang = 'ts',
    readonly = false,
    lspUri,
    marks = [],
    highlight,
    onchange,
    onrun,
    oncursor,
    onfocus,
    minLines = 6,
    maxHeight = '30rem',
    label = 'Code editor',
    view = $bindable(),
  }: {
    value: string;
    lang?: 'ts' | 'js' | 'json' | 'text';
    readonly?: boolean;
    /** Connect to the language server under this URI (file:///ex/<id>/…). */
    lspUri?: string;
    marks?: EditorMark[];
    highlight?: { from: number; to: number } | null;
    onchange?: (code: string) => void;
    onrun?: () => void;
    oncursor?: (offset: number) => void;
    onfocus?: () => void;
    minLines?: number;
    maxHeight?: string;
    label?: string;
    view?: EditorView;
  } = $props();

  let host: HTMLDivElement;
  let apply: { marks?: (m: EditorMark[]) => void; highlight?: (h: { from: number; to: number } | null | undefined) => void } = {};

  /** Replace the document (e.g. reset to the starter code). */
  export function setValue(code: string) {
    if (view && view.state.doc.toString() !== code) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
  }

  /** Move the cursor to an offset and bring it into view. */
  export function reveal(from: number, to = from) {
    if (!view) return;
    const max = view.state.doc.length;
    view.dispatch({ selection: { anchor: Math.min(from, max), head: Math.min(to, max) }, scrollIntoView: true });
    view.focus();
  }

  $effect(() => {
    const m = marks;
    apply.marks?.(m);
  });
  $effect(() => {
    const h = highlight;
    apply.highlight?.(h);
  });

  let observer: IntersectionObserver | undefined;
  onMount(() => {
    let destroyed = false;
    (async () => {
      const [viewMod, stateMod, cmds, language, { javascript }, { json }, auto, search, { highlightStyle }] = await Promise.all([
        import('@codemirror/view'),
        import('@codemirror/state'),
        import('@codemirror/commands'),
        import('@codemirror/language'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-json'),
        import('@codemirror/autocomplete'),
        import('@codemirror/search'),
        import('./editorTheme'),
      ]);
      const { EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, gutter, GutterMarker } = viewMod;
      const { EditorState, StateField, StateEffect, RangeSet } = stateMod;
      const lspExt = lspUri ? await import('$lib/sa/lsp/client').then(async (m) => (await m.lspClient()).plugin(lspUri, lang === 'js' ? 'javascript' : 'typescript')) : [];
      if (destroyed) return;

      // ── Result marks: underlines plus a gutter glyph per line ──
      const setMarks = StateEffect.define<EditorMark[]>();
      class Glyph extends GutterMarker {
        kind: EditorMark['kind'];
        title: string;
        constructor(kind: EditorMark['kind'], title: string) {
          super();
          this.kind = kind;
          this.title = title;
        }
        eq(o: Glyph) {
          return o.kind === this.kind && o.title === this.title;
        }
        toDOM() {
          const s = document.createElement('span');
          s.className = `glyph glyph-${this.kind}`;
          s.textContent = this.kind === 'ok' ? '✓' : this.kind === 'bad' ? '✗' : this.kind === 'secondary' ? '◦' : this.kind === 'warn' ? '!' : '·';
          s.title = this.title;
          return s;
        }
      }
      const clampMarks = (doc: { length: number }, list: EditorMark[]) => list.map((m) => ({ ...m, from: Math.max(0, Math.min(m.from, doc.length)), to: Math.max(0, Math.min(m.to, doc.length)) }));
      const markField = StateField.define({
        create: () => ({ deco: Decoration.none, gutter: RangeSet.empty as import('@codemirror/state').RangeSet<InstanceType<typeof GutterMarker>> }),
        update(value, tr) {
          for (const e of tr.effects) {
            if (!e.is(setMarks)) continue;
            const list = clampMarks(tr.state.doc, e.value);
            const deco = Decoration.set(
              list.filter((m) => m.to > m.from).map((m) => Decoration.mark({ class: `cm-mark-${m.kind}`, attributes: m.message ? { title: m.message } : {} }).range(m.from, m.to)),
              true,
            );
            const byLine = new Map<number, EditorMark>();
            const rank = { bad: 4, warn: 3, ok: 2, secondary: 1, info: 0 };
            for (const m of list) {
              const line = tr.state.doc.lineAt(m.from).from;
              const prev = byLine.get(line);
              if (!prev || rank[m.kind] > rank[prev.kind]) byLine.set(line, m);
            }
            const markers = [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([pos, m]) => new Glyph(m.kind, m.message ?? '').range(pos));
            return { deco, gutter: RangeSet.of(markers) };
          }
          return tr.docChanged ? { deco: value.deco.map(tr.changes), gutter: value.gutter.map(tr.changes) } : value;
        },
        provide: (f) => [EditorView.decorations.from(f, (v) => v.deco), gutter({ class: 'cm-result-gutter', markers: (v) => v.state.field(f).gutter })],
      });

      // ── Inspector highlight ──
      const setHighlight = StateEffect.define<{ from: number; to: number } | null | undefined>();
      const highlightField = StateField.define({
        create: () => Decoration.none,
        update(deco, tr) {
          for (const e of tr.effects) {
            if (!e.is(setHighlight)) continue;
            const h = e.value;
            if (!h || h.to <= h.from || h.to > tr.state.doc.length) return Decoration.none;
            return Decoration.set([Decoration.mark({ class: 'cm-picked' }).range(h.from, h.to)]);
          }
          return deco.map(tr.changes);
        },
        provide: (f) => EditorView.decorations.from(f),
      });

      const theme = EditorView.theme({
        '&': { fontSize: '0.84rem', backgroundColor: 'var(--panel)', color: 'var(--fg)', maxHeight },
        '.cm-content': { fontFamily: 'var(--font-mono)', padding: '0.5rem 0', caretColor: 'var(--accent)' },
        '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6', minHeight: `${minLines * 1.6 * 0.84 + 1}rem`, overflow: 'auto' },
        '.cm-gutters': { backgroundColor: 'var(--pn)', color: 'var(--mute)', border: 'none', borderRight: '1px solid var(--line)' },
        '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)' },
        '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--fg)' },
        '&.cm-focused': { outline: 'none' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--term-hl-strong) !important' },
        '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
        '.cm-tooltip': { backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: '8px', fontFamily: 'var(--font-ui)', fontSize: '0.82rem', maxWidth: 'min(36rem, 90vw)', color: 'var(--fg)' },
        '.cm-tooltip code, .cm-tooltip pre': { fontFamily: 'var(--font-mono)', fontSize: '0.78rem' },
        '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--accent-soft)', color: 'var(--fg)' },
        '.cm-matchingBracket': { backgroundColor: 'var(--surface-3)', outline: 'none' },
        '.cm-mark-bad': { textDecoration: 'underline wavy var(--bad)', textUnderlineOffset: '3px', backgroundColor: 'var(--bad-soft)' },
        '.cm-mark-warn': { textDecoration: 'underline wavy var(--maybe)', textUnderlineOffset: '3px' },
        '.cm-mark-ok': { backgroundColor: 'var(--ok-soft)', borderBottom: '2px solid var(--ok)' },
        '.cm-mark-secondary': { borderBottom: '2px dotted var(--accent)' },
        '.cm-mark-info': { backgroundColor: 'var(--accent-soft)' },
        '.cm-picked': { backgroundColor: 'var(--amber-soft)', outline: '1px solid var(--amber)', borderRadius: '2px' },
        '.cm-result-gutter': { width: '1.1rem' },
        '.glyph': { display: 'inline-block', width: '1rem', textAlign: 'center', fontWeight: '700', cursor: 'default' },
        '.glyph-ok': { color: 'var(--ok)' },
        '.glyph-bad': { color: 'var(--bad)' },
        '.glyph-warn': { color: 'var(--maybe)' },
        '.glyph-secondary': { color: 'var(--accent)' },
        '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--bad)', textUnderlineOffset: '3px' },
        '.cm-panels': { backgroundColor: 'var(--pn)', color: 'var(--fg)', borderTop: '1px solid var(--line)' },
      });

      const langExt = lang === 'json' ? json() : lang === 'text' ? [] : javascript({ typescript: lang === 'ts', jsx: false });
      view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: value,
          extensions: [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightActiveLine(),
            drawSelection(),
            cmds.history(),
            language.indentOnInput(),
            language.bracketMatching(),
            auto.closeBrackets(),
            lspUri ? [] : auto.autocompletion(),
            search.highlightSelectionMatches(),
            language.syntaxHighlighting(highlightStyle),
            langExt,
            markField,
            highlightField,
            lspExt,
            EditorState.tabSize.of(2),
            EditorState.readOnly.of(readonly),
            EditorView.editable.of(!readonly),
            EditorView.contentAttributes.of({ 'aria-label': label }),
            keymap.of([{ key: 'Mod-Enter', run: () => (onrun?.(), true) }, ...auto.closeBracketsKeymap, ...cmds.defaultKeymap, ...cmds.historyKeymap, ...search.searchKeymap, cmds.indentWithTab]),
            theme,
            EditorView.updateListener.of((u) => {
              if (u.docChanged) onchange?.(u.state.doc.toString());
              if (u.selectionSet || u.docChanged) oncursor?.(u.state.selection.main.head);
              if (u.focusChanged && u.view.hasFocus) onfocus?.();
            }),
          ],
        }),
      });
      apply = {
        marks: (m) => view?.dispatch({ effects: setMarks.of(m) }),
        highlight: (h) => view?.dispatch({ effects: setHighlight.of(h) }),
      };
      apply.marks!(marks);
      apply.highlight!(highlight);
      document.fonts?.ready.then(() => view?.requestMeasure());
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) view?.requestMeasure();
      });
      observer.observe(host);
    })();
    return () => {
      destroyed = true;
      observer?.disconnect();
      view?.destroy();
    };
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    overflow: hidden;
    min-height: 3rem;
    background: var(--panel);
  }
  .editor :global(.cm-editor) {
    max-width: 100%;
  }
</style>
