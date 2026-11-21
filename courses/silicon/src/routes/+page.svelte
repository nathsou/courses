<script lang="ts">
  import { base } from '$app/paths';
  import { PARTS, APPENDICES, COURSE_TITLE, COURSE_SUBTITLE } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  import ZoomScale from '$lib/widgets/ZoomScale.svelte';

  const available = new Set(ALL_ENTRIES.filter((e) => e.available).map((e) => `${e.kind}:${e.slug}`));
  const first = ALL_ENTRIES.find((e) => e.available);
</script>

<svelte:head>
  <title>{COURSE_TITLE}: {COURSE_SUBTITLE.toLowerCase()}</title>
  <meta name="description" content="An interactive course on how chips are made: the physics of semiconductors, p–n junctions and MOSFETs, CMOS logic and memory, the design flow from RTL through verification, synthesis, place and route and timing, and fabrication from sand to wafer, lithography, etching, doping, test and packaging. Every model runs in your browser." />
</svelte:head>

<div class="home">
  <header class="hero">
    <div class="text">
      <p class="eyebrow ui">An interactive course</p>
      <h1>{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}</p>
      <p class="lede">
        A modern chip holds billions of switches, each a few dozen atoms long, printed by light onto a slice of a
        single crystal. This course builds one from first principles: the physics that makes silicon a switch, the
        circuits that make switches logic, the flow that turns a description into a layout, and the hundreds of
        steps that turn a layout into a working die. Written for software engineers: every device, circuit, tool
        and process step runs here, in your browser.
      </p>
      <div class="ctas ui">
        {#if first}<a class="start" href="{base}{first.href}">Start with the silicon crystal →</a>{/if}
        <a class="alt" href="{base}/chapters/rtl/">Start with chip design</a>
        <a class="alt" href="{base}/chapters/wafer/">Start with fabrication</a>
      </div>
    </div>
    <figure class="zoom-card">
      <ZoomScale />
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
          <li class:planned={!here}><a href={here ? `${base}/appendix/${a.slug}/` : undefined}><span class="n ui">{a.number}</span><span class="t">{a.title}</span><span class="s">{a.summary}</span></a></li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="threads">
    <h2>Threads through the course</h2>
    <div class="cards">
      <div><h4>The inverter</h4><p>Two transistors, one nMOS and one pMOS. Their physics in Part I, their switching curve and delay in Part II, their layout checked against the design rules in Part III, and every mask and process step that builds them in Part IV.</p></div>
      <div><h4>One digit of a clock</h4><p>A counter from 0 to 9, written as RTL, verified by test and by proof, synthesised to standard cells, placed, routed, timed, and finally tested for manufacturing faults.</p></div>
      <div><h4>How small?</h4><p>Wavelengths of light against widths of lines, atoms per channel, impurities per million: the numbers that make chipmaking hard, made tangible in every chapter.</p></div>
      <div><h4>In software terms</h4><p>Synthesis is compilation, verification is testing with a proof attached, sign-off is a linter that can stop a release: where each idea in chip design meets its counterpart in software.</p></div>
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
    font-size: clamp(1.2rem, 2.8vw, 1.5rem);
    font-weight: 400;
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
  .zoom-card {
    margin: 0;
    min-width: 0;
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
    grid-template-columns: 2.2rem 1fr;
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
    color: var(--ac);
    font-size: 1.1rem;
  }
  .t {
    font-weight: 650;
    line-height: 1.25;
  }
  .s {
    grid-column: 2;
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
    border-top: 3px solid var(--ac);
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
