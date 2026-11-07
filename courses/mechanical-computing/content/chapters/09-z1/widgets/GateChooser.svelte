<!--
  Make a function from three gates in a fixed arrangement, out = G3(G1(A, B), G2(A, B)): choose each gate and
  compare the truth table with the target. An exercise: the table is checked.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import ExerciseFrame from '$lib/components/exercise/ExerciseFrame.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { gate, type Gate } from '$lib/mech/z1';

  let { id, title, prompt, target = [false, true, true, false], allow = ['AND', 'OR', 'NAND', 'NOR'], hints = [], solution }: { id: string; title?: string; prompt?: string; target?: boolean[]; allow?: Gate[]; hints?: string[]; solution?: string } = $props();
  let g: Gate[] = $state(['AND', 'AND', 'AND']);
  let solved = $state(false);
  onMount(() => {
    solved = progress.isSolved(id);
    const d = progress.draft<Gate[] | null>(id, null);
    if (d) g = d;
  });
  const rows = [[false, false], [false, true], [true, false], [true, true]] as const;
  const out = $derived(rows.map(([a, b]) => gate(g[2]!, gate(g[0]!, a, b), gate(g[1]!, a, b))));
  const ok = $derived(out.every((v, i) => v === target[i]));
  $effect(() => {
    progress.saveDraft(id, $state.snapshot(g));
    if (ok && !solved) {
      progress.markSolved(id);
      solved = true;
    }
  });
</script>

<ExerciseFrame {id} kind="Design" {title} {prompt} {hints} {solution} completionLabel="Truth table checked">
  <div class="ui circuit">
    <span>out =</span>
    <select bind:value={g[2]} aria-label="Gate 3">{#each allow as a (a)}<option>{a}</option>{/each}</select>
    <span>(</span>
    <select bind:value={g[0]} aria-label="Gate 1">{#each allow as a (a)}<option>{a}</option>{/each}</select><span>(A, B),</span>
    <select bind:value={g[1]} aria-label="Gate 2">{#each allow as a (a)}<option>{a}</option>{/each}</select><span>(A, B) )</span>
  </div>
  <table class="ui tt">
    <thead><tr><th>A</th><th>B</th><th>yours</th><th>target</th></tr></thead>
    <tbody>
      {#each rows as [a, b], i (i)}<tr class:bad={out[i] !== target[i]}><td>{+a}</td><td>{+b}</td><td>{+out[i]!}</td><td>{+target[i]!}</td></tr>{/each}
    </tbody>
  </table>
  <p class="ui" aria-live="polite">{#if solved && ok}<span class="ok">Truth table checked: all four rows match.</span>{/if}</p>
</ExerciseFrame>

<style>
  .circuit {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }
  select {
    font: inherit;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
    padding: 0.2rem 0.3rem;
  }
  .tt {
    border-collapse: collapse;
    margin-top: 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.86rem;
  }
  .tt th,
  .tt td {
    padding: 0.15rem 0.8rem;
    border-bottom: 1px solid var(--line);
    text-align: center;
  }
  .tt tr.bad td:nth-child(3) {
    color: var(--bad);
    font-weight: 700;
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
</style>
