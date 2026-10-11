<script lang="ts">
  /**
   * New words for a lesson section, in dictionary notation: nouns with their article (coloured
   * by gender) and plural, verbs with their principal parts. Tap to hear; glosses from the
   * dictionary unless the lesson gives one.
   */
  import { lookup, headword } from '$lib/de/lexicon';
  import { speech } from '$lib/audio/speech.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import PlayButton from './PlayButton.svelte';
  import Icon from '../ui/Icon.svelte';
  import { onDestroy } from 'svelte';

  let { items }: { items: { k: string; raw: string; g?: string }[] } = $props();
  const rows = $derived(
    items.map((it) => {
      const e = lookup(it.k);
      const hw = e ? headword(it.k, e) : { head: it.raw, extra: '' };
      return { ...it, e, hw, gloss: it.g ?? e?.g ?? '' };
    }),
  );
  let playingAll = $state(false);
  let run = 0;
  function stop() {
    run++;
    playingAll = false;
    speech.stop();
  }
  onDestroy(() => {
    if (playingAll) stop();
  });

  async function playAll() {
    const id = ++run;
    playingAll = true;
    for (const r of rows) {
      if (id !== run) return;
      await speech.say(r.k);
      await new Promise((res) => setTimeout(res, 350));
    }
    if (id === run) playingAll = false;
  }
</script>

<div class="words card">
  <div class="bar ui">
    <span class="label">New words</span>
    <button class="btn small ghost" onclick={() => (playingAll ? stop() : playAll())}>
      <Icon name={playingAll ? 'stop' : 'play'} size={14} />
      {playingAll ? 'Stop' : 'Hear them all'}
    </button>
  </div>
  <ul>
    {#each rows as r (r.k)}
      <li class:in={deck.has(r.k)}>
        <PlayButton text={r.k} small />
        <span class="w" lang="de">
          {#if r.e?.p === 'n' && r.e.a}<span class="g-{r.e.a}">{r.hw.head}</span>{:else}{r.hw.head}{/if}<span class="x">{r.hw.extra}</span>
        </span>
        <span class="g">{r.gloss}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .words {
    margin: 1.5rem 0;
    padding: 0.4rem 0 0.4rem;
    overflow: hidden;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.2rem 0.6rem 0.3rem 1rem;
  }
  .label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  }
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 0.55rem;
    align-items: center;
    padding: 0.4rem 1rem 0.45rem 0.7rem;
    border-top: 1px solid var(--line);
    margin: 0;
    min-width: 0;
  }
  li > :global(.play) {
    grid-row: span 2;
  }
  .w {
    font-weight: 620;
    font-size: 1.05rem;
    line-height: 1.3;
  }
  .x {
    font-weight: 400;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .g {
    font-size: 0.88rem;
    color: var(--ink-2);
    line-height: 1.3;
  }
</style>
