<!--
  A printed table with one wrong value. Differences make the error stand out: an error e in one entry puts
  e, −2e, e into the second differences. Tap the wrong entry. (An exercise: the choice is checked.)
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import ExerciseFrame from '$lib/components/exercise/ExerciseFrame.svelte';
  import { progress } from '$lib/state/progress.svelte';

  let { id, title = 'Find the misprint', prompt, values, wrong }: { id: string; title?: string; prompt?: string; values: number[]; wrong: number } = $props();
  let showD = $state(0);
  let picked: number | null = $state(null);
  let solved = $state(false);
  onMount(() => (solved = progress.isSolved(id)));
  const diffs = $derived.by(() => {
    const rows = [values];
    for (let k = 1; k <= 3; k++) rows.push(rows[k - 1]!.slice(1).map((v, i) => v - rows[k - 1]![i]!));
    return rows;
  });
  function pick(i: number) {
    picked = i;
    if (i === wrong) {
      progress.markSolved(id);
      solved = true;
    }
  }
</script>

<ExerciseFrame {id} kind="Be the table checker" {title} {prompt} completionLabel="Answer checked">
  <div class="ui ctl">
    <span>Show differences:</span>
    {#each [0, 1, 2, 3] as k (k)}<button class:on={showD === k} onclick={() => (showD = k)}>{k === 0 ? 'none' : `Δ${k === 1 ? '' : k === 2 ? '²' : '³'}`}</button>{/each}
  </div>
  <div class="scroll">
    <table class="ui">
      <tbody>
        <tr><th>x</th>{#each values as _, i (i)}<td class="x">{i}</td>{/each}</tr>
        <tr>
          <th>table</th>
          {#each values as v, i (i)}<td><button class="val" class:picked={picked === i} class:right={solved && i === wrong} onclick={() => pick(i)} aria-label="Entry for x = {i}: {v}">{v}</button></td>{/each}
        </tr>
        {#each diffs.slice(1, showD + 1) as row, k (k)}
          <tr class="d"><th>Δ{k === 0 ? '' : k === 1 ? '²' : '³'}</th>{#each row as v, i (i)}<td class="half" style:transform="translateX({(k + 1) * 50}%)">{v}</td>{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="ui" aria-live="polite">
    {#if solved}<span class="ok">Answer checked: the entry for x = {wrong} is the misprint.</span>
    {:else if picked !== null}<span class="bad">The entry for x = {picked} is right. Look at where the differences stop being regular.</span>{/if}
  </p>
</ExerciseFrame>

<style>
  .ctl {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    flex-wrap: wrap;
    font-size: 0.84rem;
    margin-bottom: 0.5rem;
  }
  .ctl button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    color: var(--ink);
    min-height: 1.9rem;
  }
  .ctl button.on {
    background: var(--ink);
    color: var(--page);
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
  th {
    text-align: left;
    padding: 0.2rem 0.5rem 0.2rem 0;
    color: var(--ink-3);
    font-weight: 500;
  }
  td {
    padding: 0.15rem 0.1rem;
    text-align: center;
    min-width: 2.6rem;
  }
  .x {
    color: var(--ink-3);
  }
  .val {
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--page);
    border-radius: 3px;
    padding: 0.2rem 0.3rem;
    min-width: 2.4rem;
    cursor: pointer;
    color: var(--ink);
  }
  .val.picked {
    border-color: var(--bad);
  }
  .val.right {
    border-color: var(--ok);
    background: var(--ok-soft);
  }
  .d td {
    font-family: var(--font-mono);
    color: var(--ink-2);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
</style>
