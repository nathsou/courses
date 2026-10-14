<!--
  Trial division, run live: try 2, 3, 5, 7, … up to √n. Small n show every candidate; large n report how
  many divisions were needed and how long they took, which is the point: the cost grows like √n.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  const PRESETS = ['91', '97', '8051', '1000003', '2147483647', '999999000001', '8999999999999971'];
  let text = $state('8051');
  let parsed = $state<bigint | null>(8051n);
  let running = $state(false);
  let result = $state<{ n: number; factor: number | null; trials: number; ms: number; root: number; tried: number[] } | null>(null);
  let progress = $state(0);
  let token = 0;

  const MAX = 2n ** 53n - 1n;
  const tooBig = $derived(parsed !== null && parsed > MAX);

  function run() {
    if (parsed === null || parsed < 2n || tooBig) return;
    const n = Number(parsed);
    const root = Math.floor(Math.sqrt(n));
    const my = ++token;
    running = true;
    progress = 0;
    result = null;
    const start = performance.now();
    const tried: number[] = [];
    let trials = 0;
    let d = 2;
    const step = () => {
      if (my !== token) return;
      const stopAt = performance.now() + 12;
      while (d <= root) {
        trials++;
        if (tried.length < 400) tried.push(d);
        if (n % d === 0) {
          finish(d);
          return;
        }
        d = d === 2 ? 3 : d + 2;
        if ((trials & 0xffff) === 0 && performance.now() > stopAt) {
          progress = d / root;
          requestAnimationFrame(step);
          return;
        }
      }
      finish(null);
    };
    const finish = (factor: number | null) => {
      running = false;
      result = { n, factor, trials, ms: performance.now() - start, root, tried };
    };
    step();
  }
  function stop() {
    token++;
    running = false;
  }
  const fmt = (x: number) => x.toLocaleString('en-GB');
</script>

<Widget title="Trial division" subtitle="Divide by 2 and then by every odd number up to √n. The first divisor found is the smallest prime factor; if none turns up, n is prime.">
  {#snippet controls()}
    <NumberInput label="n (up to 2⁵³)" bind:value={text} bind:parsed width="22ch" onenter={run} />
    <div class="buttons">
      {#if running}
        <Button onclick={stop}>Stop</Button>
      {:else}
        <Button variant="primary" onclick={run} disabled={parsed === null || parsed < 2n || tooBig}>Divide</Button>
      {/if}
    </div>
    <div class="presets ui" role="group" aria-label="Examples">
      {#each PRESETS as p (p)}
        <button onclick={() => ((text = p), (parsed = BigInt(p)), run())}>{p}</button>
      {/each}
    </div>
  {/snippet}
  {#if tooBig}
    <p class="warn">That is beyond 2⁵³ ≈ 9 × 10¹⁵, where JavaScript numbers stop being exact. Part II has better tools for numbers this big.</p>
  {:else if running}
    <div class="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><i style:width="{progress * 100}%"></i></div>
    <p>Dividing… {Math.round(progress * 100)}% of the way to √n.</p>
  {:else if result}
    {#if result.n <= 100_000}
      <div class="tried" aria-label="Divisors tried">
        {#each result.tried as d (d)}<span class:hit={d === result.factor}>{d}</span>{/each}
      </div>
    {/if}
    <p class="out" aria-live="polite">
      {#if result.factor !== null}
        {fmt(result.n)} = <strong>{fmt(result.factor)}</strong> × {fmt(result.n / result.factor)}: composite, found after {fmt(result.trials)}
        {result.trials === 1 ? 'division' : 'divisions'}.
      {:else}
        No divisor up to √n ≈ {fmt(result.root)}, so <strong class="p">{fmt(result.n)} is prime</strong>. That took {fmt(result.trials)} divisions
        ({result.ms < 1 ? 'under a millisecond' : `${result.ms.toFixed(0)} ms`}).
      {/if}
    </p>
  {/if}
</Widget>

<style>
  .buttons {
    display: flex;
    gap: 0.5rem;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    font-size: 0.75rem;
  }
  .presets button {
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    cursor: pointer;
  }
  .presets button:hover {
    background: var(--pn);
  }
  .tried {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    max-height: 9rem;
    overflow-y: auto;
  }
  .tried span {
    padding: 0.05rem 0.35rem;
    border-radius: 3px;
    background: var(--pn);
    color: var(--ink-3);
    text-decoration: line-through;
  }
  .tried span.hit {
    background: var(--accent);
    color: var(--on-accent);
    text-decoration: none;
  }
  .out {
    margin: 0.75rem 0 0;
    font-variant-numeric: tabular-nums;
  }
  .p {
    color: var(--accent);
  }
  .warn {
    color: var(--bad);
  }
  .bar {
    height: 6px;
    background: var(--pn);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--ac);
  }
</style>
