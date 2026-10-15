<!--
  Poisson summation for a Gaussian. Left: f(u) = e^(−π x u²) sampled at the integers; the samples add up to θ(x).
  Right: its Fourier transform f̂(v) = x^(−1/2) e^(−π v²/x) sampled at the integers; the samples add up to θ(1/x)/√x.
  The two totals agree for every x > 0, which is the theta transformation formula. A narrow bell on one side is a
  wide bell on the other.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  let x = $state(0.4);
  const K = 6;
  const ns = Array.from({ length: 2 * K + 1 }, (_, i) => i - K);
  const theta = (y: number) => {
    let s = 1;
    for (let n = 1; n < 200; n++) {
      const term = 2 * Math.exp(-Math.PI * n * n * y);
      s += term;
      if (term < 1e-17) break;
    }
    return s;
  };
  const f = (u: number) => Math.exp(-Math.PI * x * u * u);
  const g = (v: number) => Math.exp((-Math.PI * v * v) / x) / Math.sqrt(x);
  const left = $derived(theta(x));
  const right = $derived(theta(1 / x) / Math.sqrt(x));
  const termsNeeded = (y: number) => {
    let n = 0;
    while (2 * Math.exp(-Math.PI * (n + 1) ** 2 * y) > 1e-12 * theta(y)) n++;
    return n;
  };

  const W = 300;
  const H = 170;
  const yMax = $derived(Math.max(1.05, 1.05 / Math.sqrt(x)));
  const X = (u: number) => W / 2 + (u / (K + 0.5)) * (W / 2 - 6);
  const Y = (v: number) => H - 6 - (v / yMax) * (H - 16);
  const curve = (h: (u: number) => number) => 'M' + Array.from({ length: 241 }, (_, i) => -K - 0.5 + (i * (2 * K + 1)) / 240).map((u) => `${X(u).toFixed(1)},${Y(h(u)).toFixed(1)}`).join('L');
</script>

<Widget title="Poisson summation for a bell curve" subtitle="Sample a Gaussian at the integers and add up the samples; then do the same with its Fourier transform. The two totals are always equal. That is θ(1/x) = √x θ(x)." onreset={() => (x = 0.4)}>
  {#snippet controls()}
    <Slider label="width parameter x" bind:value={x} min={0.05} max={4} step={0.01} log />
  {/snippet}
  <div class="panels">
    <figure>
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="The Gaussian e to the minus pi x u squared, sampled at the integers.">
        <line class="base" x1="0" x2={W} y1={Y(0)} y2={Y(0)} />
        <path d={curve(f)} />
        {#each ns as n (n)}
          <line class="stick" x1={X(n)} x2={X(n)} y1={Y(0)} y2={Y(f(n))} />
          <circle cx={X(n)} cy={Y(f(n))} r="2.5" />
        {/each}
      </svg>
      <figcaption>
        <span class="mono">f(u) = e<sup>−πxu²</sup></span><br />
        Σ f(n) = θ(x) = <strong class="mono">{left.toFixed(10)}</strong><br />
        <span class="small">{termsNeeded(x)} terms on each side for 12 digits</span>
      </figcaption>
    </figure>
    <figure>
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="Its Fourier transform, sampled at the integers.">
        <line class="base" x1="0" x2={W} y1={Y(0)} y2={Y(0)} />
        <path class="g" d={curve(g)} />
        {#each ns as n (n)}
          <line class="stick g" x1={X(n)} x2={X(n)} y1={Y(0)} y2={Y(g(n))} />
          <circle class="g" cx={X(n)} cy={Y(g(n))} r="2.5" />
        {/each}
      </svg>
      <figcaption>
        <span class="mono">f̂(v) = x<sup>−1/2</sup> e<sup>−πv²/x</sup></span><br />
        Σ f̂(n) = θ(1/x)/√x = <strong class="mono">{right.toFixed(10)}</strong><br />
        <span class="small">{termsNeeded(1 / x)} terms on each side for 12 digits</span>
      </figcaption>
    </figure>
  </div>
  <p class="out">When x is small the left bell is wide and its sum needs many terms, while the right bell is narrow and its sum is almost just the middle term 1/√x. Riemann used exactly this trade to continue ζ.</p>
</Widget>

<style>
  .panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1rem;
  }
  figure {
    margin: 0;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    background: var(--chart-surface);
    border: 1px solid var(--rule);
  }
  .base {
    stroke: var(--ruling);
  }
  path {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.5;
  }
  path.g {
    stroke: var(--series-4);
  }
  .stick {
    stroke: var(--fx-blue);
    stroke-width: 1.5;
    opacity: 0.6;
  }
  .stick.g {
    stroke: var(--series-4);
  }
  circle {
    fill: var(--prime);
  }
  circle.g {
    fill: var(--prime);
  }
  figcaption {
    font-size: 0.84rem;
    margin-top: 0.4rem;
    line-height: 1.5;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .small {
    color: var(--mute);
    font-size: 0.78rem;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
