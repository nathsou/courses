<script lang="ts">
  /**
   * A small grid town. "Follow": hear or read directions (Gehen Sie geradeaus und dann die zweite
   * Straße links…) and tap where you end up. "Lead the way": walk to a named place step by step
   * (geradeaus, links, rechts) and watch your route turn into German directions.
   */
  import { onDestroy } from 'svelte';
  import { PLACES, type Place } from './data/town';
  import { COLS, ROWS, START, blockBeside, blockOpposite, describe, simpleRoutes, step, walk, type Block, type Move, type Pos, type Route, type Side } from '$lib/de/directions';
  import { shuffle, rng } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  const ICONS: Record<string, string> = {
    bahnhof: 'M7 3.5h10a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2zM5 10.5h14M8.5 21l2-4M15.5 21l-2-4M8.5 13.5h.01M15.5 13.5h.01',
    bank: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.2 8.6a4 4 0 1 0 0 6.8M7.5 11h6M7.5 13.3h6',
    apotheke: 'M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z',
    post: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7',
    supermarkt: 'M3 4h2.5l2.2 10.5h10.1L19.5 7.5H6.4M9 19.6v.01M17 19.6v.01',
    kino: 'M4 9.5h16V19H4zM4 9.5 6.3 5h3.2L7.2 9.5M10.2 9.5 12.5 5h3.2l-2.3 4.5M16.4 9.5 18.7 5H20',
    museum: 'M3 9 12 4l9 5zM6 11v7M10 11v7M14 11v7M18 11v7M3 20h18',
    park: 'M12 3a5 5 0 0 1 4.6 7A4 4 0 0 1 15 17.5H9A4 4 0 0 1 7.4 10 5 5 0 0 1 12 3zM12 12v9',
    cafe: 'M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3',
    rathaus: 'M4 20v-9h16v9M10 20v-4h4v4M9 11V7l3-3 3 3v4M12 7.5v.01M3 20h18',
    schule: 'M2.5 9 12 5l9.5 4L12 13zM6.5 11v4.5c3 2.5 8 2.5 11 0V11M21.5 9v5',
    hotel: 'M3 18V7M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5M7 11.5v.01',
  };
  const BREAK: Record<string, string> = { Supermarkt: 'Super­markt', Apotheke: 'Apo­theke', Bahnhof: 'Bahn­hof', Rathaus: 'Rat­haus', Museum: 'Mu­seum' };
  const noun = (p: Place) => p.de.split(' ')[1]!;
  const gender = (p: Place) => (p.de.startsWith('der') ? 'm' : p.de.startsWith('die') ? 'f' : 'n');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Geometry, in map units: streets 1 wide, blocks 5 × 4.
  const W = COLS * 6 + 1;
  const H = ROWS * 5 + 1 + 2;
  const pt = (p: Pos) => (p.y > ROWS ? { x: START.x * 6 + 0.5, y: H - 0.8 } : { x: p.x * 6 + 0.5, y: p.y * 5 + 0.5 });
  const ANGLE = { N: 0, E: 90, S: 180, W: 270 };
  const idx = (b: Block) => b.r * COLS + b.c;

  let tab = $state(0);
  let seed = $state(1);
  let layout = $state<Place[]>(PLACES);
  const placeAt = (b: Block | null) => (b ? layout[idx(b)] : undefined);

  function newTown() {
    seed = Date.now() % 1e9;
    layout = shuffle(PLACES, seed);
  }

  // Follow mode
  const ROUNDS = 6;
  type Q = Route & { text: string };
  let qs = $state<Q[]>([]);
  let qi = $state(0);
  let solved = $state(false);
  let missed = $state(false);
  let score = $state(0);
  let flash = $state<number | null>(null);
  let note = $state<string | null>(null);
  let showWay = $state(false);
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const followDone = $derived(qs.length > 0 && qi >= qs.length);

  function clueFor(r: Route, rand: () => number): string | undefined {
    const path = walk(r.moves);
    const a = path[path.length - 2]!;
    const b = path[path.length - 1]!;
    const across = placeAt(blockOpposite(a, b, r.side));
    const sideways = [-1, 1].map((d) => placeAt(r.block.c + d >= 0 && r.block.c + d < COLS ? { c: r.block.c + d, r: r.block.r } : null)).filter((p): p is Place => !!p);
    const roll = rand();
    if (across && roll < 0.4) return `gegenüber ${across.dat}`;
    if (sideways.length && roll < 0.8) return `neben ${sideways[Math.floor(rand() * sideways.length)]!.dat}`;
    return undefined;
  }

  function startFollow() {
    newTown();
    const r = rng(seed + 7);
    const routes = shuffle(simpleRoutes(), seed + 3);
    const seen = new Set<number>();
    const out: Q[] = [];
    for (const rt of routes) {
      if (seen.has(idx(rt.block))) continue;
      seen.add(idx(rt.block));
      out.push({ ...rt, text: describe(rt.moves, rt.side, { clue: clueFor(rt, r) }) });
      if (out.length >= ROUNDS) break;
    }
    qs = out;
    qi = 0;
    score = 0;
    askFollow();
  }
  function askFollow() {
    solved = false;
    missed = false;
    note = null;
    showWay = false;
    cancel();
    if (qs[qi]) cancel = speech.schedule(qs[qi]!.text, 300);
  }
  function tapFollow(i: number) {
    if (!q || solved) return;
    const place = layout[i]!;
    if (i === idx(q.block)) {
      solved = true;
      showWay = true;
      if (!missed) score++;
      note = `Das ist ${place.de}.`;
      sfx('right', settings.data.sounds);
      void speech.say(note);
    } else {
      missed = true;
      flash = i;
      note = `Das ist ${place.de}.`;
      sfx('wrong', settings.data.sounds);
      setTimeout(() => (flash = null), 400);
    }
  }
  function nextFollow() {
    qi++;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else askFollow();
  }

  // Lead mode
  const GOALS = 5;
  let goals = $state<number[]>([]);
  let gi = $state(0);
  let moves = $state<Move[]>([]);
  let leadScore = $state(0);
  let leadMissed = $state(false);
  let leadSolved = $state<Side | null>(null);
  let leadNote = $state<string | null>(null);
  const goal = $derived(goals[gi] !== undefined ? layout[goals[gi]!] : undefined);
  const leadDone = $derived(goals.length > 0 && gi >= goals.length);
  const path = $derived(walk(moves));
  const here = $derived(path[path.length - 1]!);
  const can = (m: Move) => !leadSolved && !!step(here, m);
  const canSay = $derived(!leadSolved && moves.length >= 2);
  const sofar = $derived(leadSolved ? describe(moves, leadSolved, { goal: goal?.de }) : describe(moves));

  function startLead() {
    newTown();
    goals = shuffle(
      layout.map((_, i) => i),
      seed + 11,
    ).slice(0, GOALS);
    gi = 0;
    leadScore = 0;
    resetWalk();
  }
  function resetWalk() {
    moves = [];
    leadSolved = null;
    leadMissed = false;
    leadNote = null;
  }
  function go(m: Move) {
    if (!can(m)) return;
    moves = [...moves, m];
    leadNote = null;
  }
  function undo() {
    if (leadSolved || !moves.length) return;
    moves = moves.slice(0, -1);
    leadNote = null;
  }
  function itIs(side: Side) {
    if (!canSay || !goal) return;
    const at = placeAt(blockBeside(path[path.length - 2]!, here, side));
    if (at === goal) {
      leadSolved = side;
      if (!leadMissed) leadScore++;
      sfx('right', settings.data.sounds);
      void speech.say(describe(moves, side, { goal: goal.de }));
    } else {
      leadMissed = true;
      leadNote = at ? `${side === 'L' ? 'Links' : 'Rechts'} ist ${at.de}, nicht ${goal.de}.` : `${side === 'L' ? 'Links' : 'Rechts'} ist hier nichts.`;
      sfx('wrong', settings.data.sounds);
    }
  }
  function nextGoal() {
    gi++;
    if (gi >= goals.length) sfx('done', settings.data.sounds);
    else resetWalk();
  }
  function key(e: KeyboardEvent) {
    if (tab !== 1 || e.target instanceof HTMLSelectElement) return;
    const m = ({ ArrowUp: 'S', ArrowLeft: 'L', ArrowRight: 'R' } as Record<string, Move>)[e.key];
    if (m) {
      e.preventDefault();
      go(m);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      undo();
    }
  }

  $effect(() => {
    if (tab === 0 && !qs.length) startFollow();
    if (tab === 1 && !goals.length) startLead();
  });

  const shownPath = $derived(tab === 0 ? (showWay && q ? walk(q.moves) : []) : path);
  const walker = $derived(tab === 0 ? (showWay && q ? walk(q.moves).at(-1)! : START) : here);
  const goalIdx = $derived(tab === 1 && goal ? layout.indexOf(goal) : -1);
  const rightIdx = $derived(tab === 0 && solved && q ? idx(q.block) : tab === 1 && leadSolved ? goalIdx : -1);
