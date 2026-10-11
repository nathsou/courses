<script lang="ts">
  import { untrack } from 'svelte';
  /** Fill in a verb's forms, person by person. Answers come from the verb tables (Wiktionary). */
  import type { Conjugate } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { conjugate, conjugateAll, PERSONS, TENSE_NAMES } from '$lib/de/verbs';
  import { lookup, headword } from '$lib/de/lexicon';
  import { mark, type Marked } from '$lib/de/check';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import UmlautKeys from '../de/UmlautKeys.svelte';

  let { data, report }: { data: Conjugate; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const item = $derived(data.items[seq.index]!);
  const persons = $derived(item.persons ?? (item.tense === 'imperative' ? [1, 4] : [0, 1, 2, 3, 4, 5]));
  const answers = $derived(persons.map((p) => conjugateAll(item.verb, item.tense, p)[0] ?? '?'));
  const entry = $derived(lookup(item.verb));
  const label = (p: number) => (item.tense === 'imperative' ? (p === 1 ? '(du)' : '(ihr)') : PERSONS[p]);
  let values = $state<string[]>([]);
  let results = $state<(Marked | null)[]>([]);
  let inputs = $state<HTMLInputElement[]>([]);
  let focused = $state(0);
  let tried = $state(false);

  $effect(() => {
    void seq.index;
    void seq.round;
    values = persons.map(() => '');
    results = persons.map(() => null);
    tried = false;
  });

  function check(e?: Event) {
    e?.preventDefault();
    if (seq.settled) return;
    results = persons.map((p, i) => mark(values[i] ?? '', conjugateAll(item.verb, item.tense, p), { lenient: settings.data.lenientSpelling }));
    tried = true;
    const ok = results.every((r) => r && r.verdict !== 'wrong');
    seq.attempt(ok);
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
  }
  function reveal() {
    values = [...answers];
    results = answers.map((a) => ({ verdict: 'right', answer: a }));
  }
  function key(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' && i < persons.length - 1) {
      e.preventDefault();
      inputs[i + 1]?.focus();
    }
  }
  const say = (i: number) => speech.say(`${item.tense === 'imperative' ? '' : PERSONS[persons[i]!]!.split('/')[0]} ${answers[i]}${item.tense === 'imperative' ? '!' : ''}`.trim());
</script>

<Steps {seq} {report} canReveal={tried} onreveal={reveal}>
  <p class="head"><b lang="de">{entry ? headword(item.verb, entry).head : item.verb}</b>{#if entry} <span class="g">{entry.g}</span>{/if} <span class="tense ui">{TENSE_NAMES[item.tense]}</span></p>
  <form class="grid" onsubmit={check} lang="de">
    {#each persons as p, i (p)}
      <label class="row">
        <span class="pr">{label(p)}</span>
        <input
          bind:this={inputs[i]}
          bind:value={values[i]}
          onfocus={() => (focused = i)}
          onkeydown={(e) => key(e, i)}
          class:right={results[i]?.verdict === 'right'}
          class:almost={results[i]?.verdict === 'almost'}
          class:wrong={results[i]?.verdict === 'wrong'}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          readonly={seq.settled}
        />
        {#if seq.settled}<button type="button" class="btn small ghost" onclick={() => say(i)} aria-label="Hear it">▶</button>{:else if results[i]?.verdict === 'wrong'}<span class="x ui">✗</span>{/if}
      </label>
    {/each}
    <button class="sr-only" tabindex="-1">Check</button>
  </form>
  {#if !seq.settled}
    <div class="tools ui">
      <UmlautKeys target={inputs[focused]} oninput={(v) => (values[focused] = v)} />
      <button class="btn" onclick={check} disabled={values.some((v) => !v.trim())}>Check</button>
    </div>
  {/if}
  {#snippet feedback()}
    {#if seq.settled}
      {@const slips = results.map((r, i) => (r?.verdict === 'almost' ? `{${answers[i]}}` : '')).filter(Boolean)}
      <Feedback ok={results.every((r) => r?.verdict !== 'wrong')} almost={slips.length > 0} text={slips.length ? `Mind the spelling: ${slips.join(', ')}.` : ''} />
    {:else if tried}
      <Feedback ok={false} text="Some forms need another look." />
    {/if}
  {/snippet}
</Steps>

<style>
  .head {
    margin: 0 0 0.7rem;
    font-size: 1.15rem;
  }
  .g {
    color: var(--ink-2);
    font-size: 0.95rem;
  }
  .tense {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-ink);
    margin-left: 0.3rem;
    white-space: nowrap;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
    gap: 0.4rem 1.2rem;
  }
  .row {
    display: grid;
    grid-template-columns: 5.6rem minmax(0, 1fr) 2rem;
    align-items: center;
    gap: 0.4rem;
  }
  .pr {
    color: var(--mute);
    text-align: right;
    font-size: 0.95rem;
  }
  input {
    font: inherit;
    font-size: 1.05rem;
    padding: 0.3rem 0.55rem;
    border-radius: 8px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    min-width: 0;
  }
  input.right { border-color: var(--jade); background: var(--jade-soft); }
  input.almost { border-color: var(--gold); background: var(--gold-soft); }
  input.wrong { border-color: var(--bad); background: var(--bad-soft); }
  .x {
    color: var(--bad);
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.7rem;
  }
</style>
