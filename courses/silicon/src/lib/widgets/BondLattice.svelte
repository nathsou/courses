<!--
  The bond model of a silicon crystal, flattened into two dimensions: every atom shares a pair of electrons
  with each of its four neighbours. Heat breaks bonds: the freed electron wanders, and so does the gap it
  left (a hole), as neighbouring bond electrons hop into it. A voltage makes both drift, in opposite
  directions. Dopant atoms (chapter 2) add an electron (phosphorus) or lack one (boron).

  The simulation is qualitative and exaggerated: bonds break here far more often than in real silicon, so
  that you can see it at all. The readout gives the real numbers.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { rng } from '$lib/eda/sim';
  import { NI_SI, SI_ATOMS, intrinsic, material, sci } from '$lib/physics/semiconductor';

  let {
    title = 'A silicon crystal, flattened',
    doping = 'none',
    choose = false,
    temperature = 300,
  }: { title?: string; doping?: 'none' | 'n' | 'p'; choose?: boolean; temperature?: number } = $props();

  const COLS = 9;
  const ROWS = 5;
  const S = 64;
  const W = COLS * S;
  const H = ROWS * S;
  const ax = (i: number) => S / 2 + (i % COLS) * S;
  const ay = (i: number) => S / 2 + Math.floor(i / COLS) * S;

  interface Bond {
    a: number;
    b: number;
    x: number;
    y: number;
    h: boolean;
    full: boolean;
  }
  interface Carrier {
    x: number;
    y: number;
    id: number;
    /** Seconds since it was freed: a new electron cannot fall straight back into its own hole. */
    age: number;
  }

  let T = $state(untrack(() => temperature));
  let field = $state(false);
  let running = $state(true);
  let dope = $state<'none' | 'n' | 'p'>(untrack(() => doping));
  let tick = $state(0);

  let bonds: Bond[] = [];
  let neighbours: number[][] = [];
  let electrons: Carrier[] = [];
  let holes: number[] = [];
  let dopants: { atom: number; kind: 'P' | 'B' }[] = [];
  let crossings = { e: 0, h: 0 };
  let next = 1;
  let rand = rng(7);

  function build() {
    rand = rng(7);
    bonds = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      // Horizontal bonds wrap around (the crystal is part of a circuit); vertical ones stop at the edges.
      bonds.push({ a: i, b: r * COLS + ((c + 1) % COLS), x: ax(i) + S / 2, y: ay(i), h: true, full: true });
      if (r < ROWS - 1) bonds.push({ a: i, b: i + COLS, x: ax(i), y: ay(i) + S / 2, h: false, full: true });
    }
    neighbours = bonds.map((b, k) => bonds.flatMap((o, j) => (j !== k && (o.a === b.a || o.a === b.b || o.b === b.a || o.b === b.b) ? [j] : [])));
    electrons = [];
    holes = [];
    crossings = { e: 0, h: 0 };
    dopants = [];
    if (dope !== 'none') {
      for (const atom of [COLS + 2, 3 * COLS + 6, 2 * COLS + 4, COLS + 7, 3 * COLS + 1]) {
        dopants.push({ atom, kind: dope === 'n' ? 'P' : 'B' });
        if (dope === 'n') electrons.push({ x: ax(atom) + 14, y: ay(atom) - 14, id: next++, age: 0 });
        else {
          const k = bonds.findIndex((b) => b.a === atom);
          bonds[k]!.full = false;
          holes.push(k);
        }
      }
    }
    tick++;
  }

  // Equilibrium number of thermally broken bonds in this toy lattice: an Arrhenius law with a much smaller
  // activation energy than real silicon's (0.11 eV), scaled to about three pairs at room temperature.
  const target = $derived(Math.min(14, 3 * Math.exp(-1250 * (1 / T - 1 / 300))));

  function step(dt: number) {
    // Thermally generated pairs: in doped crystals, the minority carriers count them.
    const thermal = dope === 'n' ? holes.length : dope === 'p' ? electrons.length : Math.min(electrons.length, holes.length);
    // Generation: break a random full bond.
    if (thermal < target && rand() < 2.5 * dt * (target - thermal + 0.3)) {
      const k = Math.floor(rand() * bonds.length);
      const b = bonds[k]!;
      if (b.full && !dopants.some((d) => d.atom === b.a || d.atom === b.b)) {
        b.full = false;
        holes.push(k);
        electrons.push({ x: b.x + (b.h ? (rand() - 0.5) * 16 : 20), y: b.y + (b.h ? 20 : (rand() - 0.5) * 16), id: next++, age: 0 });
      }
    }
    // Electrons: a random walk, plus a drift to the right when the voltage is on.
    const drift = field ? 70 : 0;
    for (const e of electrons) {
      e.age += dt;
      e.x += (rand() - 0.5) * 260 * dt + drift * dt;
      e.y += (rand() - 0.5) * 260 * dt;
      if (e.x > W) {
        e.x -= W;
        if (field) crossings.e++;
      }
      if (e.x < 0) e.x += W;
      e.y = Math.max(6, Math.min(H - 6, e.y));
    }
    // Holes: a neighbouring bond's electron hops in, so the hole moves; to the left when the voltage is on.
    for (let i = 0; i < holes.length; i++) {
      if (rand() > 3 * dt) continue;
      const k = holes[i]!;
      const options = neighbours[k]!.filter((j) => bonds[j]!.full);
      if (!options.length) continue;
      let j = options[Math.floor(rand() * options.length)]!;
      if (field) {
        const left = options.filter((o) => {
          const dx = bonds[o]!.x - bonds[k]!.x;
          return dx < -1 && dx > -S;
        });
        if (left.length && rand() < 0.6) j = left[Math.floor(rand() * left.length)]!;
      }
      const dx = bonds[j]!.x - bonds[k]!.x;
      if (field && dx > W / 2) crossings.h++;
      bonds[k]!.full = true;
      bonds[j]!.full = false;
      holes[i] = j;
    }
    // Recombination: a free electron that meets a hole falls back into the bond.
    for (let i = electrons.length - 1; i >= 0; i--) {
      const e = electrons[i]!;
      if (e.age < 1.5) continue;
      const hi = holes.findIndex((k) => Math.hypot(bonds[k]!.x - e.x, bonds[k]!.y - e.y) < 11);
      if (hi >= 0 && rand() < 0.12) {
        bonds[holes[hi]!]!.full = true;
        holes.splice(hi, 1);
        electrons.splice(i, 1);
      }
    }
    tick++;
  }

  let el: HTMLElement | undefined = $state();
  let visible = false;
  let raf = 0;
  let last = 0;
  function loop(now: number) {
    cancelAnimationFrame(raf);
    if (!visible || !running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    step(dt);
    raf = requestAnimationFrame(loop);
  }
  build();
  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) running = false;
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      last = 0;
      if (visible) loop(performance.now());
    });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  });
  $effect(() => {
    if (running)
      untrack(() => {
        last = 0;
        loop(performance.now());
      });
  });
  let builtFor = untrack(() => doping);
  $effect(() => {
    if (dope !== builtFor) {
      builtFor = dope;
      untrack(build);
    }
  });

  const view = $derived.by(() => {
    void tick;
    return { bonds: bonds.map((b) => ({ ...b })), electrons: electrons.map((e) => ({ ...e })), holes: [...holes], dopants: [...dopants], crossings: { ...crossings } };
  });
  const ni = $derived(intrinsic(material('si'), T));
  const perBond = $derived(ni / (2 * SI_ATOMS));
  const atomAt = (i: number) => view.dopants.find((d) => d.atom === i);
