<script lang="ts">
  /** Dictation from the course's own dialogues: hear a sentence, type it, compare word by word. */
  import { type Level } from '$lib/de/lexicon';
  import { normalise, transliterate } from '$lib/de/check';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { buildCorpus, dictable } from './corpus';
  import { pickOne, upTo } from './pick';
  import { defaultLevel } from './level';
  import LevelPicker from './LevelPicker.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import De from '$lib/components/de/De.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const sources = import.meta.glob('/content/lessons/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const corpus = buildCorpus(sources).filter(dictable);
  let level = $state<Level>(defaultLevel(settings.data.start));
  const pool = $derived(corpus.filter((s) => upTo(level).includes(s.level)));
  let s = $state<(typeof corpus)[number] | null>(null);
  let value = $state('');
  let input: HTMLInputElement | undefined = $state();
  let diff = $state<{ w: string; ok: boolean }[] | null>(null);
  let count = $state(0);
  let right = $state(0);

  function next() {
    s = pickOne(pool);
    value = '';
    diff = null;
    count++;
    void speech.say(s.de);
    setTimeout(() => input?.focus(), 30);
  }
  const loose = (w: string) => transliterate(w.toLowerCase());
  function check(e: Event) {
    e.preventDefault();
    if (!s || diff) return;
    const typed = normalise(value).split(' ');
    const target = normalise(s.de).split(' ');
    diff = target.map((w, i) => ({ w, ok: typed[i] === w || (settings.data.lenientSpelling && loose(typed[i] ?? '') === loose(w)) }));
    const ok = diff.every((d) => d.ok) && typed.length === target.length;
    if (ok) right++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
  }
</script>

<div class="game card">
  <div class="bar ui">
    <LevelPicker bind:value={level} label="Sentences up to" />
    {#if s}<span class="score">{right} / {count}</span>{/if}
  </div>
  {#if !s}
    <p class="ui intro">{pool.length} sentences from the lessons' dialogues. Listen (as often as you like), type what you hear, then compare word by word. Capitals and umlauts count.</p>
    <button class="btn primary" onclick={next} disabled={!pool.length}><Icon name="play" size={15} />Start</button>
  {:else}
    <div class="listen"><PlayButton text={s.de} /><PlayButton text={s.de} slow /></div>
    <form class="row" onsubmit={(e) => (diff ? (e.preventDefault(), next()) : check(e))}>
      <input bind:this={input} bind:value lang="de" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="What you hear" readonly={!!diff} />
      <button class="btn">{diff ? 'Next' : 'Check'}</button>
    </form>
    {#if !diff}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
    {#if diff}
      <p class="diff" lang="de" aria-live="polite">{#each diff as d, i (i)}<span class:ok={d.ok} class:bad={!d.ok}>{d.w}</span> {/each}</p>
      <p class="full"><De text={s.de} size="md" /></p>
      <p class="en ui">{s.en}</p>
    {/if}
  {/if}
</div>

<style>
  .game {
    padding: 1rem 1.2rem 1.2rem;
    margin: 1rem 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }
  .score {
    font-weight: 700;
    color: var(--accent-ink);
  }
  .intro {
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .listen {
    display: flex;
    gap: 0.4rem;
    margin: 0.4rem 0 0.7rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 1.1rem;
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .diff {
    font-size: 1.05rem;
    margin: 0.6rem 0 0.2rem;
  }
  .ok { color: var(--jade); }
  .bad { color: var(--bad); text-decoration: underline wavy; }
  .full {
    margin: 0.2rem 0;
  }
  .en {
    color: var(--mute);
    font-size: 0.88rem;
    margin: 0;
  }
</style>
