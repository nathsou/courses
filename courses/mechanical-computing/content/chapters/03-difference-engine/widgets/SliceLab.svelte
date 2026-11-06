<!-- A slice of Difference Engine No. 2 in 3D, tabulating x² + x + 41. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { DESlice, differenceEngineModel } from '$lib/models/differenceEngine';
  import { evalPoly, POLYS, staggeredColumns } from '$lib/mech/difference';

  const p = POLYS.euler!.p;
  const model = differenceEngineModel();
  const slice = new DESlice(staggeredColumns(p));
  let tick = $state(0);
  let speed = $state(1);
  let mv: { wake(): void } | undefined = $state();
  $effect(() => {
    slice.speed = speed;
  });
  function animate(dt: number) {
    const m = slice.update(dt);
    tick++;
    return m;
  }
  function cycle(n: number) {
    for (let i = 0; i < n; i++) slice.cycle();
    tick++;
    mv?.wake();
  }
  function reset() {
    slice.set(staggeredColumns(p));
    tick++;
    mv?.wake();
  }
  const vals = $derived((tick, slice.values()));
  const printed = $derived((tick, [...slice.printed]));
  const phase = $derived((tick, slice.phaseName));
</script>

<Widget title="Difference Engine No. 2, a slice" subtitle="Three columns of five figure wheels, set up for x² + x + 41. Each turn of the handle makes one cycle: two half-cycles of additions, each followed by its carries." onreset={reset}>
  {#snippet controls()}
    <button class="go" onclick={() => cycle(1)}>One cycle</button>
    <button onclick={() => cycle(5)}>Five cycles</button>
    <label>Speed <select bind:value={speed}><option value={0.4}>slow</option><option value={1}>normal</option><option value={3}>fast</option></select></label>
  {/snippet}
  <MachineView bind:this={mv} {model} data={slice} {animate} label="Three columns of figure wheels with carry warnings and spiral carry shafts" height="22rem">
    {#snippet readout()}
      <div class="ro">
        <div class="cols">
          {#each vals as v, c (c)}<div><span class="lab">{['Column 0: value', 'Column 1: first difference', 'Column 2: second difference'][c]}</span><strong class="num">{String(v).padStart(5, '0')}</strong></div>{/each}
        </div>
        <p class="phase">{phase === 'idle' ? 'At rest.' : `Now: ${phase}.`}</p>
        {#if printed.length}
          <p class="printed">Printed: {#each printed as v, i (i)}<span class="num" class:bad={v !== evalPoly(p, BigInt(i + 1))}>{String(v)}</span>{i < printed.length - 1 ? ', ' : ''}{/each}</p>
        {/if}
      </div>
    {/snippet}
  </MachineView>
</Widget>

<style>
  button,
  select {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
    font: inherit;
    font-size: 0.86rem;
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.86rem;
  }
  .cols {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.4rem;
  }
  .cols div {
    display: flex;
    flex-direction: column;
  }
  .lab {
    font-size: 0.7rem;
    color: var(--ink-3);
  }
  .cols strong {
    font-family: var(--font-mono);
    font-size: 1.1rem;
  }
  .phase,
  .printed {
    margin: 0.4rem 0 0;
    font-size: 0.84rem;
  }
  .bad {
    color: var(--bad);
  }
</style>