</script>

{#snippet map(clickable: boolean)}
  <div class="town" style="aspect-ratio: {W} / {H}">
    <svg class="streets" viewBox="0 0 {W} {H}" aria-hidden="true">
      {#each Array.from({ length: COLS + 1 }, (_, i) => i) as i (i)}
        <rect x={i * 6} y="0" width="1" height={i === START.x ? H : ROWS * 5 + 1} class="st" />
      {/each}
      {#each Array.from({ length: ROWS + 1 }, (_, j) => j) as j (j)}
        <rect x="0" y={j * 5} width={W} height="1" class="st" />
      {/each}
      {#if shownPath.length > 1}
        <polyline class="route" points={shownPath.map((p) => `${pt(p).x},${pt(p).y}`).join(' ')} />
      {/if}
      <g class="walker" style="transform: translate({pt(walker).x}px, {pt(walker).y}px) rotate({ANGLE[walker.h]}deg)">
        <circle r="0.62" />
        <path d="M0 -0.42 L0.32 0.22 L0 0.08 L-0.32 0.22 Z" />
      </g>
    </svg>
    <span class="here ui" style="left: {((START.x * 6 + 1.3) / W) * 100}%">Sie sind hier</span>
    {#each layout as p, i (p.id)}
      {@const c = i % COLS}
      {@const r = Math.floor(i / COLS)}
      <button
        type="button"
        class="bld g-{gender(p)}"
        class:goal={i === goalIdx}
        class:right={i === rightIdx}
        class:wrong={flash === i}
        disabled={!clickable}
        style="left: {((c * 6 + 1) / W) * 100}%; top: {((r * 5 + 1) / H) * 100}%; width: {(5 / W) * 100}%; height: {(4 / H) * 100}%"
        aria-label="{p.de} ({p.en})"
        onclick={() => tapFollow(i)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[p.id]} /></svg>
        <span class="nm" lang="de">{BREAK[noun(p)] ?? noun(p)}</span>
      </button>
    {/each}
  </div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onkeydown={key}>
  <Shell label="In der Stadt" icon="map" tabs={['Follow', 'Lead the way']} bind:tab>
    {#if tab === 0}
      {#if followDone}
        <div class="done" aria-live="polite">
          <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
          <p class="ui msg">{score === qs.length ? 'You never got lost once.' : 'Remember: links and rechts are from the walker’s point of view.'}</p>
          <button class="btn primary" type="button" onclick={startFollow}><Icon name="refresh" size={16} />New town</button>
        </div>
      {:else if q}
        <div class="top ui"><span>Directions {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
        <p class="dir"><De text={q.text} play={false} /><PlayButton text={q.text} small /><PlayButton text={q.text} slow /></p>
        <p class="ui instr">Start at the arrow, facing up the map. Where do you end up? Tap the building.</p>
        {@render map(!solved)}
        <div class="fb" aria-live="polite">
          {#if note}
            <p class:ok={solved}><strong>{solved ? 'Richtig!' : 'Nein.'}</strong> <De text={note} play={false} /></p>
          {/if}
          {#if solved}
            <button class="btn small primary" type="button" onclick={nextFollow}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
          {:else if missed && !showWay}
            <button class="btn small ghost" type="button" onclick={() => (showWay = true)}><Icon name="eye" size={14} />Show the way</button>
          {/if}
        </div>
      {/if}
    {:else if leadDone}
      <div class="done" aria-live="polite">
        <p class="score ui"><strong>{leadScore}</strong> / {goals.length}</p>
        <p class="ui msg">{leadScore === goals.length ? 'Sie sind ein Stadtführer!' : 'Left and right turn with you: picture yourself walking.'}</p>
        <button class="btn primary" type="button" onclick={startLead}><Icon name="refresh" size={16} />New town</button>
      </div>
    {:else if goal}
      <div class="top ui"><span>Place {gi + 1} of {goals.length}</span><span class="pts">{leadScore} right</span></div>
      <p class="dir"><De text={`Entschuldigung, wie komme ich ${goal.zu}?`} play={false} /><PlayButton text={`Entschuldigung, wie komme ich ${goal.zu}?`} small /></p>
      <p class="ui instr">Walk to the <b>{goal.en}</b> (outlined), then say which side it is on.</p>
      {@render map(false)}
      <div class="controls ui" role="group" aria-label="Walk">
        <button class="btn small" type="button" disabled={!can('L')} onclick={() => go('L')} aria-keyshortcuts="ArrowLeft"><Icon name="back" size={14} /><span lang="de">links</span></button>
        <button class="btn small" type="button" disabled={!can('S')} onclick={() => go('S')} aria-keyshortcuts="ArrowUp"><span class="up"><Icon name="arrow" size={14} /></span><span lang="de">geradeaus</span></button>
        <button class="btn small" type="button" disabled={!can('R')} onclick={() => go('R')} aria-keyshortcuts="ArrowRight"><span lang="de">rechts</span><Icon name="arrow" size={14} /></button>
        <span class="sep"></span>
        <button class="btn small" type="button" disabled={!canSay} onclick={() => itIs('L')}><span lang="de">Es ist links</span></button>
        <button class="btn small" type="button" disabled={!canSay} onclick={() => itIs('R')}><span lang="de">Es ist rechts</span></button>
        <button class="btn small ghost" type="button" disabled={!moves.length || !!leadSolved} onclick={undo} aria-label="Undo the last step"><Icon name="refresh" size={14} />Undo</button>
      </div>
      <div class="fb" aria-live="polite">
        {#if sofar}<p class="sofar" class:ok={!!leadSolved}>{#if leadSolved}<strong>Richtig!</strong> {/if}<De text={sofar} play={false} />{#if leadSolved}<PlayButton text={sofar} small />{/if}</p>{/if}
        {#if leadNote}<p class="bad"><strong>Nein.</strong> <De text={leadNote} play={false} /></p>{/if}
        {#if leadSolved}<button class="btn small primary" type="button" onclick={nextGoal}>{gi + 1 < goals.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>{/if}
      </div>
    {/if}
  </Shell>
</div>

<style>
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
  .dir {
    margin: 0.35rem 0 0.2rem;
    font-size: 1.1rem;
    line-height: 1.5;
  }
  .instr {
    margin: 0 0 0.7rem;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .town {
    position: relative;
    width: 100%;
    max-width: 34rem;
    margin: 0 auto;
    border-radius: 12px;
    background: color-mix(in srgb, var(--jade) 7%, var(--panel));
    overflow: hidden;
  }
  .streets {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .st {
    fill: var(--line);
  }
  .route {
    fill: none;
    stroke: var(--accent);
    stroke-width: 0.32;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
  }
  .walker {
    transition: transform 260ms ease;
  }
  .walker circle {
    fill: var(--accent);
    stroke: var(--panel);
    stroke-width: 0.12;
  }
  .walker path {
    fill: #fff;
  }
  .here {
    position: absolute;
    bottom: 0.15rem;
    font-size: clamp(0.58rem, 2.2vw, 0.72rem);
    font-weight: 600;
    color: var(--accent-ink);
    white-space: nowrap;
  }
  .bld {
    position: absolute;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.1rem;
    padding: 0.15rem;
    border-radius: 8px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    transition: border-color 120ms, background-color 120ms;
  }
  .bld:disabled {
    cursor: default;
  }
  .bld:not(:disabled):hover {
    border-color: var(--accent);
  }
  .bld svg {
    width: clamp(1rem, 4.5vw, 1.6rem);
    height: clamp(1rem, 4.5vw, 1.6rem);
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .nm {
    font-family: var(--font-ui);
    font-size: clamp(0.58rem, 2.3vw, 0.8rem);
    font-weight: 650;
    line-height: 1.1;
    text-align: center;
    hyphens: manual;
    max-width: 100%;
  }
  .g-m .nm {
    color: var(--g-m);
  }
  .g-f .nm {
    color: var(--g-f);
  }
  .g-n .nm {
    color: var(--g-n);
  }
  .bld.goal {
    border: 2.5px solid var(--gold);
    background: var(--gold-soft);
  }
  .bld.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .bld.wrong {
    border-color: var(--accent);
    animation: shake 300ms;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    margin-top: 0.7rem;
  }
  .up {
    display: inline-flex;
    transform: rotate(-90deg);
  }
  .sep {
    width: 0.6rem;
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
  .sofar {
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    background: var(--pn);
  }
  .sofar.ok {
    background: var(--jade-soft);
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
  @keyframes shake {
    25% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .walker {
      transition: none;
    }
    .bld.wrong {
      animation: none;
    }
  }
</style>
