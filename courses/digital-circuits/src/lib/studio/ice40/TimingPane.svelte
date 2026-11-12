<!-- synth's static timing analysis: each clock's maximum frequency and its critical path, step by step. -->
<script lang="ts">
  import type { ClockTiming } from '$lib/synth/api';

  let { clocks }: { clocks: ClockTiming[] } = $props();
</script>

<div class="timing ui">
  {#each clocks as c (c.clock)}
    <section>
      <h5>Clock <code>{c.clock}</code></h5>
      <p class="sum"><b>{c.period_ns.toFixed(2)} ns</b> on the slowest path: at most <b>{c.fmax_mhz.toFixed(1)} MHz</b>{#if c.target_mhz} (target {c.target_mhz} MHz, {c.met ? 'met' : 'missed'}){/if}.</p>
      <table>
        <thead><tr><th>Arrives at</th><th>Pin</th><th>Time</th><th>Step</th></tr></thead>
        <tbody>
          {#each c.path as s, i (i)}
            <tr><td><code>{s.cell.replace(/\$lc$/, '')}</code></td><td>{s.pin}</td><td>{s.t.toFixed(2)} ns</td><td>{i === 0 ? '' : `+${(s.t - c.path[i - 1]!.t).toFixed(2)}`}</td></tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else}
    <p class="sum">The design has no clock to time.</p>
  {/each}
</div>

<style>
  .timing {
    font-size: 0.84rem;
    display: grid;
    gap: 0.8rem;
  }
  h5 {
    margin: 0 0 0.2rem;
    font-size: 0.78rem;
  }
  .sum {
    margin: 0 0 0.4rem;
    color: var(--ink-2);
  }
  b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  table {
    border-collapse: collapse;
    font-size: 0.78rem;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 0.15rem 0.5rem 0.15rem 0;
    border-bottom: 1px solid var(--line);
  }
  th {
    color: var(--mute);
    font-weight: 500;
  }
  td:nth-child(3),
  td:nth-child(4) {
    font-family: var(--font-mono);
    white-space: nowrap;
  }
</style>
