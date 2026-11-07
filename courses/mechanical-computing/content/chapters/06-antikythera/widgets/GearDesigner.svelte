<!--
  Design a gear train: choose tooth counts for two or three meshes to make an exact ratio. An exercise: the
  ratio is checked exactly (as a fraction), and every gear must have between 15 and 225 teeth.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import ExerciseFrame from '$lib/components/exercise/ExerciseFrame.svelte';
  import { progress } from '$lib/state/progress.svelte';

  let { id, title, prompt, num, den, meshes = 2, hints = [], solution }: { id: string; title?: string; prompt?: string; num: number; den: number; meshes?: number; hints?: string[]; solution?: string } = $props();
  // svelte-ignore state_referenced_locally
  let pairs = $state(Array.from({ length: meshes }, () => ({ driver: 60, driven: 30 })));
  let solved = $state(false);
  onMount(() => {
    solved = progress.isSolved(id);
    const d = progress.draft<{ driver: number; driven: number }[] | null>(id, null);
    if (d && d.length === pairs.length) pairs = d;
  });
  const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
  const result = $derived.by(() => {
    let n = 1n, d = 1n;
    for (const p of pairs) {
      n *= BigInt(Math.round(p.driver));
      d *= BigInt(Math.round(p.driven));
    }
    const g = gcd(n, d);
    return { n: n / g, d: d / g, value: Number(n) / Number(d) };
  });
  const inRange = $derived(pairs.every((p) => p.driver >= 15 && p.driver <= 225 && p.driven >= 15 && p.driven <= 225 && Number.isInteger(p.driver) && Number.isInteger(p.driven)));
  const exact = $derived(result.n * BigInt(den) === result.d * BigInt(num));
  $effect(() => {
    progress.saveDraft(id, $state.snapshot(pairs));
    if (exact && inRange && !solved) {
      progress.markSolved(id);
      solved = true;
    }
  });
</script>

<ExerciseFrame {id} kind="Design" {title} {prompt} {hints} {solution} completionLabel="Ratio checked">
  <div class="ui train">
    {#each pairs as p, i (i)}
      <div class="pair">
        <span class="k">Mesh {i + 1}</span>
        <label>driver <input type="number" min="15" max="225" bind:value={p.driver} aria-label="Mesh {i + 1}: driver teeth" /></label>
        <span class="arrow">→</span>
        <label>driven <input type="number" min="15" max="225" bind:value={p.driven} aria-label="Mesh {i + 1}: driven teeth" /></label>
      </div>
    {/each}
  </div>
  <p class="ui res" aria-live="polite">
    Ratio {String(result.n)}/{String(result.d)} = <strong class="num">{result.value.toFixed(6)}</strong>; target {num}/{den} = {(num / den).toFixed(6)}.
    {#if !inRange}<span class="bad">Every gear needs a whole number of teeth from 15 to 225.</span>
    {:else if solved && exact}<span class="ok">Ratio checked: exactly {num}/{den}.</span>
    {:else}<span>Off by {(((result.value - num / den) / (num / den)) * 100).toFixed(4)}%.</span>{/if}
  </p>
</ExerciseFrame>

<style>
  .train {
    display: grid;
    gap: 0.4rem;
  }
  .pair {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.86rem;
  }
  .k {
    width: 4.5rem;
    color: var(--ink-3);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  input {
    font: inherit;
    font-family: var(--font-mono);
    width: 4.8rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
  }
  .arrow {
    color: var(--ink-3);
  }
  .res {
    font-size: 0.88rem;
    margin: 0.6rem 0 0;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
</style>
