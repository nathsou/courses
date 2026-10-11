<script lang="ts">
  /**
   * A room with a cat, a box, a table and chair, a sofa and a lamp. Choose a preposition and wo?
   * or wohin?: the cat sits there (dative) or moves there (accusative), and the sentence shows the
   * article that changes. Quiz: see the picture, choose the article.
   */
  import { onDestroy, tick, untrack } from 'svelte';
  import { PREPOSITIONS, VERB_PAIRS, type Prep, type PrepItem } from './data/prepositions';
  import { answerOf, gapped, filled, prepRound, type Case, type PrepQuestion } from '$lib/de/prepositions';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import { unmark } from './kit/marks';
  import HiText from './kit/HiText.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  let { mode = 'both' }: { mode?: 'wo' | 'wohin' | 'both' } = $props();

  /** Where the cat ends up for each preposition: feet position, scale, and whether it is behind the box. */
  const SPOT: Record<Prep, { x: number; y: number; s: number; back?: boolean; flip?: boolean }> = {
    in: { x: 356, y: 184, s: 0.85, back: true },
    an: { x: 319, y: 166, s: 0.85, flip: true },
    auf: { x: 254, y: 139, s: 0.95 },
    über: { x: 196, y: 230, s: 1 },
    unter: { x: 250, y: 205, s: 0.8 },
    vor: { x: 108, y: 230, s: 1.1 },
    hinter: { x: 382, y: 176, s: 0.75, back: true },
    neben: { x: 27, y: 206, s: 0.9 },
    zwischen: { x: 187, y: 207, s: 0.9 },
  };
  const START = { x: 196, y: 232, s: 1 };
  const LAMP_TABLE = 254;
  const LAMP_SOFA = 108;

  let tab = $state(0);
  let prep = $state<Prep>('auf');
  let kase = $state<Case>('wo');
  $effect.pre(() => {
    if (mode !== 'both') kase = mode;
  });
  const item = $derived(PREPOSITIONS.find((p) => p.prep === prep)!);
  const sentence = $derived(item[kase]);

  // The picture's state, animated from START for wohin.
  let cat = $state({ ...SPOT.auf });
  let lampX = $state(LAMP_TABLE);
  let moving = $state(false);
  let showArc = $state(false);

  async function stage(p: Prep, k: Case) {
    const target = SPOT[p];
    moving = false;
    if (k === 'wohin') {
      showArc = true;
      if (p === 'über') {
        lampX = LAMP_SOFA;
        cat = { ...START };
      } else {
        lampX = LAMP_TABLE;
        cat = { ...START };
      }
      await tick();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      moving = true;
      if (p === 'über') lampX = LAMP_TABLE;
      else cat = { ...target };
    } else {
      showArc = false;
      lampX = LAMP_TABLE;
      cat = { ...target };
    }
  }

  function choose(p: Prep, k: Case = kase) {
    prep = p;
    kase = k;
    void stage(p, k);
    void speech.say(unmark(PREPOSITIONS.find((x) => x.prep === p)![k].de));
  }

  // Quiz
  const ROUNDS = 8;
  let qs = $state<PrepQuestion[]>([]);
  let qi = $state(0);
  let pick = $state<string | null>(null);
  let score = $state(0);
  let order = $state<string[]>([]);
  let nextBtn: HTMLButtonElement | undefined = $state();
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const qItem = $derived(q ? PREPOSITIONS.find((p) => p.prep === q.prep)! : null);
  const qSent = $derived(qItem && q ? qItem[q.kase] : null);
  const finished = $derived(qs.length > 0 && qi >= qs.length);

  function startQuiz() {
    qs = prepRound(mode, ROUNDS, Date.now() % 1e9);
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    pick = null;
    const x = qs[qi];
    if (!x) return;
    const s = PREPOSITIONS.find((p) => p.prep === x.prep)![x.kase];
    order = [...s.options].sort((a, b) => a.localeCompare(b, 'de'));
    void stage(x.prep, x.kase);
  }
  function answer(o: string) {
    if (!qSent || pick) return;
    pick = o;
    const ok = o === answerOf(qSent.de);
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(unmark(qSent.de));
    queueMicrotask(() => nextBtn?.focus());
  }
  function next() {
    qi++;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else ask();
  }

  // Restage the picture when switching between exploring and the quiz.
  $effect(() => {
    const t = tab;
    untrack(() => {
      if (t === 1) {
        if (!qs.length) startQuiz();
        else if (qs[qi]) void stage(qs[qi]!.prep, qs[qi]!.kase);
      } else void stage(prep, kase);
    });
  });

  const why = (it: PrepItem, k: Case) =>
    k === 'wo'
      ? `Wo? The ${it.prep === 'über' ? 'lamp' : 'cat'} is already there: position, so dative.`
      : `Wohin? The ${it.prep === 'über' ? 'lamp' : 'cat'} moves there: direction, so accusative.`;
  const arcPath = $derived.by(() => {
    if (prep === 'über' && tab === 0) return `M ${LAMP_SOFA} 72 Q ${(LAMP_SOFA + LAMP_TABLE) / 2} 40 ${LAMP_TABLE} 72`;
    const t = tab === 1 && q ? SPOT[q.prep] : SPOT[prep];
    if ((tab === 1 ? q?.prep : prep) === 'über') return `M ${LAMP_SOFA} 72 Q ${(LAMP_SOFA + LAMP_TABLE) / 2} 40 ${LAMP_TABLE} 72`;
    const mx = (START.x + t.x) / 2;
    const my = Math.min(START.y, t.y) - 45;
    return `M ${START.x} ${START.y - 20} Q ${mx} ${my} ${t.x} ${t.y - 22}`;
  });
  const focusPrep = $derived(tab === 1 ? q?.prep : prep);
