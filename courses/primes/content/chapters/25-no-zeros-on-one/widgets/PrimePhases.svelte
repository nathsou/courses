<!--
  The intuition behind ζ(1 + it) ≠ 0. log|ζ(s)| ≈ Σ_p cos(t log p)/p^σ: the primes vote with the phases p^(−it). For
  ζ(1 + it) to vanish, the votes would have to lean towards −1 (cos(t log p) < 0) strongly enough to make the sum
  diverge to −∞. But then the phases at 2t, which are the squares, lean towards +1, and ζ(1 + 2it) would blow up,
  which it cannot do. Left: phases at t. Right: phases at 2t. Dot size ∝ 1/p.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { primesUpTo } from '$lib/primes/sieve';

  let t = $state(14.13);
  const PS = primesUpTo(2000);
  const W = 220;
  const R = 90;
  const sums = $derived.by(() => {
    let a = 0;
    let b = 0;
    for (const p of PS) {
      a += Math.cos(t * Math.log(p)) / p;
      b += Math.cos(2 * t * Math.log(p)) / p;
    }
    return { a, b };
  });
  const dots = (k: number) =>
    PS.slice(0, 120).map((p) => {
      const ang = -k * t * Math.log(p);
      return { p, x: W / 2 + R * Math.cos(ang), y: W / 2 - R * Math.sin(ang), r: Math.max(1.5, 14 / Math.sqrt(p)), neg: Math.cos(ang) < 0 };
    });
  const d1 = $derived(dots(1));
  const d2 = $derived(dots(2));
</script>

<Widget title="How the primes vote" subtitle="Each prime p sits on the unit circle at the angle −t log p (the direction of p^(−it)), with weight 1/p. Their weighted sum of cosines is roughly log|ζ(1 + it)|. Left: at t. Right: at 2t, where every angle is doubled." onreset={() => (t = 14.13)}>
  {#snippet controls()}
    <Slider label="t" bind:value={t} min={0.5} max={60} step={0.01} />
  {/snippet}
  <div class="pair">
    {#each [{ d: d1, label: 'p^(−it)', s: sums.a }, { d: d2, label: 'p^(−2it)', s: sums.b }] as panel (panel.label)}
      <figure>
        <svg viewBox="0 0 {W} {W}" role="img" aria-label="Phases {panel.label} of the first 120 primes.">
          <circle class="ring" cx={W / 2} cy={W / 2} r={R} />
          <line class="axis" x1={W / 2 - R - 10} x2={W / 2 + R + 10} y1={W / 2} y2={W / 2} />
          <line class="axis" y1={W / 2 - R - 10} y2={W / 2 + R + 10} x1={W / 2} x2={W / 2} />
          {#each panel.d as q (q.p)}<circle cx={q.x} cy={q.y} r={q.r} class:neg={q.neg} class="dot" />{/each}
          <text x={W / 2 + R + 4} y={W / 2 - 4}>+1</text>
          <text x={W / 2 - R - 18} y={W / 2 - 4}>−1</text>
        </svg>
        <figcaption>{panel.label}: Σ cos/p over p ≤ 2000 = <strong>{panel.s.toFixed(3)}</strong></figcaption>
      </figure>
    {/each}
  </div>
  <p class="out">
    Red dots point left (negative cosine). Small primes carry the most weight. At t ≈ 14.1 the small primes lean left, which is why |ζ(1 + it)| is smallest there; but doubling their angles sends 2, 3 and 5 to the right half, and the sum at 2t is positive. The combination 3 + 4 cos θ + cos 2θ = 2(1 + cos θ)² ≥ 0 makes this trade-off exact: here 3·Σ1/p + 4·({sums.a.toFixed(2)}) + ({sums.b.toFixed(2)}) = {(3 * PS.reduce((s, p) => s + 1 / p, 0) + 4 * sums.a + sums.b).toFixed(2)} ≥ 0.
  </p>
</Widget>

<style>
  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1rem;
  }
  figure {
    margin: 0;
  }
  svg {
    width: 100%;
    max-width: 260px;
    display: block;
    margin: 0 auto;
    font-family: var(--font-mono);
  }
  .ring {
    fill: none;
    stroke: var(--rule);
  }
  .axis {
    stroke: var(--ruling);
  }
  .dot {
    fill: var(--fx-blue);
    opacity: 0.75;
  }
  .dot.neg {
    fill: var(--prime);
  }
  text {
    font-size: 10px;
    fill: var(--mute);
  }
  figcaption {
    text-align: center;
    font-size: 0.82rem;
    margin-top: 0.3rem;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
