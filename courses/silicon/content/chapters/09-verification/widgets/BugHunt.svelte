<!--
  Hunting a bug: a decade counter that wraps after 10 instead of 9. Random testing compares it with a reference
  model cycle by cycle (a scoreboard) and records coverage: which digit values were seen, and whether the
  corner case (enabled at 9) was ever reached. A proof explores every reachable state instead.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Waveform from '$lib/components/eda/Waveform.svelte';
  import { design } from '$lib/eda/hdl';
  import { randomStimulus, simulate } from '$lib/eda/sim';
  import { prove } from '$lib/eda/check';
  import { DECADE_COUNTER, DECADE_COUNTER_BUGGY } from '$lib/eda/designs';

  const dut = design(DECADE_COUNTER_BUGGY);
  const ref = design(DECADE_COUNTER);
  let cycles = $state(50);
  let pRst = $state(0.2);
  let pEn = $state(0.5);
  let seed = $state(1);
  let proof = $state<ReturnType<typeof prove> | null>(null);

  const run = $derived.by(() => {
    const stim = randomStimulus(dut, cycles, seed, { rst: pRst, en: pEn });
    const a = simulate(dut, stim);
    const b = simulate(ref, stim);
    let mismatch = -1;
    const seen = new Array(16).fill(0);
    let corner = 0;
    for (let i = 0; i < cycles; i++) {
      const x = a.cycles[i]!.values;
      const y = b.cycles[i]!.values;
      seen[x.q!]++;
      if (y.q === 9 && stim[i]!.en && !stim[i]!.rst) corner++;
      if (mismatch < 0 && (x.digit !== y.digit || x.tc !== y.tc)) mismatch = i;
    }
    return { stim, a, b, mismatch, seen, corner };
  });
  const covered = $derived(run.seen.slice(0, 10).filter((n) => n > 0).length);
  const proofDesign = design(DECADE_COUNTER_BUGGY + 'assert q <= 9\n');
  function doProve() {
    proof = prove(proofDesign);
  }
  const shown = $derived(run.mismatch >= 0 ? Math.min(cycles, run.mismatch + 4) : Math.min(cycles, 24));
  const proofTrace = $derived(proof && !proof.ok ? simulate(proofDesign, proof.counterexample.stimulus) : null);
</script>

<Widget title="Hunting a bug" subtitle="This counter has a bug. Random testing drives it and a reference model with the same random inputs and compares their outputs every cycle. Can it find the bug? Then let a proof look.">
  {#snippet controls()}
    <Slider bind:value={cycles} min={10} max={2000} step={10} label="Random cycles" format={(v) => String(v)} />
    <Slider bind:value={pRst} min={0} max={0.5} step={0.01} label="Chance of rst in a cycle" format={(v) => `${(v * 100).toFixed(0)} %`} />
    <Slider bind:value={pEn} min={0.05} max={1} step={0.05} label="Chance of en in a cycle" format={(v) => `${(v * 100).toFixed(0)} %`} />
    <button class="b ui" onclick={() => seed++}>New random seed ({seed})</button>
  {/snippet}
  <div class="result ui" class:found={run.mismatch >= 0} aria-live="polite">
    {#if run.mismatch >= 0}Bug found: in cycle {run.mismatch} the counter shows {run.a.cycles[run.mismatch]!.values.digit} where the reference shows {run.b.cycles[run.mismatch]!.values.digit}.
    {:else}No mismatch in {cycles} random cycles. The tests passed, and the bug is still there.{/if}
  </div>
  <h5 class="ui">Coverage: how often each digit value was reached</h5>
  <div class="bins ui" role="img" aria-label="Coverage bins: {covered} of 10 values seen; corner case reached {run.corner} times">
    {#each run.seen as n, v (v)}
      {#if v < 11}
        <div class="bin" class:hit={n > 0} class:bad={v >= 10 && n > 0}>
          <span class="bar" style:height="{Math.min(100, n ? 12 + Math.log10(n + 1) * 30 : 0)}%"></span>
          <span class="lab">{v}</span>
        </div>
      {/if}
    {/each}
    <div class="corner" class:hit={run.corner > 0}>enabled at 9:<br /><strong>{run.corner}×</strong></div>
  </div>
  <p class="note ui">Values 0–9 covered: {covered} of 10. The bug shows only when the counter is enabled while at 9; to reach 9 at all it needs nine enabled cycles in a row without a reset.</p>
  <Waveform signals={[{ name: 'rst', width: 1 }, { name: 'en', width: 1 }, { name: 'q', width: 4 }, { name: 'tc', width: 1 }]} cycles={run.a.cycles.slice(0, shown).map((c) => c.values)} mark={run.mismatch >= 0 ? run.mismatch : undefined} label="The first cycles of the random test" />
  <div class="proof ui">
    <button class="b go" onclick={doProve}>Prove: assert q &lt;= 9</button>
    {#if proof}
      {#if proof.ok}<span>Proved in all {proof.states} reachable states.</span>
      {:else}<span class="bad">Counterexample after exploring {proof.states} states: {proof.counterexample.stimulus.length} cycles, the shortest possible.</span>{/if}
    {/if}
  </div>
  {#if proofTrace}
    <Waveform signals={[{ name: 'rst', width: 1 }, { name: 'en', width: 1 }, { name: 'q', width: 4 }]} cycles={proofTrace.cycles.map((c) => c.values)} mark={proofTrace.failure?.cycle} label="The counterexample the proof found" />
  {/if}
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.82rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b.go {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .result {
    padding: 0.5rem 0.75rem;
    border-left: 3px solid var(--ok);
    background: var(--ok-soft);
    font-size: 0.88rem;
  }
  .result.found {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  h5 {
    margin: 0.9rem 0 0.3rem;
    font-size: 0.86rem;
  }
  .bins {
    display: flex;
    gap: 4px;
    align-items: flex-end;
    height: 5.5rem;
  }
  .bin {
    flex: 1;
    max-width: 2.6rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    border-bottom: 2px solid var(--line-strong);
  }
  .bar {
    background: var(--line-strong);
    border-radius: 2px 2px 0 0;
  }
  .bin.hit .bar {
    background: var(--series-1);
  }
  .bin.bad .bar {
    background: var(--bad);
  }
  .lab {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-2);
    margin-top: 0.1rem;
  }
  .corner {
    margin-left: 0.8rem;
    font-size: 0.74rem;
    color: var(--bad);
    align-self: center;
  }
  .corner.hit {
    color: var(--ok);
  }
  .note {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.5rem 0 0;
  }
  .proof {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-top: 0.9rem;
    font-size: 0.86rem;
  }
  .bad {
    color: var(--bad);
  }
</style>
