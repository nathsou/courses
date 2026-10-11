<script lang="ts">
  /** Sixty seconds of meanings: see (or hear) a German word, pick the English. */
  import { onDestroy } from 'svelte';
  import { taught, headword, type Level, type Entry } from '$lib/de/lexicon';
  import { settings } from '$lib/state/settings.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { pickOne, sample, upTo } from './pick';
  import { defaultLevel } from './level';
  import LevelPicker from './LevelPicker.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const SECONDS = 60;
  let level = $state<Level>(defaultLevel(settings.data.start));
  let source = $state<'level' | 'deck'>('level');
  let mode = $state<'see' | 'hear'>('see');
  const pool = $derived.by(() => {
    void deck.version;
    const all = upTo(level).flatMap((l) => taught(l));
    return source === 'deck' ? all.filter(([k]) => deck.has(k)) : all;
  });
  let phase = $state<'ready' | 'play' | 'over'>('ready');
  let left = $state(SECONDS);
  let score = $state(0);
  let q = $state<{ key: string; e: Entry; options: string[]; answer: number } | null>(null);
  let wrong = $state<Set<number>>(new Set());
  let misses = $state<string[]>([]);
  let timer: ReturnType<typeof setInterval> | undefined;
  onDestroy(() => clearInterval(timer));
  const sense = (g: string) => g.split(/[;,]/)[0]!.trim();

  function next() {
    const [key, e] = pickOne(pool);
    const others = sample(
      pool.filter(([k, x]) => k !== key && sense(x.g) !== sense(e.g)),
      3,
    ).map(([, x]) => sense(x.g));
    const options = sample([sense(e.g), ...new Set(others)], 4);
    q = { key, e, options, answer: options.indexOf(sense(e.g)) };
    wrong = new Set();
    if (mode === 'hear') void speech.say(key);
  }
  function start() {
    score = 0;
    misses = [];
    left = SECONDS;
    phase = 'play';
    next();
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(timer);
        phase = 'over';
        progress.setBest(`blitz-${mode}-${level}`, score);
        sfx('done', settings.data.sounds);
      }
    }, 1000);
  }
  function pick(i: number) {
    if (!q || phase !== 'play') return;
    if (i === q.answer) {
      if (!wrong.size) score++;
      sfx('right', settings.data.sounds);
      if (mode === 'see') void speech.say(q.key);
      next();
    } else {
      sfx('wrong', settings.data.sounds);
      wrong = new Set([...wrong, i]);
      if (!misses.includes(q.key)) misses = [...misses, q.key];
    }
  }
</script>

<div class="game card">
  <div class="bar ui">
    <LevelPicker bind:value={level} label="Words up to" />
    {#if phase === 'play'}<span class="clock" class:low={left <= 10}>{left}s</span><span class="score">{score}</span>{/if}
  </div>
  {#if phase === 'ready'}
    <div class="opts ui">
      <label><input type="radio" bind:group={source} value="level" /> All words of these levels</label>
      <label><input type="radio" bind:group={source} value="deck" /> Only words in my review deck</label>
      <label><input type="radio" bind:group={mode} value="see" /> Read</label>
      <label><input type="radio" bind:group={mode} value="hear" /> Listen</label>
    </div>
    <p class="ui intro">{pool.length} words. Pick the meaning; sixty seconds.</p>
    <button class="btn primary" onclick={start} disabled={pool.length < 6}><Icon name="play" size={15} />Start</button>
  {:else if phase === 'play' && q}
    <div class="word" lang="de">
      {#if mode === 'see'}{#if q.e.p === 'n' && q.e.a}<span class="g-{q.e.a}">{headword(q.key, q.e).head}</span>{:else}{headword(q.key, q.e).head}{/if}{:else}<PlayButton text={q.key} /><PlayButton text={q.key} slow />{/if}
    </div>
    <div class="choices">
      {#each q.options as o, i (i)}<button class="choice" class:wrong={wrong.has(i)} disabled={wrong.has(i)} onclick={() => pick(i)}>{o}</button>{/each}
    </div>
  {:else}
    <p class="result"><strong>{score}</strong> right</p>
    {#if misses.length}
      <p class="ui">Missed: <span lang="de">{misses.join(', ')}</span></p>
      <button class="btn small" onclick={() => deck.add(misses, 'word blitz')}><Icon name="plus" size={14} />Add them to my review deck</button>
    {/if}
    <button class="btn primary" onclick={start}><Icon name="refresh" size={15} />Again</button>
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
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.88rem;
  }
  .clock {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .clock.low {
    color: var(--bad);
  }
  .score {
    font-weight: 800;
    font-size: 1.2rem;
    color: var(--accent-ink);
  }
  .intro {
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .word {
    display: flex;
    justify-content: center;
    font-size: clamp(1.6rem, 7vw, 2.4rem);
    font-weight: 650;
    margin: 0.8rem 0 1rem;
    text-align: center;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: 0.5rem;
  }
  .choice {
    padding: 0.65rem 0.8rem;
    border-radius: 12px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--fg);
  }
  .choice:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .choice.wrong {
    opacity: 0.4;
    text-decoration: line-through;
  }
  .result strong {
    font-size: 2rem;
    color: var(--accent-ink);
  }
</style>
