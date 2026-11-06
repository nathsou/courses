<script lang="ts">
  /** A directed graph with text labels, laid out in layers (from node 0) or on a circle. */
  import { layoutCircle, layoutLayers } from './layout';

  export interface GNode {
    label: string;
    /** 'nf' (normal form), 'start', 'hot', 'dim', 'bad' */
    cls?: string;
    title?: string;
  }
  export interface GEdge {
    from: number;
    to: number;
    label?: string;
    cls?: string;
  }

  let { nodes, edges, layout = 'layers', title = 'Graph', maxWidth = 760, onpick }: { nodes: GNode[]; edges: GEdge[]; layout?: 'layers' | 'circle'; title?: string; maxWidth?: number; onpick?: (i: number) => void } = $props();

  const charW = 7.4;
  const boxW = (s: string) => Math.max(30, Math.min(260, s.length * charW + 16));
  const geo = $derived.by(() => {
    if (layout === 'circle') {
      const c = layoutCircle(nodes.length);
      const R = Math.max(70, nodes.length * 24);
      const pad = Math.max(...nodes.map((n) => boxW(n.label)), 40) / 2 + 12;
      return { x: c.x.map((v) => pad + R + v * R), y: c.y.map((v) => 26 + R + v * R), W: 2 * (R + pad), H: 2 * R + 52 };
    }
    const L = layoutLayers(nodes.length, edges);
    const colW = Math.max(90, Math.max(...nodes.map((n) => boxW(n.label)), 30) + 24);
    const rowH = 64;
    return { x: L.x.map((v) => 12 + v * colW), y: L.y.map((v) => 26 + v * rowH), W: L.width * colW + 24, H: (L.layers - 1) * rowH + 52 };
  });

  /** Shorten an edge so it ends at the box border. */
  function seg(e: GEdge) {
    const x1 = geo.x[e.from]!, y1 = geo.y[e.from]!, x2 = geo.x[e.to]!, y2 = geo.y[e.to]!;
    if (e.from === e.to) return null;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const clip = (w: number, ux: number, uy: number) => {
      const hw = w / 2 + 3, hh = 15;
      const t = Math.min(Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity);
      return t;
    };
    const ux = dx / len, uy = dy / len;
    const a = clip(boxW(nodes[e.from]!.label), ux, uy), b = clip(boxW(nodes[e.to]!.label), ux, uy);
    // Bend edges that have a twin in the opposite direction.
    const twin = edges.some((o) => o.from === e.to && o.to === e.from);
    const sx = x1 + ux * a, sy = y1 + uy * a, ex = x2 - ux * b, ey = y2 - uy * b;
    if (twin) {
      const mx = (sx + ex) / 2 - uy * 14, my = (sy + ey) / 2 + ux * 14;
      return { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, lx: mx, ly: my };
    }
    return { d: `M${sx},${sy} L${ex},${ey}`, lx: (sx + ex) / 2, ly: (sy + ey) / 2 };
  }
  const uid = `ah${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="gv">
  <svg viewBox="0 0 {geo.W} {geo.H}" style="max-width: min(100%, {Math.min(maxWidth, geo.W)}px)" role="img" aria-label={title}>
    <defs>
      <marker id={uid} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah" /></marker>
    </defs>
    {#each edges as e, i (i)}
      {@const s = seg(e)}
      {#if s}
        <path d={s.d} class="edge {e.cls ?? ''}" marker-end="url(#{uid})" />
        {#if e.label}<text x={s.lx} y={s.ly - 4} class="elabel">{e.label}</text>{/if}
      {:else}
        <path d="M{geo.x[e.from]! + 10},{geo.y[e.from]! - 14} c 18,-26 34,-6 14,10" class="edge {e.cls ?? ''}" marker-end="url(#{uid})" />
      {/if}
    {/each}
    {#each nodes as n, i (i)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <g
        class="node {n.cls ?? ''}"
        class:pick={!!onpick}
        transform="translate({geo.x[i]}, {geo.y[i]})"
        role={onpick ? 'button' : undefined}
        tabindex={onpick ? 0 : undefined}
        onclick={onpick ? () => onpick(i) : undefined}
        onkeydown={onpick ? (ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), onpick(i)) : undefined}
      >
        {#if n.title}<title>{n.title}</title>{/if}
        <rect x={-boxW(n.label) / 2} y="-13" width={boxW(n.label)} height="26" rx="6" />
        <text y="4.5">{n.label}</text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .gv {
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 auto;
    overflow: visible;
  }
  .edge {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.3;
  }
  .edge.hot {
    stroke: var(--redex);
    stroke-width: 2.2;
  }
  .edge.dim {
    opacity: 0.35;
  }
  .ah {
    fill: var(--ink-3);
  }
  .elabel {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--ink-3);
    text-anchor: middle;
  }
  .node rect {
    fill: var(--surface);
    stroke: var(--ink-3);
    stroke-width: 1.2;
  }
  .node text {
    font-family: var(--font-mono);
    font-size: 12px;
    text-anchor: middle;
    fill: var(--ink);
  }
  .node.nf rect {
    fill: var(--nf-soft);
    stroke: var(--nf);
    stroke-width: 2;
  }
  .node.start rect {
    stroke-width: 2.2;
    stroke: var(--ink);
  }
  .node.hot rect {
    fill: var(--redex-soft);
    stroke: var(--redex);
    stroke-width: 2;
  }
  .node.bad rect {
    fill: var(--bad-soft);
    stroke: var(--bad);
  }
  .node.dim {
    opacity: 0.45;
  }
  .node.pick {
    cursor: pointer;
  }
  .node.pick:focus-visible rect {
    stroke-width: 3;
  }
  .node.pick:focus-visible {
    outline: none;
  }
</style>