</script>

<Widget {title} subtitle="Each line between two atoms is one shared electron; a bond holds two. Raise the temperature and watch bonds break; then switch on the voltage." onreset={build}>
  {#snippet controls()}
    <Slider bind:value={T} min={20} max={600} step={10} label="Temperature" format={(v) => `${v.toFixed(0)} K (${(v - 273.15).toFixed(0)} °C)`} />
    <Toggle bind:checked={field} label="Apply a voltage (+ on the right)" />
    <Toggle bind:checked={running} label="Animate" />
    {#if !running}<button class="step ui" onclick={() => step(0.05)}>Step</button>{/if}
    {#if choose}
      <Segmented bind:value={dope} label="Doping" options={[{ value: 'none', label: 'Pure' }, { value: 'n', label: 'Phosphorus (n)' }, { value: 'p', label: 'Boron (p)' }]} />
    {/if}
  {/snippet}
  <div bind:this={el}>
    <svg viewBox="0 0 {W} {H}" class="lattice" role="img" aria-label="Bond-model lattice with {view.electrons.length} free electrons and {view.holes.length} holes">
      {#each view.bonds as b, k (k)}
        {#if b.h}
          {#if b.full}
            <line class="bond" x1={b.x - 20} x2={b.x + 20} y1={b.y - 3.5} y2={b.y - 3.5} />
          {:else}
            <circle class="hole" cx={b.x} cy={b.y - 3.5} r="5" />
          {/if}
          <line class="bond" x1={b.x - 20} x2={b.x + 20} y1={b.y + 3.5} y2={b.y + 3.5} />
        {:else}
          {#if b.full}
            <line class="bond" y1={b.y - 20} y2={b.y + 20} x1={b.x - 3.5} x2={b.x - 3.5} />
          {:else}
            <circle class="hole" cx={b.x - 3.5} cy={b.y} r="5" />
          {/if}
          <line class="bond" y1={b.y - 20} y2={b.y + 20} x1={b.x + 3.5} x2={b.x + 3.5} />
        {/if}
      {/each}
      {#each Array.from({ length: COLS * ROWS }) as _, i (i)}
        {@const d = atomAt(i)}
        <circle class="atom" class:dopant={!!d} cx={ax(i)} cy={ay(i)} r="11" />
        <text class="sym" x={ax(i)} y={ay(i) + 4}>{d ? d.kind : 'Si'}</text>
        {#if d}<text class="ion" x={ax(i) + 13} y={ay(i) - 9}>{d.kind === 'P' ? '+' : '−'}</text>{/if}
      {/each}
      {#each view.electrons as e (e.id)}
        <circle class="electron" cx={e.x} cy={e.y} r="5.5" />
      {/each}
    </svg>
  </div>
  <div class="readout ui">
    <span><span class="dot e"></span> free electrons: <strong>{view.electrons.length}</strong></span>
    <span><span class="dot h"></span> holes: <strong>{view.holes.length}</strong></span>
    {#if field}<span>crossed the right edge: {view.crossings.e} electrons; holes crossed the left edge: {view.crossings.h}</span>{/if}
  </div>
  <p class="real ui">
    Real silicon at {T.toFixed(0)} K: about <strong>{sci(ni)}</strong> free electrons per cm³, that is one broken bond in every
    <strong>{perBond > 0 ? sci(1 / perBond) : '∞'}</strong> bonds{T === 300 ? '' : ` (at 300 K, n_i ≈ ${sci(NI_SI)})`}. This lattice breaks them far more readily, so that you can see it happen.
  </p>
</Widget>

<style>
  .lattice {
    width: 100%;
    height: auto;
    display: block;
    background: var(--page);
    border-radius: var(--radius-sm);
  }
  .bond {
    stroke: var(--ink-3);
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .atom {
    fill: var(--m-si);
    stroke: var(--ink-2);
    stroke-width: 1.2;
  }
  .atom.dopant {
    fill: var(--ac);
  }
  .sym {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink);
  }
  .ion {
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 700;
    fill: var(--ink);
  }
  .electron {
    fill: var(--electron);
  }
  .hole {
    fill: var(--page);
    stroke: var(--hole);
    stroke-width: 2.2;
  }
  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.4rem;
    margin-top: 0.6rem;
    font-size: 0.84rem;
  }
  .dot {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    vertical-align: -0.05rem;
  }
  .dot.e {
    background: var(--electron);
  }
  .dot.h {
    border: 2px solid var(--hole);
  }
  .real {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .step {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2rem;
  }
</style>
