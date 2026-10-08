<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_SUBTITLE, COURSE_TITLE, PARTS, APPENDICES, READING_PATHS, LAYERS } from '$content/outline';
  import { ALL_ENTRIES, findEntry } from '$lib/content/registry';
  import { progress } from '$lib/state/progress.svelte';
  import HexHero from '$lib/components/home/HexHero.svelte';
  import { onMount } from 'svelte';

  const available = new Set(ALL_ENTRIES.filter((e) => e.available).map((e) => `${e.kind}/${e.slug}`));
  const total = PARTS.reduce((n, p) => n + p.chapters.length, 0);
  const done = PARTS.reduce((n, p) => n + p.chapters.filter((c) => available.has(`chapter/${c.slug}`)).length, 0);
  const layerById = new Map(LAYERS.map((l) => [l.id, l]));

  const ANSWERS = [
    ['The hardware', 'never frees anything.'],
    ['The kernel', 'frees a frame when the last mapping goes.'],
    ['malloc', 'frees when you tell it to.'],
    ['Ownership', 'frees at the end of the owner’s scope.'],
    ['Reference counting', 'frees when the count reaches zero.'],
    ['A tracing collector', 'frees what nothing can reach.'],
  ];

  let path: string | null = $state(null);
  const onPath = $derived(path ? new Set(READING_PATHS.find((p) => p.id === path)!.chapters) : null);
  onMount(() => progress.load());
</script>

<svelte:head>
  <title>{COURSE_TITLE}: {COURSE_SUBTITLE}</title>
  <meta name="description" content="An interactive course on memory management for software engineers: page tables, TLBs and page faults, the kernel’s allocators, writing your own malloc, memory errors and sanitisers, ownership, reference counting and garbage collection, all running on a simulated machine in the browser." />
</svelte:head>

