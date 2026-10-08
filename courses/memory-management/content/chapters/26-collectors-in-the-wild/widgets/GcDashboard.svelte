<!--
  The GC dashboard: five simplified models of collector designs, run on the same synthetic workload (a live set of
  L MB, allocating A MB/s) in a heap of H = k × L. For two seconds of execution, each model's mutator utilisation
  is simulated at 0.5 ms resolution, giving its pauses, its throughput, and its minimum mutator utilisation curve.
  The constants are invented, round numbers for a toy machine; the shapes of the trade-offs are the point.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  let k = $state(2);
  let alloc = $state(400);
  let live = $state(200);

  // The toy machine: rates in MB per second for one collector thread.
  const MARK = 1000;
  const SWEEP = 10000;
  const COPY = 1000;
  const THREADS = 4;
  const SURVIVE = 0.05;
  const DT = 0.0005;
  const SPAN = 2;
  const N = Math.round(SPAN / DT);

  interface ModelResult {
    id: string;
    name: string;
    blurb: string;
    u: Float32Array;
  }

  function simulate(id: string): Float32Array {
    const u = new Float32Array(N).fill(1);
    const H = k * live;
    const F = H - live;
    let t = 0;
    const set = (from: number, dur: number, v: number) => {
      const a = Math.floor(from / DT);
      const b = Math.min(N, Math.floor((from + dur) / DT));
      for (let i = a; i < b; i++) u[i] = Math.min(u[i]!, v);
    };
    if (id === 'serial' || id === 'parallel') {
      const pause = (live / MARK + H / SWEEP) / (id === 'parallel' ? THREADS : 1);
      while (t < SPAN) {
        t += F / alloc;
        set(t, pause, 0);
        t += pause;
      }
    } else if (id === 'generational') {
      const nursery = Math.min(F / 2, 100);
      const minor = (SURVIVE * nursery) / COPY / THREADS;
      const major = (live / MARK + H / SWEEP) / THREADS;
      let oldFree = F - nursery;
      while (t < SPAN) {
        t += nursery / alloc;
        set(t, minor, 0);
        t += minor;
        oldFree -= SURVIVE * nursery;
        if (oldFree < SURVIVE * nursery) {
          set(t, major, 0);
          t += major;
          oldFree = F - nursery;
        }
      }
    } else {
      // Concurrent: marking (and, for the compacting model, relocation) runs on a spare core while the program
      // allocates; short pauses at the start and end; a barrier slows the program down while (or always) on.
      const compacting = id === 'zgc';
      const D = live / MARK + (compacting ? live / COPY : H / SWEEP);
      const overhead = compacting ? 0.08 : 0.03;
      const p = compacting ? 0.0002 : 0.0004;
      if (compacting) set(0, SPAN, 1 - overhead);
      let free = F;
      while (t < SPAN) {
        // Start the cycle early enough to finish before the heap is full (pacing).
        const startAt = Math.max(0, free - alloc * D * 1.1);
        t += startAt / alloc;
        set(t, p, 0);
        t += p;
        const room = Math.max(0, free - startAt);
        const runs = Math.min(D, room / alloc);
        set(t, runs, 1 - overhead);
        if (runs < D) set(t + runs, D - runs, 0); // allocation stall: the program waits for the collector
        t += D;
        set(t, p, 0);
        t += p;
        free = F;
      }
    }
    return u;
  }

  const MODELS = [
    { id: 'serial', name: 'Stop the world, one thread', blurb: 'Mark and sweep with the program stopped (like HotSpot’s Serial).' },
    { id: 'parallel', name: 'Stop the world, four threads', blurb: 'The same work split across four threads (like HotSpot’s Parallel).' },
    { id: 'generational', name: 'Generational', blurb: 'Frequent short nursery collections, rare full ones (like the young/old split in G1, V8 and .NET).' },
    { id: 'concurrent', name: 'Concurrent mark–sweep', blurb: 'Marking on a spare core while the program runs, two short pauses (like Go’s collector).' },
    { id: 'zgc', name: 'Concurrent compacting', blurb: 'Marking and moving on a spare core, a load barrier always on (like ZGC and Shenandoah).' },
  ];

  const results = $derived.by<ModelResult[]>(() => MODELS.map((m) => ({ ...m, u: simulate(m.id) })));

  function stats(u: Float32Array) {
    let sum = 0;
    let maxPause = 0;
    let run = 0;
    for (let i = 0; i < u.length; i++) {
      sum += u[i]!;
      if (u[i] === 0) {
        run++;
        maxPause = Math.max(maxPause, run);
      } else run = 0;
    }
    return { throughput: sum / u.length, maxPause: maxPause * DT * 1000 };
  }
  /** Minimum mutator utilisation for a window of w seconds. */
  function mmu(u: Float32Array, w: number): number {
    const n = Math.max(1, Math.round(w / DT));
    if (n >= u.length) return Array.from(u).reduce((a, b) => a + b, 0) / u.length;
    let s = 0;
    for (let i = 0; i < n; i++) s += u[i]!;
    let min = s;
    for (let i = n; i < u.length; i++) {
      s += u[i]! - u[i - n]!;
      if (s < min) min = s;
    }
    return min / n;
  }
  const WINDOWS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
  const table = $derived(results.map((r) => ({ ...r, ...stats(r.u), curve: WINDOWS.map((w) => mmu(r.u, w)), strip: strip(r.u) })));
  const COLOURS = ['var(--uaf)', 'var(--leak)', 'var(--copper)', 'var(--alloc)', 'var(--violet)'];

  // The challenge: a pause target and a throughput target.
  const PAUSE = 10;
  const THROUGHPUT = 0.9;
  const meets = (r: { maxPause: number; throughput: number }) => r.maxPause <= PAUSE && r.throughput >= THROUGHPUT;

  const STRIP = 600;
  function strip(u: Float32Array): { pause: string; slow: string } {
    let pause = '';
    let slow = '';
    const step = Math.max(1, Math.floor(u.length / STRIP));
    for (let i = 0; i < u.length; i += step) {
      let lo = 1;
      for (let j = i; j < Math.min(u.length, i + step); j++) lo = Math.min(lo, u[j]!);
      const x = ((i / u.length) * STRIP).toFixed(1);
      if (lo === 0) pause += `M${x},0v20`;
      else if (lo < 1) slow += `M${x},6v8`;
    }
    return { pause, slow };
  }
