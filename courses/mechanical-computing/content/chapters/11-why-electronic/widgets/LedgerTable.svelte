<!-- The limits ledger, collected: every machine in the course, sortable, with additions per second on a log scale. -->
<script lang="ts">
  import { base } from '$app/paths';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { LEDGER, type LedgerEntry } from '$lib/ledger';

  let sort: 'year' | 'digits' | 'speed' = $state('year');
  const rows = $derived([...LEDGER].sort((a, b) => (sort === 'year' ? a.year - b.year : sort === 'digits' ? b.digits - a.digits : b.addsPerSecond - a.addsPerSecond)));
  const pos = (e: LedgerEntry) => (e.addsPerSecond > 0 ? ((Math.log10(e.addsPerSecond) + 1) / 11) * 100 : 0);
  const yr = (y: number) => (y < 0 ? `c. ${-y} BC` : String(y));
</script>

<Widget title="The limits ledger" subtitle="Every machine in the course. Speed is whole additions per second (log scale, from 0.1 to 10 billion); analog machines compute continuously and are marked ‘continuous’.">
  {#snippet controls()}
    <label>Sort by <select bind:value={sort}><option value="year">year</option><option value="digits">precision</option><option value="speed">speed</option></select></label>
  {/snippet}
  <div class="scroll">
    <table class="ui">
      <thead><tr><th>Machine</th><th>Year</th><th>Kind</th><th>Digits</th><th class="sp">Additions per second</th></tr></thead>
      <tbody>
        {#each rows as e (e.machine)}
          <tr>
            <td><a href="{base}/chapters/{e.chapter}/">{e.machine}</a><span class="n">{e.note}</span></td>
            <td class="num">{yr(e.year)}</td>
            <td>{e.kind}</td>
            <td class="num">{e.digits}</td>
            <td class="sp">{#if e.addsPerSecond > 0}<span class="track"><span class="bar" class:el={e.kind === 'electronic'} style:width="{pos(e)}%"></span></span><span class="num v">{e.addsPerSecond >= 1000 ? e.addsPerSecond.toExponential(0).replace('e+', ' × 10^') : e.addsPerSecond}</span>{:else}<span class="cont">continuous</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.86rem;
  }
  select {
    font: inherit;
    font-size: 0.86rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    padding: 0.2rem 0.4rem;
    color: var(--ink);
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  th {
    font-weight: 600;
    color: var(--ink-2);
  }
  .n {
    display: block;
    color: var(--ink-3);
    font-size: 0.74rem;
  }
  .sp {
    min-width: 11rem;
  }
  .track {
    display: inline-block;
    width: 7rem;
    height: 0.6rem;
    background: var(--surface-2);
    border-radius: 2px;
    position: relative;
    vertical-align: middle;
    margin-right: 0.4rem;
  }
  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--brass);
    border-radius: 2px;
  }
  .bar.el {
    background: var(--fx-blue);
  }
  .v {
    font-family: var(--font-mono);
  }
  .cont {
    color: var(--ink-3);
    font-style: italic;
  }
</style>
