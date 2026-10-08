<!--
  Trial deletion, step by step, on a small fixed graph: a live structure with a cycle, a garbage ring with a tail,
  and a cycle kept alive by a variable. Candidates (objects whose counts were decremented to a non-zero value) are
  purple. Each step runs one phase of the algorithm and shows the counts it changed. A toggle adds an outside
  pointer into the ring, so the reader can see the same algorithm decide the ring is alive.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import ObjectGraph, { type GNode, type GEdge, type GRoot } from '$lib/components/graph/ObjectGraph.svelte';

  type Colour = 'live' | 'purple' | 'grey' | 'black' | 'white' | 'freed';
  const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const POS: [number, number][] = [
    [0, 0], [1, 0], [2, 0], // A → B ⇄ C
    [0, 2], [1, 2], [2, 2], [3, 2], // D → E → F → D, F → G
    [0, 4], [1, 4], // H ⇄ I
  ];
  const EDGES: [number, number][] = [
    [0, 1], [1, 2], [2, 1],
    [3, 4], [4, 5], [5, 3], [5, 6],
    [7, 8], [8, 7],
  ];
  const CANDIDATES = [1, 3, 7];

  let outside = $state(false);
  let step = $state(0);

  interface State {
    count: number[];
    colour: Colour[];
    text: string;
    changed: Set<number>;
  }

  /** Every state of the algorithm, phase by phase. */
  const states = $derived.by(() => {
    const roots: [string, number][] = [['doc', 0], ['cache', 7], ...(outside ? ([['keep', 5]] as [string, number][]) : [])];
    const children = (o: number) => EDGES.filter(([a]) => a === o).map(([, b]) => b);
    const count = NAMES.map((_, i) => EDGES.filter(([, b]) => b === i).length + roots.filter(([, t]) => t === i).length);
    const colour: Colour[] = NAMES.map((_, i) => (CANDIDATES.includes(i) ? 'purple' : 'live'));
    const out: State[] = [];
    const snap = (text: string, changed: Set<number>) => out.push({ count: [...count], colour: [...colour], text, changed });
    snap(`Each count is the number of pointers to the object. B, D and H are candidates (purple): their counts were recently decremented but did not reach zero, so each might be part of a garbage cycle.${outside ? ' The variable keep now points to F.' : ''}`, new Set());
    for (const r of CANDIDATES) {
      const changed = new Set<number>();
      if (colour[r] === 'grey') continue;
      colour[r] = 'grey';
      const stack = [r];
      while (stack.length) {
        const x = stack.pop()!;
        for (const c of children(x)) {
          count[c]!--;
          changed.add(c);
          if (colour[c] !== 'grey') {
            colour[c] = 'grey';
            stack.push(c);
          }
        }
      }
      snap(`Mark grey from ${NAMES[r]}: visit everything ${NAMES[r]} reaches and subtract one from the count of each object for every pointer to it found along the way. What is left of a count is the number of pointers from outside this grey subgraph.`, changed);
    }
    {
      const changed = new Set<number>();
      const scanBlack = (o: number) => {
        colour[o] = 'black';
        const stack = [o];
        while (stack.length) {
          const x = stack.pop()!;
          for (const c of children(x)) {
            count[c]!++;
            changed.add(c);
            if (colour[c] !== 'black') {
              colour[c] = 'black';
              stack.push(c);
            }
          }
        }
      };
      for (const r of CANDIDATES) {
        const stack = [r];
        while (stack.length) {
          const x = stack.pop()!;
          if (colour[x] !== 'grey') continue;
          if (count[x]! > 0) scanBlack(x);
          else {
            colour[x] = 'white';
            for (const c of children(x)) stack.push(c);
          }
        }
      }
      snap('Scan: a grey object whose count is still above zero is pointed to from outside, so it is alive. It turns black, and so does everything it reaches, with their counts restored. Grey objects still at zero turn white.', changed);
    }
    const whites = NAMES.map((_, i) => i).filter((i) => colour[i] === 'white');
    for (const w of whites) colour[w] = 'freed';
    for (let i = 0; i < colour.length; i++) if (colour[i] === 'black') colour[i] = 'live';
    snap(whites.length ? `Collect: the white objects, ${whites.map((w) => NAMES[w]).join(', ')}, are reachable only from each other. They are freed. Everything else keeps its true count.` : 'Collect: nothing is white. Every candidate turned out to be reachable from outside, and every count is back to where it started.', new Set());
    return { list: out, roots };
  });

  $effect(() => {
    void outside;
    step = 0;
  });
  const cur = $derived(states.list[Math.min(step, states.list.length - 1)]!);
  const last = $derived(step >= states.list.length - 1);

  const nodes = $derived<GNode[]>(
    NAMES.map((name, i) => ({
      id: i,
      col: POS[i]![0],
      row: POS[i]![1],
      title: name,
      sub: cur.colour[i] === 'freed' ? 'freed' : cur.colour[i] === 'live' ? '' : cur.colour[i],
      badge: String(cur.count[i]),
      state: cur.colour[i] === 'live' ? 'live' : cur.colour[i],
      flash: cur.changed.has(i),
    })),
  );
  const edges = $derived<GEdge[]>(EDGES.map(([a, b]) => ({ from: a, to: b, dead: cur.colour[a] === 'freed' })));
  const rootRow = (t: number) => POS[t]![1] + (t === 5 ? 1 : 0);
  const roots = $derived<GRoot[]>(states.roots.map(([name, t]) => ({ name, row: rootRow(t), to: t })));
</script>

<Widget title="Trial deletion" kind="Step through" n="19.2" caption="The counts in the corners are reference counts. Purple: candidate; grey: being tested; black: alive after all; white: garbage. Toggle the outside pointer and run it again.">
  <div class="ctl ui">
    <button class="primary" onclick={() => (last ? (step = 0) : step++)}>{last ? '↺ Start again' : step === 0 ? 'Begin: mark grey from B' : '▶ Next step'}</button>
    <span class="steps">Step {step + 1} of {states.list.length}</span>
    <label class="tog"><input type="checkbox" bind:checked={outside} /> A variable <code>keep</code> points to F</label>
  </div>
  <p class="text">{cur.text}</p>
  <div class="g"><ObjectGraph {nodes} {edges} {roots} /></div>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    font-size: 0.82rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--copper);
    background: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
    border-radius: 99px;
    padding: 0.25rem 0.9rem;
    cursor: pointer;
  }
  .steps {
    color: var(--mute);
  }
  .tog {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    margin-left: auto;
  }
  .text {
    min-height: 3.6rem;
    font-size: 0.9rem;
    margin: 0.7rem 0;
  }
  .g {
    overflow-x: auto;
  }
</style>
