<script lang="ts">
  import { after } from '$lib/util/after';
  import { base } from '$app/paths';
  import { PARTS, APPENDICES, COURSE_TITLE, COURSE_SUBTITLE } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { DESlice, differenceEngineModel } from '$lib/models/differenceEngine';
  import { POLYS, staggeredColumns, evalPoly } from '$lib/mech/difference';

  const available = new Set(ALL_ENTRIES.filter((e) => e.available).map((e) => `${e.kind}:${e.slug}`));
  const first = ALL_ENTRIES.find((e) => e.available);

  const model = differenceEngineModel();
  const slice = new DESlice(staggeredColumns(POLYS.euler!.p));
  let tick = $state(0);
  let mv: { wake(): void } | undefined = $state();
  function animate(dt: number) {
    const m = slice.update(dt);
    tick++;
    return m;
  }
  function turn() {
    slice.cycle();
    mv?.wake();
  }
  const printed = $derived(after(tick, [...slice.printed]));
  const yr = (y?: number) => (y === undefined ? '' : y < 0 ? `c. ${-y} BC` : String(y));
</script>

<svelte:head>
  <title>{COURSE_TITLE}: {COURSE_SUBTITLE.toLowerCase()}</title>
  <meta name="description" content="An interactive course on how machines computed before electronics: the Pascaline, stepped drums, Babbage’s engines and Lovelace’s program, the Antikythera mechanism, integrators and differential analysers, Zuse’s Z1, and why computers became electronic. Every machine runs in your browser." />
</svelte:head>

