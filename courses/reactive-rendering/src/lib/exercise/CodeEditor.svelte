<!--
  A CodeMirror 6 editor themed with the course tokens, for TypeScript (exercises) and plain text (templates).
  Mod-Enter runs. Loads CodeMirror lazily so pages with many editors stay light. Editable TypeScript editors also get
  the real compiler's language service (types, hover, completion) from a shared worker, started when one scrolls into view.
-->
<script lang="ts" module>
  let editorCount = 0;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { EditorView } from '@codemirror/view';
  import type { Extension } from '@codemirror/state';
  import type { CodeLang } from '$lib/code/highlight';

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
    typecheck = true,
  }: {
    value: string;
    lang?: CodeLang;
    readonly?: boolean;
    onchange?: (code: string) => void;
    onrun?: () => void;
    minLines?: number;
    maxHeight?: string;
    label?: string;
    /** 1-based line to highlight (the current statement while stepping). */
    highlightLine?: number;
    /** Attach the TypeScript language service (editable `ts` editors only). */
    typecheck?: boolean;
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

  /** The syntax for each language, loaded on demand so a page only downloads the ones it shows. */
  async function languageExtension(l: CodeLang): Promise<Extension> {
    switch (l) {
      case 'ts':
      case 'js':
      case 'json':
        return (await import('@codemirror/lang-javascript')).javascript({ typescript: l === 'ts' });
      case 'jsx':
        return (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true });
      case 'html':
        return (await import('@codemirror/lang-html')).html();
      case 'vue':
        return (await import('@codemirror/lang-vue')).vue();
      case 'svelte':
        return (await import('@replit/codemirror-lang-svelte')).svelte();
      default:
        return [];
    }
  }

  /** Each editor is its own file in the language service, so several can share the worker. */
  const path = `/exercise-${++editorCount}.ts`;
  let observer: IntersectionObserver | undefined;
  onMount(() => {
    let destroyed = false;
    (async () => {
      const [{ EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection }, { EditorState, StateField, StateEffect, Compartment }, cmds, language, auto, { highlightStyle }, languageSupport] = await Promise.all([
        import('@codemirror/view'),
        import('@codemirror/state'),
        import('@codemirror/commands'),
        import('@codemirror/language'),
        import('@codemirror/autocomplete'),
        import('./editorTheme'),
        languageExtension(lang),
      ]);
      if (destroyed) return;

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
        '.cm-diagnostic': { fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '0.3rem 0.6rem' },
        '.cm-diagnostic-error': { borderLeft: '3px solid var(--bad, #c0392b)' },
        '.cm-diagnostic-warning': { borderLeft: '3px solid var(--amber)' },
        '.cm-tooltip.cm-tooltip-hover': { padding: '0.3rem 0.6rem', maxWidth: 'min(36rem, 90vw)', whiteSpace: 'pre-wrap' },
      });

      // The language service joins once its worker is up; until then (and without a network) the editor still works.
      const types = new Compartment();
      const plain = () => auto.autocompletion();
      const withTypes = async () => {
        const [{ typeServer }, ts] = await Promise.all([import('./typeServer'), import('@valtown/codemirror-ts')]);
        const worker = await typeServer();
        return [
          ts.tsFacetWorker.of({ worker, path }),
          ts.tsSyncWorker(),
          ts.tsLinterWorker(),
          auto.autocompletion({ override: [ts.tsAutocompleteWorker()] }),
          ts.tsHoverWorker(),
        ];
      };
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
            types.of(plain()),
            language.syntaxHighlighting(highlightStyle),
            languageSupport,
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
      // Line heights measured before the web fonts arrive, or while the editor is off screen, can leave the
      // gutter out of step with the text: measure again once the fonts are ready and whenever it comes into view.
      document.fonts?.ready.then(() => view?.requestMeasure());
      let typed = false;
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        view?.requestMeasure();
        if (typed || !typecheck || readonly || lang !== 'ts') return;
        typed = true;
        withTypes().then(
          (extension) => !destroyed && view?.dispatch({ effects: types.reconfigure(extension) }),
          () => (typed = false), // offline or worker failure: stay a plain editor, try again when it next scrolls into view
        );
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
    border-radius: var(--radius);
    overflow: hidden;
    min-height: 3rem;
  }
  .editor :global(.cm-editor) {
    max-width: 100%;
  }
</style>
