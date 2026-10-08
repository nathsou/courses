<!--
  An object graph: roots on the left (variables), objects as cards laid out in columns by distance from the roots,
  pointers as arrows. Used by the reference-counting stepper, trial deletion, and the tracing chapters.
  Positions are in grid units (col, row); the caller keeps them stable across steps so nothing jumps.
-->
<script lang="ts" module>
  export interface GNode {
    id: number;
    col: number;
    row: number;
    title: string;
    /** Big number in the corner (a reference count), or undefined. */
    badge?: string;
    /** Small text under the title. */
    sub?: string;
    state?: 'live' | 'freed' | 'grey' | 'white' | 'black' | 'purple' | 'marked' | 'garbage' | 'hot';
    /** Draw attention (e.g. its count just changed). */
    flash?: boolean;
  }
  export interface GEdge {
    from: number;
    to: number;
    weak?: boolean;
    label?: string;
    dead?: boolean;
  }
  export interface GRoot {
    name: string;
    row: number;
    to?: number;
  }
</script>

<script lang="ts">
  let {
    nodes,
    edges,
    roots = [],
    onclick,
    selectable = false,
    height,
  }: { nodes: GNode[]; edges: GEdge[]; roots?: GRoot[]; onclick?: (id: number) => void; selectable?: boolean; height?: number } = $props();

  const COLW = 150;
  const ROWH = 62;
  const NW = 112;
  const NH = 42;
  const ROOTW = 70;
  const cols = $derived(Math.max(1, ...nodes.map((n) => n.col + 1)));
  const rows = $derived(Math.max(1, ...nodes.map((n) => n.row + 1), ...roots.map((r) => r.row + 1)));
  const W = $derived(ROOTW + 30 + cols * COLW);
  const H = $derived(height ?? rows * ROWH + 34);
  const pos = (n: GNode) => ({ x: ROOTW + 30 + n.col * COLW, y: 30 + n.row * ROWH });
  const byId = $derived(new Map(nodes.map((n) => [n.id, n])));

  function path(a: { x: number; y: number }, b: { x: number; y: number }, self = false): string {
    if (self) return `M ${a.x + NW - 10} ${a.y} C ${a.x + NW + 30} ${a.y - 30}, ${a.x + NW + 30} ${a.y + NH + 30}, ${a.x + NW} ${a.y + NH - 8}`;
    const x1 = a.x + NW;
    const y1 = a.y + NH / 2;
    let x2 = b.x;
    const y2 = b.y + NH / 2;
    if (b.x <= a.x) {
      // A back edge: loop around below.
      const yb = Math.max(a.y, b.y) + NH + 12;
      return `M ${a.x + NW / 2} ${a.y + NH} C ${a.x + NW / 2} ${yb + 20}, ${b.x + NW / 2} ${yb + 20}, ${b.x + NW / 2} ${b.y + NH + 2}`;
    }
    if (b.x - a.x > COLW + 10 && Math.abs(a.y - b.y) < 5) {
      // Skipping over a column on the same row: arc over the top so as not to pass behind the cards in between.
      const top = a.y - 26;
      return `M ${a.x + NW - 16} ${a.y} C ${a.x + NW} ${top}, ${b.x + 16} ${top}, ${b.x + 24} ${b.y - 1}`;
    }
    const dx = Math.max(30, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${(x2 = x2 - 2)} ${y2}`;
  }
</script>

<svg viewBox="0 0 {W} {H}" class="graph" style:max-width="{W * 1.1}px" role="img" aria-label="Object graph: {nodes.filter((n) => n.state !== 'freed').length} objects">
  <defs>
    <marker id="og-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah" /></marker>
    <marker id="og-arrow-dead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah dead" /></marker>
  </defs>
  {#each roots as r (r.name)}
    {@const y = 30 + r.row * ROWH}
    <g class="root">
      <rect x="2" y={y + 8} width={ROOTW} height={NH - 16} rx="5" />
      <text x={ROOTW / 2 + 2} y={y + NH / 2 + 4} text-anchor="middle">{r.name}</text>
      {#if r.to !== undefined && byId.get(r.to)}
        {@const t = pos(byId.get(r.to)!)}
        <path d="M {ROOTW + 2} {y + NH / 2} C {ROOTW + 30} {y + NH / 2}, {t.x - 30} {t.y + NH / 2}, {t.x - 2} {t.y + NH / 2}" class="edge" marker-end="url(#og-arrow)" />
      {/if}
    </g>
  {/each}
  {#each edges as e, i (i)}
    {@const a = byId.get(e.from)}
    {@const b = byId.get(e.to)}
    {#if a && b}
      <path d={path(pos(a), pos(b), e.from === e.to)} class="edge" class:weak={e.weak} class:dead={e.dead || a.state === 'freed'} marker-end={e.dead || a.state === 'freed' ? 'url(#og-arrow-dead)' : 'url(#og-arrow)'} />
    {/if}
  {/each}
  {#each nodes as n (n.id)}
    {@const p = pos(n)}
    <g class="node {n.state ?? 'live'}" class:flash={n.flash} class:sel={selectable} transform="translate({p.x} {p.y})" onclick={() => onclick?.(n.id)} onkeydown={(e) => e.key === 'Enter' && onclick?.(n.id)} role={selectable ? 'button' : undefined} tabindex={selectable ? 0 : undefined} aria-label={selectable ? `${n.title}${n.badge ? `, ${n.badge}` : ''}` : undefined}>
      <rect width={NW} height={NH} rx="7" />
      <text x="8" y="17" class="t">{n.title}</text>
      {#if n.sub}<text x="8" y="33" class="s">{n.sub}</text>{/if}
      {#if n.badge !== undefined}
        <circle cx={NW - 4} cy="4" r="12" class="b" />
        <text x={NW - 4} y="8.5" text-anchor="middle" class="bt">{n.badge}</text>
      {/if}
    </g>
  {/each}
</svg>

<style>
  .graph {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-ui);
    overflow: visible;
  }
  .root rect {
    fill: var(--panel);
    stroke: var(--line-strong);
  }
  .root text {
    font-size: 12px;
    font-family: var(--font-mono);
    fill: var(--fg);
  }
  .edge {
    fill: none;
    stroke: var(--pointer, var(--ink-2));
    stroke-width: 1.6;
  }
  .edge.weak {
    stroke-dasharray: 4 3;
    opacity: 0.8;
  }
  .edge.dead {
    stroke: var(--mute);
    opacity: 0.35;
  }
  .ah {
    fill: var(--pointer, var(--ink-2));
  }
  .ah.dead {
    fill: var(--mute);
  }
  .node rect {
    fill: color-mix(in srgb, var(--alloc) 14%, var(--panel));
    stroke: var(--alloc);
    stroke-width: 1.5;
    transition:
      fill 0.25s,
      stroke 0.25s,
      opacity 0.3s;
  }
  .node .t {
    font-size: 12px;
    font-weight: 700;
    fill: var(--fg);
  }
  .node .s {
    font-size: 10.5px;
    fill: var(--ink-2);
    font-family: var(--font-mono);
  }
  .node .b {
    fill: var(--copper);
    stroke: var(--bg);
    stroke-width: 2;
  }
  .node .bt {
    font-size: 12px;
    font-weight: 700;
    fill: var(--on-accent);
    font-family: var(--font-mono);
  }
  .node.flash .b {
    fill: var(--amber, var(--copper));
    animation: pop 0.6s ease;
  }
  @keyframes pop {
    0% {
      r: 12;
    }
    40% {
      r: 16;
    }
    100% {
      r: 12;
    }
  }
  .node.freed {
    opacity: 0.35;
  }
  .node.freed rect {
    fill: transparent;
    stroke: var(--free);
    stroke-dasharray: 4 3;
  }
  .node.garbage rect {
    fill: transparent;
    stroke: var(--garbage);
    stroke-dasharray: 5 3;
  }
  .node.white rect {
    fill: color-mix(in srgb, var(--leak) 14%, var(--panel));
    stroke: var(--leak);
    stroke-dasharray: 5 3;
  }
  .node.grey rect {
    fill: color-mix(in srgb, var(--mute) 30%, var(--panel));
    stroke: var(--mute);
  }
  .node.black rect,
  .node.marked rect {
    fill: color-mix(in srgb, var(--green) 18%, var(--panel));
    stroke: var(--green);
  }
  .node.purple rect {
    fill: color-mix(in srgb, var(--violet, #8b5cf6) 18%, var(--panel));
    stroke: var(--violet, #8b5cf6);
  }
  .node.hot rect {
    stroke: var(--copper);
    stroke-width: 2.5;
  }
  .node.sel {
    cursor: pointer;
  }
  .node.sel:hover rect,
  .node.sel:focus-visible rect {
    stroke-width: 3;
  }
  .node:focus {
    outline: none;
  }
</style>
