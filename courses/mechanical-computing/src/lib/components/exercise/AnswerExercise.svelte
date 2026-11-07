<!-- A question with a typed answer (a number or a word), checked against the spec. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import { checkAnswer, type AnswerSpec } from './answer';

  let { spec }: { spec: AnswerSpec } = $props();
  let value = $state('');
  let verdict: ReturnType<typeof checkAnswer> | null = $state(null);
  let tries = $state(0);

  onMount(() => {
    value = progress.draft(spec.id, '');
    if (progress.isSolved(spec.id) && value) verdict = checkAnswer(spec, value);
  });

  function submit(e: Event) {
    e.preventDefault();
    if (!value.trim()) return;
    tries++;
    verdict = checkAnswer(spec, value);
    progress.saveDraft(spec.id, value);
    if (verdict.ok) progress.markSolved(spec.id);
  }
</script>

<ExerciseFrame id={spec.id} kind="Work it out" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution}>
  <form class="ui" onsubmit={submit}>
    <label class="field">
      <span class="visually-hidden">Your answer</span>
      <input bind:value oninput={() => (verdict = null)} placeholder={spec.placeholder ?? 'Your answer'} autocomplete="off" spellcheck="false" />
      {#if spec.unit}<span class="unit">{spec.unit}</span>{/if}
    </label>
    <button type="submit" disabled={!value.trim()}>Check</button>
  </form>
  <div class="ui" aria-live="polite">
    {#if verdict?.ok}
      <p class="ok">Answer checked: that is right.</p>
      {#if spec.why}<div class="why">{@html spec.why}</div>{/if}
    {:else if verdict}
      <p class="bad">Not that. {#if verdict.message}{@html verdict.message}{:else if tries > 1 && spec.hints?.length}A hint may help.{:else}Try again.{/if}</p>
    {/if}
  </div>
</ExerciseFrame>

<style>
  form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .field {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  input {
    font: inherit;
    font-family: var(--font-mono);
    width: 11rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
  }
  .unit {
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    margin: 0.6rem 0 0.3rem;
  }
  .bad {
    color: var(--bad);
    margin: 0.6rem 0 0;
  }
  .why {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink-2);
  }
  .why :global(p) {
    margin: 0 0 0.5rem;
  }
</style>
