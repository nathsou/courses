<!--
  Edit and run a card deck on the course's Analytical Engine. Three views of the same deck: the text, the
  physical chain of cards, and a Lovelace-style table. Run it whole, or card by card.
-->
<script lang="ts">
  import { Engine, duration, formatFixed, noteGTable, parseDeck, type Card } from '$lib/mech/analytical';

  let {
    value = $bindable(''),
    initial = {},
    onrun,
    oninput,
    readonly = false,
    rows = 12,
  }: {
    value?: string;
    initial?: Record<number, number | string>;
    onrun?: () => void;
    oninput?: () => void;
    readonly?: boolean;
    rows?: number;
  } = $props();

  let view: 'text' | 'cards' | 'table' = $state('text');
  let engine: Engine | null = $state.raw(null);
  let version = $state(0);
  let gutter: HTMLDivElement | undefined = $state();

  const deck = $derived(parseDeck(value));
  const table = $derived(noteGTable(deck));
  const lines = $derived(value.split('\n').length);
  const errorLines = $derived(new Set(deck.errors.map((e) => e.line)));

  function fresh() {
    engine = new Engine(deck, initial);
    version++;
  }
  /** Run the deck from the start, to the end. */
  export function runAll() {
    fresh();
    engine!.run();
    version++;
    onrun?.();
  }
  function step() {
    if (!engine || engine.done || engine.deck !== deck) fresh();
    engine!.step();
    version++;
  }
  function reset() {
    engine = null;
    version++;
  }
  $effect(() => {
    void value;
    engine = null;
  });

  const snap = $derived.by(() => {
    void version;
    if (!engine) return null;
    const d = engine.deck.decimals;
    const store = [...engine.store.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, v: formatFixed(v, d) }));
    return { store, printed: [...engine.printed], last: engine.trace.slice(-6), pc: engine.pc, done: engine.done, error: engine.error, time: engine.time, steps: engine.steps, lever: engine.lever, bells: engine.bells };
  });
  const currentLine = $derived(snap && !snap.done ? deck.cards[snap.pc]?.line : undefined);

  const cardLabel = (c: Card): { kind: string; text: string } => {
    switch (c.kind) {
      case 'number': return { kind: 'Number', text: `V${c.v} = ${c.text}` };
      case 'op': return { kind: 'Operation', text: c.op === '-' ? '−' : c.op };
      case 'load': return { kind: 'Variable', text: `${c.zero ? 'Z' : 'L'} V${c.v}` };
      case 'store': return { kind: 'Variable', text: `S V${c.v}${c.remainder ? '′' : ''}` };
      case 'print': return { kind: 'Print', text: 'P' };
      case 'jump': return { kind: 'Combinatorial', text: `${c.forward ? '→' : '←'} ${c.n}${c.conditional ? ' ?' : ''}` };
      case 'bell': return { kind: 'Bell', text: '🔔' };
      case 'halt': return { kind: 'Halt', text: 'H' };
    }
  };
</script>

