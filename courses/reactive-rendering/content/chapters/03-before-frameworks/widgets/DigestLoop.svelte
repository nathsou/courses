<!--
  AngularJS's digest loop on a small page. Change a value and see every pass of the digest: each watcher is read, compared
  with what it returned last time, and its listener called if it differs. A listener that changes the scope forces
  another pass. Add idle watchers to see what the loop costs when nothing they watch has changed.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { Scope, type DigestEvent } from '$lib/rx/digest';

  let { n, title = 'The digest loop', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  let name = $state('Ann');
  let price = $state(4);
  let qty = $state(3);
  let idle = $state(0);
  let pingPong = $state(false);

  // What the page shows: written only by watcher listeners, never directly.
  let ui = $state({ greeting: '', letters: 0, total: 0, shout: '' });

  interface Cell { label: string; value: string; changed: boolean }
  let passes = $state<Cell[][]>([]);
  let result = $state({ passes: 0, watchCalls: 0, listenerCalls: 0, ms: 0, error: '' });
  let scope: Scope;

  const LABELS = ['name', 'name.length', 'price × qty', 'shout'] as const;

  function build() {
    scope = new Scope();
    scope.name = name;
    scope.price = price;
    scope.qty = qty;
    scope.shout = '';
    scope.$watch((s) => s.name, (v) => (ui.greeting = `Hello, ${v}!`), false, 'name');
    scope.$watch((s) => s.name.length, (v) => (ui.letters = v), false, 'name.length');
    scope.$watch((s) => s.price * s.qty, (v) => (ui.total = v), false, 'price × qty');
    // `shout` is read *before* the watcher that computes it, so it sees the new value one pass late.
    scope.$watch((s) => s.shout, (v) => (ui.shout = v), false, 'shout');
    scope.$watch((s) => s.name, (v) => (scope.shout = String(v).toUpperCase()), false, 'name (→ shout)');
    for (let i = 0; i < idle; i++) scope.$watch((s) => s.price + i, undefined, false, '');
    if (pingPong) {
      scope.ping = 0;
      scope.pong = 0;
      scope.$watch((s) => s.ping, () => scope.pong++, false, 'ping → pong');
      scope.$watch((s) => s.pong, () => scope.ping++, false, 'pong → ping');
    }
  }

  function digest(from: 'init' | 'change') {
    const events: DigestEvent[] = [];
    scope.$$trace = (e) => events.push(e);
    const before = { ...scope.$$stats };
    const t0 = performance.now();
    let error = '';
    try {
      scope.$apply(() => {
        scope.name = name;
        scope.price = price;
        scope.qty = qty;
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const ms = performance.now() - t0;
    scope.$$trace = null;
    const named = events.filter((e) => e.type === 'watch' && e.label);
    const byPass: Cell[][] = [];
    for (const e of named) {
      if (e.type !== 'watch') continue;
      (byPass[e.pass] ??= []).push({ label: e.label, value: String(e.value), changed: e.changed });
    }
    passes = byPass;
    result = {
      passes: events.filter((e) => e.type === 'pass').length,
      watchCalls: scope.$$stats.watchCalls - before.watchCalls,
      listenerCalls: scope.$$stats.listenerCalls - before.listenerCalls,
      ms,
      error,
    };
    void from;
  }

  // First digest on load, and a fresh scope when the watcher set changes.
  let ready = false;
  $effect(() => {
    idle;
    pingPong;
    untrack(() => {
      build();
      digest('init');
    });
    ready = true;
  });
  function changed() {
    if (ready) digest('change');
  }
  const rows = $derived([...new Set(passes.flat().map((c) => c.label))]);
</script>

<Widget {title} {n} {caption} kind="Model" subtitle="Change a value; read the passes. A dot marks a watcher whose value differed from last time.">
  {#snippet controls()}
    <label class="f ui"><span>name</span><input bind:value={name} oninput={changed} /></label>
    <label class="f ui"><span>price</span><input type="number" bind:value={price} oninput={changed} min="0" max="99" /></label>
    <label class="f ui"><span>qty</span><input type="number" bind:value={qty} oninput={changed} min="0" max="99" /></label>
    <Slider label="Idle watchers" bind:value={idle} min={0} max={4000} step={100} format={(v) => v.toFixed(0)} />
    <Toggle label="Two watchers that feed each other" bind:checked={pingPong} />
  {/snippet}
  <div class="grid">
    <div class="page ui">
      <h5>The page (written by listeners)</h5>
      <p><b>{ui.greeting}</b></p>
      <p>{ui.letters} letters · SHOUTED: {ui.shout}</p>
      <p>Total: <b>{ui.total}</b></p>
    </div>
    <div class="trace">
      <h5 class="ui">The last digest</h5>
      {#if result.error}<p class="err ui">✗ {result.error}</p>{/if}
      {#if rows.length}
        <table class="ui">
          <thead><tr><th>watcher</th>{#each passes as _, i (i)}<th>pass {i + 1}</th>{/each}</tr></thead>
          <tbody>
            {#each rows as r (r)}
              <tr>
                <th scope="row">{r}</th>
                {#each passes as col, i (i)}
                  {@const c = col.find((x) => x.label === r)}
                  <td class:changed={c?.changed}>{#if c}<span class="v">{c.value.length > 12 ? c.value.slice(0, 11) + '…' : c.value}</span>{#if c.changed}<i title="changed: its listener ran">●</i>{/if}{/if}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <p class="sum ui">
        <b>{result.passes}</b> pass{result.passes === 1 ? '' : 'es'} · <b>{result.watchCalls.toLocaleString()}</b> watcher calls · <b>{result.listenerCalls}</b> listener calls · <b>{result.ms.toFixed(1)} ms</b>
      </p>
    </div>
  </div>
</Widget>

<style>
  .f {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.74rem;
    color: var(--mute);
  }
  .f input {
    font: inherit;
    font-size: 0.86rem;
    padding: 0.25rem 0.45rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--bg);
    color: var(--fg);
    width: 7rem;
  }
  .trace {
    min-width: 0;
    overflow-x: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1.2rem;
  }
  h5 {
    margin: 0 0 0.5rem !important;
    padding: 0 !important;
    border: 0 !important;
    font-family: var(--font-mono) !important;
    font-size: 0.7rem !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--mute);
  }
  h5::before, h5::after { display: none !important; }
  .page p {
    margin: 0.2rem 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
  }
  th, td {
    text-align: left;
    padding: 0.25rem 0.45rem;
    border-top: 1px solid var(--line);
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-ui);
  }
  thead th {
    border-top: 0;
    font-size: 0.7rem;
    color: var(--mute);
  }
  td.changed {
    background: var(--flash-soft);
  }
  td i {
    color: var(--flash);
    font-style: normal;
    margin-left: 0.3rem;
  }
  .v {
    font-family: var(--font-mono);
    font-size: 0.74rem;
  }
  .sum {
    margin: 0.7rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .sum b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  .err {
    color: var(--red);
    font-weight: 600;
    font-size: 0.84rem;
  }
</style>
