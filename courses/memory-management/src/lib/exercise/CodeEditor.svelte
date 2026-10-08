<!--
  A CodeMirror 6 editor themed with the course tokens, for TypeScript (exercises) and Mote (programs).
  Mod-Enter runs. Loads CodeMirror lazily so pages with many editors stay light.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { EditorView } from '@codemirror/view';

  let {
    value,
    lang = 'ts',
    readonly = false,
    onchange,
    onrun,
    minLines = 8,
    maxHeight = '32rem',
    label = 'Code editor',
    highlightLine,
  }: {
    value: string;
    lang?: 'ts' | 'mote';
    readonly?: boolean;
    onchange?: (code: string) => void;
    onrun?: () => void;
    minLines?: number;
    maxHeight?: string;
    label?: string;
    /** 1-based line to highlight (the current statement while stepping). */
    highlightLine?: number;
  } = $props();

  let host: HTMLDivElement;
  let view = $state<EditorView | undefined>();
  let setLine: ((n: number | undefined) => void) | undefined;

  /** Replace the document (e.g. reset to the starter code). */
  export function setValue(code: string) {
    if (view && view.state.doc.toString() !== code) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
  }

  $effect(() => {
    const line = highlightLine; // read it first, so the effect tracks it even before the editor exists
    setLine?.(line);
  });

  onMount(() => {
    let destroyed = false;
    (async () => {
      const [{ EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection }, { EditorState, StateField, StateEffect }, cmds, language, { javascript }, auto, { highlightStyle }] = await Promise.all([
        import('@codemirror/view'),
        import('@codemirror/state'),
        import('@codemirror/commands'),
        import('@codemirror/language'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/autocomplete'),
        import('./editorTheme'),
      ]);
      if (destroyed) return;

      const mote = language.StreamLanguage.define({
        token(stream) {
          if (stream.eatSpace()) return null;
          if (stream.match('//')) {
            stream.skipToEnd();
            return 'comment';
          }
          if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string';
          if (stream.match(/^(0x[0-9a-fA-F_]+|[0-9][0-9_]*)/)) return 'number';
          if (stream.match(/^(struct|fn|let|var|if|else|while|for|in|return|break|continue|new|weak)\b/)) return 'keyword';
          if (stream.match(/^(true|false|null)\b/)) return 'atom';
          if (stream.match(/^(int|bool)\b/)) return 'typeName';
          if (stream.match(/^(free|print|len|gc|assert|random)\b(?=\s*\()/)) return 'keyword';
          if (stream.match(/^[A-Z][A-Za-z0-9_]*/)) return 'typeName';
          if (stream.match(/^[a-z_][A-Za-z0-9_]*(?=\s*\()/)) return 'variableName.function';
          if (stream.match(/^[a-z_][A-Za-z0-9_]*/)) return 'variableName';
          stream.next();
          return 'operator';
        },
      });

      const setLineEffect = StateEffect.define<number | undefined>();
      const lineMark = Decoration.line({ class: 'cm-current-line' });
      const lineField = StateField.define({
        create: () => Decoration.none,
        update(deco, tr) {
          for (const e of tr.effects) {
            if (e.is(setLineEffect)) {
              const n = e.value;
              if (!n || n > tr.state.doc.lines) return Decoration.none;
              return Decoration.set([lineMark.range(tr.state.doc.line(n).from)]);
            }
          }
          return deco.map(tr.changes);
        },
        provide: (f) => EditorView.decorations.from(f),
      });

      const theme = EditorView.theme({
        '&': { fontSize: '0.84rem', backgroundColor: 'var(--panel)', color: 'var(--fg)', maxHeight },
        '.cm-content': { fontFamily: 'var(--font-mono)', padding: '0.6rem 0', caretColor: 'var(--copper)' },
        '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6', minHeight: `${minLines * 1.6 * 0.84 + 1.2}rem`, overflow: 'auto' },
        '.cm-gutters': { backgroundColor: 'var(--pn)', color: 'var(--mute)', border: 'none', borderRight: '1px solid var(--line)' },
        '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--copper) 5%, transparent)' },
        '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--copper) 10%, transparent)', color: 'var(--fg)' },
        '.cm-current-line': { backgroundColor: 'var(--amber-soft)', boxShadow: 'inset 3px 0 0 var(--amber)' },
        '&.cm-focused': { outline: 'none' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--term-hl-strong) !important' },
        '.cm-cursor': { borderLeftColor: 'var(--copper)', borderLeftWidth: '2px' },
        '.cm-tooltip': { backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' },
        '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--copper-soft)', color: 'var(--fg)' },
        '.cm-matchingBracket': { backgroundColor: 'var(--surface-3)', outline: 'none' },
      });

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
            auto.autocompletion(),
            language.syntaxHighlighting(highlightStyle),
            lang === 'mote' ? mote : javascript({ typescript: true }),
            lineField,
            EditorState.tabSize.of(2),
            EditorState.readOnly.of(readonly),
            EditorView.editable.of(!readonly),
            EditorView.contentAttributes.of({ 'aria-label': label }),
            keymap.of([{ key: 'Mod-Enter', run: () => (onrun?.(), true) }, ...auto.closeBracketsKeymap, ...cmds.defaultKeymap, ...cmds.historyKeymap, cmds.indentWithTab]),
            theme,
            EditorView.updateListener.of((u) => {
              if (u.docChanged) onchange?.(u.state.doc.toString());
            }),
          ],
        }),
      });
      setLine = (n) => view?.dispatch({ effects: setLineEffect.of(n) });
      setLine(highlightLine);
    })();
    return () => {
      destroyed = true;
      view?.destroy();
    };
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    overflow: hidden;
    min-height: 3rem;
  }
  .editor :global(.cm-editor) {
    max-width: 100%;
  }
</style>
