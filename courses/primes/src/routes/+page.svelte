<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_SUBTITLE, COURSE_TITLE, PARTS } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Staircase from '$lib/widgets/Staircase.svelte';

  const byKey = new Map(ALL_ENTRIES.map((e) => [`${e.kind}:${e.slug}`, e]));
  const first = ALL_ENTRIES.find((e) => e.available);
  const appendices = ALL_ENTRIES.filter((e) => e.kind === 'appendix');
  const timeline = ALL_ENTRIES.filter((e) => e.kind === 'chapter' && e.year !== undefined && e.theorem).sort((x, y) => x.year! - y.year!);
  const year = (y: number) => (y < 0 ? `${-y} BC` : String(y));
  const chapters = ALL_ENTRIES.filter((e) => e.kind === 'chapter');
  /** Numerals in the list are two digits (01, 02, …); appendix letters stay as they are. */
  const num = (n: string) => (/^\d+$/.test(n) ? n.padStart(2, '0') : n);
</script>

<svelte:head>
  <title>{COURSE_TITLE} — {COURSE_SUBTITLE}</title>
  <meta name="description" content="An interactive course on the prime numbers from scratch: sieves, primality tests and factoring, counting primes, the zeta function, the prime number theorem and the Riemann Hypothesis." />
</svelte:head>

