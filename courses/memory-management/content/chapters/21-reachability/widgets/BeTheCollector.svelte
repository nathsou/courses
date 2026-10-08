<!--
  Be the collector: a small heap with three variables. Mark phase: click every object the program can still
  reach; an object can only be marked if a variable or an already marked object points to it. Then sweep: every
  unmarked object is freed. Then watch the collector do the same, in three colours: white (not yet seen), grey
  (found, its pointers not yet followed), black (done).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import ObjectGraph, { type GNode, type GEdge, type GRoot } from '$lib/components/graph/ObjectGraph.svelte';

  const OBJ: { name: string; col: number; row: number }[] = [
    { name: 'Doc', col: 0, row: 0 },
    { name: 'Page', col: 1, row: 0 },
    { name: 'Page', col: 1, row: 1 },
    { name: 'Para', col: 2, row: 0 },
    { name: 'Para', col: 2, row: 1 },
    { name: 'Para', col: 2, row: 2 },
    { name: 'Image', col: 3, row: 3 },
    { name: 'Cache', col: 0, row: 3 },
    { name: 'Font', col: 3, row: 0 },
    { name: 'Page', col: 0, row: 4 },
    { name: 'Para', col: 1, row: 4 },
    { name: 'Image', col: 2, row: 4 },
    { name: 'Undo', col: 0, row: 5 },
    { name: 'Undo', col: 1, row: 5 },
  ];
  const EDGES: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [5, 6], [3, 8], [7, 6],
    [9, 10], [10, 11], [11, 6], [12, 13], [13, 12],
  ];
  const ROOTS: GRoot[] = [
    { name: 'doc', row: 0, to: 0 },
    { name: 'cache', row: 3, to: 7 },
    { name: 'temp', row: 4 },
  ];
  const children = (o: number) => EDGES.filter(([a]) => a === o).map(([, b]) => b);
  const REACHABLE = (() => {
    const seen = new Set<number>();
    const work = ROOTS.flatMap((r) => (r.to === undefined ? [] : [r.to]));
    while (work.length) {
      const o = work.pop()!;
      if (seen.has(o)) continue;
      seen.add(o);
      work.push(...children(o));
    }
    return seen;
  })();

  type Phase = 'mark' | 'swept' | 'replay';
  let phase = $state<Phase>('mark');
  let marked = $state(new Set<number>());
  let message = $state('Click the objects the program can still reach. Start from the variables on the left.');
  let shake = $state<number | null>(null);

  const frontier = $derived(new Set([...ROOTS.flatMap((r) => (r.to === undefined ? [] : [r.to])), ...[...marked].flatMap(children)]));
  const done = $derived([...REACHABLE].every((o) => marked.has(o)));

  function click(id: number) {
    if (phase !== 'mark') return;
    if (marked.has(id)) return;
    if (!frontier.has(id)) {
      shake = id;
      setTimeout(() => (shake = null), 500);
      message = `Not yet: no variable and no marked object points to that ${OBJ[id]!.name}. The collector can only find objects by following pointers.`;
      return;
    }
    marked = new Set([...marked, id]);
    const left = [...REACHABLE].filter((o) => !marked.has(o) && o !== id).length;
    message = left ? `Marked. ${left} more reachable object${left === 1 ? '' : 's'} to find.` : 'That is everything reachable. Now sweep.';
  }

  function sweep() {
    phase = 'swept';
    const freed = OBJ.length - marked.size;
    message = `Swept: the ${freed} unmarked objects are freed, including the two Undo objects that point to each other. A cycle is no obstacle to tracing: nobody reached it, so it goes.`;
  }

  // The collector's turn: tricolour marking with an explicit work list (the grey objects).
  let replayStep = $state(0);
  const replay = $derived.by(() => {
    const colour = new Map<number, 'white' | 'grey' | 'black'>(OBJ.map((_, i) => [i, 'white']));
    const steps: { colour: Map<number, 'white' | 'grey' | 'black'>; grey: number[]; text: string }[] = [];
    const grey: number[] = [];
    for (const r of ROOTS) if (r.to !== undefined && colour.get(r.to) === 'white') (colour.set(r.to, 'grey'), grey.push(r.to));
    steps.push({ colour: new Map(colour), grey: [...grey], text: 'Start: everything is white. The objects the variables point to turn grey: found, but not yet scanned.' });
    while (grey.length) {
      const o = grey.pop()!;
      const found: string[] = [];
      for (const c of children(o)) {
        if (colour.get(c) === 'white') {
          colour.set(c, 'grey');
          grey.push(c);
          found.push(OBJ[c]!.name);
        }
      }
      colour.set(o, 'black');
      steps.push({ colour: new Map(colour), grey: [...grey], text: `Take a grey object, ${OBJ[o]!.name} #${o}, off the work list and scan it${found.length ? `: ${found.join(', ')} turn${found.length === 1 ? 's' : ''} grey` : ': nothing new'}. It is now black.` });
    }
    steps.push({ colour: new Map(colour), grey: [], text: 'The work list is empty: no grey objects remain. Every black object is reachable; every white one is garbage, and the sweep frees it.' });
    return steps;
  });
  let timer: ReturnType<typeof setInterval> | undefined;
  function watch() {
    phase = 'replay';
    replayStep = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      if (replayStep >= replay.length - 1) clearInterval(timer);
      else replayStep++;
    }, 900);
  }
  $effect(() => () => clearInterval(timer));
  function reset() {
    clearInterval(timer);
    phase = 'mark';
    marked = new Set();
    message = 'Click the objects the program can still reach. Start from the variables on the left.';
  }

  const nodes = $derived<GNode[]>(
    OBJ.map((o, i) => {
      let state: GNode['state'] = 'live';
      let sub = '';
      if (phase === 'mark') {
        state = marked.has(i) ? 'marked' : shake === i ? 'garbage' : 'live';
        sub = marked.has(i) ? 'marked' : '';
      } else if (phase === 'swept') {
        state = marked.has(i) ? 'live' : 'freed';
        sub = marked.has(i) ? '' : 'freed';
      } else {
        const c = replay[replayStep]!.colour.get(i)!;
        state = c === 'black' ? 'black' : c === 'grey' ? 'grey' : 'live';
        sub = c;
      }
      return { id: i, col: o.col, row: o.row, title: `${o.name} #${i}`, sub, state, flash: shake === i };
    }),
  );
  const edges = $derived<GEdge[]>(EDGES.map(([a, b]) => ({ from: a, to: b, dead: phase === 'swept' && !marked.has(a) })));
  const text = $derived(phase === 'replay' ? replay[replayStep]!.text : message);
