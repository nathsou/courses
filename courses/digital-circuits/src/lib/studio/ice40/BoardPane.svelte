<!--
  The design running from its bitstream: synth decodes the configuration bits back into the cells they
  configure (logic cells, pads, global buffers) and simulates those, so the LEDs below are lit by the chip as
  configured, not by the source. Switches drive the inputs; step or run the clock.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { RunResult, Synth } from '$lib/synth/api';
  import { tbRun, tbStart, tbStop } from '$lib/synth/api';
  import { busSet, busValue, busesOf, pinsOf, type Bus } from './board';
  import type { Target } from './run';

  let { result, target, flips = [] }: { result: RunResult; target: Target; flips?: [number, number, number][] } = $props();

  let synth: Synth | undefined;
  let id: number | undefined;
  let buses = $state<Bus[]>([]);
  let values = $state<Record<string, number>>({});
  let inputs = $state<Record<string, number>>({});
  let cycle = $state(0);
  let error = $state('');
  let running = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  const outs = $derived(buses.filter((b) => b.dir === 'out'));
  const ins = $derived(buses.filter((b) => b.dir === 'in' && !b.clock));
  const clock = $derived(buses.find((b) => b.clock));

  async function start() {
    const { synthOn } = await import('$lib/synth/client');
    synth ??= synthOn('sim');
    if (id !== undefined) await tbStop(synth, id).catch(() => {});
    id = undefined;
    error = '';
    if (!result.bin || !result.chip) return void (error = 'This run made no bitstream.');
    const s = await tbStart(synth, { bitstream: result.bin, part: target.part, package: target.package, pins: pinsOf(result.chip, target.pcf), flips });
    if (!s.ok) return void (error = s.error);
    id = s.id;
    buses = busesOf(s.ports);
    inputs = {};
    cycle = 0;
    await read([]);
  }

  async function read(ops: Parameters<typeof tbRun>[2]) {
    if (!synth || id === undefined) return;
    const names = buses.filter((b) => b.dir === 'out').flatMap((b) => b.ports.map((p) => p.name));
    const r = await tbRun(synth, id, [...ops, { read: names }]);
    if (!r.ok) return void (error = r.error ?? 'the simulation failed');
    values = r.reads.at(-1)?.values as Record<string, number>;
    cycle = r.cycle;
  }

  const enqueue = (f: () => Promise<unknown>) => (queue = queue.then(f).catch((e) => (error = String(e))));

  function setBus(b: Bus, v: number) {
    inputs = { ...inputs, [b.name]: v };
    void enqueue(() => read([{ set: busSet(b, v) }]));
  }
  function step(n = 1) {
    void enqueue(() => read([{ step: n }]));
  }
  function toggleRun() {
    running = !running;
    clearInterval(timer);
    if (running) timer = setInterval(() => step(1), 250);
  }

  $effect(() => {
    void [result, flips];
    untrack(() => void enqueue(start));
  });
  onDestroy(() => {
    clearInterval(timer);
    if (synth && id !== undefined) void tbStop(synth, id).catch(() => {});
  });
</script>

<div class="board ui">
  {#if error}
    <p class="err">{error}</p>
  {:else}
    <div class="bar">
      {#if clock}
        <button type="button" class="btn primary" onclick={() => step(1)}>Step clock</button>
        <button type="button" class="btn" onclick={toggleRun} aria-pressed={running}>{running ? 'Pause' : 'Run'}</button>
      {/if}
      <button type="button" class="btn" onclick={() => enqueue(start)}>Reset</button>
      <span class="cycle">cycle {cycle}</span>
    </div>
    {#if ins.length}
      <section aria-label="Inputs">
        <h5>Inputs</h5>
        {#each ins as b (b.name)}
          <div class="row">
            <span class="name">{b.name}</span>
            {#each Array.from({ length: b.width }, (_, i) => b.width - 1 - i) as i (i)}
              {@const on = Math.floor((inputs[b.name] ?? 0) / 2 ** i) % 2 === 1}
              <button type="button" class="sw" role="switch" aria-checked={on} aria-label="{b.name}{b.width > 1 ? ` bit ${i}` : ''}" onclick={() => setBus(b, (inputs[b.name] ?? 0) + (on ? -1 : 1) * 2 ** i)}>{on ? 1 : 0}</button>
            {/each}
          </div>
        {/each}
      </section>
    {/if}
    <section aria-label="Outputs">
      <h5>Outputs, from the decoded bitstream</h5>
      {#each outs as b (b.name)}
        {@const v = busValue(b, values)}
        <div class="row">
          <span class="name">{b.name}</span>
          {#each Array.from({ length: b.width }, (_, i) => b.width - 1 - i) as i (i)}
            {@const on = Math.floor(v / 2 ** i) % 2 === 1}
            <span class="led" class:on role="img" aria-label="{b.name}{b.width > 1 ? `[${i}]` : ''} is {on ? 1 : 0}"></span>
          {/each}
          {#if b.width > 1}<span class="val">{v}</span>{/if}
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .board {
    display: grid;
    gap: 0.7rem;
    font-size: 0.84rem;
  }
  .err {
    color: var(--bad);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .btn {
    height: 1.9rem;
    padding: 0 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .cycle {
    font-family: var(--font-mono);
    color: var(--mute);
    font-size: 0.78rem;
  }
  h5 {
    margin: 0 0 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--mute);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.15rem 0;
  }
  .name {
    min-width: 4rem;
    font-family: var(--font-mono);
  }
  .sw {
    width: 1.7rem;
    height: 1.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    font-family: var(--font-mono);
    cursor: pointer;
  }
  .sw[aria-checked='true'] {
    background: var(--copper-soft);
    border-color: var(--accent);
  }
  .led {
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 50%;
    background: var(--surface-2, var(--line));
    border: 1px solid var(--line-strong);
  }
  .led.on {
    background: var(--sig-high);
    box-shadow: 0 0 8px var(--phosphor-glow, var(--sig-high));
  }
  .val {
    font-family: var(--font-mono);
    margin-left: 0.4rem;
  }
</style>
