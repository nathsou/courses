<!--
  Patience sorting, which is how a longest increasing subsequence is found in O(n log n). Each number is placed on the
  leftmost pile whose top is not smaller than it (or starts a new pile). The number of piles is the length of the
  longest increasing subsequence.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { lis } from '$lib/rx/keyed';

  let { n, title = 'Longest increasing subsequence', caption, numbers: initial = '3 1 4 0 2 6 5' }: { n?: string | number; title?: string; caption?: string; numbers?: string } = $props();

  let text = $state(String(initial));
  let stepIndex = $state(0);
  const seq = $derived(text.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x)).slice(0, 14));

  const frames = $derived.by(() => {
    const out: { tails: number[]; placed: number; pile: number }[] = [];
    const tails: number[] = [];
    seq.forEach((x, i) => {
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (seq[tails[mid]!]! < x) lo = mid + 1;
        else hi = mid;
      }
      tails[lo] = i;
      out.push({ tails: [...tails], placed: i, pile: lo });
    });
    return out;
  });
  const result = $derived(lis(seq));
  const frame = $derived(frames[Math.min(stepIndex, frames.length) - 1]);
  $effect(() => {
    seq;
    stepIndex = 0;
  });
</script>

<Widget {title} {n} {caption} kind="Algorithm" subtitle="Step through. Moves needed = items − length of the longest increasing subsequence.">
  {#snippet controls()}
    <label class="ui"><span>Old position of each item, in new order</span><input bind:value={text} spellcheck="false" /></label>
    <Button onclick={() => (stepIndex = Math.max(0, stepIndex - 1))} disabled={stepIndex === 0}>← Back</Button>
    <Button variant="primary" onclick={() => (stepIndex = Math.min(seq.length, stepIndex + 1))} disabled={stepIndex >= seq.length}>Next →</Button>
    <Button onclick={() => (stepIndex = seq.length)}>All</Button>
  {/snippet}
  <div class="seq" aria-label="The sequence">
    {#each seq as x, i (i)}
      <span class="cell" class:done={i < stepIndex} class:now={i === stepIndex - 1} class:inlis={stepIndex >= seq.length && result.includes(i)}>{x}</span>
    {/each}
  </div>
  {#if frame}
    <p class="ui info">
      Placed <b>{seq[frame.placed]}</b> {frame.pile === frame.tails.length - 1 && frame.tails.length > (frames[frame.placed - 1]?.tails.length ?? 0) ? 'on a new pile' : `on pile ${frame.pile + 1}, replacing its top`}.
      Pile tops now: <code>{frame.tails.map((i) => seq[i]).join(', ')}</code> → {frame.tails.length} pile{frame.tails.length === 1 ? '' : 's'}.
    </p>
    <div class="piles" aria-label="Pile tops">
      {#each frame.tails as t, k (k)}<div class="pile"><span class="top">{seq[t]}</span><span class="lab ui">pile {k + 1}</span></div>{/each}
    </div>
  {:else}
    <p class="ui info">Press “Next” to place the first number.</p>
  {/if}
  {#if stepIndex >= seq.length && seq.length}
    <p class="ui result">
      Longest increasing subsequence: <b>{result.map((i) => seq[i]).join(', ')}</b> (length {result.length}). Of {seq.length} items, <b>{seq.length - result.length}</b> must move; the other {result.length} can stay where they are.
    </p>
  {/if}
</Widget>

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.74rem;
    color: var(--mute);
  }
  input {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--bg);
    color: var(--fg);
    width: 14rem;
    max-width: 100%;
  }
  .seq {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .cell {
    display: inline-grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--mute);
  }
  .cell.done { color: var(--fg); background: var(--panel); }
  .cell.now { border-color: var(--flash); background: var(--flash-soft); }
  .cell.inlis { border-color: var(--ink-blue); background: var(--ink-blue-soft); color: var(--fg); }
  .info { font-size: 0.86rem; color: var(--ink-2); }
  .piles {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    min-height: 3.4rem;
  }
  .pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }
  .top {
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1.5px solid var(--ink-blue);
    border-radius: 6px;
    background: var(--ink-blue-soft);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .lab { font-size: 0.64rem; color: var(--mute); }
  .result { font-size: 0.9rem; border-top: 1px solid var(--line); padding-top: 0.6rem; }
</style>
