<!--
  The cache lens: walk a 16 × 16 matrix of 8-byte numbers (or a linked list) through a tiny cache (8 sets × 2 ways
  of 32-byte lines) and watch hits and misses. Each pattern's total cycles are kept for comparison.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Cache } from '$lib/mm/machine/cache';
  import { rng } from '$lib/mm/util/random';
  import { onDestroy } from 'svelte';

  const N = 16;
  const ROW = N * 8;
  const LINE = 32;
  const HIT = 4;
  const MISS = 100;
  type Pattern = 'rows' | 'cols' | 'list' | 'shuffled';
  const NAMES: Record<Pattern, string> = { rows: 'Row by row', cols: 'Column by column', list: 'Linked list, in order', shuffled: 'Linked list, scattered' };

  // Linked-list node order for the list patterns: node k lives in cell perm[k].
  const perm = (() => {
    const r = rng(11);
    const p = Array.from({ length: N * N }, (_, i) => i);
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j]!, p[i]!];
    }
    return p;
  })();
  function sequence(p: Pattern): number[] {
    const cells: number[] = [];
    for (let i = 0; i < N * N; i++) {
      if (p === 'rows') cells.push(i);
      else if (p === 'cols') cells.push((i % N) * N + Math.floor(i / N));
      else if (p === 'list') cells.push(i);
      else cells.push(perm[i]!);
    }
    return cells;
  }

  let pattern = $state<Pattern>('rows');
  let cache = new Cache({ name: 'L1', size: 512, ways: 2, line: LINE, latency: HIT });
  let seq = $state(sequence('rows'));
  let pos = $state(0);
  let status = $state<number[]>(Array(N * N).fill(0)); // 0 untouched, 1 hit, 2 miss
  let hits = $state(0);
  let misses = $state(0);
  let sets = $state<number[][]>(Array.from({ length: 8 }, () => [-1, -1]));
  let playing = $state(false);
  let speed = $state(30);
  let results = $state<Partial<Record<Pattern, number>>>({});
  let timer: ReturnType<typeof setInterval> | undefined;

  function reset(p: Pattern = pattern) {
    stop();
    pattern = p;
    cache = new Cache({ name: 'L1', size: 512, ways: 2, line: LINE, latency: HIT });
    seq = sequence(p);
    pos = 0;
    status = Array(N * N).fill(0);
    hits = misses = 0;
    sets = Array.from({ length: 8 }, () => [-1, -1]);
  }
  function step(): boolean {
    if (pos >= seq.length) return false;
    const cell = seq[pos]!;
    const addr = cell * 8 + (pattern === 'list' || pattern === 'shuffled' ? 0 : 0);
    const hit = cache.access(addr);
    status[cell] = hit ? 1 : 2;
    if (hit) hits++;
    else misses++;
    pos++;
    sets = Array.from({ length: 8 }, (_, s) => cache.setContents(s));
    if (pos >= seq.length) {
      results = { ...results, [pattern]: hits * HIT + misses * MISS };
      stop();
    }
    return true;
  }
  function stop() {
    playing = false;
    clearInterval(timer);
  }
  function play() {
    if (pos >= seq.length) reset();
    playing = true;
    clearInterval(timer);
    timer = setInterval(() => {
      for (let k = 0; k < Math.max(1, Math.floor(speed / 20)); k++) if (!step()) break;
    }, Math.max(16, 400 - speed * 4));
  }
  function finish() {
    stop();
    while (step());
  }
  onDestroy(stop);

  const cycles = $derived(hits * HIT + misses * MISS);
  const maxResult = $derived(Math.max(1, ...Object.values(results)));
  const lineLabel = (line: number) => (line < 0 ? '' : `cells ${(line * LINE) / 8}–${(line * LINE) / 8 + 3}`);
  const current = $derived(pos > 0 ? seq[pos - 1] : -1);
</script>

