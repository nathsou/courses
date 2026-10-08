<!--
  Contention: simulated threads, each doing allocation work and other work. With one heap behind one lock, a
  thread that wants the lock while another holds it waits (red). With thread caches, most allocations are served
  from the thread's own cache without the lock; only refills and flushes take it.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { rng } from '$lib/mm/util/random';

  let threads = $state(4);
  let allocShare = $state(40);
  let cached = $state(false);
  const STEPS = 120;
  const LOCK_TIME = 3;

  type Cell = 'work' | 'alloc' | 'wait' | 'local';
  function simulate(n: number, share: number, tc: boolean) {
    const r = rng(7);
    const lanes: Cell[][] = Array.from({ length: n }, () => []);
    const busyUntil: number[] = Array(n).fill(0);
    const state: ('free' | 'want' | 'hold' | 'work' | 'local')[] = Array(n).fill('free');
    let lockFree = 0;
    let holder = -1;
    let done = 0;
    const cacheLeft: number[] = Array(n).fill(0);
    for (let t = 0; t < STEPS; t++) {
      for (let i = 0; i < n; i++) {
        if (state[i] === 'free' || (busyUntil[i]! <= t && (state[i] === 'work' || state[i] === 'local'))) {
          if (state[i] === 'work' || state[i] === 'local') done++;
          // Decide the next task.
          if (r() * 100 < share) {
            if (tc && cacheLeft[i]! > 0) {
              cacheLeft[i]!--;
              state[i] = 'local';
              busyUntil[i] = t + 1;
            } else state[i] = 'want';
          } else {
            state[i] = 'work';
            busyUntil[i] = t + 2;
          }
        }
        if (state[i] === 'want' && lockFree <= t && holder === -1) {
          holder = i;
          state[i] = 'hold';
          busyUntil[i] = t + LOCK_TIME;
          lockFree = t + LOCK_TIME;
        }
        const cell: Cell = state[i] === 'want' ? 'wait' : state[i] === 'hold' ? 'alloc' : state[i] === 'local' ? 'local' : 'work';
        lanes[i]!.push(cell);
        if (state[i] === 'hold' && busyUntil[i]! <= t + 1) {
          state[i] = 'free';
          holder = -1;
          done++;
          if (tc) cacheLeft[i] = 8; // a refill brings a batch of blocks
        }
      }
    }
    const waits = lanes.flat().filter((c) => c === 'wait').length;
    return { lanes, done, waitShare: waits / (n * STEPS) };
  }
  const sim = $derived(simulate(threads, allocShare, cached));
  const base1 = $derived(simulate(1, allocShare, cached).done);
</script>

<Widget title="One lock, many threads" kind="Simulation" n="12.1" caption="Each lane is a thread, each column a moment. Blue: other work. Copper: inside the allocator, holding the heap’s lock. Red: waiting for the lock. Green: an allocation served from the thread’s own cache, no lock needed.">
  <div class="cfg ui">
    <label>Threads <strong>{threads}</strong> <input type="range" min="1" max="8" bind:value={threads} /></label>
    <label>Time spent allocating <strong>{allocShare}%</strong> <input type="range" min="5" max="80" bind:value={allocShare} /></label>
    <label class="tc"><input type="checkbox" bind:checked={cached} /> Thread caches</label>
  </div>
  <div class="lanes" role="img" aria-label="{threads} threads; {Math.round(sim.waitShare * 100)}% of all time spent waiting for the lock">
    {#each sim.lanes as lane, i (i)}
      <div class="lane"><span class="ln mono">T{i + 1}</span>{#each lane as c, t (t)}<i class={c}></i>{/each}</div>
    {/each}
  </div>
  <p class="out ui">Work completed: <strong>{sim.done}</strong> tasks ({(sim.done / Math.max(1, base1)).toFixed(1)}× one thread) · time spent waiting: <strong>{Math.round(sim.waitShare * 100)}%</strong></p>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.4rem;
    font-size: 0.84rem;
    align-items: center;
  }
  .lanes {
    margin-top: 0.8rem;
    display: grid;
    gap: 3px;
  }
  .lane {
    display: flex;
    gap: 1px;
    align-items: center;
  }
  .ln {
    width: 1.8rem;
    font-size: 0.68rem;
    color: var(--mute);
  }
  .lane i {
    flex: 1;
    height: 0.9rem;
  }
  i.work {
    background: var(--alloc-soft);
  }
  i.alloc {
    background: var(--copper);
  }
  i.wait {
    background: var(--red);
  }
  i.local {
    background: var(--green);
  }
  .out {
    font-size: 0.86rem;
    margin: 0.7rem 0 0;
  }
</style>
