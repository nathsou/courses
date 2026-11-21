<!--
  Drift and diffusion, in real units: 300 electrons in a silicon bar 1 µm long (diffusivity 36 cm²/s, mobility
  1400 cm²/V·s). Each takes random thermal steps; a voltage adds a small bias. Bunch them up and they spread
  (diffusion); apply a voltage and they drift. With the ends closed, the two balance in an exponential profile:
  the Boltzmann distribution.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { rng } from '$lib/eda/sim';
  import { kT } from '$lib/physics/semiconductor';

  const N = 300;
  const L = 1e-4; // cm
  const MU = 1400;
  const D = MU * kT(300);
  const DT = 1e-13; // s per substep
  const SUB = 10;
  const BINS = 20;

  let start = $state<'even' | 'left'>('left');
  let volts = $state(0);
  let circuit = $state(false);
  let running = $state(true);
  let tick = $state(0);

  let xs = new Float64Array(N);
  const ys = Float64Array.from({ length: N }, (_, i) => 8 + ((i * 37) % 64));
  let time = 0;
  let crossed = 0;
  let rand = rng(3);
  let gauss = () => {
    const u = Math.max(1e-12, rand());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  function reset() {
    rand = rng(3);
    for (let i = 0; i < N; i++) xs[i] = start === 'left' ? rand() * 0.12 * L : rand() * L;
    time = 0;
    crossed = 0;
    tick++;
  }
  reset();

  const field = $derived(volts / L); // V/cm, pointing from + (right) to − (left)
  function step() {
    const drift = MU * field * DT; // electrons move towards the positive end (right)
    const sigma = Math.sqrt(2 * D * DT);
    for (let s = 0; s < SUB; s++) {
      for (let i = 0; i < N; i++) {
        let x = xs[i]! + drift + sigma * gauss();
        if (circuit) {
          if (x > L) {
            x -= L;
            crossed++;
          } else if (x < 0) {
            x += L;
            crossed--;
          }
        } else {
          if (x < 0) x = -x;
          if (x > L) x = 2 * L - x;
        }
        xs[i] = x;
      }
      time += DT;
    }
    tick++;
  }

  let el: HTMLElement | undefined = $state();
  let visible = false;
  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || !running) return;
    step();
    raf = requestAnimationFrame(loop);
  }
  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) running = false;
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) loop();
    });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  });
  $effect(() => {
    if (running) untrack(loop);
  });
  let last = { start: 'left', circuit: false };
  $effect(() => {
    if (start !== last.start || circuit !== last.circuit) {
      last = { start, circuit };
      untrack(reset);
    }
  });

  const snap = $derived.by(() => {
    void tick;
    const counts = new Array(BINS).fill(0);
    let mean = 0;
    for (const x of xs) {
      counts[Math.min(BINS - 1, Math.floor((x / L) * BINS))]++;
      mean += x;
    }
    mean /= N;
    let v = 0;
    for (const x of xs) v += (x - mean) ** 2;
    return { xs: Array.from(xs), counts, spread: Math.sqrt(v / N), time, crossed };
  });
  // Expected equilibrium profile with closed ends: n ∝ exp(qVx/(L kT)), normalised to N per BINS.
  const theory = $derived.by(() => {
    const a = volts / kT(300);
    const pts: [number, number][] = [];
    const norm = Math.abs(a) < 1e-6 ? 1 : a / (Math.exp(a) - 1);
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      pts.push([u, (N / BINS) * norm * Math.exp(a * u)]);
    }
    return pts;
  });
  const um = (cm: number) => (cm * 1e4).toFixed(2);
</script>

<Widget title="Drift and diffusion" subtitle="Three hundred electrons in a bar of silicon 1 µm long. Each one takes random thermal steps; a voltage adds a small, steady bias." onreset={reset}>
  {#snippet controls()}
    <Segmented bind:value={start} label="Start" options={[{ value: 'left', label: 'Bunched on the left' }, { value: 'even', label: 'Spread evenly' }]} />
    <Slider bind:value={volts} min={-0.2} max={0.2} step={0.005} label="Voltage across the bar (right end +)" format={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)} V`} />
    <Toggle bind:checked={circuit} label="Connect the ends (a circuit)" />
    <Toggle bind:checked={running} label="Animate" />
    {#if !running}<button class="step ui" onclick={step}>Step 1 ps</button>{/if}
  {/snippet}
  <div bind:this={el}>
    <svg class="bar" viewBox="0 0 600 80" preserveAspectRatio="none" role="img" aria-label="Electron positions in the bar">
      <rect x="0" y="0" width="600" height="80" class="si" />
      {#each snap.xs as x, i (i)}<circle cx={(x / L) * 600} cy={ys[i]} r="2.6" class="e" />{/each}
    </svg>
    <div class="ends ui"><span>{circuit ? 'wire to the right end ↺' : 'closed end'}</span><span>{volts > 0 ? '+' : volts < 0 ? '−' : ''}</span></div>
    <Plot
      label="Electron concentration along the bar"
      x={{ min: 0, max: 1, label: 'position along the bar (µm)', format: (v) => v.toFixed(1) }}
      y={{ min: 0, max: Math.max(60, ...snap.counts) * 1.1, label: 'electrons per bin' }}
      height={180}
      series={[
        { points: snap.counts.flatMap((c, i) => [[i / BINS, c], [(i + 1) / BINS, c]] as [number, number][]), color: 'var(--electron)', width: 2, fillTo: 0, label: 'simulation' },
        ...(!circuit ? [{ points: theory, color: 'var(--ac)', width: 2, dash: '5 4', label: 'equilibrium: n ∝ e^(qV·x/L·kT)' }] : []),
      ]}
    />
  </div>
  <dl class="nums ui">
    <div><dt>Time elapsed</dt><dd>{(snap.time * 1e12).toFixed(0)} ps</dd></div>
    <div><dt>Field</dt><dd>{Math.abs(field).toFixed(0)} V/cm</dd></div>
    <div><dt>Drift velocity μE</dt><dd>{(Math.abs(MU * field) / 1e5).toFixed(1)} km/s</dd></div>
    {#if circuit}
      <div><dt>Net electrons round the circuit</dt><dd>{snap.crossed}</dd></div>
    {:else}
      <div><dt>Spread (std. dev.)</dt><dd>{um(snap.spread)} µm</dd></div>
      <div><dt>√(2Dt), for a point start</dt><dd>{um(Math.sqrt(2 * D * snap.time))} µm</dd></div>
    {/if}
  </dl>
</Widget>

<style>
  .bar {
    width: 100%;
    height: 80px;
    display: block;
    border-radius: var(--radius-sm);
  }
  .si {
    fill: var(--m-n);
    opacity: 0.5;
  }
  .e {
    fill: var(--electron);
  }
  .ends {
    display: flex;
    justify-content: space-between;
    font-size: 0.74rem;
    color: var(--ink-3);
    margin: 0.15rem 0 0.4rem;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
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
