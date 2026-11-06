<!--
  Write a card program; the course's Analytical Engine runs it against the spec's tests. Feedback names
  what was checked: each test's starting columns and the columns or printout it must produce.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import CardEditor from '../engine/CardEditor.svelte';
  import { checkDeck, duration, type DeckTest } from '$lib/mech/analytical';

  let { spec }: { spec: { id: string; title?: string; prompt?: string; deck?: string; tests: DeckTest[]; limit?: number; why?: string; hints?: string[]; solution?: string; solutionDeck?: string; show?: Record<string, number | string> } } = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(spec.deck ?? '');
  let result: { ok: boolean; failures: string[]; time: number } | null = $state(null);
  /** The source the result belongs to: an edit after checking invalidates it. */
  let checkedSource = $state('');

  onMount(() => {
    value = progress.draft(spec.id, spec.deck ?? '');
  });

  function check() {
    progress.saveDraft(spec.id, value);
    const r = checkDeck(value, spec.tests, spec.limit);
    result = { ok: r.ok, failures: r.failures, time: Math.max(...r.runs.map((x) => x.time)) };
    checkedSource = value;
    if (r.ok) progress.markSolved(spec.id);
  }
  const stale = $derived(result !== null && checkedSource !== value);
  const initial = $derived(Object.fromEntries(Object.entries(spec.show ?? spec.tests[0]?.set ?? {}).map(([k, v]) => [Number(k.replace(/^V/i, '')), v])));
  const solutionHtml = $derived(spec.solutionDeck ? `${spec.solution ?? ''}<pre class="plain"><code>${spec.solutionDeck.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>` : spec.solution);
</script>

<ExerciseFrame id={spec.id} kind="Program the engine" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={solutionHtml} completionLabel="Tests passed">
  <CardEditor bind:value {initial} oninput={() => progress.saveDraft(spec.id, value)} />
  <div class="ui actions">
    <button class="check" onclick={check}>Check against {spec.tests.length} {spec.tests.length === 1 ? 'test' : 'tests'}</button>
    <button class="plain" onclick={() => { value = spec.deck ?? ''; result = null; progress.saveDraft(spec.id, value); }}>Start again</button>
  </div>
  <div class="ui" aria-live="polite">
    {#if result && !stale}
      {#if result.ok}
        <p class="ok">Tests passed: the engine produced every expected column{spec.tests.some((t) => t.printed) ? ' and printout' : ''} ({spec.tests.length} {spec.tests.length === 1 ? 'test' : 'tests'}; about {duration(result.time)} on the engine).</p>
        {#if spec.why}<div class="why">{@html spec.why}</div>{/if}
      {:else}
        <ul class="bad">{#each result.failures as f, i (i)}<li>{f}</li>{/each}</ul>
      {/if}
    {:else if stale}
      <p class="stale">The deck has changed since it was checked: check it again.</p>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
    flex-wrap: wrap;
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
  .plain {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.8rem;
    cursor: pointer;
    color: var(--ink);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    margin: 0.6rem 0 0.3rem;
  }
  .bad {
    color: var(--bad);
    margin: 0.6rem 0 0;
    padding-left: 1.1rem;
  }
  .stale {
    color: var(--maybe);
    margin: 0.6rem 0 0;
  }
  .why {
    font-family: var(--font-body);
    color: var(--ink-2);
  }
</style>