</script>

<Widget title="The GC dashboard" kind="Simulation" n="26.1" caption="Simplified models on a toy machine, not measurements of real collectors. Each strip is two seconds of one model: red ticks are pauses, amber is the program running slowed by a barrier. The MMU curve shows, for each window length, the smallest share of any window that the program got to run.">
  <div class="cfg ui">
    <label>Heap <strong>{k.toFixed(2)}×</strong> the live set <input type="range" min="1.2" max="5" step="0.05" bind:value={k} /></label>
    <label>Live set <strong>{live} MB</strong> <input type="range" min="50" max="800" step="10" bind:value={live} /></label>
    <label>Allocation <strong>{alloc} MB/s</strong> <input type="range" min="50" max="1000" step="10" bind:value={alloc} /></label>
  </div>
  <p class="goal ui">Challenge: keep every pause under <strong>{PAUSE} ms</strong> and throughput above <strong>{THROUGHPUT * 100}%</strong>, with the smallest heap you can.</p>
  <div class="rows ui">
    {#each table as r, i (r.id)}
      <div class="row">
        <div class="name"><span class="sw" style:background={COLOURS[i]}></span>{r.name}<span class="badge" class:ok={meets(r)}>{meets(r) ? '✓ meets the targets' : '✗'}</span></div>
        <svg viewBox="0 0 {STRIP} 20" preserveAspectRatio="none" class="strip" aria-label="{r.name}: pauses over two seconds"><rect width={STRIP} height="20" class="bg" /><path d={r.strip.slow} class="slow" /><path d={r.strip.pause} class="ticks" /></svg>
        <div class="nums mono"><span>{(r.throughput * 100).toFixed(1)}%</span><span>{r.maxPause < 1 ? r.maxPause.toFixed(2) : r.maxPause.toFixed(0)} ms</span></div>
      </div>
    {/each}
    <div class="row head"><div></div><div class="axis"><span>0 s</span><span>2 s</span></div><div class="nums"><span>throughput</span><span>max pause</span></div></div>
  </div>
  <div class="mmu">
    <svg viewBox="0 0 400 160" class="chart" role="img" aria-label="Minimum mutator utilisation against window length">
      {#each [0, 0.25, 0.5, 0.75, 1] as g (g)}<line x1="40" x2="390" y1={140 - g * 120} y2={140 - g * 120} class="grid" /><text x="34" y={144 - g * 120} text-anchor="end" class="lab">{g * 100}%</text>{/each}
      {#each WINDOWS as w, j (w)}<text x={40 + (j / (WINDOWS.length - 1)) * 350} y="156" text-anchor="middle" class="lab">{w < 1 ? `${w * 1000}` : '1000'}</text>{/each}
      <text x="215" y="12" text-anchor="middle" class="lab">minimum mutator utilisation, by window (ms)</text>
      {#each table as r, i (r.id)}
        <polyline points={r.curve.map((v, j) => `${40 + (j / (WINDOWS.length - 1)) * 350},${140 - v * 120}`).join(' ')} style:stroke={COLOURS[i]} class="line" />
      {/each}
    </svg>
  </div>
  <details class="model ui">
    <summary>The toy machine</summary>
    One program thread on a four-core machine. A collector thread marks {MARK} MB/s of live data, sweeps {SWEEP / 1000} GB/s of heap and copies {COPY} MB/s; parallel models use {THREADS} threads. In the generational model, the nursery is half the free space (at most 100 MB) and {SURVIVE * 100}% of nursery objects survive. Concurrent models run on a spare core and pace themselves to finish before the heap is full; when they cannot, the program stalls. Their barriers slow the program by 3% while marking (mark–sweep) or 8% always (compacting).
  </details>
</Widget>

<style>
  .cfg {
    display: grid;
    gap: 0.3rem;
    font-size: 0.82rem;
  }
  .cfg label {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .cfg input {
    flex: 1;
    max-width: 18rem;
  }
  .goal {
    font-size: 0.84rem;
    margin: 0.6rem 0;
    padding: 0.35rem 0.6rem;
    border-left: 3px solid var(--copper);
    background: var(--panel);
  }
  .rows {
    display: grid;
    gap: 0.45rem;
  }
  .row {
    display: grid;
    grid-template-columns: 14rem 1fr 8.5rem;
    gap: 0.7rem;
    align-items: center;
    font-size: 0.8rem;
  }
  @media (max-width: 640px) {
    .row {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
  }
  .row.head {
    font-size: 0.7rem;
    color: var(--mute);
  }
  .name {
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .sw {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    display: inline-block;
  }
  .badge {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--uaf);
  }
  .badge.ok {
    color: var(--green);
  }
  .strip {
    width: 100%;
    height: 1.2rem;
    display: block;
  }
  .bg {
    fill: color-mix(in srgb, var(--green) 14%, var(--panel));
  }
  .ticks {
    stroke: var(--uaf);
    stroke-width: 1.2;
  }
  .slow {
    stroke: var(--leak);
    stroke-width: 1;
    opacity: 0.8;
  }
  .nums {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .axis {
    display: flex;
    justify-content: space-between;
  }
  .mmu {
    margin-top: 0.8rem;
  }
  .chart {
    width: 100%;
    max-width: 560px;
    display: block;
    margin: 0 auto;
    font-family: var(--font-ui);
  }
  .grid {
    stroke: var(--line);
  }
  .lab {
    font-size: 9px;
    fill: var(--mute);
  }
  .line {
    fill: none;
    stroke-width: 2;
  }
  .model {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin-top: 0.6rem;
  }
</style>
