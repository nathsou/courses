<!--
  Conservative roots: the same program under a precise collector and a conservative one. The program builds a
  list of thirty readings, drops it and collects. Its integer `checksum` is just a number, but the conservative
  collector cannot tell a number from a pointer: if the number happens to fall inside an object, that object, and
  everything it points to, survives.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Vm } from '$lib/mm/mote/vm';
  import { makeManager } from '$lib/mm/managers/managers';
  import { hex } from '$lib/mm/util/format';

  const prog = (seed: number) => `struct Reading { sensor: int, value: int, next: Reading? }

fn main() {
  var checksum = ${seed}
  var log: Reading? = null
  for i in 0..30 {
    log = new Reading { sensor: i, value: i * 7, next: log }
  }
  log = null
  gc()
  print("checksum", checksum)
}`;

  let seed = $state(12345);
  const PRESETS: [string, number][] = [
    ['an ordinary number', 12345],
    ['the address of reading #13', 1049440],
    ['an address inside reading #20', 1049912],
  ];

  function run(s: 'mark-sweep' | 'conservative', value: number) {
    const vm = new Vm(prog(value), makeManager(s, { trigger: 1 << 30 }));
    vm.run();
    return { vm, objs: [...vm.objects.values()] };
  }
  const precise = $derived(run('mark-sweep', seed));
  const cons = $derived(run('conservative', seed));
  const hit = $derived(cons.objs.find((o) => seed >= o.addr && seed < o.addr + o.words * 8));
  const retained = $derived(cons.objs.filter((o) => o.freed === undefined));
  const lo = $derived(Math.min(...cons.objs.map((o) => o.addr)));
  const hi = $derived(Math.max(...cons.objs.map((o) => o.addr + o.words * 8)));
</script>

<Widget title="A number that looks like a pointer" kind="Simulation" n="24.2" caption="Each square is one of the thirty readings, in address order. After <code>log = null</code> and <code>gc()</code>, a precise collector frees all of them. A conservative collector scans the stack word by word, and keeps alive anything a word points into.">
  <pre class="code mono">{prog(seed).split('\n').slice(3, 4).join('')}</pre>
  <div class="cfg ui">
    <label>checksum = <input type="number" bind:value={seed} class="mono" /></label>
    {#each PRESETS as [label, v] (v)}
      <button class:on={seed === v} onclick={() => (seed = v)}>{label}</button>
    {/each}
  </div>
  <p class="range ui">The readings occupy addresses <span class="mono">{hex(lo)}</span> to <span class="mono">{hex(hi)}</span> ({lo} to {hi}). The checksum is <span class="mono">{hex(seed)}</span>: {hit ? `inside reading #${hit.id}.` : 'not inside any object.'}</p>
  {#each [['Precise collector', precise], ['Conservative collector', cons]] as [label, r] (label)}
    {@const res = r as typeof precise}
    <div class="lbl ui">{label}: {res.objs.filter((o) => o.freed === undefined).length} of 30 survive</div>
    <div class="row">
      {#each res.objs as o (o.id)}
        <span class="cell" class:alive={o.freed === undefined} class:hit={label !== 'Precise collector' && hit?.id === o.id} title="reading #{o.id} at {hex(o.addr)}">{o.id}</span>
      {/each}
    </div>
  {/each}
  <p class="verdict ui" class:bad={retained.length > 0}>
    {#if retained.length}One integer kept {retained.length} reading{retained.length === 1 ? '' : 's'} alive: reading #{hit?.id}, and every reading its <code>next</code> pointer leads to. That is <strong>false retention</strong>.
    {:else}No word on the stack points into a reading, so both collectors free all thirty.{/if}
  </p>
</Widget>

<style>
  .code {
    font-size: 0.78rem;
    margin: 0 0 0.5rem;
    padding: 0.3rem 0.6rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.8rem;
  }
  .cfg input {
    width: 8rem;
    font-size: 0.8rem;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
  }
  .cfg button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.65rem;
    cursor: pointer;
  }
  .cfg button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
  }
  .range {
    font-size: 0.82rem;
  }
  .lbl {
    font-size: 0.74rem;
    color: var(--ink-2);
    margin: 0.6rem 0 0.25rem;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(30, minmax(0, 1fr));
    gap: 2px;
  }
  .cell {
    font-size: 0.6rem;
    text-align: center;
    padding: 0.25rem 0;
    border: 1px dashed var(--free);
    border-radius: 3px;
    color: var(--mute);
    font-family: var(--font-mono);
  }
  .cell.alive {
    border: 1px solid var(--alloc);
    background: color-mix(in srgb, var(--alloc) 25%, var(--panel));
    color: var(--fg);
  }
  .cell.hit {
    border-color: var(--uaf);
    background: color-mix(in srgb, var(--uaf) 30%, var(--panel));
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.7rem 0 0;
  }
  .verdict.bad {
    color: var(--leak);
  }
</style>
