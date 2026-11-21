<!--
  Synthesis, live: the design is bit-blasted into a logic graph and mapped onto the course's cell library, for
  least area or least delay; the netlist is drawn by logic depth. Edit the design and watch the gates change.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import HdlEditor from '$lib/components/eda/HdlEditor.svelte';
  import NetlistView from '$lib/components/eda/NetlistView.svelte';
  import { parse } from '$lib/eda/hdl';
  import { blast, liveGates } from '$lib/eda/synth';
  import { levels, mapLogic, stats, type MapGoal } from '$lib/eda/techmap';
  import { ADDER_PLUS, DECADE_COUNTER } from '$lib/eda/designs';

  const EXAMPLES: Record<string, string> = {
    counter: DECADE_COUNTER,
    adder: ADDER_PLUS,
    compare: 'input a: 4\ninput b: 4\noutput lt = a < b\n',
    mux: 'input s: 2\ninput a: 2\ninput b: 2\ninput c: 2\ninput d: 2\noutput y: 2 = s == 0 ? a : s == 1 ? b : s == 2 ? c : d\n',
  };
  let which = $state('counter');
  let src = $state(DECADE_COUNTER);
  let goal = $state<MapGoal>('area');
  $effect(() => {
    const w = which;
    untrack(() => (src = EXAMPLES[w]!));
  });

  const parsed = $derived(parse(src));
  const result = $derived.by(() => {
    if (!parsed.ok) return null;
    const b = blast(parsed.design);
    const gates = liveGates(b);
    const kinds: Record<string, number> = {};
    for (const g of gates) kinds[b.logic.nodes[g]!.op] = (kinds[b.logic.nodes[g]!.op] ?? 0) + 1;
    const nl = mapLogic(b, goal);
    return { gates: gates.length, kinds, nl, st: stats(nl), depth: Math.max(0, ...levels(nl).values()) };
  });
</script>

<Widget title="Synthesis, live" subtitle="The design is bit-blasted into AND, OR, XOR, NOT and multiplexer nodes, simplified, then covered with cells from the library. Edit it, or pick another example.">
  {#snippet controls()}
    <Segmented bind:value={which} label="Example" size="sm" options={[{ value: 'counter', label: 'Decade counter' }, { value: 'adder', label: '4-bit adder' }, { value: 'compare', label: 'Comparator' }, { value: 'mux', label: '4-way mux' }]} />
    <Segmented bind:value={goal} label="Map for" size="sm" options={[{ value: 'area', label: 'Least area' }, { value: 'delay', label: 'Least delay' }]} />
  {/snippet}
  <HdlEditor bind:value={src} rows={8} errorLine={parsed.ok ? undefined : parsed.errors[0]!.line} label="Design to synthesise" />
  {#if !parsed.ok}
    <p class="err ui">Line {parsed.errors[0]!.line}: {parsed.errors[0]!.message}</p>
  {:else if result}
    <dl class="nums ui">
      <div><dt>Logic graph after bit-blasting</dt><dd>{result.gates} nodes ({Object.entries(result.kinds).map(([k, n]) => `${n} ${k.toUpperCase()}`).join(', ')})</dd></div>
      <div><dt>Mapped</dt><dd>{result.st.cells} cells + {result.st.flops} flip-flops</dd></div>
      <div><dt>Area</dt><dd>{result.st.transistors} transistors</dd></div>
      <div><dt>Logic depth</dt><dd>{result.depth} cells</dd></div>
    </dl>
    <div class="hist ui" aria-label="Cells used">
      {#each Object.entries(result.st.byCell).sort((a, b) => b[1] - a[1]) as [c, n] (c)}<span class="chip">{c} × {n}</span>{/each}
    </div>
    <NetlistView netlist={result.nl} />
  {/if}
</Widget>

<style>
  .err {
    color: var(--bad);
    font-size: 0.84rem;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.7rem 0 0.4rem;
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
  .hist {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.6rem;
  }
  .chip {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    padding: 0.1rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
</style>
