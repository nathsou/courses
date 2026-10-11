<script lang="ts">
  /** Sixty seconds of der, die or das, with the ending rule shown after each slip. */
  import { onDestroy } from 'svelte';
  import { taught, bare, type Level } from '$lib/de/lexicon';
  import { ruleFor } from '$lib/de/gender';
  import { articleOf } from '$lib/de/notation';
  import { settings } from '$lib/state/settings.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { pickOne, upTo } from './pick';
  import { defaultLevel } from './level';
  import LevelPicker from './LevelPicker.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { typing } from '$lib/exercises/keys';

  const SECONDS = 60;
  let level = $state<Level>(defaultLevel(settings.data.start));
  const pool = $derived(upTo(level).flatMap((l) => taught(l)).filter(([, e]) => e.p === 'n' && e.a && e.a !== 'pl'));
  let phase = $state<'ready' | 'play' | 'over'>('ready');
  let left = $state(SECONDS);
  let score = $state(0);
  let current = $state<[string, string] | null>(null);
  let flash = $state<{ ok: boolean; text: string } | null>(null);
  let misses = $state<string[]>([]);
  let best = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  onDestroy(() => clearInterval(timer));

  function next() {
    let k: string;
    do k = pickOne(pool)[0];
    while (k === current?.[0] && pool.length > 1);
    current = [k, bare(k)];
  }
  function start() {
    score = 0;
    misses = [];
    flash = null;
    left = SECONDS;
    phase = 'play';
    next();
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      if (left <= 0) end();
    }, 1000);
  }
  function end() {
    clearInterval(timer);
    phase = 'over';
    best = progress.setBest(`gender-blitz-${level}`, score);
    sfx('done', settings.data.sounds);
  }
  function answer(a: string) {
    if (phase !== 'play' || !current) return;
    const [key, noun] = current;
    const right = key.split(' ')[0]!;
    if (a === right) {
      score++;
      sfx('right', settings.data.sounds);
      flash = { ok: true, text: key };
    } else {
      sfx('wrong', settings.data.sounds);
      const r = ruleFor(noun);
      const g = { der: 'm', die: 'f', das: 'n' }[right];
      flash = { ok: false, text: `${key}${r && r.gender === g ? ` (${r.ending} → ${articleOf[r.gender]})` : ''}` };
      if (!misses.includes(key)) misses = [...misses, key];
    }
    void speech.say(key);
    next();
  }
  function onKey(e: KeyboardEvent) {
    if (phase !== 'play' || typing(e)) return;
    const a = { '1': 'der', '2': 'die', '3': 'das' }[e.key];
    if (a) answer(a);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="game card">
  <div class="bar ui">
    <LevelPicker bind:value={level} label="Nouns up to" />
    {#if phase === 'play'}<span class="clock" class:low={left <= 10}>{left}s</span><span class="score">{score}</span>{/if}
  </div>
  {#if phase === 'ready'}
    <p class="ui intro">{pool.length} nouns. See a noun, tap its article (keys 1, 2, 3). Sixty seconds. Best so far: {progress.data.best[`gender-blitz-${level}`] ?? '–'}.</p>
    <button class="btn primary" onclick={start} disabled={pool.length < 5}><Icon name="play" size={15} />Start</button>
  {:else if phase === 'play' && current}
    <p class="noun" lang="de">{current[1]}</p>
    <div class="arts">
      {#each ['der', 'die', 'das'] as a, i (a)}<button class="art {a}" onclick={() => answer(a)}><span class="k ui">{i + 1}</span>{a}</button>{/each}
    </div>
    <p class="flash ui" aria-live="polite">{#if flash}<span class:ok={flash.ok} class:bad={!flash.ok}>{flash.ok ? '✓' : '✗'} <span lang="de">{flash.text}</span></span>{/if}</p>
  {:else}
    <p class="result"><strong>{score}</strong> right{best ? ' · a new best!' : ''}</p>
    {#if misses.length}
      <p class="ui">To learn:</p>
      <ul class="misses" lang="de">
        {#each misses as m (m)}<li><span class="g-{({ der: 'm', die: 'f', das: 'n' } as Record<string, string>)[m.split(' ')[0]!]}">{m}</span></li>{/each}
      </ul>
      <button class="btn small" onclick={() => deck.add(misses, 'gender blitz')}><Icon name="plus" size={14} />Add these to my review deck</button>
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
  .noun {
    text-align: center;
    font-size: clamp(2rem, 8vw, 2.8rem);
    font-weight: 650;
    margin: 0.8rem 0;
  }
  .arts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .art {
    position: relative;
    font-family: var(--font-body);
    font-size: 1.4rem;
    font-weight: 650;
    padding: 0.7rem 0.3rem;
    border-radius: 14px;
    border: 2px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
  }
  .art.der { color: var(--g-m); }
  .art.die { color: var(--g-f); }
  .art.das { color: var(--g-n); }
  .art:hover {
    border-color: currentColor;
  }
  .k {
    position: absolute;
    top: 0.25rem;
    left: 0.5rem;
    font-size: 0.65rem;
    color: var(--mute);
  }
  .flash {
    min-height: 1.6rem;
    text-align: center;
    margin: 0.6rem 0 0;
  }
  .ok { color: var(--jade); }
  .bad { color: var(--bad); }
  .result {
    font-size: 1.2rem;
  }
  .result strong {
    font-size: 2rem;
    color: var(--accent-ink);
  }
  .misses {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    padding-left: 1.1rem;
  }
</style>
