<!--
  The practice room: short sessions of review across the skills the reader has met, scheduled by spaced
  repetition (src/lib/practice/schedule.ts), with a heatmap of every key-based skill in all twelve keys.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { COURSE_TITLE } from '$content/outline';
  import { findEntry } from '$lib/content/registry';
  import { progress } from '$lib/state/progress.svelte';
  import { practice } from '$lib/state/practice.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { rng } from '$lib/components/exercise/ear';
  import { nextItem, strength } from '$lib/practice/schedule';
  import { keyId, keyOf, MAJOR_KEYS, MINOR_KEYS, SKILLS, skillById, type Card, type Skill } from '$lib/practice/skills';
  import PracticeCard from '$lib/practice/PracticeCard.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let mounted = $state(false);
  let minutes = $state(10);
  let running = $state(false);
  let endsAt = 0;
  let now = $state(Date.now());
  let current: { id: string; card: Card; shownAt: number; n: number } | undefined = $state();
  let last: string | undefined;
  let done = $state(0);
  let right = $state(0);
  let r = rng(1);
  let tick: number | undefined;
  let importError = $state('');

  onMount(() => {
    progress.load();
    practice.load();
    settings.load();
    mounted = true;
  });
  onDestroy(() => clearInterval(tick));

  const unlocked = $derived(mounted ? SKILLS.filter((s) => practice.everything || progress.visited[s.chapter]) : []);
  const keysOf = (s: Skill) => (s.mode === 'minor' ? MINOR_KEYS : MAJOR_KEYS).map((f) => keyOf(f, s.mode ?? 'major'));
  const itemsOf = (s: Skill) => (s.keyed ? keysOf(s).map((k) => `${s.id}:${keyId(k)}`) : [s.id]);
  const candidates = $derived(unlocked.flatMap(itemsOf));
  const dueCount = $derived(mounted ? candidates.filter((c) => practice.items[c] && practice.items[c]!.due <= now).length : 0);
  const fresh = $derived(mounted ? candidates.filter((c) => !practice.items[c]).length : 0);

  function cardFor(id: string): Card {
    const [skillId, k] = id.split(':');
    const s = skillById(skillId!)!;
    const key = s.keyed ? keysOf(s).find((x) => keyId(x) === k) : undefined;
    return s.card(key, r);
  }
  function next() {
    now = Date.now();
    if (now >= endsAt || !candidates.length) return stop();
    const id = nextItem(candidates, practice.items, now, last)!;
    last = id;
    current = { id, card: cardFor(id), shownAt: performance.now(), n: done };
  }
  function start() {
    r = rng(Date.now() % 1e6);
    done = 0;
    right = 0;
    running = true;
    endsAt = Date.now() + minutes * 60e3;
    tick = window.setInterval(() => (now = Date.now()), 1000);
    next();
  }
  function stop() {
    running = false;
    current = undefined;
    clearInterval(tick);
  }
  function answered(ok: boolean) {
    if (!current) return;
    practice.record(current.id, ok, (performance.now() - current.shownAt) / 1000);
    done++;
    if (ok) right++;
    next();
  }

  const keyedSkills = $derived(unlocked.filter((s) => s.keyed));
  const other = $derived(unlocked.filter((s) => !s.keyed));
  const SHADE = ['var(--line)', 'color-mix(in srgb, var(--bad) 35%, var(--surface))', 'color-mix(in srgb, var(--maybe) 40%, var(--surface))', 'color-mix(in srgb, var(--ok) 25%, var(--surface))', 'color-mix(in srgb, var(--ok) 50%, var(--surface))', 'color-mix(in srgb, var(--ok) 75%, var(--surface))', 'var(--ok)'];
  const shade = (id: string) => SHADE[strength(practice.items[id]) + 1]!;
  const remaining = $derived(Math.max(0, Math.ceil((endsAt - now) / 60e3)));

  function download() {
    const blob = new Blob([practice.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'music-theory-practice.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function upload(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      practice.importJson(await f.text());
      importError = '';
    } catch (err) {
      importError = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<svelte:head>
  <title>Practice room — {COURSE_TITLE}</title>
  <meta name="description" content="Short daily sessions of review across the skills of the course, in all twelve keys." />
</svelte:head>

<div class="room">
  <header>
    <p class="eyebrow ui">Practice room</p>
    <h1>A little every day</h1>
    <p class="lede">
      Short sessions that bring back what you have learnt, just before you would forget it. Items you get
      right come back after longer and longer gaps (ten minutes, a day, three days, a week, three weeks);
      items you miss come back soon. Skills appear here once you have opened the chapter that teaches them.
    </p>
  </header>

  {#if running && current}
    <section class="session" aria-label="Practice session">
      <p class="meta ui">{done} done · {right} right · about {remaining} min left <button onclick={stop}><Icon name="stop" size={12} /> End</button></p>
      <p class="skill ui">{skillById(current.id.split(':')[0]!)?.title}</p>
      {#key current.n}
        <PracticeCard card={current.card} ondone={answered} />
      {/key}
    </section>
  {:else}
    <section class="start ui">
      {#if !mounted}
        <p>Loading…</p>
      {:else if !candidates.length}
        <p>Nothing to practise yet. Open a chapter (start with <a href="{base}/chapters/high-and-low/">Chapter 1</a>), or practise everything:</p>
        <Toggle checked={practice.everything} label="Include skills from chapters I have not opened" onchange={(v) => { practice.everything = v; practice.save(); }} />
      {:else}
        {#if done}<p class="ok"><Icon name="check" size={14} /> Session over: {right} of {done} right. Every answer was checked as you gave it.</p>{/if}
        <p>{dueCount} items due, {fresh} not tried yet, across {unlocked.length} skills.</p>
        <div class="row">
          <Segmented options={[5, 10, 20].map((m) => ({ value: m, label: `${m} min` }))} value={minutes} label="Session length" onchange={(v) => (minutes = v)} />
          <button class="go" onclick={start}><Icon name="play" size={14} /> Start a session</button>
        </div>
        <Toggle checked={practice.everything} label="Include skills from chapters I have not opened" onchange={(v) => { practice.everything = v; practice.save(); }} />
      {/if}
    </section>
  {/if}

  {#if mounted && unlocked.length}
    <section class="map" aria-labelledby="map-title">
      <h2 id="map-title">Where you are strong</h2>
      {#if keyedSkills.length}
        <div class="heat ui" role="table" aria-label="Strength by skill and key">
          {#each keyedSkills as s (s.id)}
            <div class="hrow" role="row">
              <span class="hname" role="rowheader">{s.title}</span>
              {#each keysOf(s) as k (keyId(k))}
                {@const id = `${s.id}:${keyId(k)}`}
                <span class="cell" role="cell" style:background={shade(id)} title="{noteName(k.tonic, settings.nameOptions)}{k.mode === 'minor' ? ' minor' : ' major'}: {practice.items[id] ? `box ${practice.items[id].box} of 5, ${practice.items[id].right} right, ${practice.items[id].wrong} wrong` : 'not tried'}">{noteName(k.tonic, settings.nameOptions)}{k.mode === 'minor' ? 'm' : ''}</span>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
      <ul class="others ui">
        {#each other as s (s.id)}
          <li><span class="dot" style:background={shade(s.id)}></span> {s.title} <span class="from">from <a href="{base}/chapters/{s.chapter}/">{findEntry('chapter', s.chapter)?.number}. {findEntry('chapter', s.chapter)?.title}</a></span></li>
        {/each}
      </ul>
      <p class="legend ui"><span class="dot" style:background={SHADE[0]}></span> not tried <span class="dot" style:background={SHADE[1]}></span> just missed <span class="dot" style:background={SHADE[3]}></span> learning <span class="dot" style:background={SHADE[6]}></span> long-term</p>
      <p class="io ui">Your practice history lives in this browser. <button onclick={download}>Download it</button> <label class="up">Restore from a file <input type="file" accept="application/json" onchange={upload} /></label> {#if importError}<span class="bad">{importError}</span>{/if}</p>
    </section>
  {/if}
</div>

<style>
  .room {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2.5rem 1rem 5rem;
  }
  .eyebrow {
    margin: 0 0 0.6rem;
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--accent);
  }
  h1 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(2.4rem, 7vw, 3.6rem);
    margin: 0 0 0.8rem;
    line-height: 1;
  }
  .lede {
    font-size: 1.1rem;
    color: var(--ink-2);
  }
  .session,
  .start {
    margin: 1.5rem 0;
    padding: 1.1rem 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
    display: grid;
    gap: 0.7rem;
  }
  .start p,
  .session p {
    margin: 0;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .skill {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 600;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: center;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
    padding: 0.45rem 1rem;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  h2 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 600;
    margin: 2.5rem 0 0.8rem;
  }
  .heat {
    display: grid;
    gap: 0.3rem;
    overflow-x: auto;
  }
  .hrow {
    display: grid;
    grid-template-columns: 11rem repeat(12, minmax(2.2rem, 1fr));
    gap: 0.25rem;
    align-items: center;
    min-width: 38rem;
  }
  .hname {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .cell {
    border-radius: 4px;
    text-align: center;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.35rem 0;
    color: var(--ink);
  }
  .others {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
    display: grid;
    gap: 0.3rem;
    font-size: 0.9rem;
  }
  .dot {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    vertical-align: -0.1rem;
    margin: 0 0.2rem 0 0.6rem;
  }
  .others .dot {
    margin-left: 0;
  }
  .from {
    color: var(--mute);
    font-size: 0.82rem;
  }
  .legend,
  .io {
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .up input {
    font-size: 0.8rem;
  }
  .bad {
    color: var(--bad);
  }
</style>
