<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Type the answer: a gap in a sentence, a translation, or (with `listen`) a dictation. Typed
   * answers are marked by $lib/de/check: punctuation never counts, capitals and umlauts are "almost".
   */
  import type { Type } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { mark, type Marked } from '$lib/de/check';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import Rich from './Rich.svelte';
  import De from '../de/De.svelte';
  import PlayButton from '../de/PlayButton.svelte';
  import UmlautKeys from '../de/UmlautKeys.svelte';

  let { data, id, report }: { data: Type; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const item = $derived(data.items[seq.index]!);
  const answers = $derived(Array.isArray(item.answer) ? item.answer : [item.answer]);
  const gapped = $derived(!!item.de?.includes('___'));
  const audioText = $derived(item.audio ?? (item.listen ? (gapped ? item.de!.replace(/_{3,}/, answers[0]!) : (item.de ?? answers[0]!)) : ''));
  let value = $state('');
  let input: HTMLInputElement | undefined = $state();
  let result = $state<Marked | null>(null);
  let tries = $state(0);
  void id;

  $effect(() => {
    void seq.index;
    void seq.round;
    value = '';
    result = null;
    tries = 0;
    if (!seq.done && item.listen && audioText && (seq.index > 0 || seq.round > 0)) return speech.schedule(audioText);
  });

  function check(e?: Event) {
    e?.preventDefault();
    if (seq.settled || !value.trim()) return;
    const m = mark(value, answers, { lenient: settings.data.lenientSpelling });
    result = m;
    tries++;
    const ok = m.verdict !== 'wrong';
    seq.attempt(ok);
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    if (ok) void speech.say(gapped ? item.de!.replace(/_{3,}/, m.answer) : m.answer);
  }
  const shownSentence = $derived(gapped && seq.settled ? item.de!.replace(/_{3,}/, result?.verdict !== 'wrong' && result ? result.answer : answers[0]!) : item.de);
</script>

<Steps {seq} {report} canReveal={tries > 0} onreveal={() => (result = { verdict: 'wrong', answer: answers[0]! })}>
  {#if item.prompt}<p class="prompt"><Rich text={item.prompt} /></p>{/if}
  {#if item.listen}
    <div class="listen"><PlayButton text={audioText} /><PlayButton text={audioText} slow /><span class="ui hint">{gapped ? 'Listen, and type the missing word' : 'Listen, and type what you hear'}</span></div>
  {/if}
  {#if shownSentence && (!item.listen || gapped || seq.settled)}
    <p class="sentence">{#key shownSentence}<Rich text={shownSentence} size="md" de genders="hide" />{/key}</p>
  {/if}
  {#if item.en}<p class="en ui">“{item.en}”</p>{/if}
  <form class="row" onsubmit={check}>
    <input
      bind:this={input}
      bind:value
      class="ui"
      class:right={seq.settled && result?.verdict === 'right'}
      class:almost={seq.settled && result?.verdict === 'almost'}
      lang="de"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Your answer"
      placeholder={item.hint ? `(${item.hint})` : 'Type in German…'}
      readonly={seq.settled}
    />
    {#if !seq.settled}<button class="btn" disabled={!value.trim()}>Check</button>{/if}
  </form>
  {#if !seq.settled}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
  {#snippet feedback()}
    {#if seq.settled && result}
      <Feedback ok={result.verdict !== 'wrong'} almost={result.verdict === 'almost'} text={result.verdict === 'right' ? '' : result.verdict === 'almost' ? `${result.note ?? ''} {${result.answer}}` : `The answer: {${result.answer}}`} explain={item.explain} />
    {:else if result?.verdict === 'wrong'}
      <Feedback ok={false} text="Have another go, or ask to see it." />
    {/if}
  {/snippet}
</Steps>

<style>
  .prompt {
    margin: 0 0 0.6rem;
  }
  .listen {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.2rem 0 0.7rem;
  }
  .hint {
    color: var(--mute);
    font-size: 0.85rem;
  }
  .sentence {
    margin: 0.2rem 0 0.2rem;
  }
  .en {
    margin: 0 0 0.6rem;
    color: var(--mute);
    font-size: 0.88rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0 0.45rem;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 1.1rem;
    padding: 0.55rem 0.8rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
</style>
