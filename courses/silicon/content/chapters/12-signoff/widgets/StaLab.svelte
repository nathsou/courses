<!--
  Static timing analysis of the synthesised counter: the latest arrival time (ps) on every net, the critical
  path in red, the slack at every end point for the chosen clock period, and the hold check. Click a cell to
  upsize it (×2, ×4, back to ×1): faster itself, but a heavier load for whatever drives it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import NetlistView from '$lib/components/eda/NetlistView.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { design } from '$lib/eda/hdl';
  import { synthesize } from '$lib/eda/techmap';
  import { analyse } from '$lib/eda/sta';
  import { DECADE_COUNTER } from '$lib/eda/designs';

  const nl = synthesize(design(DECADE_COUNTER));
  const GOAL = 240;
  let period = $state(300);
  let skew = $state(0);
  let sizes = $state<Record<string, number>>({});
  let selected = $state<string | undefined>();
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });

  const t = $derived(analyse(nl, { period, sizes, skew: { 'R_q[1]': skew } }));
  const closed = $derived(period <= GOAL && t.worst.slack >= 0 && skew === 0);
  $effect(() => {
    if (closed && mounted) progress.markSolved('signoff/closure');
  });
  function upsize(id: string) {
    selected = id;
    const cur = sizes[id] ?? 1;
    const next = cur >= 4 ? 1 : cur * 2;
    const s = { ...sizes };
    if (next === 1) delete s[id];
    else s[id] = next;
    sizes = s;
  }
  const hot = $derived(new Set(t.criticalCells));
  const hotNets = $derived(new Set(t.critical));
  const fmt = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(0)}`;
</script>

<Widget title="Timing the counter" subtitle="Numbers on the wires are the latest arrival times after the clock edge, in picoseconds. The red path is the critical one. Click a cell to upsize it.">
  {#snippet controls()}
    <Slider bind:value={period} min={150} max={400} step={1} label="Clock period" format={(v) => `${v} ps (${(1000 / v).toFixed(2)} GHz)`} />
    <Slider bind:value={skew} min={-80} max={80} step={1} label="Clock skew at flip-flop q[1]" format={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v)} ps`} />
    <button class="b ui" onclick={() => (sizes = {})}>All cells ×1</button>
  {/snippet}
  <NetlistView netlist={nl} {hot} {hotNets} {selected} oncell={upsize} netLabel={(n) => { const a = t.arrival.get(n); return a !== undefined && Number.isFinite(a) ? a.toFixed(0) : undefined; }} cellLabel={(id) => (sizes[id] ? `×${sizes[id]}` : undefined)} />
  <div class="two">
    <table class="ends ui">
      <thead><tr><th>End point</th><th>Arrival</th><th>Required</th><th>Setup slack</th><th>Hold slack</th></tr></thead>
      <tbody>
        {#each [...t.endpoints].sort((a, b) => a.slack - b.slack) as e (e.name)}
          <tr><td>{e.name.replace('R_', '')}{e.kind === 'flop' ? ' (D)' : ''}</td><td>{e.arrival.toFixed(0)}</td><td>{e.required.toFixed(0)}</td><td class:neg={e.slack < 0}>{fmt(e.slack)}</td><td class:neg={(e.holdSlack ?? 1) < 0}>{e.holdSlack !== undefined ? fmt(e.holdSlack) : ''}</td></tr>
        {/each}
      </tbody>
    </table>
    <dl class="nums ui">
      <div><dt>Worst setup slack</dt><dd class:neg={t.worst.slack < 0}>{fmt(t.worst.slack)} ps</dd></div>
      <div><dt>Shortest period that works</dt><dd>{t.minPeriod.toFixed(0)} ps = {(1000 / t.minPeriod).toFixed(2)} GHz</dd></div>
      <div><dt>Worst hold slack</dt><dd class:neg={t.worstHold < 0}>{fmt(t.worstHold)} ps</dd></div>
      <div><dt>Goal</dt><dd>{GOAL} ps with no negative slack{mounted && progress.isSolved('signoff/closure') ? ' ✓' : ''}</dd></div>
    </dl>
  </div>
  <p class="msg ui" class:ok={closed} aria-live="polite">
    {#if closed}Timing checked: every end point has non-negative slack at {period} ps.
    {:else if t.worstHold < 0}Hold violation: data launched by one clock edge reaches a flip-flop before that flip-flop’s own, late, clock edge has finished with the old value. A slower clock does not fix it.
    {:else if t.worst.slack < 0}Setup violation at {t.worst.name.replace('R_', '')}: the data arrives {(-t.worst.slack).toFixed(0)} ps too late for this period.
    {:else}All paths meet timing at {period} ps. Try the goal: {GOAL} ps, by upsizing cells.{/if}
  </p>
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 1rem;
    margin-top: 0.7rem;
    align-items: start;
  }
  @media (max-width: 700px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ends {
    border-collapse: collapse;
    font-size: 0.78rem;
    width: 100%;
  }
  .ends th,
  .ends td {
    padding: 0.15rem 0.4rem;
    border-bottom: 1px solid var(--line);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .ends th:first-child,
  .ends td:first-child {
    text-align: left;
    font-family: var(--font-mono);
  }
  .neg {
    color: var(--bad);
    font-weight: 700;
  }
  .nums {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .msg {
    font-size: 0.86rem;
    margin: 0.6rem 0 0;
  }
  .msg.ok {
    color: var(--ok);
    font-weight: 600;
  }
</style>
