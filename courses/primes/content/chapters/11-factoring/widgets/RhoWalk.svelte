<!--
  Pollard's ρ, seen modulo the hidden prime p. The walk x ↦ x² + c (mod p) must eventually repeat, so it has a
  tail and a cycle: the letter ρ. Floyd's tortoise moves one step, the hare two; when they meet modulo p,
  gcd(x_tortoise − x_hare, n) reveals p, although we only ever compute modulo n.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { gcd } from '$lib/primes/arith';

  const CASES = [
    { p: 101, q: 113 },
    { p: 211, q: 401 },
    { p: 547, q: 1009 },
    { p: 1009, q: 2003 },
  ];
  let which = $state(1);
  let c = $state(1);
  let x0 = $state(2);
  let step = $state(0);

  const p = $derived(CASES[which]!.p);
  const n = $derived(CASES[which]!.p * CASES[which]!.q);
  /** The walk modulo p, until the first repeat: tail length mu, cycle length lambda. */
  const walk = $derived.by(() => {
    const seen = new Map<number, number>();
    const xs: number[] = [];
    let x = x0 % p;
    while (!seen.has(x)) {
      seen.set(x, xs.length);
      xs.push(x);
      x = (x * x + c) % p;
    }
    const mu = seen.get(x)!;
    return { xs, mu, lambda: xs.length - mu };
  });
  /** Floyd on the walk modulo n: tortoise x_i, hare x_2i, and gcd at each step. */
  const floyd = $derived.by(() => {
    const f = (v: number) => (v * v + c) % n;
    const out: { i: number; t: number; h: number; g: number }[] = [];
    let t = x0 % n;
    let h = x0 % n;
    for (let i = 1; i <= 400; i++) {
      t = f(t);
      h = f(f(h));
      const g = gcd(Math.abs(t - h), n);
      out.push({ i, t, h, g });
      if (g > 1) break;
    }
    return out;
  });
  const done = $derived(floyd.at(-1)!);

  // Geometry: tail drawn as a vertical line rising into a circle for the cycle.
  const W = 360;
  const H = 360;
  const geometry = $derived.by(() => {
    const { mu, lambda } = walk;
    const R = Math.min(130, Math.max(40, lambda * 6));
    const cx = W / 2;
    const cy = 30 + R;
    const tailStep = Math.min(26, (H - (cy + R) - 10) / Math.max(1, mu));
    return walk.xs.map((_, i) => {
      if (i >= mu) {
        const t = (2 * Math.PI * (i - mu)) / lambda + Math.PI / 2;
        return { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) };
      }
      return { x: cx, y: cy + R + (mu - i) * tailStep };
    });
  });
  const tIdx = $derived(Math.min(step, walk.xs.length - 1));
  const posOf = (i: number) => (i < walk.mu ? i : walk.mu + ((i - walk.mu) % walk.lambda));
</script>

<Widget title="The ρ in Pollard’s ρ" subtitle="The walk x → x² + c modulo the hidden prime p. It must repeat within p steps, and by the birthday paradox it usually repeats after about √p." onreset={() => ((step = 0), (c = 1), (x0 = 2))}>
  {#snippet controls()}
    <label class="pick ui">n = <select bind:value={which} onchange={() => (step = 0)}>{#each CASES as k, i (i)}<option value={i}>{k.p * k.q}</option>{/each}</select></label>
    <label class="pick ui">c = <select bind:value={c} onchange={() => (step = 0)}>{#each [1, 2, 3, 5, 7] as v (v)}<option value={v}>{v}</option>{/each}</select></label>
    <div class="btns">
      <Button size="sm" onclick={() => (step = Math.max(0, step - 1))}>Back</Button>
      <Button size="sm" variant="primary" onclick={() => (step = Math.min(done.i, step + 1))}>Step</Button>
    </div>
  {/snippet}
  <div class="cols">
    <svg viewBox="0 0 {W} {H}" role="img" aria-label="The walk modulo {p}: tail of {walk.mu} steps and cycle of {walk.lambda} steps.">
      {#each geometry as g, i (i)}
        {#if i > 0}<line x1={geometry[i - 1]!.x} y1={geometry[i - 1]!.y} x2={g.x} y2={g.y} />{/if}
      {/each}
      <line x1={geometry.at(-1)!.x} y1={geometry.at(-1)!.y} x2={geometry[walk.mu]!.x} y2={geometry[walk.mu]!.y} class="closing" />
      {#each geometry as g, i (i)}
        <circle cx={g.x} cy={g.y} r="3.5" class:start={i === 0} />
      {/each}
      {#if step > 0}
        {@const T = geometry[posOf(step)]!}
        {@const Hh = geometry[posOf(2 * step)]!}
        <circle cx={T.x} cy={T.y} r="9" class="tort" />
        <circle cx={Hh.x} cy={Hh.y} r="6" class="hare" />
      {/if}
    </svg>
    <div class="side ui">
      <p>Hidden from the algorithm: p = <strong>{p}</strong>. Modulo p the walk has a tail of {walk.mu} and a cycle of {walk.lambda} (√p ≈ {Math.sqrt(p).toFixed(0)}).</p>
      <table>
        <thead><tr><th>i</th><th>x<sub>i</sub></th><th>x<sub>2i</sub></th><th>gcd</th></tr></thead>
        <tbody>
          {#each floyd.slice(Math.max(0, step - 6), step) as r (r.i)}
            <tr class:hit={r.g > 1}><td>{r.i}</td><td>{r.t}</td><td>{r.h}</td><td>{r.g}</td></tr>
          {/each}
        </tbody>
      </table>
      {#if step >= done.i && done.g === n}
        <p class="out">This time the walks modulo p and modulo q closed up together, so the gcd is n itself: a failure. Try another c.</p>
      {:else if step >= done.i}
        <p class="out">After {done.i} steps the tortoise (large dot) and the hare (small dot) meet modulo p, and gcd(x<sub>i</sub> − x<sub>2i</sub>, {n}) = <strong>{done.g}</strong>.</p>
      {:else if step === 0}
        <p class="hint">Press <em>Step</em>. The tortoise moves one step along the ρ, the hare two.</p>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  select {
    font-family: var(--font-mono);
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  .btns {
    display: flex;
    gap: 0.4rem;
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 640px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  svg {
    width: 100%;
    height: auto;
    max-width: 360px;
    display: block;
    margin: 0 auto;
  }
  line {
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  line.closing {
    stroke: var(--prime);
    stroke-dasharray: 3 3;
  }
  circle {
    fill: var(--fx-blue);
  }
  circle.start {
    fill: var(--fg);
  }
  .tort {
    fill: none;
    stroke: var(--prime);
    stroke-width: 3;
  }
  .hare {
    fill: var(--fx-yellow);
  }
  .side {
    font-size: 0.82rem;
  }
  .side p {
    margin: 0 0 0.5rem;
  }
  table {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    width: 100%;
  }
  th,
  td {
    text-align: right;
    padding: 0.12rem 0.4rem;
    border-bottom: 1px solid var(--ruling);
  }
  th {
    font-family: var(--font-ui);
  }
  tr.hit td {
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 700;
  }
  .out {
    margin-top: 0.5rem;
  }
  .hint {
    color: var(--mute);
  }
</style>
