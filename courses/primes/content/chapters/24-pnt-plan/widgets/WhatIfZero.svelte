<!--
  Why the line Re s = 1 is the crux. ψ(x)/x for x up to 10^7 (from the primes), against what it would look like if ζ
  had an extra pair of zeros β ± iγ: by the explicit formula they would add −2 Re(x^ρ/ρ)/x to ψ(x)/x, a wave of
  relative size about 2x^(β−1)/|ρ|. For β < 1 the wave dies out, slowly; for β = 1 it never does, and ψ(x)/x
  could not tend to 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const XMAX = 10_000_000;
  const actual = (() => {
    // ψ(x) = Σ_{p^k ≤ x} log p, scanning a sieve; the higher prime powers are merged in from a short sorted list.
    const flags = sieve(XMAX);
    const powers: [number, number][] = [];
    for (let p = 2; p * p <= XMAX; p++) if (flags[p]) for (let q = p * p; q <= XMAX; q *= p) powers.push([q, Math.log(p)]);
    powers.sort((a, b) => a[0] - b[0]);
    const pts: [number, number][] = [];
    let psi = 0;
    let j = 0;
    let next = 10;
    for (let n = 2; n <= XMAX; n++) {
      if (flags[n]) psi += Math.log(n);
      while (j < powers.length && powers[j]![0] === n) psi += powers[j++]![1];
      if (n >= next) {
        pts.push([n, psi / n]);
        next = Math.ceil(next * 1.01);
      }
    }
    return pts;
  })();

  let on = $state(true);
  let beta = $state(1);
  let gamma = $state(6);
  /** −2 Re(x^ρ/ρ)/x for ρ = β + iγ. */
  const extra = (x: number) => {
    const L = Math.log(x);
    const mag = Math.exp((beta - 1) * L);
    const c = Math.cos(gamma * L);
    const s = Math.sin(gamma * L);
    const d = beta * beta + gamma * gamma;
    return (-2 * mag * (beta * c + gamma * s)) / d;
  };
  const fake = $derived(on ? actual.map(([x, v]) => [x, v + extra(x)] as [number, number]) : []);
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(0.3, Math.min(1.7, b))).toFixed(1)}`).join('L');
</script>

<Widget title="What a zero on the line Re s = 1 would do" subtitle="ψ(x)/x from the actual primes (blue) settles down to 1. Red: the same, with one extra pair of zeros β ± iγ added through the explicit formula." onreset={() => ((on = true), (beta = 1), (gamma = 6))}>
  {#snippet controls()}
    <Toggle bind:checked={on} label="add a pair of zeros" />
    <Slider label="real part β" bind:value={beta} min={0.5} max={1} step={0.01} />
    <Slider label="height γ" bind:value={gamma} min={1} max={40} step={0.5} format={(v) => v.toFixed(1)} />
  {/snippet}
  <Plot x={{ domain: [10, XMAX], type: 'log', label: 'x' }} y={{ domain: [0.3, 1.7], label: 'ψ(x)/x' }} height={260} label="psi of x over x, with and without a hypothetical zero.">
    {#snippet marks({ sx, sy })}
      <line class="one" x1={sx(10)} x2={sx(XMAX)} y1={sy(1)} y2={sy(1)} />
      {#if on}<path class="fake" d={path(fake, sx, sy)} />{/if}
      <path class="real" d={path(actual, sx, sy)} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if on}
      The extra wave has relative size about 2x^(β−1)/|ρ| = {(2 * Math.pow(XMAX, beta - 1) / Math.hypot(beta, gamma)).toFixed(3)} at x = 10⁷.
      {beta >= 0.999 ? 'With β = 1 that size never shrinks: ψ(x)/x would oscillate for ever and the prime number theorem would be false.' : `With β = ${beta.toFixed(2)} < 1 it shrinks like x^(${(beta - 1).toFixed(2)}), so ψ(x)/x still tends to 1, just more slowly.`}
    {:else}
      The actual ψ(x)/x: at x = 10⁷ it is {actual[actual.length - 1]![1].toFixed(5)}.
    {/if}
  </p>
</Widget>

<style>
  .one {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .real {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.8;
  }
  .fake {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.4;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
