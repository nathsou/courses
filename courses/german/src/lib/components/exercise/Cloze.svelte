<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Gapped text: type each missing piece (an ending, an article, a verb) in place, then check the
   * whole sentence at once. Hints in brackets give the base form.
   */
  import type { Cloze } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { shuffle } from '$lib/exercises/shuffle';
  import { mark, parseCloze, fillCloze, type Gap, type Marked } from '$lib/de/check';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import Rich from './Rich.svelte';
  import De from '../de/De.svelte';
  import UmlautKeys from '../de/UmlautKeys.svelte';

  let { data, id, report }: { data: Cloze; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const item = $derived(data.items[seq.index]!);
  const parts = $derived(parseCloze(item.de));
  const gaps = $derived(parts.filter((p): p is Gap => typeof p !== 'string'));
  const bank = $derived(data.bank ? shuffle(gaps.map((g) => g.answers[0]!), `${id}:${seq.index}:${seq.round}`) : []);
  let values = $state<string[]>([]);
  let results = $state<(Marked | null)[]>([]);
  let inputs = $state<HTMLInputElement[]>([]);
  let focused = $state(0);
  let tried = $state(false);

  $effect(() => {
    void seq.index;
    void seq.round;
    values = gaps.map(() => '');
    results = gaps.map(() => null);
    tried = false;
  });

  function check(e?: Event) {
    e?.preventDefault();
    if (seq.settled) return;
    results = gaps.map((g, i) => mark(values[i] ?? '', g.answers, { lenient: settings.data.lenientSpelling }));
    tried = true;
    const ok = results.every((r) => r && r.verdict !== 'wrong');
    seq.attempt(ok);
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    if (ok) void speech.say(fillCloze(item.de));
  }
  function reveal() {
    values = gaps.map((g) => g.answers[0]!);
    results = gaps.map((g) => ({ verdict: 'right', answer: g.answers[0]! }));
  }
  function nextGap(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' && i < gaps.length - 1 && !values[i + 1]) {
      e.preventDefault();
      inputs[i + 1]?.focus();
    }
  }
  const width = (g: Gap) => `${Math.max(2.2, Math.max(...g.answers.map((a) => a.length)) * 0.68 + 1.2)}em`;
  const gapIndex = (k: number) => parts.slice(0, k).filter((p) => typeof p !== 'string').length;
  const notes = $derived(results.filter((r) => r?.verdict === 'almost' && r.note).map((r) => `${r!.note} {${r!.answer}}`));
</script>

<Steps {seq} {report} canReveal={tried} onreveal={reveal}>
  {#if data.prompt && seq.index === 0}<p class="prompt"><Rich text={data.prompt} /></p>{/if}
  {#if bank.length}<p class="bank ui">{#each bank as b, i (i)}<span>{b}</span>{/each}</p>{/if}
  <form class="text" onsubmit={check} lang="de">
    {#each parts as p, k (k)}
      {#if typeof p === 'string'}<De text={p} size="md" genders="hide" play={false} />{:else}
        {@const i = gapIndex(k)}
        <span class="gap">
          <input
            bind:this={inputs[i]}
            bind:value={values[i]}
            onfocus={() => (focused = i)}
            onkeydown={(e) => nextGap(e, i)}
            class:right={results[i]?.verdict === 'right'}
            class:almost={results[i]?.verdict === 'almost'}
            class:wrong={results[i]?.verdict === 'wrong'}
            style="width: {width(p)}"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="Gap {i + 1}{p.hint ? ` (${p.hint})` : ''}"
            readonly={seq.settled}
          />{#if p.hint}<span class="hint ui">({p.hint})</span>{/if}
        </span>
      {/if}
    {/each}
    <button class="sr-only" tabindex="-1">Check</button>
  </form>
  {#if item.en}<p class="en ui">“{item.en}”</p>{/if}
  {#if !seq.settled}
    <div class="tools ui">
      <UmlautKeys target={inputs[focused]} oninput={(v) => (values[focused] = v)} />
      <button class="btn" onclick={check} disabled={values.some((v) => !v.trim())}>Check</button>
    </div>
  {/if}
  {#snippet feedback()}
    {#if seq.settled}
      <Feedback ok={results.every((r) => r?.verdict !== 'wrong')} almost={notes.length > 0} text={notes.join(' ')} explain={item.explain} />
    {:else if tried}
      <Feedback ok={false} text="The red gaps need another look." />
    {/if}
  {/snippet}
</Steps>

<style>
  .prompt {
    margin: 0 0 0.6rem;
  }
  .bank {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0 0 0.6rem;
  }
  .bank span {
    padding: 0.05rem 0.55rem;
    border-radius: 8px;
    background: var(--pn);
    font-size: 0.92rem;
  }
  .text {
    line-height: 2.4;
    margin: 0.2rem 0;
  }
  .gap {
    white-space: nowrap;
  }
  input {
    font: inherit;
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-weight: 560;
    padding: 0.05rem 0.3rem;
    margin: 0 0.1rem;
    border: none;
    border-bottom: 2px solid var(--accent);
    border-radius: 6px 6px 0 0;
    background: var(--pn);
    color: var(--fg);
    text-align: center;
  }
  input:focus {
    outline: 2px solid var(--accent);
  }
  input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  input.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .hint {
    font-size: 0.75rem;
    color: var(--mute);
    margin-right: 0.15rem;
  }
  .en {
    margin: 0.2rem 0 0;
    color: var(--mute);
    font-size: 0.88rem;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
</style>
