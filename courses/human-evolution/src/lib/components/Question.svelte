<script lang="ts">
  import { onMount } from 'svelte';
  import { questions } from '$lib/questions';
  import { read, save } from '$lib/state.svelte';
  let { id }: { id: string } = $props();
  const q = $derived(questions[id]!);
  let selected = $state<number | null>(null);
  let checked = $state<number | null>(null);
  onMount(() => {
    const draft = read<{ selected: unknown; checked: unknown }>(`question:${id}`, { selected: null, checked: null });
    if (typeof draft.selected === 'number' && draft.selected >= 0 && draft.selected < q.options.length) selected = draft.selected;
    if (draft.checked === selected && selected !== null) checked = selected;
  });
  function choose(n: number) { selected = n; checked = null; save(`question:${id}`, { selected, checked }); }
  function check() { checked = selected; save(`question:${id}`, { selected, checked }); }
</script>
<section class="exercise" aria-labelledby="question-{id}">
  <span class="eyebrow">Pause & reason</span>
  <fieldset><legend id="question-{id}">{q.prompt}</legend>
    {#each q.options as option, i}<label class:selected={selected === i}><input type="radio" name="question-{id}" checked={selected === i} onchange={() => choose(i)}/><span>{option}</span></label>{/each}
  </fieldset>
  <button disabled={selected === null} onclick={check}>Check this answer</button>
  <div class="feedback" aria-live="polite">{#if checked !== null}<strong>{checked === q.correct ? 'Answer checked.' : 'Reconsider the inference.'}</strong> {q.explanation}{:else if selected !== null}<span>Selection saved. Check it to see the reasoning.</span>{/if}</div>
</section>
