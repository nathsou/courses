<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  /**
   * Say it: hear the model, record yourself, and play both back to compare. Where the browser
   * has German speech recognition, it can also say which words it understood.
   */
  import type { Speak } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { Mic, canRecognise, recognise, compareWords } from '$lib/audio/mic';
  import Steps from './Steps.svelte';
  import De from '../de/De.svelte';
  import PlayButton from '../de/PlayButton.svelte';
  import Icon from '../ui/Icon.svelte';

  let { data, report }: { data: Speak; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const item = $derived(data.items[seq.index]!);
  const mic = new Mic();
  let phase = $state<'idle' | 'recording' | 'listening'>('idle');
  let mine = $state<string | null>(null);
  let heard = $state<{ word: string; ok: boolean }[] | null>(null);
  let error = $state('');
  let audio: HTMLAudioElement | undefined = $state();
  const recogniser = canRecognise();
  onDestroy(() => mic.dispose());

  $effect(() => {
    void seq.index;
    void seq.round;
    mine = null;
    heard = null;
    error = '';
  });

  async function record() {
    error = '';
    if (phase === 'recording') {
      mine = await mic.stop();
      phase = 'idle';
      return;
    }
    try {
      speech.stop();
      await mic.start();
      phase = 'recording';
    } catch {
      error = 'The microphone is not available. You can still say it aloud and compare in your head.';
    }
  }
  async function check() {
    error = '';
    phase = 'listening';
    try {
      const results = await recognise();
      if (!results.length) error = 'Nothing heard. Try again, a little closer to the microphone.';
      else {
        const best = results.map((r) => compareWords(item, r)).sort((a, b) => b.filter((x) => x.ok).length - a.filter((x) => x.ok).length)[0]!;
        heard = best;
        if (best.every((w) => w.ok)) seq.attempt(true);
      }
    } catch (e) {
      error = `Speech recognition failed (${(e as Error).message}).`;
    } finally {
      phase = 'idle';
    }
  }
</script>

<Steps {seq} {report} canReveal>
  <div class="target">
    <De text={item} size="lg" play={false} />
    <span class="plays"><PlayButton text={item} /><PlayButton text={item} slow /></span>
  </div>
  <div class="tools ui">
    {#if Mic.supported}
      <button class="btn" class:rec={phase === 'recording'} onclick={record} disabled={phase === 'listening'}>
        <Icon name={phase === 'recording' ? 'stop' : 'mic'} size={16} />{phase === 'recording' ? 'Stop' : mine ? 'Record again' : 'Record yourself'}
      </button>
      {#if mine}<button class="btn" onclick={() => audio?.play()}><Icon name="play" size={16} />Play mine</button><audio bind:this={audio} src={mine}></audio>{/if}
    {/if}
    {#if recogniser}
      <button class="btn ghost" onclick={check} disabled={phase !== 'idle'} title="Uses your browser's speech recognition (in Chrome, audio goes to Google)">
        <Icon name="sparkle" size={16} />{phase === 'listening' ? 'Listening…' : 'Check my pronunciation'}
      </button>
    {/if}
  </div>
  {#if heard}
    <p class="heard ui" lang="de">Understood: {#each heard as w, i (i)}<span class:ok={w.ok} class:miss={!w.ok}>{w.word}</span> {/each}</p>
  {/if}
  {#if error}<p class="err ui">{error}</p>{/if}
  {#snippet feedback()}
    {#if !seq.settled}
      <span class="self ui">
        <span>Listen, record, compare. Happy with it?</span>
        <button class="btn small" onclick={() => seq.attempt(true)}><Icon name="check" size={14} />Sounds right</button>
      </span>
    {/if}
  {/snippet}
</Steps>

<style>
  .target {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.2rem 0 0.8rem;
  }
  .plays {
    display: inline-flex;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .rec {
    border-color: var(--bad);
    color: var(--bad);
    animation: pulse 1s infinite alternate;
  }
  @keyframes pulse {
    from {
      opacity: 0.6;
    }
  }
  .heard {
    margin: 0.7rem 0 0;
    font-size: 0.95rem;
  }
  .ok {
    color: var(--jade);
    font-weight: 600;
  }
  .miss {
    color: var(--bad);
    text-decoration: underline wavy;
  }
  .err {
    color: var(--bad);
    font-size: 0.88rem;
  }
  .self {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--mute);
  }
</style>
