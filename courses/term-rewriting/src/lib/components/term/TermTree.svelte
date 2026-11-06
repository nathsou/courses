<script lang="ts">
  /**
   * Draw a term as a tree. Optional highlights: a redex position (warm), positions marked as normal
   * forms or matched (teal), and clickable nodes.
   */
  import type { Position, Term } from '$lib/trs/term';
  import { isPrefix } from '$lib/trs/term';
  import { layoutTree } from './layout';

  let {
    term,
    redex = null,
    marked = [],
    clickable = [],
    onpick,
    label,
    maxWidth = 560,
    dx = 46,
    dy = 52,
    title = 'Term tree',
  }: {
    term: Term;
    redex?: Position | null;
    marked?: Position[];
    clickable?: Position[];
    onpick?: (p: Position) => void;
    label?: (t: Term) => string;
    maxWidth?: number;
    dx?: number;
    dy?: number;
    title?: string;
  } = $props();

  const L = $derived(layoutTree(term, label));
  const pad = 22;
  const W = $derived(L.width * dx + pad * 2 - dx + 24);
  const H = $derived((L.height - 1) * dy + pad * 2);
  const px = (x: number) => pad + 12 + x * dx;
  const py = (y: number) => pad + y * dy;
  const same = (a: Position, b: Position) => a.length === b.length && a.every((x, i) => x === b[i]);
  const inRedex = (p: Position) => redex !== null && isPrefix(redex, p);
  const isMarked = (p: Position) => marked.some((m) => isPrefix(m, p));
  const canPick = (p: Position) => clickable.some((c) => same(c, p));
  const posLabel = (p: Position) => (p.length ? p.map((i) => i + 1).join('.') : 'root');
</script>

<svg class="tree" viewBox="0 0 {W} {H}" style="max-width: min(100%, {Math.max(W, 120) > maxWidth ? maxWidth : Math.max(W, 120)}px)" role="img" aria-label={title}>
  {#each L.nodes as n, i (i)}
    {#if n.parent !== undefined}
      {@const p = L.nodes[n.parent]!}
      <line x1={px(p.x)} y1={py(p.y)} x2={px(n.x)} y2={py(n.y)} class:hot={inRedex(n.pos)} class:mark={!inRedex(n.pos) && isMarked(n.pos)} />
    {/if}
  {/each}
  {#each L.nodes as n, i (i)}
    {@const hot = inRedex(n.pos)}
    {@const pick = canPick(n.pos)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="node"
      class:var={n.isVar}
      class:hot
      class:root-hot={redex !== null && same(redex, n.pos)}
      class:mark={!hot && isMarked(n.pos)}
      class:pick
      transform="translate({px(n.x)}, {py(n.y)})"
      role={pick ? 'button' : undefined}
      tabindex={pick ? 0 : undefined}
      aria-label={pick ? `Contract the redex at ${posLabel(n.pos)}` : undefined}
      onclick={pick ? () => onpick?.(n.pos) : undefined}
      onkeydown={pick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onpick?.(n.pos)) : undefined}
    >
      {#if n.isVar}
        <rect x={-Math.max(13, n.label.length * 4.6 + 6)} y="-12" width={Math.max(26, n.label.length * 9.2 + 12)} height="24" rx="12" />
      {:else}
        <rect x={-Math.max(14, n.label.length * 4.6 + 7)} y="-13" width={Math.max(28, n.label.length * 9.2 + 14)} height="26" rx="5" />
      {/if}
      <text y="4.5">{n.label}</text>
    </g>
  {/each}
</svg>

<style>
  .tree {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 auto;
    overflow: visible;
  }
  line {
    stroke: var(--line-strong);
    stroke-width: 1.4;
  }
  line.hot {
    stroke: var(--redex);
    stroke-width: 2;
  }
  line.mark {
    stroke: var(--nf);
    stroke-width: 1.8;
  }
  .node rect {
    fill: var(--surface);
    stroke: var(--ink-3);
    stroke-width: 1.2;
  }
  .node.var rect {
    fill: var(--pn);
    stroke-dasharray: 3 2;
  }
  .node text {
    font-family: var(--font-mono);
    font-size: 13px;
    text-anchor: middle;
    fill: var(--ink);
  }
  .node.var text {
    font-style: italic;
  }
  .node.hot rect {
    fill: var(--redex-soft);
    stroke: var(--redex);
  }
  .node.root-hot rect {
    stroke-width: 2.4;
  }
  .node.mark rect {
    fill: var(--nf-soft);
    stroke: var(--nf);
  }
  .node.pick {
    cursor: pointer;
  }
  .node.pick rect {
    stroke: var(--redex);
    stroke-width: 2;
  }
  .node.pick:hover rect,
  .node.pick:focus-visible rect {
    fill: var(--redex-soft);
  }
  .node.pick:focus-visible {
    outline: none;
  }
  .node.pick:focus-visible rect {
    stroke-width: 3;
  }
</style>
