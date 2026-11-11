<!--
  The Weft editor as a component (see editor/index.ts for what it does).

    <WeftEditor bind:doc file="counter.weft" onanalysis={…} onpointer={…} probe={ranges} />

  Server-side (and until CodeMirror has loaded) it shows the code as a static, highlighted block with the
  same structure as the code blocks in chapters, so the page is readable without JavaScript and does not
  jump when the editor appears. Without `analyze`, it analyses through synth's worker.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { highlightWeftHtml } from './highlight';
  import type { WeftAnalysis } from './analysis';
  import type { FormatOutcome, Range, WeftEditor } from './editor/index';
  import type { SourceFile } from '../synth/api';

  let {
    doc = $bindable(''),
    readonly = false,
    label = 'Weft source code',
    file = 'design.weft',
    others = [],
    top,
    analyze,
    onanalysis,
    onpointer,
    onformat,
    probe = [],
    minLines = 4,
    maxLines = 40,
    lineNumbers = true,
    delay,
  }: {
    doc?: string;
    readonly?: boolean;
    label?: string;
    /** The file name the source is analysed under (diagnostics name it). */
    file?: string;
    /** Other files of the design, analysed with it. */
    others?: SourceFile[];
    top?: string;
    analyze?: (source: string) => Promise<WeftAnalysis | undefined>;
    onanalysis?: (a: WeftAnalysis) => void;
    onpointer?: (hit: { offset: number; line: number; gutter?: boolean } | null) => void;
    onformat?: (outcome: FormatOutcome) => void;
    probe?: Range[];
    minLines?: number;
    maxLines?: number;
    lineNumbers?: boolean;
    delay?: number;
  } = $props();

  let host: HTMLDivElement | undefined = $state();
  let editor: WeftEditor | undefined = $state();
  let ready = $state(false);
  const key = `ed${Math.random().toString(36).slice(2)}`;

  const lines = $derived(Math.max(minLines, Math.min(maxLines, doc.split('\n').length)));
  const height = $derived(`calc(${lines} * 1.62 * 0.84rem + 1.4rem + 2px)`);

  export function getEditor(): WeftEditor | undefined {
    return editor;
  }
  export function focus(): void {
    editor?.focus();
  }
  export function format(): Promise<FormatOutcome> | undefined {
    return editor?.format();
  }
  export function reveal(offset: number): void {
    editor?.reveal(offset);
  }

  onMount(() => {
    let disposed = false;
    let made: WeftEditor | undefined;
    Promise.all([import('./editor/index'), import('./browser')]).then(([{ createWeftEditor }, { analyzeInPage, formatInPage }]) => {
      if (disposed || !host) return;
      made = createWeftEditor(host, {
        doc: untrack(() => doc),
        readOnly: untrack(() => readonly),
        ariaLabel: label,
        lineNumbers,
        delay,
        analyze: analyze ?? ((text) => analyzeInPage(key, text, { file: untrack(() => file), others: untrack(() => others), top: untrack(() => top) })),
        formatter: formatInPage,
        onAnalysis: (a) => onanalysis?.(a),
        onPointer: (h) => onpointer?.(h),
        onFormat: (o) => onformat?.(o),
        onChange: (text) => {
          doc = text;
        },
      });
      editor = made;
      ready = true;
    });
    return () => {
      disposed = true;
      made?.destroy();
      editor = undefined;
    };
  });

  $effect(() => {
    const text = doc;
    if (editor && editor.getDoc() !== text) editor.setDoc(text);
  });
  $effect(() => {
    editor?.setReadOnly(readonly);
  });
  $effect(() => {
    editor?.setProbe(probe);
  });
</script>

<div class="weft-editor" class:ready style:height>
  <div class="cm" bind:this={host} hidden={!ready}></div>
  {#if !ready}
    <div class="static">{@html highlightWeftHtml(doc)}</div>
  {/if}
</div>

<style>
  .weft-editor {
    position: relative;
    min-width: 0;
  }
  .cm {
    height: 100%;
  }
  .cm[hidden] {
    display: none;
  }
  .static {
    height: 100%;
    overflow: auto;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .static :global(pre) {
    margin: 0;
    padding: 0.7rem 0.9rem 0.7rem 1.1rem;
    font-family: var(--font-mono);
    font-size: 0.84rem;
    line-height: 1.62;
    background: transparent !important;
    min-width: max-content;
  }
</style>
