<!--
  The quadratic sieve in miniature. (1) Factor base: primes p ≤ B for which n is a square mod p. (2) Relations:
  x near √n with Q(x) = x² − n smooth over the base. (3) Linear algebra mod 2: a set of relations whose exponent
  vectors add up to even numbers. (4) Then X² ≡ Y² (mod n) and gcd(X − Y, n) is (usually) a factor.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { gcdBig, isqrt, modBig } from '$lib/primes/arith';
  import { primesUpTo } from '$lib/primes/sieve';
  import { legendre } from '$lib/primes/primality';

  const PRESETS = [1649, 2041, 15347, 87463, 1000009, 99799811];
  let n = $state(1649);
  let B = $state(20);

  interface Rel {
    x: number;
    q: number;
    exps: number[];
  }

  const run = $derived.by(() => {
    const base = primesUpTo(B).filter((p) => p === 2 || legendre(n % p, p) === 1);
    const start = isqrt(n) + (isqrt(n) ** 2 === n ? 0 : 1);
    const candidates: { x: number; q: number; smooth: Rel | null }[] = [];
    const rels: Rel[] = [];
    for (let x = start; x < start + 4000 && rels.length < base.length + 3; x++) {
      const q = x * x - n;
      let r = q;
      const exps = base.map((p) => {
        let e = 0;
        while (r % p === 0) {
          r /= p;
          e++;
        }
        return e;
      });
      const rel = r === 1 ? { x, q, exps } : null;
      if (rel) rels.push(rel);
      if (candidates.length < 60) candidates.push({ x, q, smooth: rel });
    }
    // Gaussian elimination over GF(2) on the parity vectors, tracking combinations (as bitmasks of relations).
    const rows = rels.map((r, i) => ({ v: r.exps.reduce((m, e, j) => (e % 2 ? m | (1n << BigInt(j)) : m), 0n), combo: 1n << BigInt(i) }));
    const deps: bigint[] = [];
    const pivots: (typeof rows)[number][] = [];
    for (const row of rows) {
      let { v, combo } = row;
      for (const p of pivots) {
        const lead = p.v & -p.v;
        if (v & lead) {
          v ^= p.v;
          combo ^= p.combo;
        }
      }
      if (v === 0n) deps.push(combo);
      else pivots.push({ v, combo });
    }
    // Try each dependency until one gives a proper factor.
    const N = BigInt(n);
    const tries: { combo: number[]; X: bigint; Y: bigint; g: bigint }[] = [];
    for (const d of deps) {
      const idx = rels.map((_, i) => i).filter((i) => (d >> BigInt(i)) & 1n);
      let X = 1n;
      const sum = base.map(() => 0);
      for (const i of idx) {
        X = modBig(X * BigInt(rels[i]!.x), N);
        rels[i]!.exps.forEach((e, j) => (sum[j]! += e));
      }
      let Y = 1n;
      base.forEach((p, j) => {
        for (let k = 0; k < sum[j]! / 2; k++) Y = modBig(Y * BigInt(p), N);
      });
      const g = gcdBig(X - Y < 0n ? Y - X : X - Y, N);
      tries.push({ combo: idx, X, Y, g });
      if (g > 1n && g < N) break;
    }
    return { base, start, candidates, rels, deps, tries };
  });
  const success = $derived(run.tries.find((t) => t.g > 1n && t.g < BigInt(n)));
  const chosen = $derived(new Set(success?.combo ?? run.tries.at(-1)?.combo ?? []));
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = (e: number) => String(e).replace(/\d/g, (d) => SUP[Number(d)]!);
  const fmtQ = (r: Rel) =>
    r.exps
      .map((e, j) => (e ? (e > 1 ? `${run.base[j]}${sup(e)}` : `${run.base[j]}`) : ''))
      .filter(Boolean)
      .join('·');
</script>

