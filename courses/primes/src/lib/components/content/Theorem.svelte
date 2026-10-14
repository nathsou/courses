<!--
  A theorem-like statement: Theorem 4.1 (Euclid, c. 300 BC). Body in italic, the classical style.
  `status` says what the course does with it: proved (in full, here), sketched (the idea and main
  steps, with what is left out named), stated (quoted without proof) or open (unknown to anyone).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    kind = 'theorem',
    n,
    name,
    who,
    year,
    title,
    status,
    children,
  }: { kind?: string; n?: string; name?: string; who?: string; year?: string | number; title?: string; status?: 'proved' | 'sketched' | 'stated' | 'open'; children?: Snippet } = $props();

  const label = $derived(kind.charAt(0).toUpperCase() + kind.slice(1));
  const attribution = $derived([name ?? title, who, year].filter(Boolean).join(', '));
  const shown = $derived(status ?? (kind === 'conjecture' ? 'open' : undefined));
  const TIPS: Record<string, string> = {
    proved: 'Proved in full in this course.',
    sketched: 'The idea and the main steps are given; the text says what is left out.',
    stated: 'Stated without proof; the text says where a proof can be found.',
    open: 'Nobody knows whether this is true.',
  };
</script>

<div class="thm" data-kind={kind} role="group" aria-label="{label} {n ?? ''}">
  <p class="head">
    <span class="label ui">{label}{#if n}&nbsp;{n}{/if}</span>
    {#if attribution}<span class="attr">({attribution})</span>{/if}
    {#if shown}<span class="status ui" data-status={shown} title={TIPS[shown]}>{shown}</span>{/if}
  </p>
  <div class="body">{@render children?.()}</div>
</div>

<style>
  .thm {
    margin: 1.9rem 0;
    padding: 0.95rem 1.3rem 0.25rem;
    border-left: 3px solid var(--ac);
    background: var(--pn);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
  .thm[data-kind='lemma'],
  .thm[data-kind='claim'] {
    border-left-color: var(--fx-blue);
  }
  .thm[data-kind='corollary'],
  .thm[data-kind='proposition'] {
    border-left-color: var(--rule-strong);
  }
  .thm[data-kind='conjecture'] {
    border: 1px dashed var(--rule-strong);
    border-left: 3px dashed var(--ac);
    background: transparent;
  }
  .head {
    margin: 0 0 0.4rem !important;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.6rem;
    align-items: baseline;
  }
  .label {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.74rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .thm[data-kind='lemma'] .label,
  .thm[data-kind='claim'] .label {
    color: var(--ok);
  }
  .thm[data-kind='corollary'] .label,
  .thm[data-kind='proposition'] .label {
    color: var(--ink-2);
  }
  .attr {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink-2);
  }
  .status {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.08rem 0.45rem;
    border-radius: 999px;
    border: 1px solid currentColor;
    cursor: help;
    color: var(--ink-3);
  }
  .status[data-status='proved'] {
    color: var(--ok);
  }
  .status[data-status='sketched'] {
    color: var(--maybe);
  }
  .status[data-status='open'] {
    color: var(--accent);
  }
  .body {
    font-style: italic;
  }
  .body :global(p) {
    margin: 0 0 0.75rem;
  }
  .body :global(.katex) {
    font-style: normal;
  }
</style>
