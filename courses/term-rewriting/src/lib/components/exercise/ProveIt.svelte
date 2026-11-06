<!--
  Write a proof yourself. Support: a hint ladder, a self-check rubric and the model proof.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import type { ExerciseBase } from './types';

  interface Spec extends ExerciseBase {
    rubric?: string[];
  }
  let { spec }: { spec: Spec } = $props();

  let text = $state('');
  let ticks = $state<boolean[]>([]);

  onMount(() => {
    const d = progress.draft(spec.id, { text: '', ticks: [] as boolean[] });
    text = d.text;
    ticks = d.ticks;
  });

  function save() {
    progress.saveDraft(spec.id, { text, ticks });
    const rubric = spec.rubric ?? [];
    if (rubric.length && text.trim().length > 20 && rubric.every((_, i) => ticks[i])) progress.markSolved(spec.id);
  }
</script>

<ExerciseFrame id={spec.id} kind="Write a proof" completionLabel="Self-reviewed" title={spec.title} prompt={spec.prompt} hints={spec.hints ?? (spec.hint ? [spec.hint] : [])} solution={spec.solution} solutionLabel="Compare with a model proof">
  <textarea bind:value={text} oninput={save} rows={Math.max(6, text.split('\n').length + 1)} placeholder="Write your proof here. Plain text is fine; use $…$ for maths if you like." aria-label="Your proof"></textarea>
  {#if spec.rubric?.length}
    <fieldset class="rubric ui">
      <legend>Self-review: these checks do not verify the proof automatically</legend>
      {#each spec.rubric as r, i (i)}
        <label><input type="checkbox" bind:checked={ticks[i]} onchange={save} /> <span>{@html r}</span></label>
      {/each}
    </fieldset>
  {/if}
</ExerciseFrame>

<style>
  textarea {
    width: 100%;
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.55;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--ink);
    resize: vertical;
  }
  .rubric {
    margin: 0.75rem 0 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.8rem 0.6rem;
    font-size: 0.85rem;
  }
  legend {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    font-weight: 700;
    color: var(--ink-2);
    padding: 0 0.3rem;
  }
  .rubric label {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    margin: 0.3rem 0;
  }
  .rubric label :global(p) {
    display: inline;
    margin: 0;
  }
</style>
