<script lang="ts">
  import { base } from '$app/paths';
  import { PARTS, LESSONS, COURSE_TITLE, COURSE_SUBTITLE } from '$content/outline';
  import { hasLesson } from '$lib/content/lessons';
  import { settings, START_DEFAULTS, type StartPoint } from '$lib/state/settings.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { placement } from '$lib/state/placement.svelte';
  import { deck } from '$lib/srs/deck.svelte';
  import { levelStats } from '$lib/srs/knowledge';
  import De from '$lib/components/de/De.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const STARTS: { id: StartPoint; title: string; de: string; text: string; lesson: string }[] = [
    { id: 'new', title: 'Brand new', de: 'Hallo!', text: 'Never studied German. Start with the sounds and the basics.', lesson: '01-hallo' },
    { id: 'a1', title: 'I learnt some once', de: 'Ach ja …', text: 'You studied German but most of it has gone. Start at A1; it will come back fast.', lesson: '01-hallo' },
    { id: 'a2', title: 'I know the basics', de: 'Na klar!', text: 'Present tense, articles and the perfect feel familiar. Start at A2.', lesson: '13-perfekt' },
    { id: 'b1', title: 'I can get by', de: 'Das geht.', text: 'You can handle everyday situations. Start at B1.', lesson: '24-praeteritum' },
  ];

  function choose(s: (typeof STARTS)[number]) {
    settings.update({ start: s.id, ...START_DEFAULTS[s.id] });
  }

  const counts = $derived(deck.counts());
  const stats = $derived.by(() => {
    void deck.version;
    return levelStats(deck.data);
  });
  const start = $derived(STARTS.find((s) => s.id === settings.data.start) ?? (settings.data.start === 'b2' ? { title: 'B2', lesson: '34-konjunktiv-i' } : undefined));
  /** The lesson to continue: the most recently visited unfinished lesson, else the next unfinished. */
  const resume = $derived.by(() => {
    const visited = Object.entries(progress.data.visited)
      .filter(([slug]) => !progress.data.completed[slug] && hasLesson(slug))
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (visited) return LESSONS.find((l) => l.slug === visited);
    const from = LESSONS.findIndex((l) => l.slug === start?.lesson);
    return LESSONS.slice(Math.max(0, from)).find((l) => !progress.data.completed[l.slug] && hasLesson(l.slug));
  });
  const done = $derived(LESSONS.filter((l) => progress.data.completed[l.slug]).length);
  const brushUp = $derived(new Set(placement.data?.missed ?? []));
</script>

<svelte:head>
  <title>{COURSE_TITLE}: {COURSE_SUBTITLE}</title>
  <meta name="description" content="An interactive German course from A1 to B2 for beginners and returners: every word tappable, nouns coloured by gender, grammar machines, spaced repetition, a placement check and an optional AI conversation partner." />
</svelte:head>

