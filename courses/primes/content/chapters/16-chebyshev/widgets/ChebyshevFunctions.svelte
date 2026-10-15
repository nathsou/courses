<!--
  θ(x)/x, ψ(x)/x and π(x)/(x/log x) for x up to 10^6 (log scale), with the bounds proved in this chapter
  (log 2 and log 4) and Chebyshev's sharper constants. The prime number theorem says all three tend to 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const N = 1_000_000;
  const series = (() => {
    const s = sieve(N);
    const out: { x: number; theta: number; psi: number; pi: number }[] = [];
    let theta = 0;
    let psi = 0;
    let pi = 0;
    // Prime powers contribute to ψ.
    const pp = new Float64Array(N + 1);
    for (let p = 2; p <= N; p++) {
      if (!s[p]) continue;
      for (let q = p; q <= N; q *= p) pp[q] = Math.log(p);
    }
    let next = 10;
    for (let x = 2; x <= N; x++) {
      if (s[x]) {
        theta += Math.log(x);
        pi++;
      }
      psi += pp[x]!;
      if (x >= next) {
        out.push({ x, theta: theta / x, psi: psi / x, pi: pi / (x / Math.log(x)) });
        next = Math.ceil(next * 1.04);
      }
    }
    return out;
  })();
  const path = (f: (r: (typeof series)[number]) => number, sx: (v: number) => number, sy: (v: number) => number) => 'M' + series.map((r) => `${sx(r.x)},${sy(f(r))}`).join('L');
  const LINES = [
    { y: Math.log(2), label: 'log 2', cls: 'proved' },
    { y: Math.log(4), label: 'log 4', cls: 'proved' },
    { y: 0.92129, label: '0.921', cls: 'cheb' },
    { y: 1.10555, label: '1.106', cls: 'cheb' },
    { y: 1, label: '1', cls: 'one' },
  ];
</script>

<Widget title="Chebyshev’s functions" subtitle="θ(x)/x, ψ(x)/x and π(x)/(x/log x) up to a million. The proved bounds log 2 and log 4 are dashed; Chebyshev’s sharper constants are dotted.">
  <Plot x={{ domain: [10, N], type: 'log', label: 'x' }} y={{ domain: [0.5, 1.5], label: 'ratio' }} height={300} label="Ratios of theta, psi and pi to their expected sizes, up to one million.">
    {#snippet marks({ sx, sy })}
      {#each LINES as l (l.label)}
        <line class={l.cls} x1={sx(10)} x2={sx(N)} y1={sy(l.y)} y2={sy(l.y)} />
        <text class="lab" x={sx(N) - 4} y={sy(l.y) - 4} text-anchor="end">{l.label}</text>
      {/each}
      <path class="th" d={path((r) => r.theta, sx, sy)} />
      <path class="ps" d={path((r) => r.psi, sx, sy)} />
      <path class="pi" d={path((r) => r.pi, sx, sy)} />
    {/snippet}
  </Plot>
  <div class="legend ui">
    <span class="k th">θ(x) / x</span>
    <span class="k ps">ψ(x) / x</span>
    <span class="k pi">π(x) / (x / log x)</span>
  </div>
</Widget>

<style>
  .proved {
    stroke: var(--rule-strong);
    stroke-dasharray: 6 4;
  }
  .cheb {
    stroke: var(--rule-strong);
    stroke-dasharray: 1.5 3;
  }
  .one {
    stroke: var(--fg);
    stroke-width: 0.8;
  }
  .lab {
    font-size: 10px;
    fill: var(--mute);
  }
  path {
    fill: none;
    stroke-width: 1.7;
  }
  path.th,
  .k.th::before {
    stroke: var(--series-1);
    border-color: var(--series-1);
  }
  path.ps,
  .k.ps::before {
    stroke: var(--series-4);
    border-color: var(--series-4);
  }
  path.pi,
  .k.pi::before {
    stroke: var(--prime);
    border-color: var(--prime);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.4rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    margin-right: 0.4rem;
    vertical-align: middle;
  }
</style>
