<!--
  Hasse diagrams of small partial orders. Pick two elements: the figure shows their upper bounds, their join
  (least upper bound) and meet (greatest lower bound), or says that there is none. `::lattice-lab{presets="…"}`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { ORDERS, OrderOps } from '$lib/sa/flow/lattices';

  let { presets = 'powerset,flat,sign,notlattice', initial, n, caption, title = 'Lattice lab' }: { presets?: string; initial?: string; n?: string; caption?: string; title?: string } = $props();

  const keys = $derived(presets.split(',').map((s) => s.trim()).filter((k) => k in ORDERS));
  // svelte-ignore state_referenced_locally
  let key = $state(initial ?? presets.split(',')[0]!.trim());
  let picked = $state<string[]>([]);
  const order = $derived(ORDERS[key] ?? ORDERS.powerset!);
  const ops = $derived(new OrderOps(order));

  const W = 520;
  const ROW = 70;
  const layout = $derived.by(() => {
    const h = ops.height();
    const rows = new Map<number, string[]>();
    for (const e of order.elements) rows.set(ops.rank.get(e)!, [...(rows.get(ops.rank.get(e)!) ?? []), e]);
    const pos = new Map<string, { x: number; y: number }>();
    for (const [r, row] of rows) row.forEach((e, i) => pos.set(e, { x: ((i + 1) * W) / (row.length + 1), y: 30 + (h - r) * ROW }));
    return { pos, height: 60 + h * ROW };
  });

  function pick(e: string) {
    picked = picked.includes(e) ? picked.filter((x) => x !== e) : [...picked.slice(-1), e];
  }
  const a = $derived(picked[0]);
  const b = $derived(picked[1]);
  const join = $derived(a && b ? ops.join(a, b) : undefined);
  const meet = $derived(a && b ? ops.meet(a, b) : undefined);
  const upper = $derived(a && b ? new Set(ops.upperBounds(a, b)) : new Set<string>());
</script>

<Widget {title} subtitle="Click two elements to see their join (⊔) and meet (⊓)." {n} {caption} onreset={() => { picked = []; key = initial ?? keys[0]!; }}>
  <div class="ll ui">
    {#if keys.length > 1}
      <div class="tabs" role="tablist">
        {#each keys as k (k)}<button role="tab" aria-selected={k === key} class:on={k === key} onclick={() => { key = k; picked = []; }}>{ORDERS[k]!.name}</button>{/each}
      </div>
    {/if}
    <p class="desc">{order.description}</p>
    <svg viewBox="0 0 {W} {layout.height}" role="img" aria-label="Hasse diagram of {order.name}">
      {#each order.covers as [lo, hi] (lo + hi)}
        {@const p = layout.pos.get(lo)!}
        {@const q = layout.pos.get(hi)!}
        <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} class="cover" />
      {/each}
      {#each order.elements as e (e)}
        {@const p = layout.pos.get(e)!}
        <g class="el" class:picked={picked.includes(e)} class:join={e === join} class:meet={e === meet} class:ub={upper.has(e)} role="button" tabindex="0" aria-label={e} onclick={() => pick(e)} onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && pick(e)}>
          <rect x={p.x - 34} y={p.y - 14} width="68" height="28" rx="14" />
          <text x={p.x} y={p.y + 5} text-anchor="middle">{e}</text>
        </g>
      {/each}
    </svg>
    <p class="result" aria-live="polite">
      {#if a && b}
        <code>{a}</code> ⊔ <code>{b}</code> = {#if join}<code class="j">{join}</code>{:else}<strong class="bad">none</strong>: the upper bounds {[...upper].map((x) => x).join(', ')} have no least element{/if};
        <code>{a}</code> ⊓ <code>{b}</code> = {#if meet}<code class="m">{meet}</code>{:else}<strong class="bad">none</strong>{/if}.
      {:else if a}
        Now pick a second element.
      {:else}
        Height of this order: {ops.height()} (the longest chain from bottom to top has {ops.height() + 1} elements).
      {/if}
    </p>
  </div>
</Widget>

<style>
  .ll {
    display: grid;
    gap: 0.4rem;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .desc {
    font-size: 0.85rem;
    margin: 0;
    color: var(--ink-2);
  }
  svg {
    width: 100%;
    max-width: 560px;
    height: auto;
    justify-self: center;
  }
  .cover {
    stroke: var(--line-strong);
    stroke-width: 1.5;
  }
  .el {
    cursor: pointer;
  }
  .el rect {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 1.3;
  }
  .el text {
    font-family: var(--font-mono);
    font-size: 13px;
    fill: var(--fg);
  }
  .el.ub rect {
    fill: var(--amber-soft);
  }
  .el.picked rect {
    stroke: var(--accent);
    stroke-width: 2.6;
  }
  .el.join rect {
    fill: var(--accent);
  }
  .el.join text {
    fill: var(--accent-fg, #fff);
  }
  .el.meet rect {
    stroke: var(--ok);
    stroke-width: 2.6;
    stroke-dasharray: 4 2;
  }
  .result {
    font-size: 0.86rem;
    margin: 0;
  }
  .bad {
    color: var(--bad);
  }
</style>