<div class="home">
  <header class="hero">
    <div class="seal" aria-hidden="true">ä</div>
    <div>
      <p class="kicker ui">An interactive course · A1 to B2</p>
      <h1>{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}. Forty lessons that explain the why of German grammar, let you hear and say every sentence, and make you produce German from the first day. If you learnt German once and lost it, this course is built to bring it back.</p>
    </div>
  </header>

  {#if !settings.data.start}
    <section class="starts" aria-labelledby="start-h">
      <h2 id="start-h">Where are you starting?</h2>
      <p class="ui hint">This sets your first lesson and how much help you see. Every lesson stays open. <strong>Returning to German?</strong> <a href="{base}/placement/">Take the placement check</a>: it finds your level and lists the exact lessons to brush up.</p>
      <div class="grid">
        {#each STARTS as s (s.id)}
          <button class="start card" onclick={() => choose(s)}>
            <span class="big" lang="de">{s.de}</span>
            <span class="t">{s.title}</span>
            <span class="d ui">{s.text}</span>
          </button>
        {/each}
      </div>
    </section>
  {:else}
    <section class="today" aria-label="Today">
      <a class="tile card main" href="{base}/learn/{resume?.slug ?? '01-hallo'}/">
        <span class="label ui">{progress.data.visited[resume?.slug ?? ''] ? 'Continue' : 'Next lesson'}</span>
        {#if resume}
          <span class="lz" lang="de">{resume.de}</span>
          <span class="lt">{resume.number}. {resume.title}</span>
          <span class="lb ui">{resume.blurb}</span>
        {:else}
          <span class="lt">You've finished every lesson. Herzlichen Glückwunsch!</span>
        {/if}
        <span class="go ui">Open <Icon name="arrow" size={15} /></span>
      </a>
      <a class="tile card" href="{base}/review/">
        <span class="label ui">Review</span>
        <span class="num">{counts.due + counts.fresh}</span>
        <span class="ui small">{counts.due} due · {counts.fresh} new today</span>
        <span class="ui small mute">{counts.words} words in your deck</span>
      </a>
      <div class="tile card">
        <span class="label ui">Streak</span>
        <span class="num"><Icon name="flame" size={26} /> {progress.streak}</span>
        <span class="ui small">day{progress.streak === 1 ? '' : 's'} in a row</span>
        <span class="ui small mute">{done} / {LESSONS.length} lessons done</span>
      </div>
    </section>

    <section class="knowledge card" aria-labelledby="k-h">
      <div class="kh">
        <h2 id="k-h">Your vocabulary</h2>
        <span class="ui mute small"><a href="{base}/words/">browse every word</a></span>
      </div>
      {#each stats as s (s.level)}
        {#if s.total}
          <div class="bar-row ui">
            <span class="lv">{s.level}</span>
            <div class="bar" role="img" aria-label="{s.level}: {s.known} learned, {s.inDeck} in your deck, of {s.total}">
              <span class="known" style="width: {(s.known / s.total) * 100}%"></span>
              <span class="deck" style="width: {((s.inDeck - s.known) / s.total) * 100}%"></span>
            </div>
            <span class="nums">{s.known} learned · {s.inDeck} / {s.total}</span>
          </div>
        {/if}
      {/each}
      <p class="ui legend"><i class="sw known"></i> learned (out of the learning phase) <i class="sw deck"></i> in your review deck</p>
    </section>
  {/if}

  <section class="map" aria-labelledby="map-h">
    <h2 id="map-h">The course</h2>
    {#if brushUp.size}<p class="ui hint"><span class="bu">brush up</span> marks the lessons whose point you missed in the <a href="{base}/placement/">placement check</a>.</p>{/if}
    {#each PARTS as p (p.id)}
      <div class="part">
        <div class="ph">
          <span class="pzh">{p.level}</span>
          <div>
            <h3>{p.title} <span class="pde" lang="de">· {p.de}</span></h3>
            <p class="ui tag">{p.tagline}</p>
          </div>
        </div>
        <ol class="lessons">
          {#each p.lessons as l (l.slug)}
            {@const ref = LESSONS.find((x) => x.slug === l.slug)!}
            {@const isDone = !!progress.data.completed[l.slug]}
            <li>
              <a class="lesson card" class:done={isDone} class:next={resume?.slug === l.slug} href="{base}/learn/{l.slug}/">
                <span class="n ui">{isDone ? '✓' : ref.number}</span>
                <span class="body">
                  <span class="title">{l.title} <span class="min ui">· {l.minutes} min</span>{#if brushUp.has(l.slug) && !isDone}<span class="bu ui">brush up</span>{/if}</span>
                  <span class="lzh" lang="de">{l.de}</span>
                  <span class="blurb ui">{l.blurb}</span>
                </span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
  </section>

  <section class="tools" aria-labelledby="tools-h">
    <h2 id="tools-h">Beyond the lessons</h2>
    <div class="tgrid">
      <a class="tool card" href="{base}/placement/"><Icon name="sparkle" size={22} /><strong>Placement check</strong><span class="ui">Find your level and the lessons to brush up, in about ten minutes.</span></a>
      <a class="tool card" href="{base}/practice/"><Icon name="game" size={22} /><strong>Practice</strong><span class="ui">Der-die-das blitz, verb drills, case and ending drills, numbers, the clock, dictation.</span></a>
      <a class="tool card" href="{base}/exam/"><Icon name="exam" size={22} /><strong>Level checks</strong><span class="ui">Goethe-style reading, listening and grammar tests for A1, A2, B1 and B2.</span></a>
      <a class="tool card" href="{base}/words/"><Icon name="book" size={22} /><strong>Word list</strong><span class="ui">Every word in the course with its article, plural and verb forms.</span></a>
      <a class="tool card" href="{base}/settings/"><Icon name="settings" size={22} /><strong>Settings</strong><span class="ui">Gender colours, translations, audio speed, typing, the AI partner and backups.</span></a>
    </div>
    {#if settings.data.start}<p class="ui mute small">Starting point: {start?.title ?? settings.data.start}. <button class="link" onclick={() => settings.update({ start: null })}>Change</button></p>{/if}
  </section>

  <p class="sample ui">A taste: <De text="Aller Anfang ist schwer." /> “Every beginning is hard.” And then it gets easier.</p>
</div>

<style>
  .home {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 62rem;
  }
  .hero {
    display: flex;
    gap: 1.4rem;
    align-items: center;
    margin-bottom: 2rem;
  }
  .seal {
    flex: none;
    display: grid;
    place-items: center;
    width: 5.5rem;
    height: 5.5rem;
    border-radius: 18px;
    background: var(--accent);
    color: #fff;
    font-size: 3.6rem;
    font-weight: 650;
    transform: rotate(-4deg);
    box-shadow: var(--shadow);
  }
  .kicker {
    margin: 0;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  h1 {
    margin: 0.2rem 0 0.4rem;
    font-size: clamp(2.2rem, 6vw, 3.2rem);
  }
  .sub {
    margin: 0;
    font-size: 1.12rem;
    color: var(--ink-2);
    max-width: 40rem;
  }
  h2 {
    font-size: 1.45rem;
    margin: 0 0 0.6rem;
  }
  .hint {
    color: var(--ink-2);
    font-size: 0.92rem;
    margin: 0 0 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: 0.7rem;
  }
  .start {
    display: grid;
    gap: 0.3rem;
    padding: 1rem 1.1rem;
    text-align: left;
    cursor: pointer;
    color: var(--fg);
    font-family: var(--font-body);
    transition: border-color 120ms, transform 120ms;
  }
  .start:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .start .big {
    font-size: 1.6rem;
    font-style: italic;
    color: var(--accent);
    line-height: 1.1;
  }
  .start .t {
    font-weight: 650;
    font-size: 1.1rem;
  }
  .start .d {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .today {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }
  .tile {
    display: grid;
    align-content: start;
    gap: 0.2rem;
    padding: 1rem 1.1rem;
    color: var(--fg);
    text-decoration: none;
  }
  a.tile:hover {
    border-color: var(--accent);
  }
  .label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .main {
    background: linear-gradient(135deg, var(--panel), var(--accent-soft));
  }
  .lz {
    font-size: 1.7rem;
    font-style: italic;
    line-height: 1.15;
    color: var(--accent);
  }
  .lt {
    font-weight: 650;
    font-size: 1.15rem;
  }
  .lb {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 650;
    font-size: 0.86rem;
    color: var(--accent-ink);
    margin-top: 0.3rem;
  }
  .num {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-ui);
    font-size: 2.2rem;
    font-weight: 750;
    color: var(--accent-ink);
  }
  .small {
    font-size: 0.82rem;
  }
  .mute {
    color: var(--mute);
  }
  .knowledge {
    padding: 1rem 1.2rem;
    margin-bottom: 2.4rem;
  }
  .kh {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.4rem;
  }
  .kh h2 {
    font-size: 1.15rem;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 4rem 1fr auto;
    gap: 0.7rem;
    align-items: center;
    margin: 0.45rem 0;
    font-size: 0.85rem;
  }
  .lv {
    font-weight: 700;
  }
  .bar {
    display: flex;
    height: 0.75rem;
    border-radius: 999px;
    background: var(--pn);
    overflow: hidden;
  }
  .bar .known,
  .sw.known {
    background: var(--jade);
  }
  .bar .deck,
  .sw.deck {
    background: color-mix(in srgb, var(--jade) 35%, var(--pn));
  }
  .nums {
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  .legend {
    margin: 0.4rem 0 0;
    font-size: 0.75rem;
    color: var(--mute);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.5rem;
    border-radius: 99px;
    margin-left: 0.4rem;
  }
  .map {
    margin-top: 1rem;
  }
  .part {
    margin: 1.4rem 0 2rem;
  }
  .ph {
    display: flex;
    gap: 0.9rem;
    align-items: center;
    margin-bottom: 0.7rem;
  }
  .pzh {
    flex: none;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 12px;
    background: var(--accent);
    color: #fff;
    font-family: var(--font-ui);
    font-weight: 750;
    font-size: 1.1rem;
  }
  .pde {
    font-weight: 450;
    font-style: italic;
    color: var(--ink-2);
  }
  .bu {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0 0.45rem;
    border-radius: 999px;
    background: var(--gold-soft);
    color: var(--gold);
    font-size: 0.68rem;
    font-weight: 700;
    vertical-align: 0.1em;
  }
  h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  .tag {
    margin: 0.1rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .lessons {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    gap: 0.55rem;
  }
  .lesson {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.7rem;
    align-items: start;
    padding: 0.7rem 0.9rem;
    color: var(--fg);
    text-decoration: none;
    height: 100%;
    transition: border-color 120ms;
  }
  .lesson:hover {
    border-color: var(--accent);
  }
  .lesson.done {
    background: color-mix(in srgb, var(--jade-soft) 60%, var(--panel));
  }
  .lesson.next {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
  }
  .n {
    font-size: 0.8rem;
    font-weight: 750;
    color: var(--mute);
    width: 1.3rem;
    text-align: center;
  }
  .done .n {
    color: var(--jade);
  }
  .lzh {
    font-size: 0.92rem;
    font-style: italic;
    color: var(--accent-ink);
  }
  .body {
    display: grid;
    min-width: 0;
  }
  .title {
    font-weight: 650;
    line-height: 1.3;
  }
  .blurb {
    font-size: 0.78rem;
    color: var(--ink-2);
    line-height: 1.35;
  }
  .min {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--mute);
    white-space: nowrap;
  }
  .n {
    line-height: 1.5;
  }
  .tgrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: 0.6rem;
  }
  .tool {
    display: grid;
    gap: 0.3rem;
    padding: 1rem;
    color: var(--fg);
    text-decoration: none;
  }
  .tool:hover {
    border-color: var(--accent);
  }
  .tool :global(svg) {
    color: var(--accent);
  }
  .tool span {
    font-size: 0.85rem;
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
  .sample {
    margin-top: 2.5rem;
    color: var(--mute);
    font-size: 0.85rem;
  }
  @media (max-width: 720px) {
    .today {
      grid-template-columns: 1fr 1fr;
    }
    .main {
      grid-column: 1 / -1;
    }
    .hero {
      align-items: flex-start;
    }
    .seal {
      width: 4rem;
      height: 4rem;
      font-size: 2.6rem;
    }
  }
</style>