<Widget title="Same work, different order" kind="Cache lens" n="2.1" caption="A 16 × 16 matrix of 8-byte numbers, stored row by row (each row is 128 bytes), read through a 512-byte cache with 32-byte lines: 8 sets of 2 lines. A hit costs 4 cycles, a miss 100. The linked lists visit the same 256 cells, following next pointers; in the scattered list the nodes were allocated in random places.">
  <div class="controls ui">
    <div class="pats" role="radiogroup" aria-label="Access pattern">
      {#each Object.keys(NAMES) as p (p)}
        <button role="radio" aria-checked={pattern === p} class:on={pattern === p} onclick={() => reset(p as Pattern)}>{NAMES[p as Pattern]}</button>
      {/each}
    </div>
    <div class="play">
      <button class="primary" onclick={() => (playing ? stop() : play())}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
      <button onclick={step} disabled={playing}>Step</button>
      <button onclick={finish}>To the end</button>
      <button onclick={() => reset()}>Reset</button>
      <label>speed <input type="range" min="1" max="100" bind:value={speed} /></label>
    </div>
  </div>
  <div class="stage">
    <div class="matrix" role="img" aria-label="{hits} hits and {misses} misses so far">
      {#each Array.from({ length: N * N }, (_, i) => i) as c (c)}
        <span class="cell" class:hit={status[c] === 1} class:miss={status[c] === 2} class:cur={c === current} class:lineStart={c % 4 === 0}></span>
      {/each}
    </div>
    <div class="side">
      <div class="cache ui">
        <div class="ch">The cache: set → two ways</div>
        {#each sets as s, i (i)}
          <div class="set"><span class="sn mono">{i}</span>{#each s as l, w (w)}<span class="way" class:full={l >= 0}>{lineLabel(l)}</span>{/each}</div>
        {/each}
      </div>
      <div class="counts ui">
        <div><span class="k hit"></span> hits <strong>{hits}</strong></div>
        <div><span class="k miss"></span> misses <strong>{misses}</strong></div>
        <div>cycles <strong class="mono">{cycles.toLocaleString('en-GB')}</strong></div>
      </div>
    </div>
  </div>
  {#if Object.keys(results).length}
    <div class="results ui">
      {#each Object.entries(results) as [p, c] (p)}
        <div class="res"><span class="rn">{NAMES[p as Pattern]}</span><span class="bar" style:width="{(100 * c) / maxResult}%"></span><span class="mono">{c.toLocaleString('en-GB')} cycles</span></div>
      {/each}
    </div>
  {/if}
</Widget>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
  }
  .pats,
  .play {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.82rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
    font-size: 0.82rem;
  }
  button.on,
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.4;
  }
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: start;
  }
  @media (max-width: 640px) {
    .stage {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .matrix {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 1px;
    background: var(--line);
    border: 1px solid var(--line-strong);
  }
  .cell {
    aspect-ratio: 1;
    background: var(--panel);
    transition: background 120ms;
  }
  .cell.lineStart {
    box-shadow: inset 2px 0 0 var(--line-strong);
  }
  .cell.hit {
    background: color-mix(in srgb, var(--green) 55%, var(--panel));
  }
  .cell.miss {
    background: color-mix(in srgb, var(--red) 70%, var(--panel));
  }
  .cell.cur {
    outline: 2px solid var(--amber);
    outline-offset: -1px;
    z-index: 1;
  }
  .cache {
    font-size: 0.72rem;
  }
  .ch {
    color: var(--ink-2);
    margin-bottom: 0.3rem;
  }
  .set {
    display: grid;
    grid-template-columns: 1.2rem 1fr 1fr;
    gap: 3px;
    margin-bottom: 3px;
  }
  .sn {
    color: var(--mute);
  }
  .way {
    border: 1px dashed var(--line-strong);
    border-radius: 3px;
    padding: 0.1rem 0.3rem;
    min-height: 1.3rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
  }
  .way.full {
    border-style: solid;
    border-color: var(--alloc);
    background: var(--alloc-soft);
  }
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    margin-top: 0.8rem;
    font-size: 0.88rem;
  }
  .k {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    vertical-align: middle;
  }
  .k.hit {
    background: color-mix(in srgb, var(--green) 55%, var(--panel));
  }
  .k.miss {
    background: color-mix(in srgb, var(--red) 70%, var(--panel));
  }
  .results {
    margin-top: 1rem;
    padding-top: 0.7rem;
    border-top: 1px dashed var(--line);
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
  }
  .res {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr) 8rem;
    gap: 0.6rem;
    align-items: center;
  }
  .bar {
    height: 0.8rem;
    background: var(--copper);
    border-radius: 2px;
  }
</style>
