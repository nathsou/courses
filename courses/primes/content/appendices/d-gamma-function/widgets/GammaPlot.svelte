<!--
  Γ on the real line: it passes through the factorials (n − 1)! at the positive integers, has simple poles at
  0, −1, −2, … with residues (−1)^k/k!, and is never zero. The toggle shows 1/Γ, which is entire.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { gammaReal } from '$lib/primes/gamma';

  let reciprocal = $state(false);
  let hover = $state<number | null>(null);
  const LO = -4.6;
  const HI = 5.2;
  const Y = 7;
  const segments = $derived.by(() => {
    const segs: [number, number][][] = [];
    let cur: [number, number][] = [];
    const n = 2400;
    for (let i = 0; i <= n; i++) {
      const x = LO + ((HI - LO) * i) / n;
      const nearPole = x <= 0 && Math.abs(x - Math.round(x)) < 1e-3;
      if (nearPole && !reciprocal) {
        if (cur.length) segs.push(cur);
        cur = [];
        continue;
      }
      const g = nearPole ? Infinity : gammaReal(x);
      const v = reciprocal ? (Number.isFinite(g) ? 1 / g : 0) : g;
      if (Math.abs(v) > Y * 1.5) {
        if (cur.length) segs.push(cur);
        cur = [];
        continue;
      }
      cur.push([x, v]);
    }
    if (cur.length) segs.push(cur);
    return segs;
  });
  const facts = [1, 2, 3, 4, 5].map((n) => [n, [1, 1, 2, 6, 24][n - 1]!] as [number, number]);
  const valueAt = (x: number) => {
    if (x <= 0 && Math.abs(x - Math.round(x)) < 1e-6) return reciprocal ? '0' : 'pole';
    const g = gammaReal(x);
    return (reciprocal ? 1 / g : g).toPrecision(5);
  };
</script>

<Widget title="The Gamma function on the real line" subtitle="Γ(x) interpolates the factorials, Γ(n) = (n − 1)!, and has a pole at each of 0, −1, −2, … It never touches 0, so 1/Γ is an entire function with zeros exactly at those points." onreset={() => (reciprocal = false)}>
  {#snippet controls()}
    <Toggle bind:checked={reciprocal} label="show 1/Γ(x)" />
  {/snippet}
  <Plot x={{ domain: [LO, HI], label: 'x' }} y={{ domain: [-Y, Y], label: reciprocal ? '1/Γ(x)' : 'Γ(x)' }} height={280} label="The Gamma function for real x." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="axis" x1={sx(LO)} x2={sx(HI)} y1={sy(0)} y2={sy(0)} />
      <line class="axis" x1={sx(0)} x2={sx(0)} y1={sy(-Y)} y2={sy(Y)} />
      {#if !reciprocal}
        {#each [0, -1, -2, -3, -4] as k (k)}<line class="pole" x1={sx(k)} x2={sx(k)} y1={sy(-Y)} y2={sy(Y)} />{/each}
      {/if}
      {#each segments as seg, i (i)}
        <path class="g" d={'M' + seg.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-Y * 1.5, Math.min(Y * 1.5, b))).toFixed(1)}`).join('L')} />
      {/each}
      {#if !reciprocal}
        {#each facts as [n, f] (n)}{#if f <= Y}<circle cx={sx(n)} cy={sy(f)} r="4" class="fact" />{/if}{/each}
      {/if}
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if hover !== null}x = {hover.toFixed(3)}: {reciprocal ? '1/Γ(x)' : 'Γ(x)'} = {valueAt(hover)}.{:else}Dots: Γ(1) = 0! = 1, Γ(2) = 1! = 1, Γ(3) = 2! = 2, Γ(4) = 3! = 6. Between the poles Γ alternates in sign; its minimum on the positive axis is Γ(1.4616…) = 0.8856…{/if}
  </p>
</Widget>

<style>
  .axis {
    stroke: var(--rule);
  }
  .pole {
    stroke: var(--bad);
    stroke-dasharray: 3 3;
    opacity: 0.7;
  }
  .g {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 2;
  }
  .fact {
    fill: var(--prime);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
