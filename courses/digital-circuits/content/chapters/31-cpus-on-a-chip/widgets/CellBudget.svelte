<!--
  Where the cells go: Octet, and the RV32I core with its register file in flip-flops and in block RAM, as bars on one
  scale, the whole iCE40 HX8K (the numbers are synth's, recorded in budget.json by budget.test.ts). Each bar is split
  into the cells whose flip-flop is used and the cells that are logic only. Hover or focus a segment for its size.

    ::cell-budget{n="31.3" caption="…"}
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { BUDGET, FIT_TITLES, type FitId } from './budget';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  const scale = BUDGET.capacity;
  const fmt = (v: number) => v.toLocaleString('en-GB');
  let hot = $state<{ fit: string; i: number } | null>(null);
  const tone = ['var(--sig-high)', 'var(--copper)'];
  const width = (cells: number) => `${(100 * cells) / scale}%`;
  const fits = (Object.keys(BUDGET.fits) as FitId[]).map((id) => {
    const f = BUDGET.fits[id];
    return { id, title: FIT_TITLES[id], ...f, segments: [{ label: 'cells with a flip-flop', cells: f.flipFlopCells }, { label: 'logic only', cells: f.cells - f.flipFlopCells }] };
  });
  const detail = (f: (typeof fits)[number]) => `${f.title}: ${fmt(f.cells)} of the HX8K’s ${fmt(scale)} logic cells, ${fmt(f.flipFlopCells)} of them with their flip-flop, ${f.rams} block RAMs, ${f.mhz.toFixed(1)} MHz`;
</script>

<Widget {n} title="The cell budget" subtitle="logic cells of an iCE40 HX8K, on one scale" {caption} kind="Fit results">
  <div class="cb ui">
    {#each fits as f (f.id)}
      <section aria-label={detail(f)}>
        <header>
          <h4>{f.title}</h4>
          <span class="dev">{((100 * f.cells) / scale).toFixed(0)} % of the chip</span>
        </header>
        <div class="track">
          {#each f.segments as s, i (s.label)}
            <button
              type="button"
              class="seg"
              class:hot={hot?.fit === f.id && hot.i === i}
              style:width={width(s.cells)}
              style:background={tone[i]}
              aria-label="{s.label}: {fmt(s.cells)} cells"
              onmouseenter={() => (hot = { fit: f.id, i })}
              onmouseleave={() => (hot = null)}
              onfocus={() => (hot = { fit: f.id, i })}
              onblur={() => (hot = null)}
            ></button>
          {/each}
        </div>
        <p class="line">
          <b>{fmt(f.cells)}</b> cells · {f.rams} block RAM{f.rams === 1 ? '' : 's'} of {BUDGET.rams} · <b>{f.mhz.toFixed(1)} MHz</b>
        </p>
        <p class="key">
          {#each f.segments as s, i (s.label)}
            <span class:hot={hot?.fit === f.id && hot.i === i}><i style:background={tone[i]}></i>{s.label} {fmt(s.cells)}</span>
          {/each}
        </p>
      </section>
    {/each}
    <p class="scale">Full width = the whole HX8K, {fmt(scale)} logic cells.</p>
  </div>
</Widget>

<style>
  .cb {
    padding: 0.8rem 1rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    background: var(--panel);
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }
  h4 {
    margin: 0;
    font-size: 0.86rem;
    font-weight: 600;
  }
  .dev {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--mute);
  }
  .track {
    position: relative;
    display: flex;
    height: 1.5rem;
    margin: 0.3rem 0 0.25rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--pn);
    overflow: visible;
  }
  .seg {
    border: 0;
    border-right: 1px solid var(--panel);
    padding: 0;
    cursor: default;
    min-width: 2px;
  }
  .seg:first-of-type {
    border-radius: 3px 0 0 3px;
  }
  .seg.hot,
  .seg:focus-visible {
    outline: 2px solid var(--fg);
    outline-offset: 1px;
    z-index: 1;
  }
  .line,
  .key {
    margin: 0.15rem 0;
    font-size: 0.76rem;
    color: var(--ink-2);
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.9rem;
    font-size: 0.7rem;
  }
  .key span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .key span.hot {
    color: var(--fg);
    font-weight: 600;
  }
  .key i {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    border: 1px solid var(--line-strong);
  }
  .scale {
    margin: 0;
    font-size: 0.7rem;
    color: var(--mute);
  }
</style>
