<!--
  The adversarial mutator: the reader plays both sides of an incremental collection. Click a grey object to let
  the collector scan it; between scans, rewire pointers as the program. The goal: make the collector finish with an
  object the program can still reach left white, so that the sweep would free it. With a write barrier on, the
  same moves stop working.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import ObjectGraph, { type GNode, type GEdge, type GRoot } from '$lib/components/graph/ObjectGraph.svelte';
  import { BARRIERS, finish, reachable, scan, start, write, writeRoot, type Model, type Ref } from '$lib/mm/explore/tricolour';

  const NAMES = ['A', 'B', 'C', 'D', 'E'];
  const POS: [number, number][] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [1, 2],
  ];
  const INITIAL: Model = {
    roots: [0, null],
    fields: [
      [1, null],
      [2, null],
      [3, null],
      [null, null],
      [null, null],
    ],
    colour: ['white', 'white', 'white', 'white', 'white'],
  };

  let barrier = $state('none');
  let model = $state<Model>(start(INITIAL));
  let log = $state<string[]>([]);
  let result = $state<{ lost: number[] } | null>(null);
  let holder = $state(0);
  let field = $state(1);
  let target = $state<string>('2');
  let rootTarget = $state<string>('2');
  let showHint = $state(false);

  const reach = $derived(reachable(model));
  const reachList = $derived([...reach].sort());
  const greys = $derived(model.colour.flatMap((c, i) => (c === 'grey' ? [i] : [])));
  const name = (r: Ref) => (r === null ? 'null' : NAMES[r]!);

  function reset() {
    model = start(INITIAL);
    log = [];
    result = null;
  }
  $effect(() => {
    void barrier;
    reset();
  });

  function maybeFinish(m: Model) {
    if (m.colour.includes('grey')) return;
    const r = finish(m);
    model = r.model;
    result = { lost: r.lost };
    log = [...log, r.lost.length ? `No grey objects are left. The collector rescans the roots and finishes. ${r.lost.map((o) => NAMES[o]).join(', ')} ${r.lost.length === 1 ? 'is' : 'are'} still white, though the program can reach ${r.lost.length === 1 ? 'it' : 'them'}: the sweep would free ${r.lost.length === 1 ? 'it' : 'them'}.` : 'No grey objects are left. The collector rescans the roots and finishes: every reachable object is black. Nothing was lost.'];
  }
  function clickNode(o: number) {
    if (result) return;
    if (model.colour[o] !== 'grey') {
      log = [...log, `${NAMES[o]} is ${model.colour[o]}: the collector only scans grey objects.`];
      return;
    }
    const m = scan(model, o);
    log = [...log, `Collector: scan ${NAMES[o]}.`];
    model = m;
    maybeFinish(m);
  }
  function doWrite() {
    if (result) return;
    const v: Ref = target === 'null' ? null : Number(target);
    const before = model.colour.join();
    const m = write(model, holder, field, v, BARRIERS[barrier]!.fn);
    const shaded = m.colour.join() !== before ? ` The barrier ${m.colour.some((c, i) => c === 'grey' && model.colour[i] === 'black') ? 're-greys' : 'shades'} ${m.colour.flatMap((c, i) => (c !== model.colour[i] ? [NAMES[i]] : [])).join(', ')}.` : '';
    log = [...log, `Program: ${NAMES[holder]}.f${field} = ${name(v)}.${shaded}`];
    model = m;
    maybeFinish(m);
  }
  function doRoot() {
    if (result) return;
    const v: Ref = rootTarget === 'null' ? null : Number(rootTarget);
    log = [...log, `Program: r2 = ${name(v)} (a local variable: no barrier, but the collector rescans the roots at the end).`];
    model = writeRoot(model, 1, v);
  }

  const nodes = $derived<GNode[]>(
    NAMES.map((n, i) => ({
      id: i,
      col: POS[i]![0],
      row: POS[i]![1],
      title: n,
      sub: result?.lost.includes(i) ? 'lost!' : model.colour[i]!,
      state: result?.lost.includes(i) ? 'white' : model.colour[i] === 'white' ? 'live' : model.colour[i] === 'grey' ? 'grey' : 'black',
    })),
  );
  const edges = $derived<GEdge[]>(model.fields.flatMap((fs, o) => fs.flatMap((t) => (t === null ? [] : [{ from: o, to: t }]))));
  const roots = $derived<GRoot[]>([
    { name: 'r1', row: 0, to: model.roots[0] ?? undefined },
    { name: 'r2', row: 1, to: model.roots[1] ?? undefined },
  ]);
