<!--
  How many random candidates does it take to find a k-bit prime? Draw random odd k-bit numbers until one passes
  Miller–Rabin; compare the average with the prediction log(2^k)/2 that the prime number theorem gives for odd numbers.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { isPrime } from '$lib/primes/primality';
  import { randomBits, rng } from '$lib/primes/random';

  let bits = $state(512);
  let seed = 1;
  let results = $state<number[]>([]);
  let ms = $state(0);
  let running = $state(false);

  const predicted = $derived((bits * Math.LN2) / 2);

  async function hunt() {
    running = true;
    results = [];
    const r = rng(seed++);
    const t = performance.now();
    for (let trial = 0; trial < 10; trial++) {
      await new Promise((res) => setTimeout(res, 0));
      let tries = 0;
      for (;;) {
        tries++;
        const c = randomBits(bits, r) | 1n;
        if (isPrime(c)) break;
      }
      results = [...results, tries];
    }
    ms = performance.now() - t;
    running = false;
  }
  const mean = $derived(results.length ? results.reduce((a, b) => a + b, 0) / results.length : 0);
</script>

<Widget title="Hunting for a large prime" subtitle="Pick random odd numbers with the chosen number of bits until one passes Miller–Rabin. Repeat ten times.">
  {#snippet controls()}
    <Segmented label="Bits" bind:value={bits} options={[{ value: 256, label: '256 bits' }, { value: 512, label: '512' }, { value: 1024, label: '1024' }]} onchange={() => (results = [])} size="sm" />
    <Button variant="primary" onclick={hunt} disabled={running}>{running ? 'Hunting…' : 'Find ten primes'}</Button>
  {/snippet}
  {#if results.length}
    <p class="tries mono">{results.join(', ')}{running ? ', …' : ''}</p>
    <p class="out">
      Average: <strong>{mean.toFixed(0)}</strong> odd candidates per prime. The prime number theorem predicts about log(2<sup>{bits}</sup>)/2 ≈ {predicted.toFixed(0)}.
      {#if !running}Total time: {(ms / 1000).toFixed(1)} s for ten {bits}-bit primes.{/if}
    </p>
  {:else}
    <p class="hint">Press the button. 1024-bit primes take a few seconds.</p>
  {/if}
</Widget>

<style>
  .mono {
    font-family: var(--font-mono);
  }
  .tries {
    font-size: 0.85rem;
    margin: 0 0 0.4rem;
  }
  .out {
    margin: 0;
    font-size: 0.88rem;
  }
  .hint {
    color: var(--mute);
    font-size: 0.85rem;
  }
</style>
