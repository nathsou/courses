<!--
  A Karnaugh map of one of the decade counter's next-state bits, as a function of the current state q3 q2 q1 q0
  (counting enabled). Rows and columns are in Gray-code order, so neighbouring cells differ in one bit. Choose
  prime implicants (groups of 1, 2, 4 or 8 cells) to cover every 1; the widget checks the cover and compares it
  with the minimum. Values 10–15 never occur: they can be don't-cares.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { counterNextBit, minimumCover, minterms, primeImplicants, termText } from '$lib/eda/kmap';

  const NAMES = ['q3', 'q2', 'q1', 'q0'];
  const GRAY = [0, 1, 3, 2];
  let bit = $state(3);
  let dc = $state(true);
  let chosen = $state<string[]>([]);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });
  $effect(() => {
    void bit;
    void dc;
    chosen = [];
  });

  const fn = $derived(counterNextBit(bit, dc));
  const pis = $derived(primeImplicants(4, fn.ones, fn.dcs));
  const best = $derived(minimumCover(4, fn.ones, fn.dcs));
  const bestNoDc = $derived(minimumCover(4, counterNextBit(bit, false).ones));
  const withDc = $derived(counterNextBit(bit, true));
  const bestDc = $derived(minimumCover(4, withDc.ones, withDc.dcs));
  const lits = (cover: string[]) => cover.reduce((s, c) => s + [...c].filter((x) => x !== '-').length, 0);
  const coveredBy = (m: number) => chosen.filter((c) => minterms(c).includes(m));
  const uncovered = $derived(fn.ones.filter((m) => coveredBy(m).length === 0));
  const complete = $derived(fn.ones.length > 0 && uncovered.length === 0);
  const minimal = $derived(complete && chosen.length === best.length);
  $effect(() => {
    if (minimal && dc && mounted) progress.markSolved(`synthesis/kmap-${bit}`);
  });

  const value = (m: number) => (fn.ones.includes(m) ? '1' : fn.dcs.includes(m) ? '×' : '0');
  const cellOf = (m: number) => ({ r: GRAY.indexOf(m >> 2), c: GRAY.indexOf(m & 3) });
  const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--ac)'];
  /** Rectangles to draw for a cube: its rows and columns, split where the group wraps round the map's edge. */
  function rects(cube: string) {
    const ms = minterms(cube);
    const rows = [...new Set(ms.map((m) => cellOf(m).r))].sort((a, b) => a - b);
    const cols = [...new Set(ms.map((m) => cellOf(m).c))].sort((a, b) => a - b);
    const runs = (xs: number[]) => {
      if (xs.length === 4) return [[0, 3]];
      if (xs.length === 2 && xs[0] === 0 && xs[1] === 3) return [[3, 3], [0, 0]];
      return [[xs[0]!, xs.at(-1)!]];
    };
    return runs(rows).flatMap(([r0, r1]) => runs(cols).map(([c0, c1]) => ({ r0: r0!, r1: r1!, c0: c0!, c1: c1! })));
  }
  function toggle(c: string) {
    chosen = chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c];
  }
  const S = 54;
  const O = 46;
</script>