<div class="home">
  <header class="hero">
    <div class="text">
      <p class="eyebrow ui">An interactive course</p>
      <h1>{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}</p>
      <p class="lede">
        From Pascal’s calculator to Babbage’s engines, from a Greek astronomical computer to a differential analyser
        built of Meccano: how machines of brass, steel, water and marbles carried, multiplied, integrated and followed
        programs, and why every computer today is made of electrons instead. Written for software engineers: every
        machine runs here, in 3D, and every chapter maps its mechanism to the computer you are using.
      </p>
      <div class="ctas ui">
        {#if first}<a class="start" href="{base}{first.href}">Start with the Pascaline →</a>{/if}
        <a class="alt" href="{base}/chapters/note-g/">Program the Analytical Engine</a>
      </div>
    </div>
    <figure class="machine-card">
      <MachineView bind:this={mv} {model} data={slice} {animate} label="A slice of Babbage’s Difference Engine No. 2, set up to tabulate x² + x + 41" height="20rem">
        {#snippet readout()}
          <div class="ro">
            <button class="ui turn" onclick={turn}>Turn the handle</button>
            <span class="ui">Difference Engine No. 2, a slice, tabulating x² + x + 41:
              {#if printed.length}<strong class="num">{printed.map(String).join(', ')}</strong>{:else}press to print the next value{/if}</span>
          </div>
        {/snippet}
      </MachineView>
    </figure>
  </header>

  <section class="contents">
    <h2>Contents</h2>
    {#each PARTS as part (part.id)}
      <div class="part">
        <h3><span class="pid ui">Part {part.id}</span> {part.title}</h3>
        <p class="blurb">{part.blurb}</p>
        <ol class="chapters">
          {#each part.chapters as c (c.slug)}
            {@const here = available.has(`chapter:${c.slug}`)}
            <li class:planned={!here}>
              <a href={here ? `${base}/chapters/${c.slug}/` : undefined}>
                <span class="n ui">{c.number}</span>
                <span class="t">{c.title}</span>
                <span class="y ui">{yr(c.year)}</span>
                <span class="s">{c.summary}</span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
    <div class="part">
      <h3><span class="pid ui">Appendices</span></h3>
      <ol class="chapters">
        {#each APPENDICES as a (a.slug)}
          {@const here = available.has(`appendix:${a.slug}`)}
          <li class:planned={!here}><a href={here ? `${base}/appendix/${a.slug}/` : undefined}><span class="n ui">{a.number}</span><span class="t">{a.title}</span><span class="y"></span><span class="s">{a.summary}</span></a></li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="threads">
    <h2>Threads through the course</h2>
    <div class="cards">
      <div><h4>The carry</h4><p>The Pascaline’s falling sautoirs, Leibniz’s unfinished carry, the difference engine’s spiral, Babbage’s anticipating carriage, the Z1’s binary adder: one problem, solved again and again.</p></div>
      <div><h4>x² + x + 41</h4><p>Euler’s polynomial is tabulated by hand additions, multiplied on a Curta, printed by the difference engine and programmed on the Analytical Engine. Its value at 40 is not prime.</p></div>
      <div><h4>The Moon</h4><p>Bronze gears model its changing speed, pulleys sum its tides, and integrators wired in a loop draw its orbit.</p></div>
      <div><h4>In your computer</h4><p>Complements, pipelining, carry lookahead, microcode, flags and branches, floating point: each chapter shows where its mechanism lives now.</p></div>
    </div>
  </section>
</div>

<style>
  .home {
    max-width: 72rem;
    margin: 0 auto;
    padding: 2.5rem 1rem 5rem;
  }
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 2rem;
    align-items: center;
  }
  @media (max-width: 900px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
    }
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
    font-weight: 700;
    font-size: clamp(2.8rem, 8vw, 4.6rem);
    line-height: 0.98;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .sub {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 3vw, 1.6rem);
    font-style: italic;
    margin: 0.5rem 0 1.2rem;
    color: var(--ink-2);
  }
  .lede {
    font-size: 1.1rem;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }
  .start,
  .alt {
    display: inline-block;
    padding: 0.6rem 1.1rem;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .start {
    background: var(--accent);
    color: var(--on-accent);
  }
  .alt {
    border: 1px solid var(--line-strong);
    color: var(--ink);
  }
  .machine-card {
    margin: 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .machine-card :global(.machine) {
    margin: 0;
  }
  .machine-card :global(.readout) {
    padding: 0.6rem 0.9rem 0.8rem;
  }
  .ro {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    flex-wrap: wrap;
    font-size: 0.84rem;
  }
  .turn {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 2rem;
  }
  h2 {
    font-family: var(--font-display);
    font-size: 2rem;
    margin: 3.5rem 0 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line-strong);
  }
  .part {
    margin-bottom: 2rem;
  }
  h3 {
    font-family: var(--font-display);
    font-size: 1.45rem;
    margin: 0 0 0.2rem;
  }
  .pid {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
    margin-right: 0.4rem;
    vertical-align: 0.2em;
  }
  .blurb {
    color: var(--ink-2);
    margin: 0 0 0.6rem;
  }
  .chapters {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
    gap: 0.6rem;
  }
  .chapters a {
    display: grid;
    grid-template-columns: 2rem 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.1rem 0.5rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    text-decoration: none;
    color: var(--ink);
    height: 100%;
  }
  .chapters a[href]:hover {
    border-color: var(--accent);
    opacity: 1;
  }
  .n {
    grid-row: 1 / 3;
    font-weight: 700;
    color: var(--brass);
    font-size: 1.1rem;
  }
  .t {
    font-weight: 650;
    line-height: 1.25;
  }
  .y {
    font-size: 0.74rem;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .s {
    grid-column: 2 / 4;
    font-size: 0.9rem;
    color: var(--ink-2);
    line-height: 1.4;
  }
  .planned a {
    opacity: 0.55;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
    gap: 0.8rem;
  }
  .cards div {
    border-top: 3px solid var(--brass);
    padding-top: 0.5rem;
  }
  .cards h4 {
    font-family: var(--font-display);
    font-size: 1.2rem;
    margin: 0 0 0.3rem;
  }
  .cards p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--ink-2);
  }
</style>