</script>

<Widget title="Be the collector" kind="Play" n="21.1" caption="Variables are on the left; arrows are pointers. In the replay, grey objects are the collector’s work list: found, but their own pointers not yet followed.">
  <div class="top ui">
    <span class="score">{phase === 'mark' ? `${marked.size} marked` : phase === 'swept' ? `${OBJ.length - marked.size} freed` : `step ${replayStep + 1} of ${replay.length}`}</span>
    {#if phase === 'mark'}
      <button class="primary" onclick={sweep} disabled={!done}>Sweep</button>
    {:else if phase === 'swept'}
      <button class="primary" onclick={watch}>Watch the collector do it</button>
    {:else}
      <button onclick={() => (replayStep = Math.max(0, replayStep - 1))}>◀</button>
      <button onclick={() => (replayStep = Math.min(replay.length - 1, replayStep + 1))}>▶</button>
    {/if}
    <button onclick={reset}>Start again</button>
  </div>
  <p class="msg ui" aria-live="polite">{text}</p>
  {#if phase === 'replay'}
    <p class="grey ui">Work list: {replay[replayStep]!.grey.length ? replay[replayStep]!.grey.map((g) => `${OBJ[g]!.name} #${g}`).join(', ') : 'empty'}</p>
  {/if}
  <div class="g"><ObjectGraph {nodes} {edges} roots={ROOTS} onclick={click} selectable={phase === 'mark'} /></div>
</Widget>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .score {
    font-weight: 700;
    margin-right: auto;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.2rem 0.8rem;
    cursor: pointer;
  }
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .msg {
    min-height: 2.6rem;
    font-size: 0.9rem;
    margin: 0.6rem 0;
  }
  .grey {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: -0.3rem 0 0.5rem;
    font-family: var(--font-mono);
  }
  .g {
    overflow-x: auto;
  }
</style>
