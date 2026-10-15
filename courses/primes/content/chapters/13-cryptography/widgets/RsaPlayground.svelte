<!--
  RSA end to end: generate two random primes of the chosen size, publish (n, e), encrypt a short message as a
  number m < n, decrypt with d — directly, and with the Chinese remainder theorem, which is about four times faster.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { modInverseBig, modPowBig, gcdBig } from '$lib/primes/arith';
  import { nextPrime } from '$lib/primes/primality';
  import { randomBits, rng } from '$lib/primes/random';

  let bits = $state(512);
  let seed = $state(7);
  let message = $state('Squeamish ossifrage');

  const keys = $derived.by(() => {
    const r = rng(seed * 1009 + bits);
    const e = 65537n;
    const half = bits / 2;
    for (;;) {
      const p = nextPrime(randomBits(half, r) | 1n);
      const q = nextPrime(randomBits(half, r) | 1n);
      if (p === q) continue;
      const phi = (p - 1n) * (q - 1n);
      if (gcdBig(e, phi) !== 1n) continue;
      const d = modInverseBig(e, phi)!;
      return { p, q, n: p * q, e, d };
    }
  });
  const encoded = $derived.by(() => {
    let m = 0n;
    for (const b of new TextEncoder().encode(message)) m = (m << 8n) | BigInt(b);
    return m;
  });
  const fits = $derived(encoded < keys.n);
  const timed = $derived.by(() => {
    if (!fits) return null;
    const { n, e, d, p, q } = keys;
    const c = modPowBig(encoded, e, n);
    let t = performance.now();
    const reps = bits <= 512 ? 20 : 4;
    let m1 = 0n;
    for (let i = 0; i < reps; i++) m1 = modPowBig(c, d, n);
    const direct = (performance.now() - t) / reps;
    // CRT: m_p = c^(d mod p−1) mod p, m_q likewise, then combine (Garner).
    const qinv = modInverseBig(q, p)!;
    t = performance.now();
    let m2 = 0n;
    for (let i = 0; i < reps; i++) {
      const mp = modPowBig(c, d % (p - 1n), p);
      const mq = modPowBig(c, d % (q - 1n), q);
      const h = (((mp - mq) % p) + p) % p * qinv % p;
      m2 = mq + h * q;
    }
    const crt = (performance.now() - t) / reps;
    return { c, m1, m2, direct, crt };
  });
  const decoded = (m: bigint) => {
    const bytes: number[] = [];
    while (m > 0n) {
      bytes.unshift(Number(m & 255n));
      m >>= 8n;
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  };
  const short = (v: bigint) => {
    const t = v.toString();
    return t.length > 40 ? `${t.slice(0, 18)}…${t.slice(-18)}` : t;
  };
</script>

<Widget title="RSA from scratch" subtitle="Two random primes, a public key (n, e), a private key d. Encryption is m ↦ mᵉ mod n; decryption is c ↦ cᵈ mod n." onreset={() => ((seed = 7), (message = 'Squeamish ossifrage'))}>
  {#snippet controls()}
    <Segmented label="Key size" bind:value={bits} options={[{ value: 128, label: '128-bit n' }, { value: 512, label: '512-bit' }, { value: 1024, label: '1024-bit' }, { value: 2048, label: '2048-bit' }]} size="sm" />
    <Button size="sm" onclick={() => seed++}>New primes</Button>
    <label class="msg ui">message <input bind:value={message} maxlength="200" /></label>
  {/snippet}
  <dl class="kv mono">
    <dt>p</dt><dd>{short(keys.p)}</dd>
    <dt>q</dt><dd>{short(keys.q)}</dd>
    <dt>n = pq</dt><dd>{short(keys.n)} <span class="mute">({keys.n.toString(2).length} bits)</span></dd>
    <dt>e</dt><dd>65537</dd>
    <dt>d = e⁻¹ mod (p−1)(q−1)</dt><dd>{short(keys.d)}</dd>
    <dt>m (message as a number)</dt><dd>{short(encoded)}</dd>
    {#if timed}
      <dt>c = mᵉ mod n</dt><dd>{short(timed.c)}</dd>
      <dt>cᵈ mod n</dt><dd>{short(timed.m1)} → “{decoded(timed.m1)}” <span class="mute">({timed.direct.toFixed(1)} ms)</span></dd>
      <dt>with the CRT</dt><dd>{short(timed.m2)} → “{decoded(timed.m2)}” <span class="mute">({timed.crt.toFixed(1)} ms, {(timed.direct / Math.max(timed.crt, 1e-3)).toFixed(1)}× faster)</span></dd>
    {/if}
  </dl>
  {#if !fits}<p class="bad">The message is too long for this key: as a number it must be smaller than n. Use a bigger key or a shorter message.</p>{/if}
</Widget>

<style>
  .msg {
    display: inline-flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    flex: 1;
    min-width: 12rem;
  }
  .msg input {
    font: inherit;
    font-size: 0.9rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--ink);
  }
  .kv {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 0.25rem 1rem;
    margin: 0;
    font-size: 0.78rem;
  }
  dt {
    color: var(--mute);
    font-family: var(--font-ui);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .mute {
    color: var(--mute);
  }
  .bad {
    color: var(--bad);
    font-size: 0.85rem;
  }
</style>
