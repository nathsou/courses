<!--
  Gauss's observation, measured: count the primes in a window [x, x + Δ) anywhere up to 10^15 (with a segmented
  sieve) and compare with Δ / log x.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { countPrimesInRange } from '$lib/primes/sieve';

  let logx = $state(6);
  const DELTA = 100_000;
  const x = $derived(Math.round(10 ** logx));
  const count = $derived(countPrimesInRange(x, x + DELTA - 1));
  const predicted = $derived(DELTA / Math.log(x + DELTA / 2));
  const fmt = (v: number) => v.toLocaleString('en-GB');
  const sci = (v: number) => {
    const e = Math.floor(Math.log10(v));
    const m = v / 10 ** e;
    return e < 5 ? fmt(v) : `${m.toFixed(2)} × 10${String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)}`;
  };
</script>

<Widget title="How dense are the primes near x?" subtitle="Count the primes among the 100,000 numbers starting at x, and compare with 100,000 / log x." onreset={() => (logx = 6)}>
  {#snippet controls()}
    <Slider label="x (log scale)" bind:value={logx} min={3} max={15} step={0.25} format={(v) => sci(10 ** v)} />
  {/snippet}
  <div class="row">
    <div class="stat"><span class="k">primes in [x, x + 10⁵)</span><span class="v">{fmt(count)}</span></div>
    <div class="stat"><span class="k">10⁵ / log x</span><span class="v">{fmt(Math.round(predicted))}</span></div>
    <div class="stat"><span class="k">one in every</span><span class="v">{(DELTA / count).toFixed(2)}</span></div>
    <div class="stat"><span class="k">log x</span><span class="v">{Math.log(x).toFixed(2)}</span></div>
  </div>
  <p class="out">Near {sci(x)}, about one number in {(DELTA / count).toFixed(1)} is prime, and log x = {Math.log(x).toFixed(1)}. The ratio of actual to predicted is {(count / predicted).toFixed(3)}.</p>
</Widget>

<style>
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.6rem;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius-sm);
  }
  .k {
    font-size: 0.72rem;
    color: var(--mute);
  }
  .v {
    font-family: var(--font-mono);
    font-size: 1.15rem;
    color: var(--ink);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
