<script lang="ts">
  /**
   * The placement check: up to 32 questions, eight per level, stopping once a level is clearly too
   * hard. It recommends where to start and lists the lessons to brush up; nothing is locked.
   * Returners can add the vocabulary of the levels below to their review deck in one go.
   */
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { settings, START_DEFAULTS, type StartPoint } from '$lib/state/settings.svelte';
  import { placement, startLevel } from '$lib/state/placement.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { taught, LEVELS, type Level } from '$lib/de/lexicon';
  import { PLACEMENT, type PlacementQuestion } from '$content/data/placement';
  import { LESSONS, PARTS, lessonBySlug } from '$content/outline';
  import { speech } from '$lib/audio/speech.svelte';
  import { shuffle } from '$lib/exercises/shuffle';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let i = $state(0);
  let picks = $state<number[]>([]);
  let finished = $state(false);
  const q = $derived<PlacementQuestion | undefined>(finished ? undefined : PLACEMENT[i]);
  const order = $derived(q ? shuffle(q.options.map((_, k) => k), `placement:${i}`) : []);
  const levelQs = (l: Level) => PLACEMENT.map((x, k) => [x, k] as const).filter(([x]) => x.level === l);
  const score = (l: Level) => levelQs(l).filter(([x, k]) => picks[k] === x.answer).length;
  const attempted = $derived(LEVELS.filter((l) => levelQs(l).every(([, k]) => picks[k] !== undefined)));
  const scores = $derived(Object.fromEntries(attempted.map((l) => [l, score(l)])) as Partial<Record<Level, number>>);

  $effect(() => {
    if (q?.audio) return speech.schedule(q.audio, 250);
  });

  function pick(k: number) {
    picks = [...picks, k];
    const next = PLACEMENT[i + 1];
    // At the end of a level, stop if it went badly: no need to suffer through the harder ones.
    if (!next || (next.level !== q!.level && score(q!.level) <= 3)) finish();
    else i++;
  }
  function finish() {
    finished = true;
    const missed = [...new Set(PLACEMENT.filter((x, k) => picks[k] !== undefined && picks[k] !== x.answer).map((x) => x.lesson))];
    placement.save({ at: Date.now(), scores, missed });
  }
  function skip() {
    settings.update({ start: 'new', ...START_DEFAULTS.new });
    void goto(`${base}/learn/${LESSONS[0]!.slug}/`);
  }

  const start = $derived(finished ? startLevel(scores, LEVELS) : 'A1');
  const startPoint = $derived<StartPoint>(start === 'done' ? 'b2' : start === 'A1' ? (score('A1') <= 2 ? 'new' : 'a1') : (start.toLowerCase() as StartPoint));
  const missedLessons = $derived(placement.data?.missed.map((s) => lessonBySlug(s)).filter((l) => !!l) ?? []);
  /** Lessons missed below the start level: brush these up. */
  const brushUp = $derived(missedLessons.filter((l) => start === 'done' || LEVELS.indexOf(l!.part.level) < LEVELS.indexOf(start)));
  const firstLesson = $derived.by(() => {
    if (start === 'done') return LESSONS[LESSONS.length - 1]!;
    const inLevel = LESSONS.filter((l) => l.part.level === start);
    // Start at the first lesson of the level whose point was missed, or at the level's start.
    return inLevel.find((l) => missedLessons.some((m) => m!.slug === l.slug)) && score(start) >= 4 ? inLevel.find((l) => missedLessons.some((m) => m!.slug === l.slug))! : inLevel[0]!;
  });
  const below = $derived(start === 'done' ? LEVELS : LEVELS.slice(0, LEVELS.indexOf(start)));
  const belowWords = $derived(below.flatMap((l) => taught(l).map(([k]) => k)));
  let addBelow = $state(true);

  function accept() {
    settings.update({ start: startPoint, ...START_DEFAULTS[startPoint] });
    if (addBelow && belowWords.length) deck.add(belowWords, 'placement');
    void goto(`${base}/learn/${firstLesson.slug}/`);
  }
  const LEVEL_TEXT: Record<Level | 'done', string> = {
    A1: 'Start at A1',
    A2: 'Start at A2',
    B1: 'Start at B1',
    B2: 'Start at B2',
    done: 'You are at B2 already',
  };
</script>

<svelte:head><title>Placement check · Auf Deutsch</title></svelte:head>

