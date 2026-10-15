<!--
  The sieve of Eratosthenes, one prime at a time. Each composite is coloured by the prime that first crosses it
  out (its smallest prime factor); crossing out starts at p². Counts how many crossings each prime makes.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let N = $state(120);
  let cols = $derived(N <= 120 ? 10 : 20);
  /** Primes processed so far. */
  let done = $state<number[]>([]);
  let fromSquare = $state(true);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const COLOURS = ['var(--series-1)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)', 'var(--series-2)'];

  const sv = $derived.by(() => {
    const crossedBy = new Int32Array(N + 1);
    let crossings = 0;
    const perPrime: { p: number; c: number }[] = [];
    for (const p of done) {
      let c = 0;
      for (let m = fromSquare ? p * p : 2 * p; m <= N; m += p) {
        if (!crossedBy[m]) crossedBy[m] = p;
        c++;
      }
      crossings += c;
      perPrime.push({ p, c });
    }
    // Next prime to process: the smallest number > last processed that is not crossed out.
    let next = 2;
    const last = done.at(-1) ?? 1;
    for (next = last + 1; next <= N && crossedBy[next]; next++);
    const finished = next * next > N;
    return { crossedBy, crossings, perPrime, next, finished };
  });

  function step() {
    if (sv.finished) {
      stop();
      return;
    }
    done = [...done, sv.next];
  }
  function play() {
    if (playing) return stop();
    playing = true;
    timer = setInterval(step, 900);
  }
  function stop() {
    playing = false;
    clearInterval(timer);
  }
  function reset() {
    stop();
    done = [];
  }
  onDestroy(stop);
  const colourOf = (p: number) => COLOURS[done.indexOf(p) % COLOURS.length];
  const isKnownPrime = (k: number) => k >= 2 && !sv.crossedBy[k] && (done.includes(k) || sv.finished || k < sv.next);
</script>

<Widget title="The sieve of Eratosthenes" subtitle="Take the next number that is not crossed out: it is prime. Cross out its multiples. Stop once p² exceeds N; whatever is left is prime." onreset={reset}>
  {#snippet controls()}
    <Segmented label="Range" bind:value={N} options={[{ value: 120, label: 'up to 120' }, { value: 400, label: 'up to 400' }]} onchange={reset} size="sm" />
    <div class="btns">
      <Button size="sm" variant="primary" onclick={step} disabled={sv.finished}>Next prime</Button>
      <Button size="sm" onclick={play}>{playing ? 'Pause' : 'Play'}</Button>
    </div>
    <label class="opt ui"><input type="checkbox" bind:checked={fromSquare} onchange={reset} /> start crossing out at p² (not 2p)</label>
  {/snippet}
  <div class="grid" style:--cols={cols} role="img" aria-label="The numbers 1 to {N}; {sv.perPrime.length} primes processed so far.">
    {#each Array.from({ length: N }, (_, i) => i + 1) as k (k)}
      {@const by = sv.crossedBy[k]}
      <span class="cell" class:one={k === 1} class:crossed={by} class:prime={isKnownPrime(k)} class:current={done.at(-1) === k} style:--c={by ? colourOf(by) : undefined}>{k}</span>
    {/each}
  </div>
  <p class="out" aria-live="polite">
    {#if !done.length}
      Press <em>Next prime</em>: 2 is not crossed out, so it is prime.
    {:else if sv.finished}
      Done after sieving by {done.join(', ')} (all primes up to √{N} ≈ {Math.sqrt(N).toFixed(1)}). The {Array.from({ length: N }, (_, i) => i + 1).filter((k) => k >= 2 && !sv.crossedBy[k]).length} uncrossed numbers are the primes up to {N}. Total crossings: {sv.crossings}.
    {:else}
      Crossings so far: {sv.perPrime.map((x) => `${x.p}: ${x.c}`).join(', ')}. Next prime: {sv.next}.
    {/if}
  </p>
</Widget>

<style>
  .btns {
    display: flex;
    gap: 0.4rem;
  }
  .opt {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 2px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .cell {
    display: grid;
    place-items: center;
    aspect-ratio: 1.5;
    border-radius: 2px;
    background: var(--pn);
    color: var(--ink-2);
    transition: background-color 250ms;
  }
  .cell.one {
    color: var(--ink-3);
  }
  .cell.crossed {
    background: color-mix(in srgb, var(--c) 30%, var(--surface));
    color: var(--ink-3);
    text-decoration: line-through;
  }
  .cell.prime {
    background: var(--prime);
    color: var(--on-accent);
    font-weight: 700;
  }
  .cell.current {
    outline: 2px solid var(--fg);
  }
  .out {
    margin: 0.7rem 0 0;
    font-size: 0.86rem;
  }
</style>
