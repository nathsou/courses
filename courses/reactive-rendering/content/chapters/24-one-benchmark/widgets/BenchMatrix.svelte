<!--
  Seven strategies, eight scenarios, one table. Every cell is measured: the lab's adapters run each scenario on a
  fresh MiniDom and the operations they perform are counted. Choose what to count; the colour says how far a cell is
  from the best in its row. The bottom row is the geometric mean of those ratios, as the js-framework-benchmark
  reports.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { ADAPTERS, SCENARIOS, measure, type Measurement } from '$lib/rx/bench';

  let { n, title = 'One table', caption, metric: initial = 'work' }: { n?: string | number; title?: string; caption?: string; metric?: string } = $props();

  type Metric = 'work' | 'live' | 'built' | 'ms';
  const METRICS: { value: Metric; label: string; text: string; get: (m: Measurement) => number }[] = [
    { value: 'work', label: 'Work', text: 'nodes built (created or parsed) + operations on the live page', get: (m) => m.stats.created + m.stats.parsed + m.stats.live },
    { value: 'live', label: 'Live operations', text: 'operations on nodes that are attached to the page: what a browser has to style, lay out and paint', get: (m) => m.stats.live },
    { value: 'built', label: 'Nodes built', text: 'nodes created with createElement or parsed from HTML or cloned from a template', get: (m) => m.stats.created + m.stats.parsed },
    { value: 'ms', label: 'Wall-clock ms', text: 'JavaScript time on the fake DOM: noisy, and not what a browser would measure', get: (m) => m.ms },
  ];

  let metric = $state<Metric>(METRICS.some((m) => m.value === initial) ? (initial as Metric) : 'work');
  let results = $state.raw<Record<string, Measurement>>({});
  let running = $state(false);
  let done = $state(0);
  let selected = $state<{ s: string; a: string } | null>(null);
  const total = ADAPTERS.length * SCENARIOS.length;

  async function run() {
    if (running) return;
    running = true;
    done = 0;
    const out: Record<string, Measurement> = {};
    results = out;
    for (const s of SCENARIOS) {
      for (const a of ADAPTERS) {
        await new Promise((r) => setTimeout(r, 0)); // let the page breathe between measurements
        out[`${s.id}/${a.id}`] = measure(a, s);
        done++;
        results = { ...out };
      }
    }
    running = false;
  }

  const m = $derived(METRICS.find((x) => x.value === metric)!);
  const val = (s: string, a: string) => {
    const r = results[`${s}/${a}`];
    return r ? m.get(r) : null;
  };
  const best = (s: string) => Math.max(1, Math.min(...ADAPTERS.map((a) => val(s, a.id) ?? Infinity)));
  const ratio = (s: string, a: string) => {
    const v = val(s, a);
    return v === null ? null : Math.max(v, 1) / best(s);
  };
  const geo = (a: string) => {
    const rs: number[] = [];
    for (const s of SCENARIOS) {
      const r = ratio(s.id, a);
      if (r === null) return null;
      rs.push(r);
    }
    return Math.exp(rs.reduce((acc, r) => acc + Math.log(r), 0) / rs.length);
  };
  const fmt = (v: number | null) => (v === null ? '' : v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v < 10 && metric === 'ms' ? v.toFixed(1) : String(Math.round(v)));
  /** 1 (best) → green, 10 and beyond → red, on a log scale. */
  const heat = (r: number | null) => (r === null ? 'transparent' : `color-mix(in srgb, var(--red) ${Math.round(Math.min(1, Math.log10(r)) * 55)}%, var(--panel))`);
  const sel = $derived(selected ? results[`${selected.s}/${selected.a}`] : null);
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Seven strategies from this course, eight scenarios from the js-framework-benchmark, counted exactly on the lab's DOM.">
  {#snippet controls()}
    <Segmented label="What to count" bind:value={metric} options={METRICS.map((x) => ({ value: x.value, label: x.label }))} />
  {/snippet}

  <div class="top ui">
    <Button variant="primary" onclick={run} disabled={running}>{done === 0 ? 'Run the benchmark' : running ? `Running… ${done} of ${total}` : 'Run it again'}</Button>
    <span class="hint">{m.text}.</span>
  </div>

  <div class="scroll">
    <table class="mx ui">
      <thead>
        <tr>
          <th scope="col">Scenario</th>
          {#each ADAPTERS as a (a.id)}<th scope="col" title={a.how}>{a.name}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each SCENARIOS as s (s.id)}
          <tr>
            <th scope="row">{s.label}</th>
            {#each ADAPTERS as a (a.id)}
              {@const r = ratio(s.id, a.id)}
              <td>
                {#if results[`${s.id}/${a.id}`]}
                  <button type="button" class="cell" class:best={r === 1} class:on={selected?.s === s.id && selected?.a === a.id} style:background={heat(r)} onclick={() => (selected = { s: s.id, a: a.id })} aria-label="{a.name}, {s.label}: {fmt(val(s.id, a.id))}">{fmt(val(s.id, a.id))}</button>
                {:else}<span class="empty">·</span>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Geometric mean, vs the best in each row</th>
          {#each ADAPTERS as a (a.id)}
            {@const g = geo(a.id)}
            <td class="geo">{g === null ? '' : `${g.toFixed(1)}×`}</td>
          {/each}
        </tr>
      </tfoot>
    </table>
  </div>

  {#if sel && selected}
    {@const a = ADAPTERS.find((x) => x.id === selected!.a)!}
    {@const sc = SCENARIOS.find((x) => x.id === selected!.s)!}
    <div class="detail ui" aria-live="polite">
      <b>{a.name}</b>, {sc.label.toLowerCase()}: {a.how}
      <ul>
        <li>{sel.stats.created} created, {sel.stats.parsed} parsed or cloned</li>
        <li>{sel.stats.inserted} inserted, {sel.stats.removed} removed</li>
        <li>{sel.stats.texts} text writes, {sel.stats.attrs} attribute writes</li>
        <li>{sel.stats.live} of {sel.stats.total} operations on the live page</li>
      </ul>
    </div>
  {/if}
</Widget>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
  }
  .hint {
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .scroll {
    overflow-x: auto;
  }
  .mx {
    border-collapse: collapse;
    font-size: 0.8rem;
    min-width: 46rem;
    width: 100%;
  }
  .mx th,
  .mx td {
    padding: 0.2rem 0.35rem;
    text-align: right;
    border-top: 1px solid var(--line);
  }
  .mx thead th {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ink-2);
    vertical-align: bottom;
    border-top: 0;
  }
  .mx tbody th,
  .mx tfoot th {
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
  }
  .cell {
    width: 100%;
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.15rem 0.3rem;
    color: var(--fg);
    cursor: pointer;
    text-align: right;
  }
  .cell.best {
    font-weight: 700;
    border-color: var(--signal);
  }
  .cell.on {
    outline: 2px solid var(--ink-blue);
  }
  .cell:focus-visible {
    outline: 2px solid var(--focus);
  }
  .empty {
    color: var(--mute);
  }
  .geo {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  tfoot th,
  tfoot td {
    border-top: 2px solid var(--line-strong);
  }
  .detail {
    margin-top: 0.8rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.84rem;
  }
  .detail ul {
    margin: 0.3rem 0 0;
    padding-left: 1.2rem;
    color: var(--ink-2);
  }
</style>
