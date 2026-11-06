<!--
  The Analytical Engine's layout, running a small deck: the store's columns, the racks, the mill's two
  ingress axes and egress, and the chain of cards. Step card by card and watch numbers travel.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Engine, formatFixed, parseDeck, duration, type Card } from '$lib/mech/analytical';

  let { src = '# (a + b) × c\nN1 7\nN2 5\nN3 3\n+\nL1\nL2\nS4\n×\nL4\nL3\nS5\nP', columns = 6 }: { src?: string; columns?: number } = $props();
  // svelte-ignore state_referenced_locally
  const deck = parseDeck(src);
  let engine = $state.raw(new Engine(deck));
  let tick = $state(0);
  let flight: { from: [number, number]; to: [number, number]; text: string; key: number } | null = $state(null);
  let key = 0;

  const STORE_X = 30, MILL_X = 330, ROW_Y = (v: number) => 46 + v * 30;
  const AXIS_Y = [70, 120, 190];

  function step() {
    if (engine.done) return;
    const card = deck.cards[engine.pc];
    const before = engine.ingress.length;
    const pre = card && card.kind === 'load' ? engine.get(card.v) : 0n;
    engine.step();
    tick++;
    if (!card) return;
    const d = deck.decimals;
    if (card.kind === 'load') {
      const axis = before;
      flight = { from: [STORE_X + 120, ROW_Y(card.v)], to: [MILL_X + 40, AXIS_Y[axis]!], text: formatFixed(pre, d), key: ++key };
    } else if (card.kind === 'store') {
      flight = { from: [MILL_X + 40, AXIS_Y[2]!], to: [STORE_X + 120, ROW_Y(card.v)], text: formatFixed(engine.result, d), key: ++key };
    } else if (card.kind === 'number') {
      flight = { from: [STORE_X + 60, 8], to: [STORE_X + 60, ROW_Y(card.v)], text: formatFixed(card.value, d), key: ++key };
    } else flight = null;
  }
  function reset() {
    engine = new Engine(deck);
    flight = null;
    tick++;
  }
  const view = $derived.by(() => {
    void tick;
    const d = deck.decimals;
    return {
      store: Array.from({ length: columns }, (_, v) => formatFixed(engine.get(v), d)),
      ingress: [0, 1].map((i) => (engine.ingress[i] !== undefined ? formatFixed(engine.ingress[i]!, d) : '')),
      egress: formatFixed(engine.result, d),
      op: engine.op,
      pc: engine.pc,
      done: engine.done,
      note: engine.trace.at(-1)?.note ?? 'The engine is ready: press Step to read the first card.',
      printed: [...engine.printed],
      time: engine.time,
    };
  });
  const cardText = (c: Card) => (c.kind === 'number' ? `N${c.v} ${c.text}` : c.kind === 'op' ? (c.op === '-' ? '−' : c.op) : c.kind === 'load' ? `${c.zero ? 'Z' : 'L'}${c.v}` : c.kind === 'store' ? `S${c.v}` : c.kind === 'print' ? 'P' : c.kind === 'halt' ? 'H' : c.kind === 'bell' ? 'BELL' : `C${c.forward ? 'F' : 'B'}${c.conditional ? '?' : ''} ${c.n}`);
</script>

