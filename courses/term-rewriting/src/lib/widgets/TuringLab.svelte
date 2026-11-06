<script lang="ts">
  /** A Turing machine compiled into rewrite rules, run one rewrite step at a time. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { tmRules, tmStart, readConfig, BUSY_BEAVER_2, BUSY_BEAVER_3, type TuringMachine } from '$lib/trs/machines';
  import { normalize, system } from '$lib/trs/rewrite';
  import { showRule } from '$lib/trs/parse';

  const MACHINES: Record<string, TuringMachine> = { 'Busy beaver, 2 states': BUSY_BEAVER_2, 'Busy beaver, 3 states': BUSY_BEAVER_3 };
  let name = $state('Busy beaver, 2 states');
  let k = $state(0);
  const tm = $derived(MACHINES[name]!);
  const R = $derived(tmRules(tm));
  const run = $derived(normalize(system(R), tmStart(tm), { fuel: 200 }));
  const configs = $derived([tmStart(tm), ...run.steps.map((s) => s.after)]);
  $effect(() => {
    void name;
    k = 0;
  });
  const conf = $derived(readConfig(configs[k]!));
</script>

<Widget title="A Turing machine as rewrite rules" subtitle="Configurations are terms Q_state(left, right). Each transition of the machine becomes one or a few rules; one rewrite step is one machine step.">
  <div class="w-row">
    <label>Machine <select class="w-input" bind:value={name}>{#each Object.keys(MACHINES) as m (m)}<option>{m}</option>{/each}</select></label>
    <button class="w-btn" onclick={() => (k = 0)} disabled={k === 0}>⏮</button>
    <button class="w-btn" onclick={() => k--} disabled={k === 0}>◀</button>
    <button class="w-btn primary" onclick={() => k++} disabled={k >= configs.length - 1}>Step ▶</button>
    <button class="w-btn" onclick={() => (k = configs.length - 1)} disabled={k >= configs.length - 1}>⏭</button>
  </div>
  <p class="tape w-code">{conf.tape}</p>
  <p class="w-note">Step {k} of {configs.length - 1} · state {conf.state} · {conf.nonBlank} ones on the tape{k === configs.length - 1 ? ' · halted (a normal form)' : ''}</p>
  <details>
    <summary class="w-note">The {R.length} rewrite rules</summary>
    <ol class="rules">{#each R as r, i (i)}<li class="w-code">{showRule(r)}</li>{/each}</ol>
  </details>
</Widget>

<style>
  .tape {
    font-size: 1.1rem;
    letter-spacing: 0.2em;
    padding: 0.4rem 0.6rem;
    background: var(--pn);
    border-radius: var(--radius-sm);
    margin: 0.4rem 0;
  }
  .rules {
    font-size: 0.76rem;
    max-height: 14rem;
    overflow-y: auto;
    padding-left: 2rem;
  }
  summary {
    cursor: pointer;
  }
</style>