<div class="home">
  <section class="hero" aria-labelledby="hero-h">
    <div class="intro">
      <p class="kicker">An interactive course · Mathematics · {chapters.length} chapters</p>
      <h1 id="hero-h">{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}.</p>
      <p class="desc">
        The prime numbers from scratch: how to find them, test them and take numbers apart, how to count them, and why counting them
        leads to the zeta function and the most famous open problem in mathematics. Every algorithm runs in your browser; every major
        theorem is sketched first and then proved.
      </p>
      <div class="cta">
        {#if first}<a class="primary" href="{base}{first.href}">Start with Chapter {first.number} <Icon name="chevron" size={16} /></a>{/if}
        <a class="secondary" href="#contents">See all chapters</a>
      </div>
    </div>
    <figure class="hero-fig">
      <Staircase compact ranges={[30, 100, 1000, 100_000]} initial={100} />
      <figcaption class="ui">π(x) counts the primes up to x. Gauss guessed its shape at fifteen; proving him right took a century.</figcaption>
    </figure>
  </section>

  <section class="contents" id="contents" aria-labelledby="contents-h">
    <h2 id="contents-h" class="visually-hidden">Contents</h2>
    {#each PARTS as part (part.id)}
      <div class="part">
        <div class="part-head">
          {#if part.id !== '0' && part.id !== 'E'}<span class="pid">Part {part.id}</span>{/if}
          <h3>{part.title}</h3>
          <p>{part.blurb}</p>
        </div>
        <ul class="rows">
          {#each part.chapters as c (c.slug)}
            {@const e = byKey.get(`chapter:${c.slug}`)!}
            <li>
              {#if e.available}
                <a class="row ready" href="{base}{e.href}">
                  <span class="n">{num(e.number)}</span>
                  <span class="t">{e.title}</span>
                  {#if e.year !== undefined}<span class="y">{year(e.year)}</span>{/if}
                  <span class="s">{e.summary}</span>
                </a>
              {:else}
                <div class="row planned" aria-label="{e.title} (coming soon)">
                  <span class="n">{num(e.number)}</span>
                  <span class="t">{e.title}</span>
                  <span class="y">Coming soon</span>
                  <span class="s">{e.summary}</span>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
    <div class="part">
      <div class="part-head">
        <span class="pid">Appendices</span>
        <h3>Reference</h3>
        <p>The background the course assumes, the code library, and every term, date and source.</p>
      </div>
      <ul class="rows compact">
        {#each appendices as e (e.slug)}
          <li>
            {#if e.available}
              <a class="row ready" href="{base}{e.href}"><span class="n">{num(e.number)}</span><span class="t">{e.title}</span></a>
            {:else}
              <div class="row planned"><span class="n">{num(e.number)}</span><span class="t">{e.title}</span><span class="y">Coming soon</span></div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </section>

  <section class="about" aria-labelledby="about-h">
    <h2 id="about-h">How the course works</h2>
    <div class="features">
      <div class="f">
        <h3>Sketch first, then prove</h3>
        <p>Each major theorem arrives as an idea, then a sketch, then a complete proof you can expand step by step. The prime number theorem gets a whole chapter of plan before its proof.</p>
      </div>
      <div class="f">
        <h3>Honest about status</h3>
        <p>Every theorem is labelled <em>proved</em>, <em>sketched</em>, <em>stated</em> or <em>open</em>, so you always know what has been shown here and what is borrowed.</p>
      </div>
      <div class="f">
        <h3>Algorithms you run</h3>
        <p>Write a sieve, Miller–Rabin, Pollard’s ρ, a prime counter and a zero finder in TypeScript, checked against tests in your browser.</p>
      </div>
      <div class="f">
        <h3>Figures you can push</h3>
        <p>Sieve animations, prime spirals, the zeta function in colour, 10,000 zeros computed by the course itself, and the staircase rebuilt from them.</p>
      </div>
    </div>
  </section>

  <section class="timeline" aria-labelledby="tl-h">
    <h2 id="tl-h">From Euclid to Maynard</h2>
    <ol class="tl ui">
      {#each timeline as e, i (e.slug)}
        <li>
          <span class="yr">{year(e.year!)}</span>
          {#if e.available}
            <a href="{base}{e.href}"><span class="pt"></span><span class="th">{e.theorem}</span><span class="ch">Chapter {e.number}</span></a>
          {:else}
            <span class="off"><span class="pt"></span><span class="th">{e.theorem}</span><span class="ch">Chapter {e.number} · coming</span></span>
          {/if}
        </li>
      {/each}
    </ol>
  </section>
</div>

<style>
  .home {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 0 5rem;
    font-family: var(--font-ui);
  }
  .home > section:not(.hero) {
    margin-inline: clamp(1.25rem, 4vw, 2.25rem);
  }

  /* ───── Hero: title and text beside a live staircase. ───── */
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 2.5rem;
    align-items: center;
    padding: 3.5rem clamp(1.25rem, 4vw, 2.25rem) 2.5rem;
    border-bottom: 1px solid var(--line-strong);
  }
  @media (max-width: 860px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
      padding-top: 2rem;
    }
  }
  .kicker {
    margin: 0 0 1rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    margin: 0 0 0.6rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(2.6rem, 7vw, 4.2rem);
    line-height: 0.98;
    letter-spacing: -0.025em;
    font-variation-settings: 'SOFT' 60;
  }
  .sub {
    margin: 0 0 1rem;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.35rem;
    line-height: 1.3;
    color: var(--ink-2);
  }
  .desc {
    margin: 0 0 1.5rem;
    font-family: var(--font-body);
    font-size: 1.08rem;
    line-height: 1.6;
  }
  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }
  .cta a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 1.05rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    color: var(--ink);
  }
  .cta a:hover {
    opacity: 1;
  }
  .cta .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .cta .primary:hover {
    background: var(--accent-ink);
    border-color: var(--accent-ink);
  }
  .cta .secondary:hover {
    background: var(--pn);
  }
  .hero-fig {
    margin: 0;
    padding: 1rem 1.1rem 0.9rem;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .hero-fig figcaption {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--rule);
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--ink-2);
  }

  /* ───── Contents: numbered rows on ledger rules. ───── */
  .contents {
    padding-top: 1.5rem;
  }
  .part {
    padding: 2rem 0 0.75rem;
  }
  .part-head {
    display: grid;
    gap: 0.25rem;
    margin-bottom: 1.1rem;
    max-width: 44rem;
  }
  .pid {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .part-head h3 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.5rem, 3.4vw, 1.9rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .part-head p {
    margin: 0.2rem 0 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17.5rem), 1fr));
    gap: 0 2.25rem;
    align-content: start;
  }
  .row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    column-gap: 0.7rem;
    align-items: baseline;
    height: 100%;
    padding: 0.7rem 0 0.75rem;
    border-bottom: 1px solid var(--line-strong);
    color: var(--ink);
    text-decoration: none;
  }
  .row .n {
    color: var(--accent);
    font-weight: 700;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    min-width: 1.5rem;
  }
  .row .t {
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.3;
  }
  .row .y {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 0.7rem;
    color: var(--mute);
    white-space: nowrap;
  }
  .row .s {
    grid-column: 2 / -1;
    margin-top: 0.25rem;
    font-size: 0.86rem;
    line-height: 1.45;
    color: var(--ink-2);
  }
  .ready:hover {
    opacity: 1;
  }
  .ready:hover .t,
  .ready:hover .n {
    color: var(--accent);
  }
  .ready:hover .n {
    color: var(--fx-red);
  }
  .planned .t,
  .planned .s,
  .planned .n {
    color: var(--ink-3);
  }
  .compact .row {
    padding-block: 0.55rem;
  }

  /* ───── About: four features on ledger rules ───── */
  .about {
    margin-top: 3.5rem;
    padding-top: 2.5rem;
    border-top: 1px solid var(--line-strong);
  }
  .about h2,
  .timeline h2 {
    margin: 0 0 1.25rem;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.7rem, 4vw, 2.2rem);
    line-height: 1.05;
    letter-spacing: -0.015em;
  }
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13.5rem, 1fr));
    gap: 1.5rem 2rem;
  }
  .f {
    position: relative;
    padding-top: 1.1rem;
    border-top: 1px solid var(--line-strong);
  }
  .f::before {
    content: '';
    position: absolute;
    left: 0;
    top: -3px;
    width: 2.5rem;
    height: 5px;
    border-top: 1.5px solid var(--ac);
    border-bottom: 1.5px solid var(--ac);
    background: var(--bg);
  }
  .f h3 {
    margin: 0 0 0.4rem;
    font-size: 1.02rem;
    font-weight: 600;
  }
  .f p {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.55;
    color: var(--ink-2);
  }

  /* ───── Timeline ───── */
  .timeline {
    margin-top: 3.5rem;
    padding-top: 2.5rem;
    border-top: 1px solid var(--line-strong);
  }
  .tl {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0 1rem;
    display: flex;
    overflow-x: auto;
    scrollbar-width: thin;
    position: relative;
  }
  .tl li {
    flex: 0 0 9.5rem;
    position: relative;
    padding: 0 0.8rem 0 0;
  }
  .tl li::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 2.35rem;
    height: 1px;
    background: var(--line-strong);
  }
  .tl .yr {
    display: block;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    height: 1.7rem;
    color: var(--ink);
  }
  .tl .pt {
    position: relative;
    z-index: 1;
    display: block;
    width: 0.7rem;
    height: 0.7rem;
    margin: 0.47rem 0 0.8rem;
    border-radius: 50%;
    background: var(--prime);
    box-shadow: 0 0 0 3px var(--bg);
  }
  .tl a,
  .tl .off {
    display: block;
    font-size: 0.86rem;
    line-height: 1.35;
    text-decoration: none;
    color: var(--ink);
  }
  .tl a:hover {
    opacity: 1;
  }
  .tl a:hover .th {
    color: var(--accent);
  }
  .tl .th {
    font-weight: 700;
  }
  .tl .ch {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
    margin-top: 0.25rem;
  }
  .tl .off .th {
    color: var(--ink-3);
  }
</style>
