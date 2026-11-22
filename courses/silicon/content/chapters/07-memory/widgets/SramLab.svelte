<!--
  The six-transistor SRAM cell: two cross-coupled inverters holding Q and Q̄, and two access transistors that
  connect them to the bitlines when the word line is high. Read (bitlines precharged and floating) or write
  (bitlines driven), with chosen transistor strengths and random variation. Simulated with the transistor model.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { sram } from '$lib/physics/circuits';

  let op = $state<'read' | 'write'>('read');
  let cr = $state(2);
  let pu = $state(1);
  let mismatch = $state(0);

  // A read of a stored 0; a write of 0 into a cell holding 1.
  const tr = $derived(op === 'read' ? sram('read', { pullDown: cr, pullUp: pu }, 0, 0, 1, mismatch) : sram('write', { pullDown: cr, pullUp: pu }, 1, 0, 1, mismatch));
  const ok = $derived(tr.stored === 0);
  const bump = $derived(Math.max(...tr.q));
  const ps = (i: number) => tr.t[i]! * 1e12;
  const pts = (arr: number[]) => arr.map((v, i) => [ps(i), v] as [number, number]);
</script>

<Widget title="A six-transistor SRAM cell" subtitle="Two inverters in a loop hold the bit; two access transistors connect it to the bitlines while the word line is high (from 10 to 150 ps). Read a stored 0, or write a 0 over a stored 1.">
  {#snippet controls()}
    <Segmented bind:value={op} label="Operation" options={[{ value: 'read', label: 'Read the stored 0' }, { value: 'write', label: 'Write 0 over a 1' }]} />
    <Slider bind:value={cr} min={0.2} max={3} step={0.1} label="Pull-down ÷ access strength (cell ratio)" format={(v) => v.toFixed(1)} />
    <Slider bind:value={pu} min={0.5} max={8} step={0.1} label="Pull-up ÷ access width" format={(v) => v.toFixed(1)} />
    <Slider bind:value={mismatch} min={0} max={0.3} step={0.01} label="Threshold variation (worst case)" format={(v) => `${(v * 1000).toFixed(0)} mV`} />
  {/snippet}
  <div class="two">
    <svg viewBox="0 0 260 200" class="sch" role="img" aria-label="6T cell schematic; Q ends at {tr.q.at(-1)!.toFixed(2)} V">
      <line x1="20" x2="20" y1="10" y2="190" class="bl" /><text x="20" y="8" class="t c">BL</text>
      <line x1="240" x2="240" y1="10" y2="190" class="bl" /><text x="240" y="8" class="t c">BL̄</text>
      <line x1="10" x2="250" y1="40" y2="40" class="wl" /><text x="130" y="34" class="t c">word line</text>
      <!-- access transistors -->
      <rect x="44" y="92" width="26" height="12" class="fet" /><line x1="57" x2="57" y1="40" y2="92" class="g" />
      <line x1="20" x2="44" y1="98" y2="98" class="w" /><line x1="70" x2="90" y1="98" y2="98" class="w" />
      <rect x="190" y="92" width="26" height="12" class="fet" /><line x1="203" x2="203" y1="40" y2="92" class="g" />
      <line x1="216" x2="240" y1="98" y2="98" class="w" /><line x1="170" x2="190" y1="98" y2="98" class="w" />
      <!-- cross-coupled inverters -->
      <path d="M100,70 L130,85 L100,100 Z" class="inv" /><circle cx="133" cy="85" r="3" class="bub" />
      <path d="M160,112 L130,127 L160,142 Z" class="inv" /><circle cx="127" cy="127" r="3" class="bub" />
      <path d="M90,98 L90,127 L124,127 M90,85 L100,85" class="w" />
      <path d="M136,85 L170,85 L170,127 L160,127 M170,98 L170,98" class="w" />
      <circle cx="90" cy="98" r="3" class="node" /><text x="86" y="114" class="t r">Q {tr.q.at(-1)!.toFixed(2)}</text>
      <circle cx="170" cy="98" r="3" class="node" /><text x="174" y="114" class="t">Q̄ {tr.qb.at(-1)!.toFixed(2)}</text>
      <text x="130" y="175" class="t c dim">each inverter: a pull-up pMOS and a pull-down nMOS</text>
    </svg>
    <Plot
      label="Node and bitline voltages against time"
      x={{ min: 0, max: 250, label: 'time (ps)' }}
      y={{ min: 0, max: 1.05, label: 'voltage (V)' }}
      height={220}
      series={[
        { points: pts(tr.q), color: 'var(--series-1)', width: 2.5, label: 'Q' },
        { points: pts(tr.qb), color: 'var(--series-2)', width: 2.5, label: 'Q̄' },
        { points: pts(tr.bl), color: 'var(--series-1)', width: 1.5, dash: '5 3', label: 'BL' },
        { points: pts(tr.blb), color: 'var(--series-2)', width: 1.5, dash: '5 3', label: 'BL̄' },
      ]}
      vlines={[{ at: 10, label: 'word line on' }, { at: 150, label: 'off' }]}
    />
  </div>
  <p class="verdict ui" class:bad={!ok} class:good={ok}>
    {#if op === 'read'}
      {ok ? `Read checked: the cell still holds 0. Q rose to ${bump.toFixed(2)} V while BL was pulled down to ${tr.bl.at(-1)!.toFixed(2)} V, enough for a sense amplifier.` : `Read upset: Q rose to ${bump.toFixed(2)} V, past the other inverter’s switching point, and the cell flipped to 1. The read destroyed the data.`}
    {:else}
      {ok ? 'Write checked: the access transistor overpowered the pull-up and the cell now holds 0.' : 'Write failed: the pull-up is too strong for the access transistor to pull Q low, and the cell still holds 1.'}
    {/if}
  </p>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .sch {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .bl {
    stroke: var(--ink);
    stroke-width: 2.5;
  }
  .wl {
    stroke: var(--ac);
    stroke-width: 2.5;
  }
  .w {
    stroke: var(--ink-2);
    stroke-width: 1.6;
    fill: none;
  }
  .g {
    stroke: var(--ac);
    stroke-width: 1.6;
  }
  .fet,
  .inv {
    fill: var(--surface-2);
    stroke: var(--ink);
    stroke-width: 1.4;
  }
  .bub {
    fill: var(--surface);
    stroke: var(--ink);
  }
  .node {
    fill: var(--ink);
  }
  .t {
    font-size: 10px;
    fill: var(--ink);
    font-weight: 600;
  }
  .t.c {
    text-anchor: middle;
  }
  .t.r {
    text-anchor: end;
  }
  .t.dim {
    fill: var(--ink-3);
    font-weight: 400;
    font-size: 9px;
  }
  .verdict {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
  .good {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
    font-weight: 600;
  }
</style>
