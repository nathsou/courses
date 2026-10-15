<!--
  The flagship: Riemann's explicit formula, live. The exact staircase (ψ(x) or π(x)) against the smooth main term
  plus the first K pairs of zeros:
    ψ₀(x) = x − Σ_ρ x^ρ/ρ − log 2π − ½ log(1 − x⁻²),
    π(x) = R(x) − Σ_ρ R(x^ρ) (Riemann's form, through J(x) and Möbius inversion).
  Up to 10,000 zeros (fetched from static/data/zeros.json). The wave of the K-th zero can be shown on its own, and
  the zeros can be heard: each pair is a tone whose pitch is proportional to γ and loudness to 1/|ρ|.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { psiExplicit, psiSteps, piExplicit, zeroPairTerm } from '$lib/primes/explicit';
  import { primePiTable } from '$lib/primes/sieve';
  import { riemannR } from '$lib/primes/count';
  import { ZEROS } from '$lib/primes/zeros';
  import { loadZeros } from '$lib/data/zeros';

  let zeros = $state<readonly number[]>(ZEROS);
  $effect(() => {
    loadZeros()
      .then((z) => (zeros = z))
      .catch(() => {});
  });

  let mode = $state<'psi' | 'pi'>('psi');
  let X = $state(100);
  let K = $state(10);
  let showWave = $state(false);

  const maxK = $derived(mode === 'pi' ? Math.min(300, zeros.length) : zeros.length);
  $effect(() => {
    if (K > maxK) K = maxK;
  });

  const piTable = primePiTable(10_000);
  const exact = $derived.by(() => {
    if (mode === 'psi') {
      const steps = psiSteps(X);
      const pts: [number, number][] = [];
      let prev = 0;
      for (const s of steps) {
        if (s.x === 0) continue;
        pts.push([s.x, prev], [s.x, s.psi]);
        prev = s.psi;
      }
      pts.push([X, prev]);
      return [[1, 0] as [number, number], ...pts];
    }
    const pts: [number, number][] = [[1, 0]];
    for (let n = 2; n <= X; n++) if (piTable[n] !== piTable[n - 1]) pts.push([n, piTable[n - 1]!], [n, piTable[n]!]);
    pts.push([X, piTable[X]!]);
    return pts;
  });

  // The approximation is computed in chunks so that 10,000 zeros do not freeze the page.
  let approx = $state<[number, number][]>([]);
  let busy = $state(false);
  let job = 0;
  $effect(() => {
    const zs = zeros.slice(0, K);
    const m = mode;
    const xMax = X;
    const n = Math.min(m === 'pi' ? 800 : 4000, Math.max(500, Math.round((xMax * Math.max(1, zs[zs.length - 1] ?? 1)) / 200)));
    const id = ++job;
    const out: [number, number][] = [];
    let i = 0;
    busy = true;
    const step = () => {
      if (id !== job) return;
      const t0 = performance.now();
      while (i <= n && performance.now() - t0 < 30) {
        const x = 1.5 + ((xMax - 1.5) * i) / n;
        out.push([x, m === 'psi' ? psiExplicit(x, zs) : piExplicit(Math.max(2, x), zs)]);
        i++;
      }
      if (i <= n) requestAnimationFrame(step);
      else {
        approx = out;
        busy = false;
      }
    };
    requestAnimationFrame(step);
  });

  const main = $derived(Array.from({ length: 301 }, (_, i) => 2 + ((X - 2) * i) / 300).map((x) => [x, mode === 'psi' ? x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x)) : riemannR(x)] as [number, number]));
  const yMax = $derived((mode === 'psi' ? X * 1.12 : (piTable[X] ?? 0) * 1.15) + 1);
  const gammaK = $derived(zeros[K - 1]);
  const wave = $derived(gammaK === undefined ? [] : Array.from({ length: 801 }, (_, i) => 2 + ((X - 2) * i) / 800).map((x) => [x, -zeroPairTerm(x, gammaK) / (mode === 'pi' ? Math.log(x) : 1)] as [number, number]));
  const waveMax = $derived(Math.max(0.1, ...wave.map((p) => Math.abs(p[1]))));
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number, lo = -Infinity, hi = Infinity) => (pts.length ? 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(lo, Math.min(hi, b))).toFixed(1)}`).join('L') : '');

  // Sound: one sine per zero pair, pitch ∝ γ, loudness ∝ 1/|ρ|.
  let audio: AudioContext | null = null;
  let playing = $state(false);
  function play() {
    if (playing) return;
    audio ??= new AudioContext();
    const ctx = audio;
    const count = Math.min(K, 30);
    const base = 110 / 14.134725; // the first zero sounds as A2 (110 Hz)
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3);
    master.gain.setValueAtTime(0.25, ctx.currentTime + 3.2);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
    master.connect(ctx.destination);
    const norm = zeros.slice(0, count).reduce((s, g) => s + 1 / g, 0);
    for (const g of zeros.slice(0, count)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = base * g;
      gain.gain.value = 1 / g / norm;
      osc.connect(gain).connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 4.05);
    }
    playing = true;
    setTimeout(() => (playing = false), 4100);
  }
</script>

<Widget title="The zeros rebuild the primes" subtitle="The exact staircase (blue) and the explicit formula with the first K pairs of zeros (red). With no zeros you get the smooth main term; each pair of zeros adds one wave." onreset={() => ((mode = 'psi'), (X = 100), (K = 10), (showWave = false))}>
  {#snippet controls()}
    <Segmented label="Function" bind:value={mode} options={[{ value: 'psi', label: 'ψ(x)' }, { value: 'pi', label: 'π(x)' }]} size="sm" />
    <Segmented label="x up to" bind:value={X} options={[{ value: 50, label: '50' }, { value: 100, label: '100' }, { value: 500, label: '500' }, { value: 2000, label: '2000' }]} size="sm" />
    <Slider label="zeros K" bind:value={K} min={1} max={maxK} log format={(v) => String(Math.round(v))} oninput={(v) => (K = Math.round(v))} />
    <Toggle bind:checked={showWave} label="show the K-th wave" />
    <Button size="sm" onclick={play} disabled={playing || K === 0}>{playing ? 'Playing…' : 'Hear the zeros'}</Button>
  {/snippet}
  <div class="presets ui">
    {#each [0, 1, 10, 100, 1000, 10000].filter((k) => k <= maxK) as k (k)}
      <button class:on={K === k} onclick={() => (K = k)}>{k === 0 ? 'no zeros' : `${k.toLocaleString('en-GB')} zero${k > 1 ? 's' : ''}`}</button>
    {/each}
  </div>
  <Plot x={{ domain: [1, X], label: 'x' }} y={{ domain: [mode === 'psi' ? -X * 0.05 : -1, yMax], label: mode === 'psi' ? 'ψ(x)' : 'π(x)' }} height={320} label="The explicit formula with {K} zeros against the exact staircase.">
    {#snippet marks({ sx, sy })}
      <path class="main" d={path(main, sx, sy)} />
      <path class="exact" d={path(exact, sx, sy)} />
      <path class="approx" class:stale={busy} d={path(approx, sx, sy, -yMax, yMax * 1.2)} />
    {/snippet}
  </Plot>
  {#if showWave && gammaK !== undefined}
    <Plot x={{ domain: [1, X], label: 'x' }} y={{ domain: [-waveMax * 1.1, waveMax * 1.1], label: 'wave' }} height={140} label="The contribution of zero number {K}.">
      {#snippet marks({ sx, sy })}
        <line class="axis" x1={sx(1)} x2={sx(X)} y1={sy(0)} y2={sy(0)} />
        <path class="wave" d={path(wave, sx, sy)} />
      {/snippet}
    </Plot>
  {/if}
  <p class="out" aria-live="polite">
    {#if K === 0}
      No zeros: only the smooth term {mode === 'psi' ? 'x − log 2π − ½ log(1 − x⁻²)' : 'R(x) (Riemann’s refinement of Li)'}.
    {:else}
      {K.toLocaleString('en-GB')} pair{K > 1 ? 's' : ''} of zeros ρ = ½ ± iγ, up to γ = {(zeros[K - 1] ?? 0).toFixed(2)}.
      {#if showWave}{@const amp = (2 * Math.sqrt(X)) / (zeros[K - 1] ?? 1) / (mode === 'pi' ? Math.log(X) : 1)}The K-th wave is {mode === 'pi' ? '−2 Re li(x^ρ) ≈ −2 Re(x^ρ/(ρ log x))' : '−2 Re(x^ρ/ρ)'}: amplitude about {mode === 'pi' ? '2√x/(γ log x)' : '2√x/γ'} = {amp.toFixed(2)} at x = {X}, and {((zeros[K - 1] ?? 0) * Math.log(X) / (2 * Math.PI)).toFixed(0)} oscillations up to there.{/if}
    {/if}
    {#if mode === 'pi'}(The π(x) version is slower to compute, so it uses at most 300 zeros.){/if}
    {#if busy}Computing…{/if}
  </p>
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.4rem;
  }
  .presets button {
    font: inherit;
    font-size: 0.76rem;
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .presets button.on {
    border-color: var(--prime);
    color: var(--prime);
  }
  .main {
    fill: none;
    stroke: var(--mute);
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
  }
  .exact {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 2;
  }
  .approx {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.4;
    transition: opacity 0.2s;
  }
  .approx.stale {
    opacity: 0.4;
  }
  .axis {
    stroke: var(--ruling);
  }
  .wave {
    fill: none;
    stroke: var(--series-4);
    stroke-width: 1.4;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