<div class="home">
  <section class="hero core-plane">
    <div class="hero-text">
      <p class="eyebrow ui">An interactive course · {done} of {total} chapters</p>
      <h1>{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}</p>
      <p class="lede">
        Every program asks for memory and, sooner or later, has to give it back. Between your <code>new</code> and the
        capacitors that hold the bits sit five layers that each hand out memory: caches, the kernel’s frames, page tables,
        <code>malloc</code> and your language’s runtime. This course opens each one, has you build a small version of it on a
        simulated RISC-V machine, and then breaks it on purpose.
      </p>
      <div class="cta ui">
        <a class="primary" href="{base}/chapters/{PARTS[0]!.chapters[0]!.slug}/">Start with chapter 0</a>
        <a href="{base}/lab/">The lab bench</a>
        <a href="{base}/appendix/museum/">The museum</a>
      </div>
    </div>
    <div class="hero-dump"><HexHero /></div>
  </section>

  <section class="who" aria-labelledby="who-h">
    <h2 id="who-h">One question, six answers</h2>
    <p class="note">The whole course is about one question: <em>who frees it?</em> Each layer answers it differently.</p>
    <ol class="answers ui">
      {#each ANSWERS as [who, what], i (who)}
        <li style:--i={i}><strong>{who}</strong> <span>{what}</span></li>
      {/each}
    </ol>
  </section>

  <section class="paths" aria-labelledby="paths-h">
    <h2 id="paths-h">Four ways through</h2>
    <p class="note">The chapters are written to be read in order, from the hardware up, but each one says what it assumes. Pick a path to highlight its chapters on the map below.</p>
    <div class="path-cards ui" role="group" aria-label="Reading paths">
      {#each READING_PATHS as p (p.id)}
        <button type="button" class="path" aria-pressed={path === p.id} onclick={() => (path = path === p.id ? null : p.id)}>
          <strong>{p.title}</strong>
          <span>{p.blurb}</span>
          <em>{p.chapters.length} chapters</em>
        </button>
      {/each}
    </div>
  </section>

  <section class="map" id="course-map" aria-label="Course map">
    {#each PARTS as part (part.id)}
      <div class="part">
        <h2>
          <span class="pid ui">{part.id === '0' || part.id === 'E' ? part.title : `Part ${part.id}`}</span>
          {#if part.id !== '0' && part.id !== 'E'}{part.title}{/if}
        </h2>
        <p class="blurb">{part.blurb}</p>
        {#if part.essay}
          {@const ess = findEntry('part', part.essay)}
          {#if ess?.available}<p class="essay ui"><a href="{base}{ess.href}">§ How we got here</a></p>{/if}
        {/if}
        <ol class="chapters">
          {#each part.chapters as c (c.slug)}
            {@const ok = available.has(`chapter/${c.slug}`)}
            <li class:dim={onPath && !onPath.has(c.slug)} class:hl={onPath?.has(c.slug)} class:visited={progress.visited[c.slug]}>
              <span class="n ui">{c.number}</span>
              <div class="c">
                {#if ok}<a href="{base}/chapters/{c.slug}/">{c.title}</a>{:else}<span class="planned" title="Being written">{c.title}</span>{/if}
                {#if c.optional}<span class="opt ui" title="Optional deeper chapter">◇ optional</span>{/if}
                <p>{c.summary.replace(/`/g, '')}</p>
                {#if c.flagship || c.layers?.length}
                  <p class="engines ui">
                    {#if c.flagship}<span class="flag">▶ {c.flagship}</span>{/if}
                    {#each c.layers ?? [] as l (l)}<span title={layerById.get(l)?.blurb}><b aria-hidden="true">{layerById.get(l)?.glyph}</b> {layerById.get(l)?.label}</span>{/each}
                  </p>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
    <div class="part">
      <h2><span class="pid ui">Appendices</span></h2>
      <ol class="chapters">
        {#each APPENDICES as a (a.slug)}
          <li>
            <span class="n ui">{a.number}</span>
            <div class="c">
              {#if available.has(`appendix/${a.slug}`)}<a href="{base}/appendix/{a.slug}/">{a.title}</a>{:else}<span class="planned">{a.title}</span>{/if}
              <p>{a.summary}</p>
            </div>
          </li>
        {/each}
      </ol>
    </div>
  </section>
</div>

<style>
  .home {
    max-width: 72rem;
    margin: 0 auto;
    padding: 0 max(1rem, 3vw) 5rem;
  }
  .hero {
    padding: 4rem 2rem 3rem;
    /* Keep the bleed within the home padding at intermediate viewport widths. */
    margin: 0 calc(-1 * min(2rem, max(1rem, 3vw)));
    border-bottom: 1px solid var(--line);
  }
  @media (max-width: 640px) {
    .hero {
      padding: 2.5rem 1rem 2rem;
      margin: 0 -1rem;
    }
  }
  .hero::before {
    opacity: 0.6;
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    margin: 0 0 0.8rem;
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 8vw, 4.6rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1;
    margin: 0;
  }
  .sub {
    font-size: clamp(1.15rem, 2.6vw, 1.5rem);
    font-style: italic;
    color: var(--ink-2);
    margin: 0.5rem 0 1.4rem;
  }
  .lede {
    max-width: 42rem;
    font-size: 1.12rem;
    margin: 0 0 1.6rem;
  }
  .hero {
    position: relative;
  }
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: center;
  }
  .hero-text {
    min-width: 0;
  }
  .hero-dump {
    transform: rotate(1.5deg);
  }
  @media (max-width: 960px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
    }
    .hero-dump {
      transform: none;
    }
  }
  .lede code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--copper);
  }
  .answers {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: 0.6rem;
  }
  .answers li {
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--line);
    border-left: 3px solid color-mix(in srgb, var(--copper) calc(30% + var(--i) * 14%), var(--line));
    border-radius: var(--radius);
    background: var(--panel);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .answers span {
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .flag {
    color: var(--copper);
    font-weight: 600;
  }
  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .cta a {
    padding: 0.5rem 1rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--fg);
    text-decoration: none;
    font-weight: 500;
  }
  .cta a.primary {
    background: var(--ink-blue);
    border-color: var(--ink-blue);
    color: var(--on-accent);
  }
  .cta a:hover {
    border-color: var(--ink-blue);
  }
  h2 {
    font-family: var(--font-display);
    font-weight: 560;
    font-size: 1.6rem;
    margin: 2.8rem 0 0.5rem;
  }
  .note {
    color: var(--ink-2);
    margin: 0 0 1rem;
  }
  .path-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
    gap: 0.8rem;
  }
  .path {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    text-align: left;
    padding: 0.9rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    cursor: pointer;
  }
  .path span {
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .path em {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .path[aria-pressed='true'] {
    border-color: var(--gold);
    box-shadow: inset 0 0 0 1px var(--gold);
    background: var(--gold-soft);
  }
  .part h2 {
    display: flex;
    align-items: baseline;
    gap: 0.8rem;
    border-top: 1px solid var(--line);
    padding-top: 1.2rem;
  }
  .pid {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    min-width: 5rem;
  }
  .blurb {
    color: var(--ink-2);
    margin: 0 0 0.5rem;
    max-width: 48rem;
  }
  .essay {
    margin: 0 0 0.8rem;
    font-size: 0.9rem;
    font-style: italic;
  }
  .chapters {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
    gap: 0.6rem 1.4rem;
  }
  .chapters li {
    display: grid;
    grid-template-columns: 2.2rem minmax(0, 1fr);
    gap: 0.6rem;
    padding: 0.6rem 0.4rem;
    border-radius: var(--radius-sm);
    transition: opacity 150ms;
  }
  .chapters li.dim {
    opacity: 0.35;
  }
  .chapters li.hl {
    background: var(--gold-soft);
  }
  .n {
    font-family: var(--font-mono);
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--mute);
    text-align: right;
  }
  .visited .n {
    color: var(--seal);
  }
  .c a,
  .planned {
    font-weight: 600;
    font-size: 1.05rem;
  }
  .planned {
    color: var(--ink-2);
  }
  .opt {
    margin-left: 0.4rem;
    font-size: 0.72rem;
    color: var(--gold);
  }
  .c p {
    margin: 0.15rem 0 0;
    font-size: 0.94rem;
    color: var(--ink-2);
  }
  .c .engines {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.7rem;
    font-size: 0.74rem;
    color: var(--mute);
  }
  .engines b {
    color: var(--ink-blue);
    font-weight: 600;
  }
</style>
