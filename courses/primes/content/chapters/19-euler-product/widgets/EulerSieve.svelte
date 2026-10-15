<!--
  Euler's product as a sieve. The bars are the terms n^(−s) of ζ(s). Multiplying the series by (1 − 2^(−s))
  deletes every term with a factor 2, multiplying by (1 − 3^(−s)) deletes the multiples of 3, and so on: what is
  left is 1 plus terms with only large prime factors, so ζ(s) · Π(1 − p^(−s)) → 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { zetaReal } from '$lib/primes/zeta';

  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const N = 48;
  let s = $state(1.5);
  let applied = $state(0);

  const used = $derived(PRIMES.slice(0, applied));
  const removedBy = (n: number) => used.find((p) => n % p === 0);
  const z = $derived(zetaReal(s));
  const product = $derived(used.reduce((acc, p) => acc * (1 - p ** -s), 1));
  const remaining = $derived(z * product);
  const W = 640;
  const H = 180;
  const bw = W / N;
  const Y_MAX = 0.5;
  const scaleY = (v: number) => (Math.min(v, Y_MAX) / Y_MAX) * (H - 8);
</script>

<Widget title="Euler’s product is a sieve" subtitle="The bars are the terms 1/nˢ of ζ(s) (the first, 1, is cut short). Multiplying the whole series by (1 − p⁻ˢ) deletes every term divisible by p. What survives tends to the single term 1." onreset={() => ((s = 1.5), (applied = 0))}>
  {#snippet controls()}
    <Slider label="s" bind:value={s} min={1.1} max={3} step={0.05} />
    <Button size="sm" onclick={() => (applied = Math.min(PRIMES.length, applied + 1))} disabled={applied >= PRIMES.length}>Multiply by (1 − {PRIMES[Math.min(applied, PRIMES.length - 1)]}⁻ˢ)</Button>
    <Button size="sm" variant="ghost" onclick={() => (applied = 0)} disabled={applied === 0}>Start again</Button>
  {/snippet}
  <svg viewBox="0 0 {W} {H + 22}" class="plot" role="img" aria-label="Terms 1 over n to the s for n up to {N}; terms divisible by the first {applied} primes are removed.">
    {#each Array.from({ length: N }, (_, i) => i + 1) as n (n)}
      {@const h = scaleY(n ** -s)}
      {@const gone = removedBy(n)}
      <rect x={(n - 1) * bw + 1} y={H - h} width={bw - 2} height={Math.max(0.5, h)} class:gone={gone !== undefined} class:one={n === 1}>
        <title>1/{n}ˢ = {(n ** -s).toFixed(4)}{gone ? ` (removed by ${gone})` : ''}</title>
      </rect>
      {#if n === 1}<path class="brk" d="M{bw * 0.1},{14} l{bw * 0.8},-5 M{bw * 0.1},{20} l{bw * 0.8},-5" />{/if}
      {#if n <= 10 || n % 6 === 0}<text x={(n - 0.5) * bw} y={H + 15} text-anchor="middle">{n}</text>{/if}
    {/each}
  </svg>
  <dl class="readout">
    <div><dt>series</dt><dd class="mono">{applied ? `ζ(s) · Π(1 − p⁻ˢ), p ≤ ${used[used.length - 1]}` : 'ζ(s)'}</dd></div>
    <div><dt>sum of what is left</dt><dd class="mono">{remaining.toFixed(5)}</dd></div>
    <div><dt>1 / Π(1 − p⁻ˢ)</dt><dd class="mono">{(1 / product).toFixed(5)}</dd></div>
    <div><dt>ζ(s)</dt><dd class="mono">{z.toFixed(5)}</dd></div>
  </dl>
  <p class="out">
    {#if applied === 0}
      Nothing removed yet: the sum is ζ(s). Press the button to multiply by the first factor.
    {:else}
      The surviving terms are 1 and the 1/nˢ with no prime factor up to {used[used.length - 1]}; the next one is 1/{PRIMES[applied] ?? 53}ˢ. Their total is {remaining.toFixed(5)}, so ζ(s) is the product 1/Π(1 − p⁻ˢ) up to a factor of {remaining.toFixed(5)}. Closer to s = 1 the convergence is slower.
    {/if}
  </p>
</Widget>

<style>
  .plot {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-mono);
  }
  rect {
    fill: var(--fx-blue);
    transition: fill 0.25s, opacity 0.25s;
  }
  rect.one {
    fill: var(--prime);
  }
  .brk {
    stroke: var(--surface);
    stroke-width: 2.5;
    fill: none;
  }
  rect.gone {
    fill: var(--ruling);
    opacity: 0.6;
  }
  text {
    font-size: 10px;
    fill: var(--mute);
  }
  .readout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.5rem;
    margin: 0.6rem 0 0;
  }
  .readout div {
    border: 1px solid var(--rule);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.55rem;
  }
  dt {
    font-family: var(--font-ui);
    font-size: 0.72rem;
    color: var(--mute);
  }
  dd {
    margin: 0.1rem 0 0;
    font-size: 0.86rem;
    overflow-wrap: anywhere;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