<Widget title="A Karnaugh map of the counter" subtitle="One bit of the counter’s next value, as a function of its current value q. Each prime implicant below is a group of 1s (and don’t-cares); choose some to cover every 1, with as few as possible.">
  {#snippet controls()}
    <Segmented bind:value={bit} label="Next-state bit" options={[3, 2, 1, 0].map((b) => ({ value: b, label: `q${b}′${mounted && progress.isSolved(`synthesis/kmap-${b}`) ? ' ✓' : ''}` }))} />
    <Toggle bind:checked={dc} label="Values 10–15 are don’t-cares" />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 {O + 4 * S + 10} {O + 4 * S + 10}" class="map" role="img" aria-label="Karnaugh map of next q{bit}: ones at {fn.ones.join(', ')}">
      <text x={O - 4} y={O / 2 - 6} class="axis">q3q2 \ q1q0</text>
      {#each GRAY as g, i (i)}
        <text x={O + i * S + S / 2} y={O - 8} class="hd">{g.toString(2).padStart(2, '0')}</text>
        <text x={O - 8} y={O + i * S + S / 2 + 4} class="hd r">{g.toString(2).padStart(2, '0')}</text>
      {/each}
      {#each Array.from({ length: 16 }) as _, m (m)}
        {@const p = cellOf(m)}
        <rect x={O + p.c * S} y={O + p.r * S} width={S} height={S} class="cell" class:miss={chosen.length > 0 && uncovered.includes(m)} />
        <text x={O + p.c * S + S / 2} y={O + p.r * S + S / 2 + 6} class="v" class:one={value(m) === '1'} class:dc={value(m) === '×'}>{value(m)}</text>
        <text x={O + p.c * S + 4} y={O + p.r * S + 11} class="idx">{m}</text>
      {/each}
      {#each chosen as c, k (c)}
        {#each rects(c) as r, j (j)}
          <rect x={O + r.c0 * S + 4 + k} y={O + r.r0 * S + 4 + k} width={(r.c1 - r.c0 + 1) * S - 8 - 2 * k} height={(r.r1 - r.r0 + 1) * S - 8 - 2 * k} rx="10" class="grp" style:stroke={COLORS[k % COLORS.length]} />
        {/each}
      {/each}
    </svg>
    <div class="side ui">
      <p class="lbl">Prime implicants</p>
      <div class="pis">
        {#each pis as c (c)}
          {@const k = chosen.indexOf(c)}
          <button class:on={k >= 0} style:--c={k >= 0 ? COLORS[k % COLORS.length] : 'var(--line-strong)'} onclick={() => toggle(c)} aria-pressed={k >= 0}>{termText(c, NAMES)}</button>
        {/each}
      </div>
      <p class="expr">q{bit}′ = {chosen.length ? chosen.map((c) => termText(c, NAMES)).join(' + ') : '…'}</p>
      <p class="verdict" class:ok={minimal} aria-live="polite">
        {#if !chosen.length}Choose groups to cover the 1s.
        {:else if !complete}{uncovered.length} 1{uncovered.length === 1 ? ' is' : 's are'} not covered yet (outlined in red).
        {:else if minimal}Cover checked: every 1 is covered, with {best.length} term{best.length === 1 ? '' : 's'}, the minimum.
        {:else}Every 1 is covered, with {chosen.length} terms; the minimum is {best.length}.{/if}
      </p>
      <p class="note">Minimum without don’t-cares: {bestNoDc.length} term{bestNoDc.length === 1 ? '' : 's'}, {lits(bestNoDc)} literals. With them: {bestDc.length} term{bestDc.length === 1 ? '' : 's'}, {lits(bestDc)} literals.</p>
    </div>
  </div>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .map {
    width: 100%;
    max-width: 20rem;
    height: auto;
    font-family: var(--font-ui);
  }
  .cell {
    fill: var(--surface);
    stroke: var(--line-strong);
  }
  .cell.miss {
    stroke: var(--bad);
    stroke-width: 2.5;
  }
  .v {
    font-family: var(--font-mono);
    font-size: 17px;
    text-anchor: middle;
    fill: var(--ink-3);
  }
  .v.one {
    fill: var(--ink);
    font-weight: 700;
  }
  .v.dc {
    fill: var(--ac);
  }
  .idx {
    font-size: 8px;
    fill: var(--ink-3);
  }
  .hd {
    font-family: var(--font-mono);
    font-size: 11px;
    text-anchor: middle;
    fill: var(--ink-2);
  }
  .hd.r {
    text-anchor: end;
  }
  .axis {
    font-size: 9px;
    text-anchor: end;
    fill: var(--ink-3);
  }
  .grp {
    fill: none;
    stroke-width: 3;
    opacity: 0.85;
  }
  .lbl {
    margin: 0 0 0.3rem;
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .pis {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .pis button {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    border: 2px solid var(--c);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .pis button.on {
    background: color-mix(in srgb, var(--c) 18%, var(--surface));
    font-weight: 700;
  }
  .expr {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    margin: 0.8rem 0 0.3rem;
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.3rem 0;
  }
  .verdict.ok {
    color: var(--ok);
    font-weight: 600;
  }
  .note {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin: 0.4rem 0 0;
  }
</style>
