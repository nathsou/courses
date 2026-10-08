<!--
  Generations: a Mote program runs under the generational collector (a copying nursery, promoting survivors to a
  mark–sweep old generation). The chart shows the nursery filling and emptying at each minor collection (the
  sawtooth) and the old generation growing as survivors are promoted. The write barrier can be switched off: then
  a minor collection frees a young object that only an old object points to, and the oracle catches it.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Vm } from '$lib/mm/mote/vm';
  import { GenerationalManager } from '$lib/mm/managers/managers';
  import { bytes } from '$lib/mm/util/format';

  let { code, n = '23.2' }: { code: string; n?: string } = $props();

  let barrier = $state(true);
  let nursery = $state(2048);

  const run = $derived.by(() => {
    const m = new GenerationalManager({ nurseryBytes: nursery, barrier });
    const vm = new Vm(code, m, { heapBytes: 1 << 18 });
    const samples: { t: number; young: number; old: number }[] = [];
    const sample = () => {
      let old = 0;
      for (const [a, id] of vm.byAddr) if (!m.young(a)) old += vm.objects.get(id)!.words * 8;
      samples.push({ t: vm.time, young: m.top - m.nurseryStart, old });
    };
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    sample();
    let guard = 0;
    while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 20000) {
      vm.stepStatement();
      sample();
    }
    const gcs = vm.events.filter((e) => e.kind === 'gc') as { t: number; label: string }[];
    const note = vm.events.find((e) => e.kind === 'note') as { text: string; t: number } | undefined;
    return { m, vm, samples, gcs, note };
  });

  const W = 600;
  const H = 180;
  const end = $derived(Math.max(1, run.vm.time));
  const maxY = $derived(Math.max(nursery, ...run.samples.map((s) => s.old)) * 1.1);
  const x = (t: number) => (t / end) * W;
  const y = (v: number) => H - (v / maxY) * H;
  function path(key: 'young' | 'old') {
    const pts = run.samples;
    const step = Math.max(1, Math.floor(pts.length / 800));
    let d = '';
    for (let i = 0; i < pts.length; i += step) d += `${d ? 'L' : 'M'}${x(pts[i]!.t).toFixed(1)},${y(pts[i]![key]).toFixed(1)}`;
    const last = pts[pts.length - 1]!;
    return `${d}L${x(last.t).toFixed(1)},${y(last[key]).toFixed(1)}`;
  }
  const minors = $derived(run.gcs.filter((g) => g.label === 'minor'));
  const majors = $derived(run.gcs.filter((g) => g.label === 'major'));
</script>

<Widget title="Generations at work" kind="Simulation" {n} caption="Copper: bytes in the nursery, which fills with new objects and empties at every minor collection (the ticks below). Blue: bytes in the old generation, which grows as survivors are promoted.">
  <div class="grid">
    <div><CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="20rem" label="The program" highlightLine={run.vm.status === 'error' ? run.vm.error?.pos?.line : undefined} /></div>
    <div>
      <div class="cfg ui">
        <label><input type="checkbox" bind:checked={barrier} /> Write barrier</label>
        <span class="sizes" role="radiogroup" aria-label="Nursery size">
          Nursery
          {#each [1024, 2048, 4096] as s (s)}
            <button role="radio" aria-checked={nursery === s} class:on={nursery === s} onclick={() => (nursery = s)}>{bytes(s)}</button>
          {/each}
        </span>
      </div>
      <svg viewBox="0 -8 {W} {H + 30}" class="chart" role="img" aria-label="Nursery and old generation over time; {minors.length} minor collections">
        <line x1="0" x2={W} y1={y(nursery)} y2={y(nursery)} class="cap" />
        <text x={W - 4} y={y(nursery) - 4} text-anchor="end" class="lab">nursery size</text>
        <path d={path('old')} class="old" />
        <path d={path('young')} class="young" />
        {#each minors as g, i (i)}<line x1={x(g.t)} x2={x(g.t)} y1={H + 4} y2={H + 12} class="minor" />{/each}
        {#each majors as g, i (i)}<line x1={x(g.t)} x2={x(g.t)} y1={H + 2} y2={H + 20} class="major" />{/each}
        {#if run.vm.status === 'error'}<line x1={x(run.vm.time)} x2={x(run.vm.time)} y1="0" y2={H} class="err" />{/if}
        <text x="0" y={H + 28} class="lab">start</text>
        <text x={W} y={H + 28} text-anchor="end" class="lab">{run.vm.status === 'error' ? 'stopped' : 'end'}</text>
      </svg>
      <dl class="stats ui">
        <dt>Minor collections</dt><dd>{run.m.stats.minor}</dd>
        <dt>Major collections</dt><dd>{run.m.stats.major}</dd>
        <dt>Objects promoted</dt><dd>{run.m.promoted}</dd>
        <dt>Barrier executions</dt><dd>{run.m.stats.barriers.toLocaleString('en-GB')}</dd>
      </dl>
      <p class="status ui" class:bad={run.vm.status === 'error' || run.m.lost.length > 0}>
        {#if run.m.lost.length}✗ A minor collection freed objects that were still reachable from the old generation: nothing told it that an old object pointed into the nursery. {run.vm.error ? `The program then crashed: ${run.vm.error.message}` : ''}
        {:else if run.vm.status === 'error'}✗ {run.vm.error?.message}
        {:else}✓ Finished: {run.vm.output.join(' ')}. Every object the program could reach survived.{/if}
      </p>
    </div>
  </div>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 1rem;
  }
  @media (max-width: 800px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .sizes {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .sizes button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.1rem 0.6rem;
    cursor: pointer;
  }
  .sizes button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .chart {
    width: 100%;
    margin-top: 0.6rem;
    font-family: var(--font-ui);
  }
  .young {
    fill: none;
    stroke: var(--copper);
    stroke-width: 1.5;
  }
  .old {
    fill: none;
    stroke: var(--alloc);
    stroke-width: 2.2;
  }
  .cap {
    stroke: var(--line-strong);
    stroke-dasharray: 4 3;
  }
  .minor {
    stroke: var(--copper);
  }
  .major {
    stroke: var(--violet);
    stroke-width: 2;
  }
  .err {
    stroke: var(--uaf);
    stroke-width: 2;
  }
  .lab {
    font-size: 10px;
    fill: var(--mute);
  }
  .stats {
    display: grid;
    grid-template-columns: auto auto auto auto;
    gap: 0.2rem 0.8rem;
    font-size: 0.8rem;
    margin: 0.4rem 0 0;
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    margin: 0;
    font-family: var(--font-mono);
  }
  .status {
    font-size: 0.84rem;
    margin: 0.6rem 0 0;
  }
  .status.bad {
    color: var(--uaf);
  }
</style>
