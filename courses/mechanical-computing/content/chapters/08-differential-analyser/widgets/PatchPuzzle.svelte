<!--
  Wire up a differential analyser: choose what steers each integrator's wheel. The machine is run with your
  wiring and compared with the target, y = cos t. An exercise: the wiring is checked by running it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import ExerciseFrame from '$lib/components/exercise/ExerciseFrame.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { solve } from '$lib/mech/da';

  let { id, title = 'Wire it yourself', prompt, hints = [], solution }: { id: string; title?: string; prompt?: string; hints?: string[]; solution?: string } = $props();
  const OPTIONS = [
    { v: 't', label: 't (the motor shaft)' },
    { v: 'A', label: 'A’s output' },
    { v: 'B', label: 'B’s output' },
    { v: '-A', label: 'A’s output, through a reversing gear' },
    { v: '-B', label: 'B’s output, through a reversing gear' },
    { v: '1', label: 'a fixed setting of 1' },
  ];
  let a = $state('B');
  let b = $state('t');
  let solved = $state(false);
  onMount(() => {
    solved = progress.isSolved(id);
    const d = progress.draft<{ a: string; b: string } | null>(id, null);
    if (d) ({ a, b } = d);
  });
  const src = (k: string, t: number, s: number[]) => (k === 't' ? t : k === 'A' ? s[0]! : k === 'B' ? s[1]! : k === '-A' ? -s[0]! : k === '-B' ? -s[1]! : 1);
  // A starts at 0, B at 1: the initial values of y′ and y.
  const run = $derived(solve({ init: [0, 1], integrand: (t, s) => [src(a, t, s), src(b, t, s)] }, 2 * Math.PI, 0.005, 0, 4));
  const err = $derived(Math.max(...run.map(([t, , y]) => Math.abs(y! - Math.cos(t!)))));
  const ok = $derived(err < 1e-3);
  $effect(() => {
    progress.saveDraft(id, { a, b });
    if (ok && !solved) {
      progress.markSolved(id);
      solved = true;
    }
  });
  const W = 300, H = 120;
  const path = (f: (t: number) => number) => Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * 2 * Math.PI; return `${i ? 'L' : 'M'}${(10 + (t / (2 * Math.PI)) * (W - 20)).toFixed(1)},${(H / 2 - Math.max(-1.6, Math.min(1.6, f(t))) * 34).toFixed(1)}`; }).join(' ');
  const yours = $derived(path((t) => { let best = run[0]!; for (const r of run) if (Math.abs(r[0]! - t) < Math.abs(best[0]! - t)) best = r; return best[2]!; }));
</script>

<ExerciseFrame {id} kind="Design" {title} {prompt} {hints} {solution} completionLabel="Wiring checked">
  <div class="ui wiring">
    <label>Integrator A’s wheel (its output starts at 0) is steered by <select bind:value={a}>{#each OPTIONS as o (o.v)}<option value={o.v}>{o.label}</option>{/each}</select></label>
    <label>Integrator B’s wheel (its output starts at 1; it is y) is steered by <select bind:value={b}>{#each OPTIONS as o (o.v)}<option value={o.v}>{o.label}</option>{/each}</select></label>
  </div>
  <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="Your machine's output against the target cosine">
    <line x1="10" y1={H / 2} x2={W - 10} y2={H / 2} class="axis" />
    <path d={path(Math.cos)} class="target" />
    <path d={yours} class="yours" />
  </svg>
  <p class="ui" aria-live="polite">{#if solved && ok}<span class="ok">Wiring checked: B’s output follows cos t over a whole cycle.</span>{:else}<span class="dim">Dashed: the target, cos t. Solid: what your wiring draws (largest difference {err.toFixed(2)}).</span>{/if}</p>
</ExerciseFrame>

<style>
  .wiring {
    display: grid;
    gap: 0.5rem;
    font-size: 0.86rem;
  }
  select {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--page);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.4rem;
    color: var(--ink);
    margin-left: 0.3rem;
  }
  .plot {
    width: 100%;
    max-width: 26rem;
    margin-top: 0.6rem;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .axis {
    stroke: var(--line-strong);
  }
  .target {
    fill: none;
    stroke: var(--ink-3);
    stroke-dasharray: 4 3;
  }
  .yours {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .dim {
    color: var(--ink-3);
    font-size: 0.84rem;
  }
</style>
