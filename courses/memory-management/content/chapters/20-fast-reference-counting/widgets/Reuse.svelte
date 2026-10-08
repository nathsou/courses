<!--
  Reuse (Perceus, Lean): a functional map over a list, `map(xs, x => x + 1)`, which builds a new list. When a cell
  of the old list has a count of exactly one, nobody else can see it, so the new cell can be written into the old
  one's memory: no allocation, no free. If someone else holds the list, nothing can be reused, and the map copies.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { hex } from '$lib/mm/util/format';

  const N = 6;
  const BASE = 0x10_0040;
  let reuse = $state(true);
  let shared = $state(false);
  let step = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  interface Cell {
    addr: number;
    value: number;
    count: number;
    state: 'old' | 'new' | 'reused' | 'freed';
  }
  /** The two lists after `k` cells of the map have been processed. */
  const view = $derived.by(() => {
    const k = step;
    const old: Cell[] = Array.from({ length: N }, (_, i) => ({ addr: BASE + i * 0x20, value: i * 10, count: i === 0 && shared ? 2 : 1, state: 'old' }));
    const out: Cell[] = [];
    let allocs = 0;
    let frees = 0;
    let next = BASE + N * 0x20 + 0x40;
    for (let i = 0; i < k; i++) {
      const c = old[i]!;
      // Copying a shared cell duplicates its pointers, so the rest of the list becomes shared too.
      const unique = !shared;
      if (unique && reuse) {
        c.state = 'reused';
        out.push({ addr: c.addr, value: c.value + 1, count: 1, state: 'reused' });
      } else {
        allocs++;
        out.push({ addr: next, value: c.value + 1, count: 1, state: 'new' });
        next += 0x20;
        if (unique) {
          c.state = 'freed';
          frees++;
        }
      }
    }
    return { old, out, allocs, frees };
  });

  function play() {
    clearInterval(timer);
    step = 0;
    timer = setInterval(() => {
      if (step >= N) clearInterval(timer);
      else step++;
    }, 450);
  }
  $effect(() => {
    void reuse;
    void shared;
    clearInterval(timer);
    step = N;
  });
  $effect(() => () => clearInterval(timer));
</script>

<Widget title="Functional, but in place" kind="Reuse" n="20.2" caption="<code>map(xs, x =&gt; x + 1)</code> on a six-element list. Each cell shows its address, its value and, in the corner, its reference count. Reused cells keep their address; new cells get a fresh one.">
  <div class="cfg ui">
    <label><input type="checkbox" bind:checked={reuse} /> Reuse cells whose count is one</label>
    <label><input type="checkbox" bind:checked={shared} /> Another variable also holds the list</label>
    <button onclick={play}>▶ Run the map</button>
  </div>
  <div class="lists">
    <div class="lbl ui">xs</div>
    <div class="row">
      {#each view.old as c (c.addr)}
        <div class="cell {c.state}"><span class="a mono">{hex(c.addr)}</span><span class="v mono">{c.state === 'reused' ? '→' : c.value}</span>{#if c.state === 'old'}<span class="cnt">{c.count}</span>{/if}</div>
      {/each}
    </div>
    <div class="lbl ui">map(xs, x =&gt; x + 1)</div>
    <div class="row">
      {#each view.out as c (c.addr)}
        <div class="cell {c.state}"><span class="a mono">{hex(c.addr)}</span><span class="v mono">{c.value}</span><span class="cnt">{c.count}</span></div>
      {/each}
      {#each Array(N - view.out.length) as _, i (i)}<div class="cell empty"></div>{/each}
    </div>
  </div>
  <p class="sum ui">
    <strong>{view.allocs}</strong> allocation{view.allocs === 1 ? '' : 's'}, <strong>{view.frees}</strong> free{view.frees === 1 ? '' : 's'}.
    {#if shared}The first cell has a count of two, so it cannot be overwritten; copying it gives the rest of the list a second owner too, so nothing can be reused, and the old list stays alive for its other owner.
    {:else if reuse}Every cell had a count of one: nobody else could see the old value, so the new cell was written into the old one’s memory.
    {:else}The map builds a whole new list, and the old one is freed as it goes: twice the allocator traffic for the same result.{/if}
  </p>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.2rem;
    align-items: center;
    font-size: 0.84rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--copper);
    background: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
    border-radius: 99px;
    padding: 0.2rem 0.8rem;
    cursor: pointer;
  }
  .lists {
    margin-top: 0.9rem;
  }
  .lbl {
    font-size: 0.72rem;
    color: var(--ink-2);
    margin: 0.5rem 0 0.25rem;
    font-family: var(--font-mono);
  }
  .row {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.4rem;
  }
  .cell {
    position: relative;
    border: 1.5px solid var(--alloc);
    border-radius: 6px;
    padding: 0.3rem 0.4rem;
    min-height: 2.8rem;
    display: grid;
    background: color-mix(in srgb, var(--alloc) 10%, var(--panel));
    transition: all 0.3s;
  }
  .cell .a {
    font-size: 0.64rem;
    color: var(--ink-2);
  }
  .cell .v {
    font-size: 0.95rem;
    font-weight: 700;
  }
  .cnt {
    position: absolute;
    top: -0.5rem;
    right: -0.4rem;
    background: var(--copper);
    color: var(--on-accent);
    border-radius: 99px;
    font-size: 0.68rem;
    font-weight: 700;
    min-width: 1.1rem;
    text-align: center;
    padding: 0 0.2rem;
  }
  .cell.reused {
    border-color: var(--green);
    background: color-mix(in srgb, var(--green) 14%, var(--panel));
  }
  .cell.new {
    border-color: var(--copper);
  }
  .cell.freed {
    border-style: dashed;
    border-color: var(--free);
    background: transparent;
    opacity: 0.5;
  }
  .cell.empty {
    border: 1px dashed var(--line);
    background: transparent;
  }
  .sum {
    font-size: 0.86rem;
    margin: 0.9rem 0 0;
  }
</style>
