<!--
  How long objects live: each course program runs once with the reachability oracle checking after every
  statement, and each object's lifetime is measured as the number of allocations between its birth and the moment
  it became unreachable. The bars show what share of objects died within 1, 4, 16, 64 and 256 allocations.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Vm } from '$lib/mm/mote/vm';
  import { makeManager } from '$lib/mm/managers/managers';
  import { PROGRAMS } from '$lib/mm/mote/programs';

  const NAMES: Record<string, string> = { churn: 'Short-lived pairs', trees: 'Binary trees', list: 'Build and sum a list', arrays: 'An array of objects' };
  const BINS = [1, 4, 16, 64, 256];
  let program = $state('churn');

  function measure(src: string) {
    const vm = new Vm(src, makeManager('mark-sweep', { trigger: 1 << 30 }), { heapBytes: 1 << 22, sample: 1 });
    vm.run();
    const allocTimes = vm.events.filter((e) => e.kind === 'alloc').map((e) => e.t);
    const allocsBy = (t: number) => {
      let lo = 0;
      let hi = allocTimes.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (allocTimes[m]! <= t) lo = m + 1;
        else hi = m;
      }
      return lo;
    };
    const life = [...vm.objects.values()].map((o) => (o.unreachable === undefined ? Infinity : allocsBy(o.unreachable) - allocsBy(o.born)));
    return { n: life.length, share: BINS.map((b) => life.filter((l) => l <= b).length / life.length) };
  }
  const cache = new Map<string, ReturnType<typeof measure>>();
  const data = $derived.by(() => {
    if (!cache.has(program)) cache.set(program, measure(PROGRAMS[program as keyof typeof PROGRAMS]));
    return cache.get(program)!;
  });
</script>

<Widget title="How long do objects live?" kind="Measure" n="23.1" caption="Share of all the objects a program allocates that become unreachable within a given number of further allocations. Lifetimes are measured by the course’s reachability oracle, which checks after every statement.">
  <div class="cfg ui" role="radiogroup" aria-label="Program">
    {#each Object.keys(NAMES) as p (p)}
      <button role="radio" aria-checked={program === p} class:on={program === p} onclick={() => (program = p)}>{NAMES[p]}</button>
    {/each}
  </div>
  <div class="bars ui">
    {#each BINS as b, i (b)}
      <div class="row">
        <span class="lab">within {b} allocation{b === 1 ? '' : 's'}</span>
        <span class="track"><span class="fill" style:width="{data.share[i]! * 100}%"></span></span>
        <span class="val mono">{Math.round(data.share[i]! * 100)}%</span>
      </div>
    {/each}
  </div>
  <p class="foot ui">{data.n} objects allocated.</p>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.8rem;
  }
  .cfg button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .cfg button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .bars {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.9rem;
  }
  .row {
    display: grid;
    grid-template-columns: 11rem 1fr 3rem;
    gap: 0.7rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .track {
    height: 0.85rem;
    background: var(--line);
    border-radius: 99px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--copper);
    transition: width 0.4s ease;
  }
  .val {
    text-align: right;
  }
  .foot {
    font-size: 0.74rem;
    color: var(--mute);
    margin: 0.5rem 0 0;
  }
</style>
