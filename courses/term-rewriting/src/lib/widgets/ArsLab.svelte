<script lang="ts">
  /** Draw an abstract reduction system and test its properties, with counterexamples. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import GraphView from '$lib/components/term/GraphView.svelte';
  import { parseARS, properties } from '$lib/trs/ars';

  const PRESETS: Record<string, string> = {
    'Newman’s counterexample': 'b -> a, b -> c, c -> b, c -> d',
    'A diamond': 'a -> b, a -> c, b -> d, c -> d',
    'Two normal forms': 'a -> b, a -> c',
    'A loop with an exit': 'a -> a, a -> b',
    'Confluent but not terminating': 'a -> b, b -> a, a -> c, b -> c',
  };
  let { initial = 'b -> a, b -> c, c -> b, c -> d' }: { initial?: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(initial);

  const data = $derived.by(() => {
    try {
      const a = parseARS(src);
      if (a.labels.length > 14) return { error: 'Keep it to 14 objects or fewer.' };
      return { a, p: properties(a) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
  const L = (i: number) => ('a' in data && data.a ? data.a.labels[i] : '?');
</script>

<Widget title="An abstract reduction system" subtitle="Objects and arrows, nothing else. Edit the arrows (a -> b, separated by commas) and read off the properties." onreset={() => (src = initial)}>
  <div class="w-row">
    <label class="grow">Arrows <input class="w-input" bind:value={src} spellcheck="false" /></label>
    <label>Examples
      <select class="w-input" onchange={(e) => (src = PRESETS[(e.currentTarget as HTMLSelectElement).value] ?? src)}>
        <option value="">choose…</option>
        {#each Object.keys(PRESETS) as k (k)}<option value={k}>{k}</option>{/each}
      </select>
    </label>
  </div>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else if data.a && data.p}
    {@const p = data.p}
    <GraphView layout="circle" nodes={data.a.labels.map((l, i) => ({ label: l, cls: data.a!.edges.some(([s]) => s === i) ? undefined : 'nf' }))} edges={data.a.edges.map(([from, to]) => ({ from, to }))} title="The relation" maxWidth={420} />
    <table class="w-table">
      <tbody>
        <tr><th>Terminating</th><td class:w-ok={p.terminating} class:w-bad={!p.terminating}>{p.terminating ? 'yes: no infinite path' : `no: ${p.cycle!.map(L).join(' → ')} is a cycle`}</td></tr>
        <tr><th>Weakly normalising</th><td class:w-ok={p.weaklyNormalising} class:w-bad={!p.weaklyNormalising}>{p.weaklyNormalising ? 'yes: every object has a normal form' : 'no: some object can never reach a normal form'}</td></tr>
        <tr><th>Locally confluent</th><td class:w-ok={p.locallyConfluent} class:w-bad={!p.locallyConfluent}>{p.locallyConfluent ? 'yes: every one-step fork can be joined' : `no: ${L(p.localPeak![1])} ← ${L(p.localPeak![0])} → ${L(p.localPeak![2])} cannot be joined`}</td></tr>
        <tr><th>Confluent</th><td class:w-ok={p.confluent} class:w-bad={!p.confluent}>{p.confluent ? 'yes: every fork can be joined' : `no: ${L(p.peak![0])} reaches both ${L(p.peak![1])} and ${L(p.peak![2])}, which have no common reduct`}</td></tr>
        <tr><th>Unique normal forms</th><td class:w-ok={p.uniqueNormalForms} class:w-bad={!p.uniqueNormalForms}>{p.uniqueNormalForms ? 'yes: no object reaches two normal forms' : 'no'}</td></tr>
      </tbody>
    </table>
  {/if}
</Widget>
