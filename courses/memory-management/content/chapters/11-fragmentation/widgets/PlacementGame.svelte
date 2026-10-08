<!--
  The placement game: be the allocator. Requests arrive one at a time; click where each block goes (or let a
  policy decide). Frees happen on their own. The game ends when a request fits in no hole, however much memory
  is free in total. Then first fit, next fit and best fit replay the same stream.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { rng } from '$lib/mm/util/random';
  import { progress } from '$lib/state/progress.svelte';

  const UNITS = 48;
  type Op = { k: 'a'; id: number; size: number } | { k: 'f'; id: number };
  type Policy = 'first' | 'next' | 'best' | 'worst';

  /** Each level is a seeded request stream, chosen (by simulation) so that the policies disagree. */
  const LEVELS: Record<number, { seed: number; sizes: number[]; target: number; pfree: number; smallFree: boolean }> = {
    1: { seed: 103, sizes: [2, 3, 4, 5], target: 0.75, pfree: 0.38, smallFree: false },
    2: { seed: 101, sizes: [1, 2, 6, 8], target: 0.8, pfree: 0.35, smallFree: true },
    3: { seed: 104, sizes: [3, 5, 7, 9], target: 0.8, pfree: 0.35, smallFree: false },
  };
  function level(n: number): Op[] {
    const cfg = LEVELS[n]!;
    const r = rng(cfg.seed);
    const ops: Op[] = [];
    const live: { id: number; size: number }[] = [];
    let used = 0;
    let id = 1;
    for (let i = 0; i < 90; i++) {
      if (live.length && (used / UNITS > cfg.target || r() < cfg.pfree)) {
        // Level 2 frees small blocks by preference: it leaves small holes everywhere.
        const pickFrom = cfg.smallFree ? live.filter((b) => b.size <= 2) : live;
        const pool = pickFrom.length ? pickFrom : live;
        const b = pool[Math.floor(r() * pool.length)]!;
        live.splice(live.indexOf(b), 1);
        used -= b.size;
        ops.push({ k: 'f', id: b.id });
      } else {
        const size = cfg.sizes[Math.floor(r() * cfg.sizes.length)]!;
        ops.push({ k: 'a', id, size });
        live.push({ id: id++, size });
        used += size;
      }
    }
    return ops;
  }

  /** Replay a stream with a policy; returns how many allocations succeeded before the first failure. */
  function replay(ops: Op[], policy: Policy) {
    const cells: number[] = Array(UNITS).fill(0);
    let rover = 0;
    let placed = 0;
    for (const o of ops) {
      if (o.k === 'f') {
        for (let i = 0; i < UNITS; i++) if (cells[i] === o.id) cells[i] = 0;
        continue;
      }
      const at = choose(cells, o.size, policy, rover);
      if (at < 0) return { placed, cells, failed: o };
      for (let i = 0; i < o.size; i++) cells[at + i] = o.id;
      rover = at + o.size;
      placed++;
    }
    return { placed, cells, failed: undefined };
  }
  function holes(cells: number[]): { at: number; size: number }[] {
    const out: { at: number; size: number }[] = [];
    for (let i = 0; i < cells.length; ) {
      if (cells[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < cells.length && !cells[j]) j++;
      out.push({ at: i, size: j - i });
      i = j;
    }
    return out;
  }
  function choose(cells: number[], size: number, policy: Policy, rover: number): number {
    const hs = holes(cells).filter((h) => h.size >= size);
    if (!hs.length) return -1;
    if (policy === 'first') return hs[0]!.at;
    if (policy === 'next') {
      // Continue from where the last search stopped, wrapping around.
      for (let k = 0; k < cells.length; k++) {
        const p = (rover + k) % cells.length;
        if (p + size <= cells.length && cells.slice(p, p + size).every((c) => !c)) return p;
      }
      return -1;
    }
    if (policy === 'best') return hs.reduce((a, b) => (b.size < a.size ? b : a)).at;
    return hs.reduce((a, b) => (b.size > a.size ? b : a)).at;
  }

  let lv = $state(1);
  let ops = $state(level(1));
  let step = $state(0);
  let cells = $state<number[]>(Array(UNITS).fill(0));
  let placedCount = $state(0);
  let over = $state<string | null>(null);
  let hoverAt = $state<number | null>(null);
  let cursor = $state(0);
  let best = $state<Record<number, number>>({});

  function advanceFrees() {
    while (step < ops.length && ops[step]!.k === 'f') {
      const id = ops[step]!.id;
      cells = cells.map((c) => (c === id ? 0 : c));
      step++;
    }
    if (step >= ops.length) {
      over = 'You placed every request. A perfect run.';
      finish();
      return;
    }
    const cur = ops[step] as { size: number };
    if (!holes(cells).some((h) => h.size >= cur.size)) {
      const free = cells.filter((c) => !c).length;
      over = `Game over: a block of ${cur.size} units does not fit in any hole, although ${free} units are free. That is external fragmentation.`;
      finish();
    }
  }
  function finish() {
    best = { ...best, [lv]: Math.max(best[lv] ?? 0, placedCount) };
    if (placedCount >= results.best.placed) progress.markSolved(`fragmentation/game-${lv}`);
  }
  function start(n: number) {
    lv = n;
    ops = level(n);
    step = 0;
    cells = Array(UNITS).fill(0);
    placedCount = 0;
    over = null;
    advanceFrees();
  }

  const current = $derived(!over && step < ops.length ? (ops[step] as { k: 'a'; id: number; size: number }) : null);
  function fits(at: number): boolean {
    if (!current || at < 0 || at + current.size > UNITS) return false;
    for (let i = 0; i < current.size; i++) if (cells[at + i]) return false;
    return true;
  }
  function place(at: number) {
    if (!current || !fits(at)) return;
    const c = [...cells];
    for (let i = 0; i < current.size; i++) c[at + i] = current.id;
    cells = c;
    placedCount++;
    step++;
    advanceFrees();
  }
  function auto(p: Policy) {
    if (!current) return;
    place(choose(cells, current.size, p, 0));
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') cursor = Math.min(UNITS - 1, cursor + 1);
    else if (e.key === 'ArrowLeft') cursor = Math.max(0, cursor - 1);
    else if (e.key === 'Enter' || e.key === ' ') place(cursor);
    else return;
    hoverAt = cursor;
    e.preventDefault();
  }

  const results = $derived({
    first: replay(ops, 'first'),
    next: replay(ops, 'next'),
    best: replay(ops, 'best'),
    worst: replay(ops, 'worst'),
  });
  const totalAllocs = $derived(ops.filter((o) => o.k === 'a').length);
  const hs = $derived(holes(cells));
  const freeUnits = $derived(cells.filter((c) => !c).length);
  const largest = $derived(Math.max(0, ...hs.map((h) => h.size)));
  const ghost = $derived(hoverAt !== null && current ? { at: hoverAt, ok: fits(hoverAt) } : null);
  const color = (id: number) => `var(--series-${(id % 7) + 1})`;
  const upcoming = $derived(ops.slice(step, step + 6));
  start(1);
</script>

<Widget title="The placement game" kind="Game" n="11.1" caption="A heap of 48 units. Requests arrive one at a time: click where each block should start (or use the arrow keys and Enter). Blocks are freed by the program at times you cannot control. You lose when a request fits in no hole. The three policies then replay exactly the same stream.">
  <div class="lv ui">
    {#each [1, 2, 3] as n (n)}<button class:on={lv === n} onclick={() => start(n)}>Level {n}{best[n] ? ` · best ${best[n]}` : ''}</button>{/each}
  </div>
  <div class="now ui" aria-live="polite">
    {#if current}
      <span>Place a block of <strong>{current.size}</strong> unit{current.size > 1 ? 's' : ''} (#{current.id})</span>
      <span class="auto">or let a policy choose: <button onclick={() => auto('first')}>first fit</button><button onclick={() => auto('best')}>best fit</button><button onclick={() => auto('worst')}>worst fit</button></span>
    {:else if over}
      <span class="over">{over}</span>
    {/if}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="heap" tabindex="0" role="application" aria-label="The heap: arrow keys move, Enter places the block" onkeydown={onKey} onmouseleave={() => (hoverAt = null)}>
    {#each cells as c, i (i)}
      {@const inGhost = ghost && i >= ghost.at && i < ghost.at + (current?.size ?? 0)}
      <button class="cell" class:used={c > 0} class:ghost={inGhost && ghost?.ok} class:bad={inGhost && !ghost?.ok} class:cur={hoverAt === i} style:--c={c ? color(c) : undefined} onmouseenter={() => (hoverAt = i)} onclick={() => place(i)} tabindex="-1" aria-label="unit {i}{c ? `, used by #${c}` : ', free'}">{c && cells[i - 1] !== c ? c : ''}</button>
    {/each}
  </div>
  <div class="queue ui">
    <span class="label-caps">Coming up</span>
    {#each upcoming as o, i (i)}<span class="q" class:f={o.k === 'f'}>{o.k === 'a' ? `malloc ${o.size}` : `free #${o.id}`}</span>{/each}
  </div>
  <p class="stats ui">placed <strong>{placedCount}</strong> of {totalAllocs} · free <strong>{freeUnits}</strong> units in {hs.length} hole{hs.length === 1 ? '' : 's'} · largest hole <strong>{largest}</strong>{freeUnits ? ` · fragmentation ${Math.round(100 * (1 - largest / freeUnits))}%` : ''}</p>
  {#if over}
    <div class="cmp ui">
      <span class="label-caps">Same stream, automatic policies</span>
      {#each [['you', placedCount], ['first fit', results.first.placed], ['next fit', results.next.placed], ['best fit', results.best.placed], ['worst fit', results.worst.placed]] as [name, n] (name)}
        <div class="row"><span>{name}</span><span class="bar" class:me={name === 'you'} style:width="{(100 * Number(n)) / totalAllocs}%"></span><span class="mono">{n} / {totalAllocs}</span></div>
      {/each}
    </div>
  {/if}
</Widget>

<style>
  .lv,
  .auto {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .lv button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .now {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    align-items: center;
    margin: 0.7rem 0;
    font-size: 0.92rem;
    min-height: 2rem;
  }
  .over {
    color: var(--leak);
    font-weight: 600;
  }
  .heap {
    display: grid;
    grid-template-columns: repeat(48, minmax(0, 1fr));
    gap: 1px;
    background: var(--line);
    border: 1px solid var(--line-strong);
    outline: none;
  }
  .heap:focus-visible {
    box-shadow: 0 0 0 2px var(--focus);
  }
  .cell {
    height: 2.6rem;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: var(--panel);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--on-accent);
    cursor: pointer;
  }
  .cell.used {
    background: var(--c);
    cursor: default;
  }
  .cell.ghost {
    background: color-mix(in srgb, var(--amber) 45%, var(--panel));
  }
  .cell.bad {
    background: color-mix(in srgb, var(--red) 45%, var(--panel));
  }
  .queue {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    margin-top: 0.6rem;
    font-size: 0.76rem;
  }
  .q {
    padding: 0.05rem 0.45rem;
    border-radius: 3px;
    background: var(--alloc-soft);
    font-family: var(--font-mono);
  }
  .q.f {
    background: var(--pn);
    color: var(--mute);
  }
  .stats {
    font-size: 0.84rem;
    margin: 0.6rem 0;
  }
  .cmp {
    display: grid;
    gap: 0.25rem;
    font-size: 0.8rem;
    margin-top: 0.4rem;
  }
  .row {
    display: grid;
    grid-template-columns: 6rem minmax(0, 1fr) 4.5rem;
    gap: 0.6rem;
    align-items: center;
  }
  .bar {
    height: 0.8rem;
    background: var(--alloc);
    border-radius: 2px;
  }
  .bar.me {
    background: var(--amber);
  }
</style>
