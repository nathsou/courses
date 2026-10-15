<!--
  The Lucas–Lehmer test on M_p = 2^p − 1, live: s₀ = 4, s_{k+1} = s_k² − 2 mod M_p, and M_p is prime exactly when
  s_{p−2} = 0. Shows the sequence for small p and times the whole test for exponents up to a few thousand.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { lucasLehmerTrace, isPrimeTrial } from '$lib/primes/primality';

  const PRESETS = [7, 11, 13, 31, 61, 67, 127, 521, 607, 1279, 2203, 4253, 4423];
  let p = $state(13);
  let timing = $state<{ p: number; prime: boolean; ms: number } | null>(null);

  const trace = $derived(p <= 130 ? lucasLehmerTrace(p) : null);
  const M = $derived((1n << BigInt(p)) - 1n);

  function runFull() {
    const P = BigInt(p);
    const mask = M;
    const t = performance.now();
    let s = 4n;
    for (let i = 0; i < p - 2; i++) {
      s = s * s - 2n;
      s = (s & mask) + (s >> P);
      if (s >= mask) s -= mask;
    }
    timing = { p, prime: s === 0n, ms: performance.now() - t };
  }
  const short = (v: bigint) => {
    const t = v.toString();
    return t.length > 26 ? `${t.slice(0, 10)}…${t.slice(-10)}` : t;
  };
</script>

<Widget title="The Lucas–Lehmer test" subtitle="Start at 4; square and subtract 2, reducing modulo 2ᵖ − 1, p − 2 times. The result is 0 exactly when 2ᵖ − 1 is prime.">
  {#snippet controls()}
    <div class="presets ui" role="group" aria-label="Exponents">
      {#each PRESETS as q (q)}<button class:on={p === q} onclick={() => ((p = q), (timing = null))}>p = {q}</button>{/each}
    </div>
  {/snippet}
  {#if !isPrimeTrial(p)}
    <p>p must be prime: if p = ab then 2ᵃ − 1 divides 2ᵖ − 1.</p>
  {:else}
    <p class="m">M<sub>{p}</sub> = 2<sup>{p}</sup> − 1 = {short(M)} ({M.toString().length} digits)</p>
    {#if trace}
      <ol class="seq" start="0">
        {#each trace as s, i (i)}<li class:zero={s === 0n}><span class="k">s<sub>{i}</sub></span> {short(s)}</li>{/each}
      </ol>
      <p class="out" class:prime={trace.at(-1) === 0n}>
        s<sub>{p - 2}</sub> {trace.at(-1) === 0n ? '= 0, so M' : '≠ 0, so M'}<sub>{p}</sub> is {trace.at(-1) === 0n ? 'prime' : 'composite'}.
      </p>
    {:else}
      <Button variant="primary" onclick={runFull}>Run {p - 2} squarings</Button>
      {#if timing && timing.p === p}
        <p class="out" class:prime={timing.prime}>M<sub>{p}</sub> is {timing.prime ? 'prime' : 'composite'}: {p - 2} squarings of {p}-bit numbers took {timing.ms.toFixed(0)} ms.</p>
      {/if}
    {/if}
  {/if}
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .presets button {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    cursor: pointer;
  }
  .presets button.on {
    background: var(--fg);
    color: var(--bg);
  }
  .m {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    margin: 0 0 0.5rem;
    overflow-wrap: anywhere;
  }
  .seq {
    list-style: none;
    padding: 0;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    max-height: 16rem;
    overflow: auto;
    columns: 2 18rem;
  }
  .seq li {
    padding: 0.1rem 0;
  }
  .k {
    display: inline-block;
    min-width: 3rem;
    color: var(--mute);
  }
  .seq li.zero {
    color: var(--ok);
    font-weight: 700;
  }
  .out {
    margin: 0.7rem 0 0;
    padding: 0.4rem 0.7rem;
    border-left: 3px solid var(--bad);
    background: var(--bad-soft);
    font-size: 0.88rem;
  }
  .out.prime {
    border-color: var(--ok);
    background: var(--ok-soft);
  }
</style>
