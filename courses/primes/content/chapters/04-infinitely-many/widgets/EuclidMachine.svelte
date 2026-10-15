<!--
  Euclid's construction as a machine: multiply the primes found so far, add one, factor the result, and adopt its
  smallest prime factor. Starting from {2} this is the Euclid–Mullin sequence. Factoring has a time budget, so the
  machine stalls once a number is too hard to factor in a browser, which is part of the lesson.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { factorWithin } from '$lib/primes/factor';

  interface Step {
    list: bigint[];
    N: bigint;
    factors: [bigint, number][] | null;
    pick: bigint | null;
  }

  let steps = $state<Step[]>([]);
  let busy = $state(false);

  function reset() {
    steps = [];
    busy = false;
  }

  function next() {
    const list = steps.length ? [...steps.at(-1)!.list, steps.at(-1)!.pick!] : [2n];
    const N = list.reduce((a, b) => a * b, 1n) + 1n;
    const step: Step = { list, N, factors: null, pick: null };
    steps = [...steps, step];
    busy = true;
    // Let the UI paint before factoring.
    setTimeout(() => {
      const f = factorWithin(N, 2000);
      const s = steps.at(-1)!;
      s.factors = f;
      s.pick = f ? f[0]![0] : null;
      steps = [...steps];
      busy = false;
    }, 30);
  }

  const last = $derived(steps.at(-1));
  const canContinue = $derived(!busy && (!last || last.pick !== null));
  const short = (n: bigint) => {
    const s = n.toString();
    return s.length > 28 ? `${s.slice(0, 12)}…${s.slice(-12)} (${s.length} digits)` : s;
  };
</script>

<Widget title="Euclid’s machine" subtitle="Multiply the primes found so far and add 1. None of them divides the result, so its prime factors are new. Keep one and repeat." onreset={reset}>
  {#snippet controls()}
    <Button variant="primary" onclick={next} disabled={!canContinue}>{steps.length ? 'Next prime' : 'Start from {2}'}</Button>
    <span class="rule ui">Keeps the smallest new prime factor each time.</span>
  {/snippet}
  {#if !steps.length}
    <p class="hint">Press <em>Start</em>. The primes found so far: {'{'}2{'}'}.</p>
  {:else}
    <ol class="steps">
      {#each steps as s, i (i)}
        <li>
          <span class="calc">{s.list.length > 6 ? `${s.list.slice(0, 3).join(' · ')} ⋯ ${s.list.at(-1)}` : s.list.join(' · ')} + 1 = {short(s.N)}</span>
          {#if s.factors}
            <span class="f">= {s.factors.map(([p, e]) => (e > 1 ? `${short(p)}^${e}` : short(p))).join(' · ')}</span>
            <span class="pick">→ {short(s.pick!)}</span>
          {:else if i === steps.length - 1 && busy}
            <span class="f">factoring…</span>
          {:else}
            <span class="f stuck">too hard to factor in a browser in two seconds — but it has a new prime factor all the same</span>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</Widget>

<style>
  .rule {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .steps {
    margin: 0;
    padding-left: 1.6rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .steps li {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--ruling);
    overflow-wrap: anywhere;
  }
  .calc {
    color: var(--ink-2);
  }
  .f {
    margin-left: 0.4rem;
  }
  .stuck {
    color: var(--mute);
    font-style: italic;
  }
  .pick {
    margin-left: 0.4rem;
    color: var(--accent);
    font-weight: 700;
  }
  .hint {
    color: var(--mute);
  }
</style>
