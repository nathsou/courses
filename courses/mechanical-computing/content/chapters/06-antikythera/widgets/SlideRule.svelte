<!--
  A slide rule with C and D scales. Drag the slide (or use its buttons) to put C's 1 over a number on D;
  then the cursor over another number on C reads the product on D. Distances are logarithms.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  const W = 600, X0 = 20, L = 560;
  let slide = $state(0); // offset of the slide in units of log10 (0..1)
  let cursor = $state(Math.log10(2)); // cursor position on D, log10 units
  let drag: { what: 'slide' | 'cursor'; x: number; start: number } | null = null;
  let svg: SVGSVGElement | undefined = $state();

  const ticks = (() => {
    const t: { v: number; major: boolean; label?: string }[] = [];
    for (let v = 1; v < 10; v += v < 2 ? 0.05 : v < 5 ? 0.1 : 0.2) {
      const r = Math.round(v * 100) / 100;
      const major = Math.abs(r - Math.round(r)) < 1e-9;
      t.push({ v: r, major, label: major ? String(Math.round(r)) : Math.abs(r * 10 - Math.round(r * 10)) < 1e-9 && r < 2 ? String(r) : undefined });
    }
    t.push({ v: 10, major: true, label: '10' });
    return t;
  })();
  const X = (logv: number) => X0 + logv * L;
  function toUnits(clientX: number) {
    const r = svg!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  }
  function down(e: PointerEvent, what: 'slide' | 'cursor') {
    drag = { what, x: toUnits(e.clientX), start: what === 'slide' ? slide : cursor };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const d = (toUnits(e.clientX) - drag.x) / L;
    if (drag.what === 'slide') slide = Math.max(0, Math.min(1, drag.start + d));
    else cursor = Math.max(0, Math.min(1, drag.start + d));
  }
  const dRead = $derived(10 ** cursor);
  const cRead = $derived(10 ** (cursor - slide));
  const fmt = (v: number) => (v >= 10 ? v.toFixed(1) : v.toFixed(v < 2 ? 3 : 2));
</script>

<Widget title="A slide rule" subtitle="Drag the slide so that the 1 of the C scale sits over a number on D. Then drag the cursor to a number on C: the cursor shows their product on D, because adding lengths adds logarithms." onreset={() => { slide = 0; cursor = Math.log10(2); }}>
  {#snippet controls()}
    <span class="nudge">Slide <button onclick={() => (slide = Math.max(0, slide - 0.002))} aria-label="Move the slide left">◀</button><button onclick={() => (slide = Math.min(1, slide + 0.002))} aria-label="Move the slide right">▶</button></span>
    <span class="nudge">Cursor <button onclick={() => (cursor = Math.max(0, cursor - 0.002))} aria-label="Move the cursor left">◀</button><button onclick={() => (cursor = Math.min(1, cursor + 0.002))} aria-label="Move the cursor right">▶</button></span>
  {/snippet}
  <div class="scroll">
    <svg bind:this={svg} viewBox="0 0 {W} 150" class="rule" role="img" aria-label="Slide rule: slide offset {fmt(10 ** slide)}, cursor at {fmt(dRead)} on D and {fmt(cRead)} on C" onpointermove={move} onpointerup={() => (drag = null)}>
      <rect x="0" y="10" width={W} height="130" rx="6" class="stock" />
      <g transform="translate({slide * L} 0)">
        <rect x={X0 - 14} y="40" width={L + 28} height="40" class="slide" onpointerdown={(e) => down(e, 'slide')} role="slider" aria-label="The slide" aria-valuenow={10 ** slide} tabindex="0" />
        {#each ticks as t (t.v)}
          <line x1={X(Math.log10(t.v))} y1="80" x2={X(Math.log10(t.v))} y2={t.major ? 62 : 70} class="tick" />
          {#if t.label}<text x={X(Math.log10(t.v))} y="56" text-anchor="middle" class="tl">{t.label}</text>{/if}
        {/each}
        <text x={X0 - 8} y="74" class="sc">C</text>
      </g>
      {#each ticks as t (t.v)}
        <line x1={X(Math.log10(t.v))} y1="82" x2={X(Math.log10(t.v))} y2={t.major ? 100 : 92} class="tick" />
        {#if t.label}<text x={X(Math.log10(t.v))} y="112" text-anchor="middle" class="tl">{t.label}</text>{/if}
      {/each}
      <text x={X0 - 14} y="96" class="sc">D</text>
      <g transform="translate({X(cursor)} 0)" class="cursor" onpointerdown={(e) => down(e, 'cursor')} role="slider" aria-label="The cursor" aria-valuenow={dRead} tabindex="0">
        <rect x="-16" y="14" width="32" height="122" rx="3" />
        <line x1="0" y1="14" x2="0" y2="136" />
      </g>
    </svg>
  </div>
  <p class="read ui">C under the cursor: <strong class="num">{fmt(cRead)}</strong> · D under the cursor: <strong class="num">{fmt(dRead)}</strong> · slide set to ×{fmt(10 ** slide)}</p>
</Widget>

<style>
  .scroll {
    overflow-x: auto;
  }
  .rule {
    width: 100%;
    min-width: 32rem;
    touch-action: none;
    user-select: none;
  }
  .stock {
    fill: var(--surface-2);
    stroke: var(--line-strong);
  }
  .slide {
    fill: var(--page);
    stroke: var(--line-strong);
    cursor: ew-resize;
  }
  .tick {
    stroke: var(--ink);
    stroke-width: 0.8;
  }
  .tl {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--ink);
  }
  .sc {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
    fill: var(--accent);
  }
  .cursor {
    cursor: ew-resize;
  }
  .cursor rect {
    fill: color-mix(in srgb, var(--accent) 10%, transparent);
    stroke: var(--accent);
  }
  .cursor line {
    stroke: var(--fx-red);
    stroke-width: 1.2;
  }
  .nudge {
    display: inline-flex;
    gap: 0.2rem;
    align-items: center;
    font-size: 0.84rem;
  }
  .nudge button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    min-width: 2rem;
    min-height: 2rem;
    cursor: pointer;
    color: var(--ink);
  }
  .read {
    font-size: 0.86rem;
    margin: 0.4rem 0 0;
  }
</style>