<Widget title="Store, mill and cards" subtitle="The engine computes (7 + 5) × 3. Step through the cards: number cards fill the store; variable cards send numbers along the racks to the mill and back; operation cards set what the mill does." onreset={reset}>
  {#snippet controls()}
    <button class="go" onclick={step} disabled={!!view.done}>Step</button>
    <button onclick={() => { while (!engine.done) step(); }}>Run to the end</button>
    <span class="t">about {duration(view.time)} on the engine</span>
  {/snippet}
  <div class="wrap">
    <svg viewBox="0 0 470 {Math.max(250, ROW_Y(columns) + 10)}" role="img" aria-label="The store on the left, the mill on the right, joined by racks">
      <text x={STORE_X} y="28" class="h">Store</text>
      {#each view.store as v, i (i)}
        <g transform="translate({STORE_X} {ROW_Y(i) - 13})">
          <rect width="150" height="24" rx="3" class="col" class:hot={deck.cards[view.pc - 1]?.kind !== 'op' && 'v' in (deck.cards[view.pc - 1] ?? {}) && (deck.cards[view.pc - 1] as { v: number }).v === i} />
          <text x="8" y="16" class="vn">V{i}</text>
          <text x="142" y="16" class="num" text-anchor="end">{v}</text>
        </g>
      {/each}
      <!-- racks -->
      <line x1={STORE_X + 150} y1="40" x2={STORE_X + 150} y2={ROW_Y(columns - 1)} class="rack" />
      <line x1={STORE_X + 150} y1="95" x2={MILL_X} y2="95" class="rack" />
      <text x={(STORE_X + 150 + MILL_X) / 2} y="88" text-anchor="middle" class="small">racks</text>
      <text x={MILL_X} y="28" class="h">Mill</text>
      <rect x={MILL_X} y="40" width="125" height="170" rx="6" class="mill" />
      <text x={MILL_X + 62} y="62" text-anchor="middle" class="small">ingress axis 1</text>
      <rect x={MILL_X + 8} y="66" width="109" height="20" rx="3" class="axis" /><text x={MILL_X + 110} y="81" text-anchor="end" class="num">{view.ingress[0]}</text>
      <text x={MILL_X + 62} y="112" text-anchor="middle" class="small">ingress axis 2</text>
      <rect x={MILL_X + 8} y="116" width="109" height="20" rx="3" class="axis" /><text x={MILL_X + 110} y="131" text-anchor="end" class="num">{view.ingress[1]}</text>
      <text x={MILL_X + 62} y="158" text-anchor="middle" class="opbig">{view.op === '-' ? '−' : view.op}</text>
      <text x={MILL_X + 62} y="182" text-anchor="middle" class="small">egress</text>
      <rect x={MILL_X + 8} y="186" width="109" height="20" rx="3" class="axis eg" /><text x={MILL_X + 110} y="201" text-anchor="end" class="num">{view.egress}</text>
      {#if flight}
        {#key flight.key}
          <g class="token" style="--fx:{flight.from[0]}px; --fy:{flight.from[1]}px; --tx:{flight.to[0]}px; --ty:{flight.to[1]}px">
            <rect x="-26" y="-10" width="52" height="20" rx="10" /><text text-anchor="middle" y="5">{flight.text}</text>
          </g>
        {/key}
      {/if}
    </svg>
    <ol class="cards ui" aria-label="The chain of cards">
      {#each deck.cards as c, i (i)}<li class:cur={i === view.pc && !view.done} class:read={i < view.pc}>{cardText(c)}</li>{/each}
    </ol>
  </div>
  <p class="note ui" aria-live="polite">{view.note}{#if view.printed.length} · printed: <strong>{view.printed.join(', ')}</strong>{/if}</p>
</Widget>

<style>
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.5;
  }
  .t {
    font-size: 0.82rem;
    color: var(--ink-3);
  }
  .wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 5.5rem;
    gap: 0.6rem;
  }
  svg {
    width: 100%;
    font-family: var(--font-ui);
  }
  .h {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    fill: var(--ink);
  }
  .col {
    fill: var(--page);
    stroke: var(--line-strong);
  }
  .col.hot {
    stroke: var(--brass);
    stroke-width: 2.5;
  }
  .vn {
    font-size: 11px;
    fill: var(--accent);
    font-weight: 600;
  }
  .num {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--ink);
  }
  .small {
    font-size: 10px;
    fill: var(--ink-3);
  }
  .rack {
    stroke: var(--brass);
    stroke-width: 3;
    stroke-dasharray: 2 3;
  }
  .mill {
    fill: var(--surface-2);
    stroke: var(--line-strong);
  }
  .axis {
    fill: var(--page);
    stroke: var(--line-strong);
  }
  .axis.eg {
    stroke: var(--fx-red);
  }
  .opbig {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 700;
    fill: var(--fx-red);
  }
  .token {
    animation: fly 650ms ease-in-out forwards;
  }
  .token rect {
    fill: var(--brass);
  }
  .token text {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    fill: #fff;
  }
  @keyframes fly {
    from {
      transform: translate(var(--fx), var(--fy));
      opacity: 1;
    }
    85% {
      opacity: 1;
    }
    to {
      transform: translate(var(--tx), var(--ty));
      opacity: 0;
    }
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    max-height: 17rem;
    overflow-y: auto;
  }
  .cards li {
    padding: 0.1rem 0.4rem;
    border-left: 3px solid transparent;
  }
  .cards li.read {
    color: var(--ink-3);
  }
  .cards li.cur {
    border-left-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .note {
    font-size: 0.84rem;
    margin: 0.5rem 0 0;
    color: var(--ink-2);
  }
</style>
