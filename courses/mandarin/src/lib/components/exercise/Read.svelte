<script lang="ts">
  /**
   * Reading comprehension: a short real-world text, read without pinyin (tap a word for its card,
   * or switch pinyin on), then questions about it. The translation waits until you have answered.
   */
  import type { ChooseItem, Judge, Read } from '$lib/exercises/types';
  import { speech } from '$lib/audio/speech.svelte';
  import Zh from '../zh/Zh.svelte';
  import Choose from './Choose.svelte';
  import Rich from './Rich.svelte';
  import Icon from '../ui/Icon.svelte';

  let { data, id, report }: { data: Read; id: string; report: (ok: boolean) => void } = $props();

  /** Pinyin starts off: reading the characters is the point. */
  let pinyin = $state(false);
  let reading = $state(false);
  let answered = $state(false);
  const lines = $derived(data.text.trim().split('\n').map((l) => l.trim()));

  const isJudge = (q: ChooseItem | Judge): q is Judge => 'claim' in q;
  /** 对/错 statements become two-option questions; every question hides pinyin with the text. */
  const questions = $derived(
    data.questions.map((q): ChooseItem =>
      isJudge(q)
        ? { prompt: 'True or false, according to the text?', zh: q.claim, options: ['对 true', '错 false'], answer: q.answer ? 0 : 1, explain: q.explain, noPinyin: !pinyin }
        : { ...q, noPinyin: q.noPinyin || !pinyin },
    ),
  );

  async function readAloud() {
    if (reading) {
      reading = false;
      speech.stop();
      return;
    }
    reading = true;
    await speech.say(lines.join(''));
    reading = false;
  }

  function onDone(ok: boolean) {
    answered = true;
    report(ok);
  }
</script>

<div class="read">
  {#if data.setting}<p class="setting"><Icon name="book" size={15} /> <Rich text={data.setting} /></p>{/if}
  <div class="tools ui">
    <button class="btn small ghost" aria-pressed={pinyin} onclick={() => (pinyin = !pinyin)}><Icon name="eye" size={14} />Pinyin</button>
    <button class="btn small ghost" onclick={readAloud}><Icon name={reading ? 'stop' : 'speaker'} size={14} />{reading ? 'Stop' : 'Listen'}</button>
    <span class="tip">Read it first. Tap any word you don’t know.</span>
  </div>
  <div class="text" lang="zh-CN">
    {#each lines as line, i (i)}
      {#if line}<p><Zh text={line} size="md" pinyin={pinyin ? 'show' : 'hide'} play={false} /></p>{:else}<br />{/if}
    {/each}
  </div>
  {#if answered && data.en}
    <details class="en ui">
      <summary>Translation</summary>
      <p>{data.en}</p>
    </details>
  {/if}
</div>
<div class="questions">
  <p class="ui qh">Questions</p>
  <Choose data={{ items: questions }} {id} report={onDone} />
</div>

<style>
  .setting {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    margin: 0 0 0.6rem;
    color: var(--ink-2);
    font-style: italic;
    font-size: 0.95rem;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
    margin-bottom: 0.6rem;
  }
  .tip {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .text {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.7rem 1rem;
    border-left: 3px solid var(--accent);
  }
  .text p {
    margin: 0.15rem 0;
    line-height: 1.9;
  }
  .en {
    margin-top: 0.6rem;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .en summary {
    cursor: pointer;
    color: var(--mute);
  }
  .en p {
    margin: 0.3rem 0 0;
    white-space: pre-line;
  }
  .questions {
    margin-top: 1.1rem;
  }
  .qh {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mute);
  }
</style>
