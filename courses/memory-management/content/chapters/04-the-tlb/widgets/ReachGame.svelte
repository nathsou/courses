<!--
  The reach game: a program sweeps a working set four times; the TLB (8 entries, LRU) caches translations.
  Predict the miss rate, then run. Toggle 2 MiB megapages to see reach grow 512-fold.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Tlb } from '$lib/mm/machine/tlb';
  import { bytes } from '$lib/mm/util/format';

  const ENTRIES = 8;
  const SIZES = [16, 32, 48, 64, 128, 512, 4096, 16384]; // KiB
  let ws = $state(48);
  let stride = $state(64);
  let mega = $state(false);
  let guess = $state(50);
  let revealed = $state(false);
  let points = $state(0);
  let rounds = $state(0);
  let tlbView = $state<{ tag: number; level: number }[]>([]);

  function simulate(wsKiB: number, strideB: number, big: boolean) {
    const tlb = new Tlb(ENTRIES);
    const bytesWs = wsKiB * 1024;
    const level = big ? 1 : 0;
    const accesses = Math.min(4 * Math.ceil(bytesWs / strideB), 200000);
    for (let i = 0; i < accesses; i++) {
      const va = 0x4000_0000 + ((i * strideB) % bytesWs);
      if (!tlb.lookup(va, 1)) tlb.insert(va, 1, level, { ppn: Math.floor(va / (big ? 2097152 : 4096)) * (big ? 512 : 1), flags: 0xdf });
    }
    return { rate: tlb.stats.misses / accesses, accesses, misses: tlb.stats.misses, entries: tlb.entries.map((e) => ({ tag: e.tag, level: e.level })) };
  }
  const result = $derived(simulate(ws, stride, mega));
  const reach = $derived(ENTRIES * (mega ? 2 * 1024 * 1024 : 4096));
  const curve = (big: boolean) => SIZES.map((s) => simulate(s, stride, big).rate);
  const small = $derived(curve(false));
  const large = $derived(curve(true));

  function reveal() {
    revealed = true;
    rounds++;
    const err = Math.abs(guess - result.rate * 100);
    if (err <= 10) points++;
    tlbView = result.entries;
  }
  function change() {
    revealed = false;
  }
  const W = 360,
    H = 120;
  const xs = (i: number) => 30 + (i * (W - 40)) / (SIZES.length - 1);
  const ys = (r: number) => 10 + (1 - r) * (H - 30);
</script>

<Widget title="How far does the TLB reach?" kind="Reach game" n="4.1" caption="Eight TLB entries, least recently used replacement. The program reads its working set from start to end four times, one load every stride bytes. Each miss costs a page walk.">
  <div class="cfg ui">
    <label>Working set
      <select bind:value={ws} onchange={change}>{#each SIZES as s (s)}<option value={s}>{bytes(s * 1024)}</option>{/each}</select>
    </label>
    <label>Stride
      <select bind:value={stride} onchange={change}>{#each [8, 64, 4096] as s (s)}<option value={s}>{s} bytes</option>{/each}</select>
    </label>
    <label class="mega"><input type="checkbox" bind:checked={mega} onchange={change} /> 2 MiB megapages</label>
    <span class="reach">TLB reach: <strong>{bytes(reach)}</strong> (8 × {mega ? '2 MiB' : '4 KiB'})</span>
  </div>
  <div class="guess ui">
    <label>Your guess: <strong>{guess}%</strong> of loads miss in the TLB <input type="range" min="0" max="100" bind:value={guess} disabled={revealed} /></label>
    <button onclick={reveal} disabled={revealed}>Run it</button>
    <span class="pts">within 10 points: {points} of {rounds}</span>
  </div>
  {#if revealed}
    <p class="ans ui"><strong>{(result.rate * 100).toFixed(1)}%</strong> of {result.accesses.toLocaleString('en-GB')} loads missed ({result.misses.toLocaleString('en-GB')} page walks). {Math.abs(guess - result.rate * 100) <= 10 ? '✓ Good guess.' : 'Off by more than 10 points.'}
      {#if ws * 1024 > reach && result.rate > 0.2}The working set is bigger than the reach, and the sweep evicts each entry just before it is needed again: LRU’s worst case.{:else if result.rate < 0.01}Everything fits: after the first pass, every translation is in the TLB.{/if}</p>
    <div class="slots mono">
      {#each tlbView as e, i (i)}<span class="slot">VPN {e.level ? `${(e.tag * 512).toString(16)}… (2 MiB)` : e.tag.toString(16)}</span>{/each}
    </div>
  {/if}
  <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="TLB miss rate against working-set size, for 4 KiB pages and for 2 MiB megapages">
    <line x1="30" x2={W - 10} y1={ys(0)} y2={ys(0)} class="axis" />
    <text x="4" y={ys(1) + 4} class="t">100%</text>
    <text x="10" y={ys(0) + 4} class="t">0%</text>
    {#each SIZES as s, i (s)}<text x={xs(i)} y={H - 4} class="t" text-anchor="middle">{s >= 1024 ? `${s / 1024}M` : `${s}K`}</text>{/each}
    <polyline class="small" points={small.map((r, i) => `${xs(i)},${ys(r)}`).join(' ')} />
    <polyline class="large" points={large.map((r, i) => `${xs(i)},${ys(r)}`).join(' ')} />
    {#if revealed}<circle cx={xs(SIZES.indexOf(ws))} cy={ys(result.rate)} r="5" class="me" />{/if}
  </svg>
  <p class="legend ui"><span><i class="k small"></i> 4 KiB pages</span><span><i class="k large"></i> 2 MiB megapages</span> <span class="dim">(miss rate against working-set size, at this stride)</span></p>
</Widget>

<style>
  .cfg,
  .guess {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.2rem;
    align-items: center;
    font-size: 0.86rem;
  }
  .guess {
    margin-top: 0.7rem;
    padding: 0.6rem 0.8rem;
    border: 1px dashed var(--copper);
    border-radius: var(--radius);
    background: var(--copper-soft);
  }
  select {
    font: inherit;
    margin-left: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 3px;
  }
  .reach strong {
    color: var(--copper);
  }
  button {
    font: inherit;
    background: var(--copper);
    border: 1px solid var(--copper);
    color: var(--on-accent);
    border-radius: 99px;
    padding: 0.25rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
  }
  .pts {
    color: var(--ink-2);
  }
  .ans {
    font-size: 0.9rem;
    margin: 0.7rem 0 0.4rem;
  }
  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    font-size: 0.7rem;
  }
  .slot {
    padding: 0.15rem 0.4rem;
    background: var(--page-soft);
    border: 1px solid var(--page-c);
    border-radius: 3px;
  }
  .chart {
    width: 100%;
    max-width: 34rem;
    display: block;
    margin-top: 0.8rem;
  }
  .axis {
    stroke: var(--line-strong);
  }
  .t {
    font-family: var(--font-mono);
    font-size: 8px;
    fill: var(--mute);
  }
  polyline {
    fill: none;
    stroke-width: 2;
  }
  .small {
    stroke: var(--copper);
  }
  .large {
    stroke: var(--page-c);
    stroke-dasharray: 5 3;
  }
  .me {
    fill: var(--amber);
    stroke: var(--fg);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.76rem;
    color: var(--ink-2);
  }
  .k {
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    vertical-align: middle;
    margin-right: 0.3rem;
  }
  .k.small {
    border-color: var(--copper);
  }
  .k.large {
    border-color: var(--page-c);
    border-top-style: dashed;
  }
  .dim {
    color: var(--mute);
  }
</style>
