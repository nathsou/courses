<!--
  A small editor for the course's HDL: a textarea over a highlighted copy of its text (same font and padding,
  scroll kept in step), with line numbers and an optional marked line. Tab inserts two spaces; Escape then Tab
  leaves the editor, so keyboard users are never trapped.
-->
<script lang="ts">
  import { highlightHdl } from '$lib/eda/highlight';

  let {
    value = $bindable(''),
    label = 'Design',
    errorLine,
    rows = 10,
    oninput,
  }: { value: string; label?: string; errorLine?: number; rows?: number; oninput?: () => void } = $props();

  let ta: HTMLTextAreaElement | undefined = $state();
  let pre: HTMLPreElement | undefined = $state();
  let gutter: HTMLDivElement | undefined = $state();
  let escaped = false;

  const lines = $derived(Math.max(rows, value.split('\n').length));
  const html = $derived(highlightHdl(value) + '\n');

  function sync() {
    if (!ta || !pre || !gutter) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      escaped = true;
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !escaped && ta) {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b } = ta;
      value = value.slice(0, a) + '  ' + value.slice(b);
      requestAnimationFrame(() => ta?.setSelectionRange(a + 2, a + 2));
      oninput?.();
    }
    escaped = false;
  }
</script>

<div class="editor" style:--rows={rows}>
  <div class="gutter ui" bind:this={gutter} aria-hidden="true">
    {#each Array.from({ length: lines }) as _, i (i)}<span class:err={errorLine === i + 1}>{i + 1}</span>{/each}
  </div>
  <div class="area">
    <pre bind:this={pre} aria-hidden="true"><code>{@html html}</code></pre>
    <textarea
      bind:this={ta}
      bind:value
      aria-label="{label} (Tab indents; press Escape, then Tab, to leave the editor)"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      wrap="off"
      onscroll={sync}
      onkeydown={keydown}
      oninput={() => {
        sync();
        oninput?.();
      }}
    ></textarea>
  </div>
</div>

<style>
  .editor {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    font-family: var(--font-mono);
    font-size: 0.84rem;
    line-height: 1.5;
    height: calc(var(--rows) * 1.5em + 1.2rem);
    overflow: hidden;
  }
  .gutter {
    display: flex;
    flex-direction: column;
    padding: 0.6rem 0.45rem 0.6rem 0.6rem;
    background: var(--surface-2);
    color: var(--ink-3);
    text-align: right;
    font-family: var(--font-mono);
    user-select: none;
    overflow: hidden;
    border-right: 1px solid var(--line);
  }
  .gutter span {
    min-width: 1.4em;
  }
  .gutter .err {
    color: var(--on-accent);
    background: var(--bad);
    border-radius: 2px;
  }
  .area {
    position: relative;
    min-width: 0;
  }
  pre,
  textarea {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0.6rem 0.75rem;
    font: inherit;
    line-height: inherit;
    white-space: pre;
    overflow: auto;
    tab-size: 2;
    border: 0;
    letter-spacing: 0;
  }
  pre {
    color: var(--ink);
    pointer-events: none;
    scrollbar-width: none;
  }
  pre::-webkit-scrollbar {
    display: none;
  }
  textarea {
    background: transparent;
    color: transparent;
    caret-color: var(--ink);
    resize: none;
    outline: none;
  }
  textarea::selection {
    background: var(--term-hl-strong);
    color: transparent;
  }
  .editor:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 1px;
  }
  pre :global(.kw) {
    color: var(--accent);
    font-weight: 600;
  }
  pre :global(.num) {
    color: var(--series-3);
  }
  pre :global(.com) {
    color: var(--ink-3);
    font-style: italic;
  }
  pre :global(.op) {
    color: var(--ink-2);
  }
</style>
