<!--
  Diffie–Hellman key exchange with a safe prime p = 2q + 1 and a generator g of the subgroup of order q. Alice and
  Bob publish g^a and g^b; both compute g^(ab). An eavesdropper sees p, g, g^a, g^b and would need a discrete logarithm.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { modPowBig } from '$lib/primes/arith';
  import { isPrime } from '$lib/primes/primality';
  import { randomBits, rng } from '$lib/primes/random';
  import { primesUpTo } from '$lib/primes/sieve';

  const SMALL = primesUpTo(2000).map(BigInt);
  let bits = $state(64);
  let seed = $state(3);

  const setup = $derived.by(() => {
    const r = rng(seed * 31 + bits);
    let q: bigint;
    let p: bigint;
    for (;;) {
      q = randomBits(bits - 1, r) | 1n;
      p = 2n * q + 1n;
      // Cheap filter first: neither q nor 2q + 1 may have a small prime factor.
      if (SMALL.some((s) => (q % s === 0n && q !== s) || p % s === 0n)) continue;
      if (isPrime(q) && isPrime(p)) break;
    }
    const g = 4n; // a square, hence in the subgroup of order q
    const a = 2n + (randomBits(bits - 2, r) % (q - 2n));
    const b = 2n + (randomBits(bits - 2, r) % (q - 2n));
    const A = modPowBig(g, a, p);
    const B = modPowBig(g, b, p);
    return { p, q, g, a, b, A, B, kA: modPowBig(B, a, p), kB: modPowBig(A, b, p) };
  });
  const short = (v: bigint) => {
    const t = v.toString();
    return t.length > 36 ? `${t.slice(0, 16)}…${t.slice(-16)}` : t;
  };
</script>

<Widget title="Diffie–Hellman key exchange" subtitle="Public: a safe prime p = 2q + 1 and g = 4. Alice keeps a secret a and publishes gᵃ; Bob keeps b and publishes gᵇ. Each can compute gᵃᵇ; an eavesdropper cannot, as far as anyone knows.">
  {#snippet controls()}
    <Segmented label="Size of p" bind:value={bits} options={[{ value: 32, label: '32-bit p' }, { value: 64, label: '64-bit' }, { value: 128, label: '128-bit' }, { value: 256, label: '256-bit' }]} size="sm" />
    <Button size="sm" onclick={() => seed++}>New exchange</Button>
  {/snippet}
  <div class="cols mono">
    <div class="who">
      <h5 class="ui">Alice</h5>
      <p>secret a = {short(setup.a)}</p>
      <p>sends A = gᵃ mod p = {short(setup.A)}</p>
      <p>computes Bᵃ = <strong>{short(setup.kA)}</strong></p>
    </div>
    <div class="who pub">
      <h5 class="ui">Public channel</h5>
      <p>p = {short(setup.p)}</p>
      <p>g = 4</p>
      <p>A, B</p>
    </div>
    <div class="who">
      <h5 class="ui">Bob</h5>
      <p>secret b = {short(setup.b)}</p>
      <p>sends B = gᵇ mod p = {short(setup.B)}</p>
      <p>computes Aᵇ = <strong>{short(setup.kB)}</strong></p>
    </div>
  </div>
  <p class="out">{setup.kA === setup.kB ? 'The two computed keys agree: (gᵇ)ᵃ = (gᵃ)ᵇ.' : 'Mismatch (this should never happen).'}</p>
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.8rem;
    font-size: 0.78rem;
  }
  .who {
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
  }
  .who.pub {
    background: var(--pn);
  }
  h5 {
    margin: 0 0 0.3rem;
    font-size: 0.85rem;
  }
  .who p {
    margin: 0.15rem 0;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
