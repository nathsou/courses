<!--
  Put steps in order ("be the machine"): the steps arrive shuffled (deterministically, by id), the reader
  moves them up and down with buttons (keyboard and touch alike), then checks.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';

  let { spec }: { spec: { id: string; title?: string; prompt?: string; steps: string[]; why?: string; hints?: string[]; solution?: string } } = $props();

  function shuffle(n: number, seed: string): number[] {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const out = Array.from({ length: n }, (_, i) => i);
    for (let tries = 0; tries < 5; tries++) {
      for (let i = n - 1; i > 0; i--) {
        h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
        const j = h % (i + 1);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      if (out.some((v, i) => v !== i)) break;
    }
    return out;
  }

  // svelte-ignore state_referenced_locally
  let order: number[] = $state(shuffle(spec.steps.length, spec.id));
  let checked: boolean | null = $state(null);
  let firstWrong = $state(-1);

  onMount(() => {
    const d = progress.draft<number[] | null>(spec.id, null);
    if (d && d.length === spec.steps.length) order = d;
  });

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    checked = null;
    progress.saveDraft(spec.id, $state.snapshot(order));
  }

  function check() {
    firstWrong = order.findIndex((v, i) => v !== i);
    checked = firstWrong < 0;
    if (checked) progress.markSolved(spec.id);
  }
</script>

<ExerciseFrame id={spec.id} kind="Be the machine" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Order checked">
  <ol class="steps ui">
    {#each order as s, i (s)}
      <li class:wrong={checked === false && i === firstWrong}>
        <span class="n">{i + 1}</span>
        <span class="text">{@html spec.steps[s]}</span>
        <span class="moves">
          <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move step {i + 1} up">↑</button>
          <button onclick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Move step {i + 1} down">↓</button>
        </span>
      </li>
    {/each}
  </ol>
  <div class="ui actions">
    <button class="check" onclick={check}>Check the order</button>
    <span aria-live="polite">
      {#if checked === true}<span class="ok">Order checked: that is the sequence.</span>
      {:else if checked === false}<span class="bad">Step {firstWrong + 1} is out of place (the steps before it are right).</span>{/if}
    </span>
  </div>
  {#if checked && spec.why}<div class="why">{@html spec.why}</div>{/if}
</ExerciseFrame>

<style>
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }
  li {
    display: grid;
    grid-template-columns: 1.6rem 1fr auto;
    gap: 0.5rem;
    align-items: center;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    padding: 0.35rem 0.5rem;
    font-size: 0.92rem;
  }
  li.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .n {
    font-family: var(--font-mono);
    color: var(--accent);
    font-weight: 600;
    text-align: right;
  }
  .text :global(p) {
    margin: 0;
  }
  .moves {
    display: inline-flex;
    gap: 0.2rem;
  }
  .moves button {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--ink);
  }
  .moves button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .actions {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.7rem;
    font-size: 0.9rem;
  }
  .check {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  .why {
    margin-top: 0.6rem;
    color: var(--ink-2);
  }
</style>