</script>

{#snippet catSvg()}
  <g class="cat" class:moving style="transform: translate({cat.x}px, {cat.y}px) scale({cat.s * (SPOT[focusPrep ?? 'auf'].flip ? -1 : 1)}, {cat.s})" opacity={focusPrep === 'über' ? 0.45 : 1}>
    <path class="tail" d="M-14 -8 C-30 -10 -30 -32 -20 -36" />
    <ellipse class="body" cx="0" cy="-13" rx="16" ry="12" />
    <circle class="body" cx="12" cy="-28" r="9.5" />
    <path class="body" d="M5 -34 L6 -44 L12 -36 Z M14 -36 L19 -44 L20 -33 Z" />
    <circle class="eye" cx="10" cy="-29" r="1.4" />
    <circle class="eye" cx="16" cy="-29" r="1.4" />
    <path class="whisk" d="M14 -25 l7 -1 M14 -24 l7 1.5" />
  </g>
{/snippet}

{#snippet scene()}
  <svg class="scene" viewBox="0 0 400 240" role="img" aria-label={tab === 1 && qSent ? 'Picture for the question' : unmark(sentence.de)}>
    <rect x="0" y="0" width="400" height="182" class="wall" />
    <rect x="0" y="182" width="400" height="58" class="floor" />
    <line x1="0" y1="182" x2="400" y2="182" class="skirting" />
    <!-- picture on the wall -->
    <rect x="80" y="44" width="56" height="42" rx="2" class="frame" />
    <path d="M86 80 l14 -16 l10 10 l8 -8 l12 14 z" class="pic" />
    <!-- lamp -->
    <g class="lamp" class:moving style="transform: translateX({lampX}px)" class:focus={focusPrep === 'über'}>
      <line x1="0" y1="0" x2="0" y2="58" class="cord" />
      <path d="M-18 78 L-8 58 L8 58 L18 78 Z" class="shade" />
      <circle cx="0" cy="81" r="4" class="bulb" />
    </g>
    <!-- sofa -->
    <g class:focus={focusPrep === 'vor' || focusPrep === 'neben' || focusPrep === 'zwischen'}>
      <rect x="58" y="128" width="100" height="40" rx="8" class="sofa back" />
      <rect x="54" y="160" width="108" height="30" rx="6" class="sofa" />
      <rect x="46" y="150" width="16" height="42" rx="6" class="sofa" />
      <rect x="154" y="150" width="16" height="42" rx="6" class="sofa" />
      <rect x="54" y="192" width="6" height="13" class="leg" />
      <rect x="156" y="192" width="6" height="13" class="leg" />
    </g>
    <!-- table and chair -->
    <g class:focus={focusPrep === 'auf' || focusPrep === 'unter' || focusPrep === 'an' || focusPrep === 'über' || focusPrep === 'zwischen'}>
      <rect x="204" y="139" width="100" height="9" rx="2" class="wood" />
      <rect x="212" y="148" width="7" height="57" class="wood" />
      <rect x="289" y="148" width="7" height="57" class="wood" />
      <rect x="304" y="164" width="34" height="6" rx="1" class="wood light" />
      <rect x="332" y="124" width="6" height="81" class="wood light" />
      <rect x="306" y="170" width="5" height="35" class="wood light" />
    </g>
    {#if showArc}
      <path d={arcPath} class="arc" marker-end="url(#ps-arrow)" />
    {/if}
    {#if !SPOT[focusPrep ?? 'auf'].back}{@render catSvg()}{/if}
    <!-- the box -->
    <g class:focus={focusPrep === 'in' || focusPrep === 'hinter'}>
      {#if SPOT[focusPrep ?? 'auf'].back}{@render catSvg()}{/if}
      <path d="M340 160 L332 148 L346 148 Z M386 160 L394 147 L380 147 Z" class="box lid" />
      <rect x="340" y="160" width="46" height="45" class="box" />
      <path d="M340 172 H386" class="box-line" />
    </g>
    <defs>
      <marker id="ps-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
      </marker>
    </defs>
  </svg>
{/snippet}

<Shell label="Wo oder wohin?" icon="eye" title={mode === 'wo' ? 'position: dative' : mode === 'wohin' ? 'movement: accusative' : undefined} tabs={['Explore', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="preps ui" role="group" aria-label="Preposition">
      {#each PREPOSITIONS as p (p.prep)}
        <button type="button" class:on={prep === p.prep} aria-pressed={prep === p.prep} title={p.en} onclick={() => choose(p.prep)}><span lang="de">{p.prep}</span></button>
      {/each}
    </div>
    {#if mode === 'both'}
      <div class="cases ui" role="group" aria-label="Question">
        <button type="button" class="wo" class:on={kase === 'wo'} aria-pressed={kase === 'wo'} onclick={() => choose(prep, 'wo')}><b lang="de">Wo?</b> position · Dativ</button>
        <button type="button" class="wohin" class:on={kase === 'wohin'} aria-pressed={kase === 'wohin'} onclick={() => choose(prep, 'wohin')}><b lang="de">Wohin?</b> movement · Akkusativ</button>
      </div>
    {/if}
    {@render scene()}
    <div class="say" aria-live="polite">
      <p class="de"><HiText text={sentence.de} tone={kase === 'wo' ? 'jade' : 'accent'} size="lg" /><PlayButton text={unmark(sentence.de)} small /></p>
      <p class="en ui">{sentence.en}</p>
      <p class="why ui"><span class="tag {kase}">{kase === 'wo' ? 'Dativ' : 'Akkusativ'}</span>{why(item, kase)}</p>
    </div>
    <details class="more ui">
      <summary>Verb pairs and contractions</summary>
      <ul>
        {#each VERB_PAIRS as v (v.de)}<li><b lang="de">{v.de}</b> <span>{v.en}</span></li>{/each}
      </ul>
      <p>Position verbs (liegen, sitzen, stehen, hängen) go with <b>wo?</b> and the dative; putting verbs (legen, setzen, stellen, hängen) with <b>wohin?</b> and the accusative. <span lang="de"><b>in dem → im, in das → ins, an dem → am, an das → ans</b></span>.</p>
    </details>
  {:else if finished}
    <div class="done" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
      <p class="ui msg">{score === qs.length ? 'Perfekt! Wo and wohin hold no secrets.' : 'Ask yourself: is it already there (wo?, dative) or going there (wohin?, accusative)?'}</p>
      <button class="btn primary" type="button" onclick={startQuiz}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else if q && qSent}
    <div class="top ui"><span>Picture {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
    {@render scene()}
    <p class="de q">
      {#if pick}<HiText text={filled(qSent.de, answerOf(qSent.de))} tone={q.kase === 'wo' ? 'jade' : 'accent'} size="lg" /><PlayButton text={unmark(qSent.de)} small />{:else}<span class="lg"><De text={gapped(qSent.de).replace(/___/g, '＿＿')} play={false} genders="hide" /></span>{/if}
    </p>
    <p class="en ui">{qSent.en}</p>
    <div class="opts" role="group" aria-label="Choose the article">
      {#each order as o (o)}
        {@const right = o === answerOf(qSent.de)}
        <button type="button" class="opt" class:right={pick !== null && right} class:wrong={pick === o && !right} disabled={pick !== null && !right && pick !== o} onclick={() => answer(o)}><span lang="de">{o}</span></button>
      {/each}
    </div>
    <div class="fb" aria-live="polite">
      {#if pick}
        <p class:ok={pick === answerOf(qSent.de)}><strong>{pick === answerOf(qSent.de) ? 'Richtig!' : 'Nicht ganz.'}</strong> {why(qItem!, q.kase)}</p>
        <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .preps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .preps button {
    min-width: 2.9rem;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    font-family: var(--font-body);
    font-size: 0.98rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--fg);
  }
  .preps button.on {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }
  .cases {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    margin: 0.6rem 0 0.2rem;
  }
  .cases button {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 10px;
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
    color: var(--mute);
    cursor: pointer;
    text-align: center;
  }
  .cases b {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--fg);
    margin-right: 0.2rem;
  }
  .cases .wo.on {
    border-color: var(--jade);
    background: var(--jade-soft);
    color: var(--jade);
  }
  .cases .wohin.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .scene {
    display: block;
    width: 100%;
    max-width: 34rem;
    height: auto;
    margin: 0.7rem auto 0.5rem;
    border-radius: 12px;
  }
  .wall {
    fill: var(--pn);
  }
  .floor {
    fill: color-mix(in srgb, var(--gold) 16%, var(--panel));
  }
  .skirting {
    stroke: var(--line-strong);
    stroke-width: 2;
  }
  .frame {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 3;
  }
  .pic {
    fill: color-mix(in srgb, var(--jade) 45%, var(--panel));
  }
  .cord {
    stroke: var(--mute);
    stroke-width: 1.5;
  }
  .shade {
    fill: var(--gold);
  }
  .bulb {
    fill: color-mix(in srgb, var(--gold) 50%, #fff);
  }
  .lamp {
    transition: transform 0ms;
  }
  .lamp.moving {
    transition: transform 700ms cubic-bezier(0.4, 0.1, 0.3, 1);
  }
  .sofa {
    fill: color-mix(in srgb, var(--g-m) 45%, var(--panel));
  }
  .sofa.back {
    fill: color-mix(in srgb, var(--g-m) 35%, var(--panel));
  }
  .leg {
    fill: var(--ink-2);
  }
  .wood {
    fill: color-mix(in srgb, var(--gold) 55%, var(--ink-2));
  }
  .wood.light {
    fill: color-mix(in srgb, var(--gold) 40%, var(--panel));
  }
  .box {
    fill: color-mix(in srgb, var(--gold) 45%, var(--panel));
    stroke: color-mix(in srgb, var(--gold) 60%, var(--ink-2));
    stroke-width: 1.2;
  }
  .box.lid {
    fill: color-mix(in srgb, var(--gold) 30%, var(--panel));
  }
  .box-line {
    stroke: color-mix(in srgb, var(--gold) 60%, var(--ink-2));
    stroke-width: 1;
  }
  .cat .body {
    fill: var(--accent);
  }
  .cat .tail {
    fill: none;
    stroke: var(--accent);
    stroke-width: 5;
    stroke-linecap: round;
  }
  .cat .eye {
    fill: var(--panel);
  }
  .cat .whisk {
    stroke: var(--panel);
    stroke-width: 0.8;
  }
  .cat.moving {
    transition: transform 700ms cubic-bezier(0.4, 0.1, 0.3, 1);
  }
  .arc {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-dasharray: 5 5;
    opacity: 0.8;
  }
  .arrowhead {
    fill: var(--accent);
  }
  .say {
    min-height: 6.5rem;
  }
  .de {
    margin: 0.2rem 0 0;
  }
  .lg {
    font-size: 1.35rem;
    line-height: 1.5;
  }
  .en {
    margin: 0.1rem 0 0.4rem;
    font-size: 0.86rem;
    color: var(--mute);
  }
  .why {
    margin: 0;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .tag {
    display: inline-block;
    margin-right: 0.4rem;
    padding: 0 0.45rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .tag.wo {
    background: var(--jade-soft);
    color: var(--jade);
  }
  .tag.wohin {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .more {
    margin-top: 0.7rem;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .more summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-ink);
  }
  .more ul {
    margin: 0.4rem 0;
    padding-left: 1.1rem;
  }
  .more li span {
    color: var(--mute);
  }
  .more p {
    margin: 0.3rem 0 0;
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--mute);
  }
  .pts {
    color: var(--jade);
    font-weight: 600;
  }
  .q {
    min-height: 2.2rem;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .opt {
    min-width: 4.2rem;
    padding: 0.45rem 0.8rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  .opt:hover:not(:disabled):not(.right):not(.wrong) {
    border-color: var(--accent);
  }
  .opt.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .opt.wrong {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .opt:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .fb {
    margin-top: 0.7rem;
    min-height: 2.2rem;
  }
  .fb p {
    margin: 0 0 0.45rem;
  }
  .fb strong {
    color: var(--accent-ink);
  }
  .fb .ok strong {
    color: var(--jade);
  }
  .done {
    text-align: center;
    padding: 0.6rem 0;
  }
  .score {
    font-size: 1.1rem;
    margin: 0;
  }
  .score strong {
    font-size: 2rem;
    color: var(--jade);
  }
  .msg {
    color: var(--mute);
    font-size: 0.9rem;
    margin: 0.2rem 0 0.8rem;
  }
  @media (max-width: 420px) {
    .cases button {
      font-size: 0.72rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cat.moving,
    .lamp.moving {
      transition: none;
    }
  }
</style>
