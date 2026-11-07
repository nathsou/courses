<script lang="ts">
  import { base } from '$app/paths';
  import { COURSE_SUBTITLE, COURSE_TITLE, PARTS, PATHS, THREADS } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TermTree from '$lib/components/term/TermTree.svelte';
  import { parseStrict, term } from '$lib/trs/parse';
  import { normalize, system } from '$lib/trs/rewrite';
  import { show } from '$lib/trs/term';

  const byKey = new Map(ALL_ENTRIES.map((e) => [`${e.kind}:${e.slug}`, e]));
  const first = ALL_ENTRIES.find((e) => e.available);
  const appendices = ALL_ENTRIES.filter((e) => e.kind === 'appendix');
  const timeline = ALL_ENTRIES.filter((e) => e.kind === 'chapter' && e.year !== undefined && e.theorem).sort((x, y) => x.year! - y.year!);
  const chapters = ALL_ENTRIES.filter((e) => e.kind === 'chapter');
  const num = (n: string) => (/^\d+$/.test(n) ? n.padStart(2, '0') : n);
  const byNumber = new Map(chapters.map((c) => [c.number, c]));

  // The hero: 2 + 1 in Peano arithmetic, one rewrite step at a time.
  const peano = parseStrict('#infixl 6 +\n0 + y -> y\nS(x) + y -> S(x + y)');
  const run = normalize(system(peano.rules), term('+(S(S(0)), S(0))'), { strategy: 'outermost' });
  const frames = [{ t: run.steps[0]!.before, pos: run.steps[0]!.redexes[0]!.pos as number[] | null }, ...run.steps.map((s, i) => ({ t: s.after, pos: (run.steps[i + 1]?.redexes[0]?.pos ?? null) as number[] | null }))];
  let frame = $state(0);
  const cur = $derived(frames[frame]!);
</script>

<svelte:head>
  <title>{COURSE_TITLE} — {COURSE_SUBTITLE}</title>
  <meta name="description" content="An interactive course on term rewriting: matching and strategies, fast engines, termination and confluence, Knuth–Bendix completion, rewriting modulo AC, e-graphs, strategy combinators, the λ-calculus and computability. Every rule runs in your browser." />
</svelte:head>

<div class="home">
  <section class="hero" aria-labelledby="hero-h">
    <div class="intro">
      <p class="kicker">An interactive course · Computer science · {chapters.length} chapters</p>
      <h1 id="hero-h">{COURSE_TITLE}</h1>
      <p class="sub">{COURSE_SUBTITLE}.</p>
      <p class="desc">
        Replace equals by equals, over and over, until nothing applies. That one idea simplifies algebra, runs programs, proves theorems
        and optimises compilers. Learn it from first principles, build a complete rewriting engine in TypeScript as you go, and prove when it
        terminates and when its answers are unique. Every rule file in the course is editable and runs in your browser.
      </p>
      <div class="cta">
        {#if first}<a class="primary" href="{base}{first.href}">Start with Chapter {first.number} <Icon name="chevron" size={16} /></a>{/if}
        <a class="secondary" href="#contents">See all chapters</a>
        <a class="secondary" href="{base}/engine/">Your engine</a>
      </div>
    </div>
    <figure class="hero-fig">
      <div class="hero-tree"><TermTree term={cur.t} redex={cur.pos} maxWidth={320} title="The term {show(cur.t, peano.fixity)}" /></div>
      <div class="hero-bar ui">
        <code>{show(cur.t, peano.fixity)}</code>
        <button onclick={() => (frame = (frame + 1) % frames.length)}>{frame === frames.length - 1 ? 'Again' : 'Rewrite ▶'}</button>
      </div>
      <figcaption class="ui">Two rules, <code>0 + y → y</code> and <code>S(x) + y → S(x + y)</code>, compute 2 + 1 = 3. The highlighted subterm is the next redex.</figcaption>
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
          {#if part.thread && part.thread !== 'all'}<p class="thread ui">Thread: {THREADS[part.thread].name}</p>{/if}
        </div>
        <ul class="rows">
          {#each part.chapters as c (c.slug)}
            {@const e = byKey.get(`chapter:${c.slug}`)!}
            <li>
              {#if e.available}
                <a class="row ready" href="{base}{e.href}">
                  <span class="n">{num(e.number)}</span>
                  <span class="t">{e.title}{#if c.optional}<span class="opt" title="Optional: the core path skips it"> ◇</span>{/if}</span>
                  {#if c.builds}<span class="y">builds {c.builds}</span>{:else if e.year !== undefined}<span class="y">{e.year}</span>{/if}
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
        <p>The mathematics the proofs use, the rule language, the engine, and every term, date and source.</p>
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

  <section class="about" aria-labelledby="paths-h">
    <h2 id="paths-h">Four ways through</h2>
    <div class="features">
      {#each PATHS as p (p.id)}
        <div class="f">
          <h3>{p.name}</h3>
          <p>{p.blurb}</p>
          <p class="path ui">
            {#each p.chapters as n, i (n)}{#if i}<span class="sep"> · </span>{/if}{@const c = byNumber.get(n)}{#if c?.available}<a href="{base}{c.href}" title={c.title}>{n}</a>{:else}<span title={c?.title}>{n}</span>{/if}{/each}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <section class="about" aria-labelledby="about-h">
    <h2 id="about-h">How the course works</h2>
    <div class="features">
      <div class="f">
        <h3>Build the engine</h3>
        <p>Write terms, matching, rewriting, strategies, hash-consing, an LPO, unification, critical pairs, completion, AC matching and an e-graph in TypeScript. Each module you finish is carried into later exercises, and you can swap in the reference at any time.</p>
      </div>
      <div class="f">
        <h3>Prove it, at the right depth</h3>
        <p>Every result is labelled <em>proved</em>, <em>sketched</em> or <em>stated</em>, and the main theorems open as an idea, then a sketch, then a full proof.</p>
      </div>
      <div class="f">
        <h3>Every listing runs</h3>
        <p>Rule files are written in Girafe syntax and open in a workbench: run queries, trace a reduction redex by redex, prove termination, check confluence, run completion or saturate an e-graph.</p>
      </div>
      <div class="f">
        <h3>Three threads</h3>
        <p>{THREADS.cas.name}, {THREADS.prover.name.toLowerCase()} and {THREADS.language.name.toLowerCase()} grow chapter by chapter, so each new idea lands on something you have already built.</p>
      </div>
    </div>
  </section>

  <section class="timeline" aria-labelledby="tl-h">
    <h2 id="tl-h">From Schönfinkel to egg</h2>
    <ol class="tl ui">
      {#each timeline as e (e.slug)}
        <li>
          <span class="yr">{e.year}</span>
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
  .hero-tree {
    min-height: 13rem;
    display: flex;
    align-items: center;
  }
  .hero-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    margin-top: 0.4rem;
  }
  .hero-bar code {
    font-family: var(--font-mono);
    overflow-wrap: anywhere;
  }
  .hero-bar button {
    font: inherit;
    font-weight: 600;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
  }
  .thread {
    font-size: 0.78rem !important;
    color: var(--accent) !important;
    margin-top: 0.4rem !important;
  }
  .opt {
    color: var(--mute);
    font-weight: 400;
  }
  .path {
    font-family: var(--font-mono);
    font-size: 0.78rem !important;
  }
  .path .sep {
    color: var(--mute);
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