<div class="page">
  <h1>Placement check</h1>
  {#if q}
    <p class="ui lead">Up to 32 quick questions, from A1 to B2, eight per level; it stops early once a level is clearly too hard. Guessing is fine, but “I don't know” is more useful than a wild guess. New to German? <button class="link" onclick={skip}>Skip straight to lesson 1</button>.</p>
    <div class="card box">
      <div class="top ui"><span>{i + 1} / {PLACEMENT.length}</span><span class="band">{q.level}</span></div>
      <p class="prompt"><Rich text={q.prompt} de={false} /></p>
      {#if q.audio}<div class="audio"><PlayButton text={q.audio} /><PlayButton text={q.audio} slow /></div>{/if}
      {#if q.de}<p class="de"><Rich text={q.de} size="lg" de genders="hide" /></p>{/if}
      <div class="opts">
        {#each order as k (k)}
          <button class="opt" onclick={() => pick(k)}><Rich text={q.options[k]!} plain genders="hide" /></button>
        {/each}
        <button class="opt idk ui" onclick={() => pick(-1)}>I don't know</button>
      </div>
    </div>
  {:else}
    <div class="card box">
      <p class="ui small">{#each attempted as l, k (l)}{k ? ' · ' : ''}{l} {scores[l]}/8{/each}</p>
      <h2>{LEVEL_TEXT[start]}</h2>
      {#if start === 'done'}
        <p>You got through B2 comfortably. Use the course to polish: the B2 lessons, the level checks and the review deck.</p>
      {:else if start === 'A1' && startPoint === 'new'}
        <p>Start at the beginning: lesson 1 builds the sounds and the basics quickly, and returners will find the first lessons go fast.</p>
      {:else}
        <p>Begin with <a href="{base}/learn/{firstLesson.slug}/">lesson {firstLesson.number}, {firstLesson.title}</a>{firstLesson.slug !== PARTS.find((p) => p.level === start)?.lessons[0]?.slug ? ' (the first point you missed at this level)' : ''}. Skim the parts you know: every lesson has exercises you can jump straight to.</p>
      {/if}
      {#if brushUp.length}
        <h3 class="ui bh">Brush up first</h3>
        <p class="ui small">You missed the point these lessons teach, even though the level as a whole went well:</p>
        <ul class="bl">
          {#each brushUp as l (l!.slug)}<li><a href="{base}/learn/{l!.slug}/">{l!.number}. {l!.title}</a> <span class="ui g">{l!.grammar}</span></li>{/each}
        </ul>
      {/if}
      {#if belowWords.length}
        <label class="ui chk"><input type="checkbox" bind:checked={addBelow} /> Add the {belowWords.length} words of {below.join(' and ')} to my review deck (introduced {settings.data.newPerDay} a day), so forgotten vocabulary comes back</label>
      {/if}
      <div class="row">
        <button class="btn primary" onclick={accept}>Sounds good <Icon name="arrow" size={15} /></button>
        <a class="btn ghost" href="{base}/">Choose myself</a>
      </div>
      <p class="ui small">The course map remembers this result and marks the lessons to brush up. You can take the check again at any time.</p>
    </div>
    <details class="answers ui">
      <summary>Your answers</summary>
      <ol>
        {#each PLACEMENT as x, k (k)}
          {#if picks[k] !== undefined}
            <li class:ok={picks[k] === x.answer}>
              <span class="lv">{x.level}</span>
              {#if x.de}<span lang="de">{x.de.replace('___', x.options[x.answer]!)}</span>{:else if x.audio}<span lang="de">{x.audio}</span> → {x.options[x.answer]}{:else}{x.options[x.answer]}{/if}
              {#if picks[k] !== x.answer}<span class="miss">(you: {picks[k] === -1 ? "don't know" : x.options[picks[k]!]})</span>{/if}
            </li>
          {/if}
        {/each}
      </ol>
    </details>
  {/if}
</div>

<style>
  .page {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 42rem;
  }
  h1 {
    margin: 0 0 0.3rem;
  }
  h2 {
    margin: 0.3rem 0 0.5rem;
  }
  .lead {
    color: var(--ink-2);
  }
  .link {
    border: none;
    background: none;
    padding: 0;
    color: var(--accent-ink);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }
  .box {
    padding: 1.1rem 1.3rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .band {
    font-weight: 700;
    color: var(--accent-ink);
  }
  .prompt {
    font-size: 1.05rem;
    margin: 0.6rem 0 0.4rem;
  }
  .de {
    margin: 0.2rem 0 0.8rem;
  }
  .audio {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }
  .opts {
    display: grid;
    gap: 0.45rem;
  }
  .opt {
    text-align: left;
    padding: 0.6rem 0.9rem;
    border-radius: 12px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 1rem;
  }
  .opt:hover {
    border-color: var(--accent);
  }
  .idk {
    color: var(--mute);
    font-size: 0.88rem;
    border-style: dashed;
  }
  .small {
    font-size: 0.82rem;
    color: var(--mute);
  }
  .bh {
    margin: 1rem 0 0.2rem;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .bl {
    margin: 0.3rem 0 0.8rem;
    padding-left: 1.2rem;
  }
  .bl .g {
    font-size: 0.8rem;
    color: var(--mute);
  }
  .chk {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.9rem;
    margin-top: 0.8rem;
  }
  .chk input {
    margin-top: 0.25rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .answers {
    margin-top: 1rem;
    font-size: 0.88rem;
  }
  .answers summary {
    cursor: pointer;
    color: var(--mute);
  }
  .answers li {
    margin: 0.2rem 0;
  }
  .answers li.ok::marker {
    color: var(--jade);
  }
  .lv {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--mute);
    margin-right: 0.3rem;
  }
  .miss {
    color: var(--bad);
  }
</style>