<div class="editor ui">
  <div class="bar">
    <div class="seg" role="group" aria-label="View of the deck">
      <button class:on={view === 'text'} aria-pressed={view === 'text'} onclick={() => (view = 'text')}>Text</button>
      <button class:on={view === 'cards'} aria-pressed={view === 'cards'} onclick={() => (view = 'cards')}>Cards</button>
      <button class:on={view === 'table'} aria-pressed={view === 'table'} onclick={() => (view = 'table')}>Table</button>
    </div>
    <span class="count">{deck.cards.length} cards</span>
    <span class="spacer"></span>
    <button class="run" onclick={runAll} disabled={deck.errors.length > 0}>Run</button>
    <button onclick={step} disabled={deck.errors.length > 0}>Step</button>
    {#if engine}<button onclick={reset}>Clear</button>{/if}
  </div>

  {#if view === 'text'}
    <div class="code" style:height="{rows * 1.23 + 1.1}rem">
      <div class="gutter" bind:this={gutter} aria-hidden="true">
        {#each Array.from({ length: lines }) as _, i (i)}<span class:err={errorLines.has(i + 1)} class:cur={currentLine === i + 1}>{i + 1}</span>{/each}
      </div>
      <textarea
        bind:value
        {readonly}
        {rows}
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        aria-label="Card deck"
        oninput={() => oninput?.()}
        onscroll={(e) => gutter && (gutter.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop)}
      ></textarea>
    </div>
  {:else if view === 'cards'}
    <ol class="chain" aria-label="The chain of cards">
      {#each deck.cards as c, i (i)}
        {@const l = cardLabel(c)}
        <li class="card {c.kind}" class:cur={snap && !snap.done && snap.pc === i}><span class="k">{l.kind}</span><span class="t">{l.text}</span></li>
      {/each}
    </ol>
  {:else}
    <div class="table-wrap">
      <table>
        <thead><tr><th>№</th><th>Operation</th><th>Variables acted upon</th><th>Variables receiving results</th></tr></thead>
        <tbody>
          {#each table as r (r.n)}
            <tr>
              <td>{r.n}</td>
              <td class="op">{r.op === '-' ? '−' : r.op}</td>
              <td>{#each r.operands as o, i (i)}{i ? (r.op === '-' ? ' − ' : ` ${r.op} `) : ''}<sup>{o.zero ? '0' : '1'}</sup>V<sub>{o.v}</sub>{/each}</td>
              <td>{r.results.map((x) => `V${x.v}${x.remainder ? '′' : ''}`).join(', ') || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="legend">As in Lovelace’s table, a superscript 1 marks a column read and kept; 0, a column read and cleared.</p>
    </div>
  {/if}

  {#if deck.errors.length}
    <ul class="errors">{#each deck.errors as e (e.line)}<li>Line {e.line}: {e.message}</li>{/each}</ul>
  {/if}

  {#if snap}
    <div class="out" aria-live="polite">
      <div class="status">
        <span>{snap.steps} cards read</span>
        <span>about {duration(snap.time)} on the engine</span>
        <span class:set={snap.lever}>run-up lever {snap.lever ? 'set' : 'not set'}</span>
        {#if snap.bells}<span>bell × {snap.bells}</span>{/if}
        <span>{snap.done === 'halt' ? 'halted' : snap.done === 'end' ? 'reached the end of the chain' : snap.done === 'limit' || snap.done === 'error' ? 'stopped' : 'running'}</span>
      </div>
      {#if snap.error}<p class="err">{snap.error}</p>{/if}
      <div class="panes">
        <div>
          <h5>Store</h5>
          {#if snap.store.length}
            <dl class="store">{#each snap.store as s (s.k)}<dt>V{s.k}</dt><dd>{s.v}</dd>{/each}</dl>
          {:else}<p class="none">All columns at zero.</p>{/if}
        </div>
        <div>
          <h5>Printer</h5>
          {#if snap.printed.length}<ol class="printed">{#each snap.printed as p, i (i)}<li>{p}</li>{/each}</ol>{:else}<p class="none">Nothing printed.</p>{/if}
          <h5>Last cards</h5>
          <ol class="trace">{#each snap.last as t, i (i)}<li><span>card {t.pc + 1}</span> {t.note}</li>{/each}</ol>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .editor {
    font-size: 0.86rem;
  }
  .bar {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }
  .spacer {
    flex: 1;
  }
  .count {
    color: var(--ink-3);
    font-size: 0.78rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .run {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .seg {
    display: inline-flex;
  }
  .seg button {
    border-radius: 0;
  }
  .seg button:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
  .seg button:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
  .seg button + button {
    border-left: 0;
  }
  .seg button.on {
    background: var(--ink);
    color: var(--page);
    border-color: var(--ink);
  }
  .code {
    display: grid;
    grid-template-columns: auto 1fr;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    overflow: hidden;
  }
  .gutter {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.4rem;
    text-align: right;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--ink-3);
    background: var(--surface-2);
    overflow: hidden;
    user-select: none;
  }
  .gutter .err {
    color: var(--bad);
    font-weight: 700;
  }
  .gutter .cur {
    color: var(--on-accent);
    background: var(--accent);
    border-radius: 2px;
  }
  textarea {
    height: 100%;
    overflow-y: auto;
    resize: none;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.5;
    padding: 0.5rem 0.6rem;
    border: 0;
    background: transparent;
    color: var(--ink);
    min-width: 0;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
    tab-size: 2;
  }
  textarea:focus {
    outline: none;
  }
  .code:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 1px;
  }
  .chain {
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    max-height: 18rem;
    overflow-y: auto;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 4.6rem;
    padding: 0.25rem 0.4rem 0.35rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--page);
    position: relative;
  }
  /* Punched holes along the top edge, as on a Jacquard card. */
  .card::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 8px;
    right: 8px;
    height: 3px;
    background: radial-gradient(circle, var(--line-strong) 1.2px, transparent 1.6px) 0 0 / 7px 3px repeat-x;
  }
  .card .k {
    margin-top: 0.3rem;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .card .t {
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .card.op {
    border-top: 3px solid var(--fx-red);
  }
  .card.load,
  .card.store {
    border-top: 3px solid var(--fx-blue);
  }
  .card.number {
    border-top: 3px solid var(--brass);
  }
  .card.jump {
    border-top: 3px solid var(--ok);
  }
  .card.cur {
    outline: 2px solid var(--accent);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.84rem;
  }
  th,
  td {
    border: 1px solid var(--line);
    padding: 0.3rem 0.5rem;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  th {
    background: var(--surface-2);
    font-weight: 600;
  }
  .op {
    font-family: var(--font-mono);
    text-align: center;
  }
  .legend {
    font-size: 0.76rem;
    color: var(--ink-3);
    margin: 0.3rem 0 0;
  }
  .errors {
    margin: 0.5rem 0 0;
    padding-left: 1.1rem;
    color: var(--bad);
  }
  .out {
    margin-top: 0.7rem;
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
  }
  .status {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .status .set {
    color: var(--bad);
    font-weight: 600;
  }
  .err {
    color: var(--bad);
    margin: 0.4rem 0;
  }
  .panes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.5rem 1.2rem;
  }
  h5 {
    margin: 0.6rem 0 0.25rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-3);
  }
  .store {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 0.7rem;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    max-height: 12rem;
    overflow-y: auto;
  }
  .store dt {
    color: var(--accent);
  }
  .store dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .printed,
  .trace {
    margin: 0;
    padding-left: 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .trace {
    list-style: none;
    padding: 0;
    color: var(--ink-2);
  }
  .trace span {
    color: var(--ink-3);
  }
  .none {
    margin: 0;
    color: var(--ink-3);
  }
</style>