</script>

<Widget title="The adversarial mutator" kind="Play" n="25.1" caption="Click a grey object to let the collector scan it. Between scans, change pointers as the program would. Goal: finish the collection with an object that is reachable but still white.">
  <div class="top ui">
    <label>Write barrier
      <select bind:value={barrier}>
        {#each Object.entries(BARRIERS) as [id, b] (id)}<option value={id}>{b.label}</option>{/each}
      </select>
    </label>
    <button onclick={reset}>Start again</button>
    <button onclick={() => (showHint = !showHint)}>{showHint ? 'Hide' : 'Show'} a hint</button>
  </div>
  {#if showHint}<p class="hint ui">Scan A first, so that it is black and B is grey. Then give A a second pointer to C (A.f1 = C), and cut the only grey path to C (B.f0 = null). Then let the collector finish.</p>{/if}
  <div class="g"><ObjectGraph {nodes} {edges} {roots} onclick={clickNode} selectable={!result} /></div>
  <div class="moves ui">
    <span class="lbl">Program:</span>
    <select bind:value={holder} aria-label="Object to write to">{#each reachList as o (o)}<option value={o}>{NAMES[o]}</option>{/each}</select>
    .
    <select bind:value={field} aria-label="Field">{#each [0, 1] as f (f)}<option value={f}>f{f}</option>{/each}</select>
    =
    <select bind:value={target} aria-label="New value"><option value="null">null</option>{#each reachList as o (o)}<option value={String(o)}>{NAMES[o]}</option>{/each}</select>
    <button onclick={doWrite} disabled={!!result}>Write</button>
    <span class="sep"></span>
    r2 =
    <select bind:value={rootTarget} aria-label="New value of r2"><option value="null">null</option>{#each reachList as o (o)}<option value={String(o)}>{NAMES[o]}</option>{/each}</select>
    <button onclick={doRoot} disabled={!!result}>Write</button>
  </div>
  <p class="greys ui">Grey: {greys.length ? greys.map((g) => NAMES[g]).join(', ') : 'none'}</p>
  <ol class="log ui" aria-live="polite">
    {#each log as l, i (i)}<li class:bad={i === log.length - 1 && !!result?.lost.length} class:good={i === log.length - 1 && result && !result.lost.length}>{l}</li>{:else}<li class="mute">The collection has started: the root’s object, A, is grey.</li>{/each}
  </ol>
  {#if result?.lost.length}<p class="win ui">You hid {result.lost.map((o) => NAMES[o]).join(', ')} from the collector. Now try the same moves with a barrier.</p>{/if}
</Widget>

<style>
  .top,
  .moves {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.82rem;
  }
  select {
    font: inherit;
    padding: 0.1rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .hint {
    font-size: 0.84rem;
    padding: 0.4rem 0.6rem;
    background: var(--panel);
    border-left: 3px solid var(--copper);
  }
  .g {
    margin: 0.6rem 0;
    overflow-x: auto;
  }
  .lbl {
    font-weight: 700;
  }
  .sep {
    width: 1rem;
  }
  .greys {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.5rem 0 0.2rem;
  }
  .log {
    font-size: 0.82rem;
    margin: 0.3rem 0 0;
    padding-left: 1.3rem;
    max-height: 12rem;
    overflow: auto;
  }
  .log li.bad {
    color: var(--uaf);
    font-weight: 600;
  }
  .log li.good {
    color: var(--green);
    font-weight: 600;
  }
  .log li.mute {
    color: var(--mute);
    list-style: none;
  }
  .win {
    font-weight: 700;
    color: var(--copper);
  }
</style>
