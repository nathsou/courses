<!--
  A decision compass. Describe the application with six sliders and a switch; each family of strategies scores against
  the description, and the compass lists what pushed it up and what pulled it down. The weights are the author's
  judgement, written out below so they can be argued with: it is a way to practise the trade-offs, not a verdict.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { n, title = 'The decision compass', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  // Each input runs from -1 to +1 around a neutral middle.
  let content = $state(0.5); // 0 = an application (state in the browser), 1 = content (documents)
  let interactive = $state(0.3); // share of the page that responds to the user
  let updates = $state(0.2); // 0 = tiny local changes, 1 = the whole screen at once
  let scale = $state(0.3); // number of items on the screen: few → thousands
  let weak = $state(0.4); // how weak the devices and networks are
  let instant = $state(0.3); // how much interaction must respond with no network round trip
  let seo = $state(true); // must arrive as HTML

  interface Term {
    /** Shown when this term pushes the family up. */
    pro: string;
    /** Shown when it pulls the family down. */
    con: string;
    w: (v: V) => number;
  }
  interface Family {
    id: string;
    name: string;
    examples: string;
    terms: Term[];
  }
  interface V { content: number; interactive: number; updates: number; scale: number; weak: number; instant: number; seo: boolean }

  const c = (x: number) => x - 0.5; // centre a 0..1 slider

  const FAMILIES: Family[] = [
    {
      id: 'morph',
      name: 'Server renders, browser morphs',
      examples: 'htmx, Hotwire Turbo, Phoenix LiveView, Livewire',
      terms: [
        { pro: 'the page is mostly content and forms', con: 'it is an application more than a document', w: (v) => 3 * c(v.content) },
        { pro: 'interactions can afford a round trip to the server', con: 'every interaction is a round trip to the server', w: (v) => -4.5 * c(v.instant) },
        { pro: 'little of the page needs local state', con: 'a page with a lot of local state is awkward', w: (v) => -2 * c(v.interactive) },
        { pro: 'it ships almost no JavaScript', con: 'its small size matters little on strong devices', w: (v) => 2 * c(v.weak) },
        { pro: 'it arrives as HTML', con: 'it does not need to arrive as HTML', w: (v) => (v.seo ? 1 : -0.3) },
      ],
    },
    {
      id: 'islands',
      name: 'Islands of interactivity',
      examples: 'Astro, Eleventy with islands, Fresh, Marko',
      terms: [
        { pro: 'most of the page is static content', con: 'there is little static content to leave alone', w: (v) => 4 * c(v.content) },
        { pro: 'only a small share of the page is interactive', con: 'much of the page is interactive, so many islands', w: (v) => -4 * c(v.interactive) },
        { pro: 'weak devices pay only for the islands', con: 'strong devices make the saving matter less', w: (v) => 2.5 * c(v.weak) },
        { pro: 'it arrives as HTML', con: 'it does not need to arrive as HTML', w: (v) => (v.seo ? 1.2 : -0.2) },
        { pro: 'updates are local, which islands handle well', con: 'whole-screen updates fit badly with isolated islands', w: (v) => -1.5 * c(v.updates) },
      ],
    },
    {
      id: 'rsc',
      name: 'Server components with a client layer',
      examples: 'React Server Components in Next.js and Waku',
      terms: [
        { pro: 'content with islands of state, in one component tree', con: 'an application with little server-side content', w: (v) => 2 * c(v.content) },
        { pro: 'it keeps navigation state and moves data work to the server', con: 'little to gain when little of the page is interactive', w: (v) => 1.5 * c(v.interactive) },
        { pro: 'less JavaScript than hydrating everything', con: 'strong devices make the saving matter less', w: (v) => 1.5 * c(v.weak) },
        { pro: 'it arrives as HTML', con: 'it does not need to arrive as HTML', w: (v) => (v.seo ? 1 : -0.3) },
        { pro: '', con: 'it needs a server framework and a build', w: () => -0.5 },
      ],
    },
    {
      id: 'resume',
      name: 'Resumable',
      examples: 'Qwik and Qwik City',
      terms: [
        { pro: 'almost no JavaScript runs at load', con: 'strong devices make the saving matter less', w: (v) => 3.5 * c(v.weak) },
        { pro: 'a large, mostly dormant page costs nothing until used', con: 'a busy, application-like page uses most of its code anyway', w: (v) => 2 * c(v.content) },
        { pro: 'a first interaction can wait for a fetch', con: 'the first interaction waits for a fetch', w: (v) => -2.5 * c(v.instant) },
        { pro: 'closures stay simple', con: 'every closure must be serializable', w: (v) => -0.5 * c(v.interactive) },
        { pro: 'it arrives as HTML', con: 'it does not need to arrive as HTML', w: (v) => (v.seo ? 1 : -0.3) },
      ],
    },
    {
      id: 'signals',
      name: 'Signals and compiled templates',
      examples: 'Solid, Svelte 5, Vue Vapor, Preact Signals',
      terms: [
        { pro: 'updates are small and exact: one value, one node', con: 'whole-screen updates give it little to skip', w: (v) => -3 * c(v.updates) },
        { pro: 'an application with a lot of state in the browser', con: 'a document has little state to track', w: (v) => -3 * c(v.content) },
        { pro: 'it responds instantly with no round trip', con: 'it is not needed for the instant response', w: (v) => 3 * c(v.instant) },
        { pro: 'large lists of rows update cheaply', con: 'its advantage with large lists does not apply', w: (v) => 1.5 * c(v.scale) },
        { pro: '', con: 'there is a compiler and a build', w: () => -0.5 },
        { pro: 'strong devices run the framework easily', con: 'everything hydrates on weak devices', w: (v) => -1 * c(v.weak) },
      ],
    },
    {
      id: 'vdom',
      name: 'Virtual DOM, with a compiler',
      examples: 'React with the Compiler, Vue (default mode)',
      terms: [
        { pro: 'whole-screen updates are what it is good at', con: 'it pays off less when updates are tiny', w: (v) => 2 * c(v.updates) },
        { pro: 'a mature ecosystem for applications', con: 'documents do not need an application framework', w: (v) => -1.5 * c(v.content) },
        { pro: 'it responds instantly with no round trip', con: 'it is not needed for the instant response', w: (v) => 2 * c(v.instant) },
        { pro: 'few items keep the diff cheap', con: 'the diff costs more with many rows, unless keyed and memoised', w: (v) => -1 * c(v.scale) },
        { pro: 'strong devices run the framework and the diff easily', con: 'every weak device runs the framework and the diff', w: (v) => -1.5 * c(v.weak) },
        { pro: 'it works with any JavaScript you write', con: '', w: () => 0.8 },
      ],
    },
    {
      id: 'parts',
      name: 'Templates and parts, no build',
      examples: 'Lit, htm with Preact',
      terms: [
        { pro: 'it needs no compiler: it runs from a script tag', con: '', w: () => 1.2 },
        { pro: 'components that live inside someone else’s page', con: 'a whole application, not a set of components', w: (v) => 1.2 * c(v.content) },
        { pro: 'small updates compare only a few holes', con: 'each update compares every hole of the re-rendered template', w: (v) => -1 * c(v.updates) },
        { pro: 'light on weak devices', con: 'its lightness matters little on strong devices', w: (v) => 1 * c(v.weak) },
        { pro: 'few items need no keyed lists', con: 'long lists need care (keyed `repeat`)', w: (v) => -0.8 * c(v.scale) },
      ],
    },
    {
      id: 'check',
      name: 'Dirty-checking with signals, in an application framework',
      examples: 'Angular (zone.js, OnPush, signals, zoneless)',
      terms: [
        { pro: 'a large application with strong conventions', con: 'a document does not need an application framework', w: (v) => -2 * c(v.content) },
        { pro: 'complex forms and tables of live data', con: 'little of the page is interactive', w: (v) => 1 * c(v.interactive) },
        { pro: 'it responds instantly with no round trip', con: 'it is not needed for the instant response', w: (v) => 1.5 * c(v.instant) },
        { pro: 'small updates in a small tree are cheap to check', con: 'checking the tree is costly when updates are large or items many', w: (v) => -1.2 * c(v.updates) - 0.8 * c(v.scale) },
        { pro: 'strong devices carry a large framework easily', con: 'a lot of framework to ship to weak devices', w: (v) => -1.2 * c(v.weak) },
      ],
    },
  ];

  const v = $derived<V>({ content, interactive, updates, scale, weak, instant, seo });
  const scored = $derived(
    FAMILIES.map((f) => {
      const parts = f.terms.map((t) => { const w = t.w(v); return { why: w >= 0 ? t.pro : t.con, w }; }).filter((p) => p.why);
      return { f, score: parts.reduce((a, p) => a + p.w, 0), parts };
    }).sort((a, b) => b.score - a.score),
  );
  const top = $derived(Math.max(...scored.map((s) => s.score)));
  const bottom = $derived(Math.min(...scored.map((s) => s.score)));
  const pct = (x: number) => `${((x - bottom) / Math.max(0.01, top - bottom)) * 100}%`;

  const SCENARIOS: Record<string, { label: string; set: Partial<V> }> = {
    news: { label: 'A news article', set: { content: 0.95, interactive: 0.1, updates: 0.1, scale: 0.2, weak: 0.7, instant: 0.1, seo: true } },
    sheet: { label: 'A spreadsheet', set: { content: 0.05, interactive: 0.95, updates: 0.2, scale: 0.8, weak: 0.2, instant: 0.95, seo: false } },
    admin: { label: 'A staff dashboard', set: { content: 0.3, interactive: 0.6, updates: 0.4, scale: 0.5, weak: 0.1, instant: 0.4, seo: false } },
    shop: { label: 'A shop’s product page', set: { content: 0.7, interactive: 0.3, updates: 0.2, scale: 0.3, weak: 0.8, instant: 0.4, seo: true } },
    chat: { label: 'A chat application', set: { content: 0.2, interactive: 0.7, updates: 0.2, scale: 0.6, weak: 0.5, instant: 0.8, seo: false } },
  };
  function apply(id: string) {
    const s = SCENARIOS[id]!.set;
    content = s.content ?? content;
    interactive = s.interactive ?? interactive;
    updates = s.updates ?? updates;
    scale = s.scale ?? scale;
    weak = s.weak ?? weak;
    instant = s.instant ?? instant;
    seo = s.seo ?? seo;
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Describe the application. Each family of strategies scores against it. The weights are one author's judgement, shown in full so you can argue with them.">
  <div class="presets ui">
    <span>Start from:</span>
    {#each Object.entries(SCENARIOS) as [id, s] (id)}<Button size="sm" variant="secondary" onclick={() => apply(id)}>{s.label}</Button>{/each}
  </div>

  <div class="inputs">
    <Slider label="The page is… (0 an application, 1 a document)" bind:value={content} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />
    <Slider label="Share of the page that responds to the user" bind:value={interactive} min={0} max={1} step={0.05} format={(x) => `${Math.round(x * 100)}%`} />
    <Slider label="An update changes… (0 one value, 1 the whole screen)" bind:value={updates} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />
    <Slider label="Items on the screen (0 a few, 1 thousands)" bind:value={scale} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />
    <Slider label="Devices and networks (0 strong, 1 weak)" bind:value={weak} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />
    <Slider label="Must respond with no round trip (0 no, 1 always)" bind:value={instant} min={0} max={1} step={0.05} format={(x) => x.toFixed(2)} />
    <Toggle label="It must arrive as HTML (search engines, first paint)" bind:checked={seo} />
  </div>

  <ol class="rank ui" aria-label="Families, best fit first">
    {#each scored as s, i (s.f.id)}
      <li class:first={i === 0}>
        <div class="head"><b>{s.f.name}</b> <span class="ex">{s.f.examples}</span></div>
        <div class="bar" role="img" aria-label="fit {i + 1} of {scored.length}"><span style:width={pct(s.score)}></span></div>
        {#if i < 3}
          <div class="why">
            {#each s.parts.filter((p) => p.w > 0.4).sort((a, b) => b.w - a.w).slice(0, 2) as p (p.why)}<span class="pro">＋ {p.why}</span>{/each}
            {#each s.parts.filter((p) => p.w < -0.4).sort((a, b) => a.w - b.w).slice(0, 2) as p (p.why)}<span class="con">− {p.why}</span>{/each}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
    font-size: 0.84rem;
  }
  .inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.4rem 1.2rem;
    margin-bottom: 1rem;
  }
  .rank {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.55rem;
  }
  .rank li {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
  }
  .rank li.first {
    border-color: var(--signal);
    background: var(--signal-soft);
  }
  .ex {
    font-size: 0.76rem;
    color: var(--ink-2);
    margin-left: 0.4rem;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    margin: 0.3rem 0;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--signal);
    min-width: 3px;
  }
  .why {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.9rem;
    font-size: 0.78rem;
  }
  .pro {
    color: var(--signal);
  }
  .con {
    color: var(--red);
  }
</style>
