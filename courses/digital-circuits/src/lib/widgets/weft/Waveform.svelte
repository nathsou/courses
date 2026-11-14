<!-- A test's waveform: each port at the end of each statement of the test, the failing step marked. -->
<script lang="ts">
  export interface WaveSignal {
    name: string;
    width: number;
    values: bigint[];
  }

  let { signals, cycles, marker, label = 'Waveform' }: {
    signals: WaveSignal[];
    /** The clock cycle of each column. */
    cycles: number[];
    /** The column to mark (the failure), if any. */
    marker?: number;
    label?: string;
  } = $props();

  const CW = 46;
  const RH = 22;
  const LW = 96;
  const n = $derived(cycles.length);
  const width = $derived(LW + n * CW + 8);
  const height = $derived(signals.length * RH + 24);
  const show = (v: bigint, w: number) => (w === 1 ? String(v) : v.toString(16));
  function trace(values: bigint[], y: number): string {
    let d = '';
    values.forEach((v, i) => {
      const yy = v === 1n ? y + 4 : y + RH - 4;
      const x = LW + i * CW;
      d += i === 0 ? `M${x},${yy}` : `V${yy}`;
      d += `H${x + CW}`;
    });
    return d;
  }
</script>

<svg viewBox="0 0 {width} {height}" {width} {height} role="img" aria-label={label} class="wave">
  {#if marker !== undefined}<rect class="mark" x={LW + marker * CW} y="0" width={CW} height={height} />{/if}
  {#each cycles as c, i (i)}
    <text class="cyc" class:fail={i === marker} x={LW + i * CW + CW / 2} y="12" text-anchor="middle">{c}</text>
  {/each}
  {#each signals as s, r (s.name)}
    {@const y = 24 + r * RH}
    <text class="name" x="4" y={y + RH / 2 + 4}>{s.name}</text>
    {#if s.width === 1}
      <path class="bit" d={trace(s.values, y)} />
    {:else}
      {#each s.values as v, i (i)}
        {@const changed = i === 0 || s.values[i - 1] !== v}
        <rect class="bus" class:changed x={LW + i * CW + 1} y={y + 3} width={CW - 2} height={RH - 6} rx="3" />
        <text class="val" x={LW + i * CW + CW / 2} y={y + RH / 2 + 4} text-anchor="middle">{show(v, s.width)}</text>
      {/each}
    {/if}
  {/each}
</svg>
<style>
  .wave {
    max-width: none;
    overflow: visible;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  .mark {
    fill: var(--bad-soft);
  }
  .cyc {
    fill: var(--mute);
  }
  .cyc.fail {
    fill: var(--bad);
    font-weight: 700;
  }
  .name {
    fill: var(--ink-2);
  }
  .bit {
    fill: none;
    stroke: var(--sig-current);
    stroke-width: 1.6;
  }
  .bus {
    fill: color-mix(in srgb, var(--sig-current) 10%, transparent);
    stroke: var(--sig-current);
    stroke-width: 1;
  }
  .bus.changed {
    fill: color-mix(in srgb, var(--sig-current) 24%, transparent);
  }
  .val {
    fill: var(--fg);
  }
</style>
