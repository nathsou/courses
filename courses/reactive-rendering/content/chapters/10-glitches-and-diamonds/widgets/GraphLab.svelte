<!--
  One small dependency graph, run on each of three propagation strategies. Press a write button; scrub through the
  trace of what the engine did. The effect's log of what it saw is the evidence: if it ever saw a value that no
  consistent state could produce, that was a glitch.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { createEngine, type Engine, type Signal, type Strategy, type TraceEvent, type GraphNode } from '$lib/rx/signals';

  let { n, title = 'The graph lab', caption, strategy: initial = 'eager', graph: initialGraph = 'diamond' }: { n?: string | number; title?: string; caption?: string; strategy?: string; graph?: string } = $props();

  interface Spec {
    label: string;
    blurb: string;
    h: number;
    nodes: Record<string, { x: number; y: number }>;
    edges: [string, string][];
    actions: { label: string; run: (s: Record<string, Signal<number>>) => void }[];
    /** Is a logged effect value consistent with this input state? */
    consistent: (v: number, s: Record<string, number>) => boolean;
    build: (e: Engine) => { signals: Record<string, Signal<number>>; log: (string | number)[]; unread?: string };
    invariant: string;
  }

  const SPECS: Record<string, Spec> = {
    diamond: {
      label: 'Diamond',
      h: 320,
      blurb: 'a feeds b = 2a and c = 3a; d = b + c; the effect logs d. Whatever a is, d must be 5a. x = 100a is read by nobody.',
      nodes: { a: { x: 60, y: 120 }, b: { x: 190, y: 50 }, c: { x: 190, y: 190 }, d: { x: 320, y: 120 }, e: { x: 440, y: 120 }, x: { x: 190, y: 270 } },
      edges: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e'], ['a', 'x']],
      actions: [{ label: 'a = a + 1', run: (s) => s.a!.update((v) => v + 1) }],
      consistent: (v, s) => v === 5 * s.a!,
      invariant: 'd = 5 × a',
      build(e) {
        const a = e.signal(1, { label: 'a' });
        const b = e.computed(() => a.get() * 2, { label: 'b' });
        const c = e.computed(() => a.get() * 3, { label: 'c' });
        const d = e.computed(() => b.get() + c.get(), { label: 'd' });
        e.computed(() => a.get() * 100, { label: 'x' });
        const log: (string | number)[] = [];
        e.effect(() => void log.push(d.get()), { label: 'e' });
        return { signals: { a }, log };
      },
    },
    parity: {
      label: 'Cut-off',
      h: 200,
      blurb: 'n feeds even = (n is even); the effect logs “even” or “odd”. Adding 2 changes n but not even.',
      nodes: { n: { x: 80, y: 100 }, p: { x: 250, y: 100 }, e: { x: 420, y: 100 } },
      edges: [['n', 'p'], ['p', 'e']],
      actions: [
        { label: 'n = n + 2', run: (s) => s.n!.update((v) => v + 2) },
        { label: 'n = n + 1', run: (s) => s.n!.update((v) => v + 1) },
      ],
      consistent: () => true,
      invariant: '',
      build(e) {
        const nn = e.signal(2, { label: 'n' });
        const p = e.computed(() => (nn.get() % 2 === 0 ? 'even' : 'odd'), { label: 'p' });
        const log: (string | number)[] = [];
        e.effect(() => void log.push(p.get()), { label: 'e' });
        return { signals: { n: nn }, log };
      },
    },
  };

  let strategy = $state<Strategy>(initial === 'topological' || initial === 'colour' ? initial : 'eager');
  let which = $state(initialGraph === 'parity' ? 'parity' : 'diamond');
  const spec = $derived(SPECS[which]!);

  let engine = $state.raw<Engine | null>(null);
  let signals = $state.raw<Record<string, Signal<number>>>({});
  let log = $state<(string | number)[]>([]);
  let snapshots = $state<{ at: number; inputs: Record<string, number> }[]>([]);
  let events = $state.raw<TraceEvent[]>([]);
  let nodes = $state.raw<GraphNode[]>([]);
  let step = $state(0);
  let ranBefore = $state<Record<string, number>>({});
  let wrote = $state(false);

  function reset() {
    const e = createEngine(strategy);
    e.tracing = true;
    const built = spec.build(e);
    engine = e;
    signals = built.signals;
    log = built.log;
    bound = built.log;
    e.trace.length = 0;
    events = [];
    nodes = e.graph();
    ranBefore = Object.fromEntries(nodes.map((g) => [g.label, g.runs]));
    step = 0;
    snapshots = [];
    wrote = false;
  }
  // `log` is mutated by the effect; keep a reference we can re-read after a write.
  let bound: (string | number)[] = [];

  $effect(() => {
    strategy;
    which;
    untrack(reset);
  });

  function write(i: number) {
    if (!engine) return;
    engine.trace.length = 0;
    ranBefore = Object.fromEntries(engine.graph().map((g) => [g.label, g.runs]));
    const before = bound.length;
    spec.actions[i]!.run(signals);
    events = [...engine.trace];
    nodes = engine.graph();
    log = [...bound];
    inputs = Object.fromEntries(Object.entries(signals).map(([k, s]) => [k, s.peek()]));
    snapshots = [...snapshots, { at: before, inputs }];
    step = events.length;
    wrote = true;
  }
  let inputs = $state<Record<string, number>>({});

  const label = (id: number) => nodes.find((g) => g.id === id)?.label ?? '?';
  /** What each node was doing as of `step`. */
  const status = $derived.by(() => {
    const out: Record<string, string> = {};
    for (const ev of events.slice(0, step)) {
      const l = label(ev.node);
      if (ev.type === 'run') out[l] = 'ran';
      else if (ev.type === 'set') out[l] = 'set';
      else if (ev.type === 'cutoff') out[l] = 'cutoff';
      else if (ev.type === 'skip') out[l] = 'skip';
      else if (ev.type === 'mark' && out[l] !== 'ran') out[l] = ev.detail === 'dirty' ? 'dirty' : 'check';
      else if (ev.type === 'queue' && !out[l]) out[l] = 'queued';
    }
    return out;
  });
  const current = $derived(step > 0 ? events[step - 1] : null);
  const describeEv = (ev: TraceEvent) => {
    const l = label(ev.node);
    return ev.type === 'set' ? `write ${l}` : ev.type === 'mark' ? `mark ${l} ${ev.detail}` : ev.type === 'run' ? `run ${l}` : ev.type === 'skip' ? `${l} checked, unchanged` : ev.type === 'cutoff' ? `${l} unchanged: stop here` : `queue ${l}`;
  };
  const runs = (l: string) => (nodes.find((g) => g.label === l)?.runs ?? 0) - (ranBefore[l] ?? 0);
  const valueOf = (l: string) => nodes.find((g) => g.label === l)?.value;
  /** The consistency check, per logged value. */
  const verdicts = $derived.by(() => {
    if (!spec.invariant) return [] as boolean[];
    // The initial value is always consistent; each write contributes the logged values after it.
    const result: boolean[] = [];
    for (let i = 0; i < log.length; i++) {
      const owner = [...snapshots].reverse().find((s) => s.at <= i);
      result.push(owner ? spec.consistent(Number(log[i]), owner.inputs) : spec.consistent(Number(log[i]), { a: 1 }));
    }
    return result;
  });
  const glitches = $derived(verdicts.filter((v) => !v).length);
  const totalRuns = $derived(nodes.filter((g) => g.kind !== 'signal').reduce((s, g) => s + runs(g.label), 0));
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle={spec.blurb}>
  {#snippet controls()}
    <Segmented label="Propagation strategy" bind:value={strategy} options={[{ value: 'eager', label: 'Eager push' }, { value: 'topological', label: 'Topological' }, { value: 'colour', label: 'Three colours' }]} />
    <Segmented label="Graph" bind:value={which} options={Object.entries(SPECS).map(([value, s]) => ({ value, label: s.label }))} />
  {/snippet}

  <div class="actions ui">
    {#each spec.actions as a, i (a.label)}<Button variant="primary" onclick={() => write(i)}>{a.label}</Button>{/each}
    <Button variant="ghost" onclick={reset}>Reset</Button>
  </div>

  <svg class="graph" viewBox="0 0 500 {spec.h}" role="img" aria-label="Dependency graph. {nodes.map((g) => `${g.label}${status[g.label] ? ' ' + status[g.label] : ''}`).join(', ')}">
    <defs>
      <marker id="arrow-{which}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="head" /></marker>
    </defs>
    {#each spec.edges as [from, to] (from + to)}
      {@const f = spec.nodes[from]!}
      {@const t = spec.nodes[to]!}
      {@const dx = t.x - f.x}
      {@const dy = t.y - f.y}
      {@const len = Math.hypot(dx, dy)}
      <line class="edge" x1={f.x + (dx / len) * 26} y1={f.y + (dy / len) * 26} x2={t.x - (dx / len) * 30} y2={t.y - (dy / len) * 30} marker-end="url(#arrow-{which})" />
    {/each}
    {#each Object.entries(spec.nodes) as [l, p] (l)}
      {@const g = nodes.find((x) => x.label === l)}
      <g class="node {g?.kind ?? ''} {status[l] ?? ''}" class:now={current && label(current.node) === l} transform="translate({p.x} {p.y})">
        {#if g?.kind === 'effect'}
          <rect x="-26" y="-22" width="52" height="44" rx="8" />
        {:else}
          <circle r="26" />
        {/if}
        <text class="name" y="-2">{l}</text>
        <text class="val" y="14">{g?.kind === 'effect' ? '' : (g?.value ?? '')}</text>
        {#if g && g.kind !== 'signal' && wrote}<text class="runs" x="22" y="-24">×{runs(l)}</text>{/if}
      </g>
    {/each}
  </svg>

  <div class="scrub ui">
    <label for="step-{which}">Replay</label>
    <input id="step-{which}" type="range" min="0" max={events.length} bind:value={step} disabled={!events.length} />
    <span class="now" aria-live="polite">{#if !events.length}Press the button.{:else if current}step {step} of {events.length}: <b>{describeEv(current)}</b>{:else}before the write{/if}</span>
  </div>

  <div class="results ui">
    <div class="card">
      <div class="h">The effect has seen</div>
      <div class="seen">
        {#each log as v, i (i)}<span class="chip" class:bad={verdicts[i] === false}>{v}</span>{/each}
      </div>
      {#if spec.invariant && wrote}
        <p class="note">{#if glitches}<b class="badtext">{glitches} glitch{glitches === 1 ? '' : 'es'}</b>: values that broke “{spec.invariant}”.{:else}Every value satisfied “{spec.invariant}”.{/if}</p>
      {/if}
    </div>
    <div class="card">
      <div class="h">Recomputations in the last write</div>
      {#if wrote}
        <div class="seen">
          {#each nodes.filter((g) => g.kind !== 'signal') as g (g.id)}<span class="chip" class:zero={runs(g.label) === 0}>{g.label} ×{runs(g.label)}</span>{/each}
        </div>
        <p class="note">{totalRuns} recomputation{totalRuns === 1 ? '' : 's'} in total{#if valueOf('x') !== undefined && runs('x') > 0}; <b>x</b> ran though nobody reads it{/if}.</p>
      {:else}<p class="note">—</p>{/if}
    </div>
  </div>

  <details class="trace ui">
    <summary>Every step, as text</summary>
    <ol>
      {#each events as ev, i (i)}<li class:now={i === step - 1}>{describeEv(ev)}</li>{/each}
    </ol>
  </details>
</Widget>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .graph {
    display: block;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }
  .edge {
    stroke: var(--node-line);
    stroke-width: 1.6;
  }
  .head {
    fill: var(--node-line);
  }
  .node circle,
  .node rect {
    fill: var(--panel);
    stroke: var(--node-line);
    stroke-width: 2;
    transition: fill 150ms, stroke 150ms;
  }
  .node.signal circle {
    stroke: var(--signal);
  }
  .node.computed circle {
    stroke: var(--computed);
  }
  .node.effect rect {
    stroke: var(--effect);
  }
  .node.set circle,
  .node.ran circle,
  .node.ran rect {
    fill: var(--flash-soft);
  }
  .node.now circle,
  .node.now rect {
    stroke: var(--flash);
    stroke-width: 4;
  }
  .node.dirty circle,
  .node.dirty rect {
    stroke-dasharray: none;
    fill: var(--effect-soft);
  }
  .node.check circle,
  .node.check rect {
    stroke-dasharray: 4 3;
    fill: var(--computed-soft);
  }
  .node.skip circle,
  .node.cutoff circle {
    fill: var(--signal-soft);
  }
  .node text {
    text-anchor: middle;
    fill: var(--fg);
  }
  .name {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 15px;
  }
  .val {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--ink-2);
  }
  .runs {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--flash-ink, var(--flash));
    text-anchor: start;
  }
  .scrub {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin: 0.5rem 0;
    font-size: 0.85rem;
  }
  .scrub input {
    flex: 1 1 8rem;
    min-width: 6rem;
  }
  .now {
    flex-basis: 100%;
    color: var(--ink-2);
    min-height: 1.3em;
  }
  .results {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.75rem;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    background: var(--panel);
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.35rem;
  }
  .seen {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: var(--bg);
  }
  .chip.bad {
    border-color: var(--red);
    background: var(--red-soft, transparent);
    color: var(--red);
    font-weight: 700;
  }
  .chip.zero {
    color: var(--mute);
    border-style: dashed;
  }
  .note {
    margin: 0.45rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .badtext {
    color: var(--red);
  }
  .trace {
    margin-top: 0.6rem;
    font-size: 0.8rem;
  }
  .trace ol {
    margin: 0.3rem 0 0;
    padding-left: 1.4rem;
    columns: 2 14rem;
  }
  .trace li.now {
    font-weight: 700;
    color: var(--flash);
  }
</style>