<Widget title="A quadratic sieve you can read" subtitle="Collect numbers x near √n for which x² − n is smooth over a small factor base, then combine some of them into a perfect square." onreset={() => ((n = 1649), (B = 20))}>
  {#snippet controls()}
    <label class="pick ui">n = <select bind:value={n}>{#each PRESETS as v (v)}<option value={v}>{v.toLocaleString('en-GB')}</option>{/each}</select></label>
    <Slider label="smoothness bound B" bind:value={B} min={5} max={120} step={1} format={(v) => String(v)} />
  {/snippet}
  <ol class="phases">
    <li>
      <h5>Factor base</h5>
      <p>Primes p ≤ {B} with n a square modulo p (only those can divide x² − n): <span class="mono">{run.base.join(', ')}</span> ({run.base.length} primes).</p>
    </li>
    <li>
      <h5>Relations</h5>
      <p>Starting at x = ⌈√n⌉ = {run.start}, keep the x for which Q(x) = x² − n factors over the base. Found {run.rels.length} after trying {run.rels.length ? run.rels.at(-1)!.x - run.start + 1 : 0} values of x.</p>
      <div class="cands mono">
        {#each run.candidates as c (c.x)}
          <span class:smooth={c.smooth} class:used={c.smooth && chosen.has(run.rels.indexOf(c.smooth))} title="x = {c.x}, Q = {c.q}">{c.x}² − n = {c.q}{#if c.smooth} = {fmtQ(c.smooth)}{/if}</span>
        {/each}
      </div>
    </li>
    <li>
      <h5>Linear algebra mod 2</h5>
      {#if run.rels.length}
        <div class="scroll">
          <table class="mat mono">
            <thead><tr><th>x</th>{#each run.base as p (p)}<th>{p}</th>{/each}</tr></thead>
            <tbody>
              {#each run.rels as r, i (r.x)}
                <tr class:used={chosen.has(i)}><td>{r.x}</td>{#each r.exps as e, j (j)}<td class:odd={e % 2 === 1}>{e % 2}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p>Rows are exponent vectors mod 2. {run.deps.length ? `Elimination found ${run.deps.length} combination${run.deps.length > 1 ? 's' : ''} of rows adding up to zero; the highlighted rows are one of them.` : 'No combination yet: increase B.'}</p>
      {:else}
        <p>No smooth values found: increase B.</p>
      {/if}
    </li>
    <li>
      <h5>Square and gcd</h5>
      {#if success}
        <p>
          X = product of the chosen x ≡ {success.X} and Y = √(product of their Q) ≡ {success.Y} (mod n), so X² ≡ Y². Then
          gcd(X − Y, n) = <strong>{success.g}</strong>, and {n} = {success.g} × {BigInt(n) / success.g}.
        </p>
      {:else if run.tries.length}
        <p>Every combination tried gave X ≡ ±Y, so the gcd was trivial. Increase B to get more relations.</p>
      {:else}
        <p>Need a combination first.</p>
      {/if}
    </li>
  </ol>
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
  .phases {
    margin: 0;
    padding-left: 1.3rem;
  }
  .phases li + li {
    margin-top: 0.8rem;
  }
  h5 {
    margin: 0 0 0.2rem;
    font-size: 0.86rem;
  }
  .phases p {
    margin: 0.2rem 0;
    font-size: 0.84rem;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .cands {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.35rem;
    font-size: 0.72rem;
    max-height: 9rem;
    overflow-y: auto;
  }
  .cands span {
    padding: 0.05rem 0.35rem;
    border-radius: 3px;
    background: var(--pn);
    color: var(--ink-3);
  }
  .cands span.smooth {
    background: color-mix(in srgb, var(--fx-blue) 18%, var(--surface));
    color: var(--ink);
  }
  .cands span.used {
    background: var(--prime);
    color: var(--on-accent);
  }
  .scroll {
    overflow: auto;
    max-height: 14rem;
  }
  .mat {
    border-collapse: collapse;
    font-size: 0.72rem;
  }
  .mat th,
  .mat td {
    padding: 0.08rem 0.4rem;
    text-align: center;
    border-bottom: 1px solid var(--ruling);
  }
  .mat td.odd {
    font-weight: 700;
    color: var(--fx-blue);
  }
  .mat tr.used td {
    background: var(--accent-soft);
  }
</style>
