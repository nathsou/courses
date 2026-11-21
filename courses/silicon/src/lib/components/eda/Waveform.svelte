<!--
  A waveform viewer: a clock row, then one row per signal. One-bit signals are drawn as high and low levels,
  wider ones as a bus with the value written in each cycle. A marked cycle (a failure) is shaded. The SVG
  scrolls sideways on narrow screens; a table under it gives the same values as text.
-->
<script lang="ts">
  import type { Env } from '$lib/eda/hdl';

  let {
    signals,
    cycles,
    mark,
    format = 'dec',
    label = 'Waveform',
  }: {
    signals: { name: string; width: number }[];
    cycles: Env[];
    mark?: number;
    format?: 'dec' | 'hex' | 'bin';
    label?: string;
  } = $props();

  const CW = 34;
  const ROW = 26;
  const LABEL = 62;
  const n = $derived(cycles.length);
  const W = $derived(LABEL + n * CW + 6);
  const H = $derived((signals.length + 1) * ROW + 16);

  function fmt(v: number | undefined, w: number): string {
    if (v === undefined) return '?';
    if (format === 'hex') return v.toString(16);
    if (format === 'bin') return v.toString(2).padStart(w, '0');
    return String(v);
  }

  function levelPath(name: string): string {
    let d = '';
    for (let i = 0; i < n; i++) {
      const y = (cycles[i]![name] ?? 0) ? 4 : ROW - 8;
      const x = LABEL + i * CW;
      d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
      d += `L${x + CW},${y}`;
    }
    return d;
  }
  const clockPath = $derived.by(() => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = LABEL + i * CW;
      d += `${i === 0 ? 'M' : 'L'}${x},${ROW - 8}L${x},4L${x + CW / 2},4L${x + CW / 2},${ROW - 8}L${x + CW},${ROW - 8}`;
    }
    return d;
  });
</script>

<div class="wave" role="figure" aria-label={label}>
  <div class="scroll">
    <svg viewBox="0 0 {W} {H}" width={W} height={H} aria-hidden="true">
      {#if mark !== undefined && mark < n}
        <rect class="mark" x={LABEL + mark * CW} y="0" width={CW} height={H} />
      {/if}
      {#each Array.from({ length: n + 1 }) as _, i (i)}
        <line class="edge" x1={LABEL + i * CW} x2={LABEL + i * CW} y1="0" y2={H - 14} />
      {/each}
      <g>
        <text class="name" x="4" y={ROW - 10}>clock</text>
        <path class="clk" d={clockPath} />
      </g>
      {#each signals as s, r (s.name)}
        <g transform="translate(0 {(r + 1) * ROW})">
          <text class="name" x="4" y={ROW - 10}>{s.name}</text>
          {#if s.width === 1}
            <path class="bit" d={levelPath(s.name)} />
          {:else}
            {#each cycles as c, i (i)}
              {@const x = LABEL + i * CW}
              {@const same = i > 0 && cycles[i - 1]![s.name] === c[s.name]}
              <path class="bus" d="M{x + (same ? 0 : 3)},4 L{x + CW - 0},4 M{x + (same ? 0 : 3)},{ROW - 8} L{x + CW},{ROW - 8}{same ? '' : ` M${x},${(ROW - 4) / 2} L${x + 3},4 M${x},${(ROW - 4) / 2} L${x + 3},${ROW - 8}`}" />
              {#if !same}<text class="val" x={x + 5} y={ROW - 11}>{fmt(c[s.name], s.width)}</text>{/if}
            {/each}
          {/if}
        </g>
      {/each}
      {#each Array.from({ length: n }) as _, i (i)}
        <text class="cyc" x={LABEL + i * CW + CW / 2} y={H - 3}>{i}</text>
      {/each}
    </svg>
  </div>
  <details class="as-text ui">
    <summary>The same values as a table</summary>
    <div class="table-wrap">
      <table>
        <thead><tr><th>cycle</th>{#each signals as s (s.name)}<th>{s.name}</th>{/each}</tr></thead>
        <tbody>
          {#each cycles as c, i (i)}
            <tr class:marked={mark === i}><td>{i}</td>{#each signals as s (s.name)}<td>{fmt(c[s.name], s.width)}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>

<style>
  .wave {
    margin: 0.6rem 0 0;
  }
  .scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--page);
  }
  svg {
    display: block;
    font-family: var(--font-mono);
    font-size: 10.5px;
  }
  .edge {
    stroke: var(--line);
    stroke-width: 1;
  }
  .mark {
    fill: var(--bad-soft);
  }
  .name {
    fill: var(--ink-2);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
  }
  .clk {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 1.2;
  }
  .bit {
    fill: none;
    stroke: var(--series-1);
    stroke-width: 1.8;
  }
  .bus {
    fill: none;
    stroke: var(--series-3);
    stroke-width: 1.4;
  }
  .val {
    fill: var(--ink);
  }
  .cyc {
    fill: var(--ink-3);
    text-anchor: middle;
    font-size: 9.5px;
  }
  .as-text {
    margin-top: 0.35rem;
    font-size: 0.8rem;
  }
  .as-text summary {
    cursor: pointer;
    color: var(--ink-2);
  }
  .table-wrap {
    overflow-x: auto;
    max-height: 14rem;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    margin-top: 0.3rem;
  }
  th,
  td {
    padding: 0.1rem 0.6rem;
    text-align: right;
    border-bottom: 1px solid var(--line);
  }
  tr.marked td {
    background: var(--bad-soft);
  }
</style>
