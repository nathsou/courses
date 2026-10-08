<!--
  Context switches and the TLB: two processes take turns on one core. Without ASIDs the TLB must be flushed at
  every switch (every entry might belong to the other process); with ASIDs, entries are tagged and survive.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Tlb } from '$lib/mm/machine/tlb';

  let quantum = $state(50);
  let hot = $state(4);
  const ENTRIES = 16;

  function run(asid: boolean) {
    const tlb = new Tlb(ENTRIES);
    let misses = 0;
    let n = 0;
    for (let slice = 0; slice < 40; slice++) {
      const proc = (slice % 2) + 1;
      if (!asid) tlb.flush();
      for (let i = 0; i < quantum; i++) {
        const va = 0x10000 + ((i * 7) % hot) * 4096;
        n++;
        if (!tlb.lookup(va, asid ? proc : 0)) {
          misses++;
          tlb.insert(va, asid ? proc : 0, 0, { ppn: proc * 100 + ((i * 7) % hot), flags: 0xdf });
        }
      }
    }
    return { misses, n };
  }
  const flush = $derived(run(false));
  const tagged = $derived(run(true));
  const max = $derived(Math.max(1, flush.misses, tagged.misses));
</script>

<Widget title="Switching address spaces" kind="Interactive" n="4.2" caption="Two processes alternate on one core for 40 time slices, each touching its own few hot pages. A 16-entry TLB. Without address-space identifiers, every switch flushes the TLB; with them, each process’s entries are tagged and survive the other’s turn.">
  <div class="cfg ui">
    <label>Loads per time slice: <strong>{quantum}</strong> <input type="range" min="5" max="400" bind:value={quantum} /></label>
    <label>Hot pages per process: <strong>{hot}</strong> <input type="range" min="1" max="12" bind:value={hot} /></label>
  </div>
  <div class="bars ui">
    <div class="row"><span class="lab">Flush on every switch</span><span class="bar" style:width="{(100 * flush.misses) / max}%"></span><span class="mono">{flush.misses} misses ({((100 * flush.misses) / flush.n).toFixed(1)}%)</span></div>
    <div class="row"><span class="lab">ASID-tagged entries</span><span class="bar t" style:width="{(100 * tagged.misses) / max}%"></span><span class="mono">{tagged.misses} misses ({((100 * tagged.misses) / tagged.n).toFixed(1)}%)</span></div>
  </div>
  <p class="note ui">{hot * 2 > ENTRIES ? 'The two processes’ hot pages no longer fit in the TLB together, so tagging helps less: they evict each other anyway.' : quantum < 30 ? 'Short time slices: flushing hurts most when switches are frequent, which is exactly the case for system calls under page-table isolation.' : 'Both processes’ hot pages fit in the TLB at once, so with ASIDs each switch costs nothing.'}</p>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.6rem;
    font-size: 0.86rem;
  }
  .bars {
    margin-top: 0.9rem;
    display: grid;
    gap: 0.4rem;
    font-size: 0.82rem;
  }
  .row {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr) 11rem;
    gap: 0.6rem;
    align-items: center;
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .bar {
    height: 0.9rem;
    background: var(--red);
    border-radius: 2px;
    transition: width 200ms;
  }
  .bar.t {
    background: var(--green);
  }
  .note {
    font-size: 0.86rem;
    color: var(--ink-2);
    margin: 0.8rem 0 0;
  }
</style>
