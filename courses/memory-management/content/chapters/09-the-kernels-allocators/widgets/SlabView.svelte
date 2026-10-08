<!--
  A slab cache: one cache per object type; each slab is a page carved into equal objects. Allocation takes from a
  partly full slab first; freeing returns objects to their slab; empty slabs can be reaped back to the page allocator.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { SlabCache } from '$lib/mm/kernel/slab';
  import { rng } from '$lib/mm/util/random';

  let size = $state(600);
  let cache = $state.raw(new SlabCache('inode', 600));
  let tick = $state(0);
  let live: { slab: number; index: number }[] = [];
  const r = rng(9);
  function reset(s = size) {
    size = s;
    cache = new SlabCache('object', s);
    live = [];
    tick++;
  }
  function alloc(n = 1) {
    for (let i = 0; i < n; i++) live.push(cache.alloc());
    tick++;
  }
  function freeSome(n = 1) {
    for (let i = 0; i < n && live.length; i++) {
      const o = live.splice(Math.floor(r() * live.length), 1)[0]!;
      cache.free(o.slab, o.index);
    }
    tick++;
  }
  const slabs = $derived.by(() => {
    void tick;
    return cache.slabs.map((s) => ({ id: s.id, used: [...s.used] }));
  });
  const reaped = $state({ n: 0 });
</script>

<Widget title="A slab cache" kind="Allocator" n="9.2" caption="Each row is one 4 KiB slab carved into objects of one size. The grey tail is the space left over when 4096 is not a multiple of the object size: internal fragmentation, paid once per slab.">
  <div class="ctl ui">
    <label>Object size <select value={size} onchange={(e) => reset(Number((e.target as HTMLSelectElement).value))}>{#each [64, 192, 600, 1000, 1400] as s (s)}<option value={s}>{s} bytes</option>{/each}</select></label>
    <button onclick={() => alloc(1)}>Allocate one</button>
    <button onclick={() => alloc(5)}>Allocate five</button>
    <button onclick={() => freeSome(1)}>Free one</button>
    <button onclick={() => freeSome(5)}>Free five</button>
    <button onclick={() => ((reaped.n += cache.reap()), tick++)}>Reap empty slabs</button>
  </div>
  <p class="meta ui">{cache.perSlab} objects per slab · {cache.waste()} bytes wasted per slab ({((100 * cache.waste()) / 4096).toFixed(1)}%) · slabs given back so far: {reaped.n}</p>
  <div class="slabs">
    {#each slabs as s (s.id)}
      {@const nUsed = s.used.filter(Boolean).length}
      <div class="slab" class:full={nUsed === s.used.length} class:empty={nUsed === 0}>
        <span class="sid mono">slab {s.id} · {nUsed === 0 ? 'empty' : nUsed === s.used.length ? 'full' : 'partial'}</span>
        <div class="objs">
          {#each s.used as u, i (i)}<i class:u style:flex-grow={size}></i>{/each}
          <i class="waste" style:flex-grow={cache.waste()}></i>
        </div>
      </div>
    {:else}
      <p class="none ui">No slabs yet: the first allocation will get a page from the page allocator.</p>
    {/each}
  </div>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .ctl button,
  select {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .meta {
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .slab {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr);
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 4px;
  }
  .sid {
    font-size: 0.7rem;
    color: var(--ink-2);
  }
  .objs {
    display: flex;
    gap: 2px;
    height: 1.4rem;
  }
  .objs i {
    flex-basis: 0;
    border: 1px dashed var(--free);
    border-radius: 2px;
  }
  .objs i.u {
    background: var(--alloc);
    border: 0;
  }
  .objs i.waste {
    background: var(--meta-soft);
    border: 0;
  }
  .none {
    color: var(--mute);
    font-size: 0.85rem;
  }
</style>
